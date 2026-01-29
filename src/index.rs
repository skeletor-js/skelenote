//! SQLite index for full-text search and backlinks

use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

/// Index manager for FTS5 and backlink tracking
pub struct Index {
    conn: Connection,
}

impl Index {
    /// Open or create the index database
    pub fn open(path: &Path) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;
        let index = Self { conn };
        index.init_schema()?;
        Ok(index)
    }

    /// Initialize database schema
    fn init_schema(&self) -> anyhow::Result<()> {
        self.conn.execute_batch(
            r#"
            -- Notes metadata
            CREATE TABLE IF NOT EXISTS notes (
                path TEXT PRIMARY KEY,
                title TEXT,
                note_type TEXT,
                tags TEXT,
                created TEXT,
                updated TEXT,
                modified TEXT,
                content_hash TEXT
            );

            -- Full-text search index
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                path,
                title,
                content,
                tags,
                content='notes',
                content_rowid='rowid'
            );

            -- Triggers to keep FTS in sync
            CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(rowid, path, title, content, tags)
                VALUES (new.rowid, new.path, new.title, '', new.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                INSERT INTO notes_fts(notes_fts, rowid, path, title, content, tags)
                VALUES('delete', old.rowid, old.path, old.title, '', old.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                INSERT INTO notes_fts(notes_fts, rowid, path, title, content, tags)
                VALUES('delete', old.rowid, old.path, old.title, '', old.tags);
                INSERT INTO notes_fts(rowid, path, title, content, tags)
                VALUES (new.rowid, new.path, new.title, '', new.tags);
            END;

            -- Backlinks (source -> target)
            CREATE TABLE IF NOT EXISTS backlinks (
                source_path TEXT NOT NULL,
                target_path TEXT NOT NULL,
                link_text TEXT,
                PRIMARY KEY (source_path, target_path)
            );

            CREATE INDEX IF NOT EXISTS idx_backlinks_target ON backlinks(target_path);

            -- Tasks
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                line INTEGER NOT NULL,
                text TEXT NOT NULL,
                done INTEGER DEFAULT 0,
                in_progress INTEGER DEFAULT 0,
                due TEXT,
                priority TEXT,
                project TEXT,
                area TEXT,
                recurrence TEXT,
                UNIQUE(source_path, line)
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due);
            CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);

            -- Embeddings (for semantic search)
            CREATE TABLE IF NOT EXISTS embeddings (
                path TEXT PRIMARY KEY,
                content_hash TEXT NOT NULL,
                embedding BLOB NOT NULL
            );
            "#,
        )?;
        Ok(())
    }

    /// Index a note's metadata
    pub fn index_note(
        &self,
        path: &str,
        title: Option<&str>,
        note_type: Option<&str>,
        tags: &[String],
        content_hash: &str,
    ) -> anyhow::Result<()> {
        let tags_str = tags.join(",");

        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO notes (path, title, note_type, tags, modified, content_hash)
            VALUES (?, ?, ?, ?, datetime('now'), ?)
            "#,
            params![path, title, note_type, tags_str, content_hash],
        )?;

        Ok(())
    }

    /// Update the FTS content for a note
    pub fn update_fts_content(&self, path: &str, content: &str) -> anyhow::Result<()> {
        // Get rowid for the note
        let rowid: Option<i64> = self
            .conn
            .query_row("SELECT rowid FROM notes WHERE path = ?", [path], |row| {
                row.get(0)
            })
            .optional()?;

        if let Some(rowid) = rowid {
            // Delete old FTS entry
            self.conn.execute(
                "INSERT INTO notes_fts(notes_fts, rowid, path, title, content, tags) VALUES('delete', ?, ?, ?, ?, ?)",
                params![rowid, path, "", "", ""],
            )?;

            // Get note metadata
            let (title, tags): (Option<String>, Option<String>) = self.conn.query_row(
                "SELECT title, tags FROM notes WHERE path = ?",
                [path],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;

            // Insert new FTS entry
            self.conn.execute(
                "INSERT INTO notes_fts(rowid, path, title, content, tags) VALUES(?, ?, ?, ?, ?)",
                params![rowid, path, title, content, tags],
            )?;
        }

        Ok(())
    }

    /// Remove a note from the index
    pub fn remove_note(&self, path: &str) -> anyhow::Result<()> {
        self.conn
            .execute("DELETE FROM notes WHERE path = ?", [path])?;
        self.conn
            .execute("DELETE FROM backlinks WHERE source_path = ?", [path])?;
        self.conn
            .execute("DELETE FROM tasks WHERE source_path = ?", [path])?;
        self.conn
            .execute("DELETE FROM embeddings WHERE path = ?", [path])?;
        Ok(())
    }

    /// Update backlinks for a source note
    pub fn update_backlinks(&self, source_path: &str, targets: &[String]) -> anyhow::Result<()> {
        // Clear existing backlinks from this source
        self.conn
            .execute("DELETE FROM backlinks WHERE source_path = ?", [source_path])?;

        // Insert new backlinks
        let mut stmt = self
            .conn
            .prepare("INSERT OR IGNORE INTO backlinks (source_path, target_path) VALUES (?, ?)")?;

        for target in targets {
            stmt.execute(params![source_path, target])?;
        }

        Ok(())
    }

    /// Get backlinks to a target note
    pub fn get_backlinks(&self, target_path: &str) -> anyhow::Result<Vec<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT source_path FROM backlinks WHERE target_path = ?")?;

        let paths = stmt
            .query_map([target_path], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(paths)
    }

    /// Full-text search
    pub fn search(&self, query: &str, limit: usize) -> anyhow::Result<Vec<SearchHit>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT path, title, snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
                   bm25(notes_fts) as score
            FROM notes_fts
            WHERE notes_fts MATCH ?
            ORDER BY score
            LIMIT ?
            "#,
        )?;

        let hits = stmt
            .query_map(params![query, limit], |row| {
                Ok(SearchHit {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                    score: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(hits)
    }

    /// Index tasks from a note
    pub fn index_tasks(
        &self,
        source_path: &str,
        tasks: &[crate::tasks::Task],
    ) -> anyhow::Result<()> {
        // Clear existing tasks from this source
        self.conn
            .execute("DELETE FROM tasks WHERE source_path = ?", [source_path])?;

        let mut stmt = self.conn.prepare(
            r#"
            INSERT INTO tasks (source_path, line, text, done, in_progress, due, priority, project, area, recurrence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )?;

        for task in tasks {
            stmt.execute(params![
                source_path,
                task.line,
                task.text,
                task.done,
                task.in_progress,
                task.due.map(|d| d.to_string()),
                task.priority.map(|p| format!("{:?}", p).to_lowercase()),
                task.project,
                task.area,
                task.recurrence,
            ])?;
        }

        Ok(())
    }

    /// Get content hash for a note (to detect changes)
    pub fn get_content_hash(&self, path: &str) -> anyhow::Result<Option<String>> {
        self.conn
            .query_row(
                "SELECT content_hash FROM notes WHERE path = ?",
                [path],
                |row| row.get(0),
            )
            .optional()
            .map_err(Into::into)
    }

    /// Store embedding for a note
    pub fn store_embedding(
        &self,
        path: &str,
        content_hash: &str,
        embedding: &[f32],
    ) -> anyhow::Result<()> {
        let embedding_bytes: Vec<u8> = embedding.iter().flat_map(|f| f.to_le_bytes()).collect();

        self.conn.execute(
            "INSERT OR REPLACE INTO embeddings (path, content_hash, embedding) VALUES (?, ?, ?)",
            params![path, content_hash, embedding_bytes],
        )?;

        Ok(())
    }

    /// Get embedding for a note
    pub fn get_embedding(&self, path: &str) -> anyhow::Result<Option<(String, Vec<f32>)>> {
        let result: Option<(String, Vec<u8>)> = self
            .conn
            .query_row(
                "SELECT content_hash, embedding FROM embeddings WHERE path = ?",
                [path],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;

        Ok(result.map(|(hash, bytes)| {
            let embedding: Vec<f32> = bytes
                .chunks_exact(4)
                .map(|chunk| f32::from_le_bytes(chunk.try_into().unwrap()))
                .collect();
            (hash, embedding)
        }))
    }

    /// Get all embeddings for similarity search
    pub fn get_all_embeddings(&self) -> anyhow::Result<Vec<(String, Vec<f32>)>> {
        let mut stmt = self
            .conn
            .prepare("SELECT path, embedding FROM embeddings")?;

        let results = stmt
            .query_map([], |row| {
                let path: String = row.get(0)?;
                let bytes: Vec<u8> = row.get(1)?;
                let embedding: Vec<f32> = bytes
                    .chunks_exact(4)
                    .map(|chunk| f32::from_le_bytes(chunk.try_into().unwrap()))
                    .collect();
                Ok((path, embedding))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(results)
    }

    /// Semantic search using cosine similarity
    pub fn semantic_search(
        &self,
        query_embedding: &[f32],
        limit: usize,
    ) -> anyhow::Result<Vec<SearchHit>> {
        let embeddings = self.get_all_embeddings()?;
        let mut scores: Vec<(String, f64)> = embeddings
            .into_iter()
            .map(|(path, embedding)| {
                let score = cosine_similarity(query_embedding, &embedding);
                (path, score)
            })
            .collect();

        // Sort by score descending
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scores.truncate(limit);

        // Fetch details for top hits
        let mut hits = Vec::new();
        for (path, score) in scores {
            let details: Option<(Option<String>, Option<String>)> = self
                .conn
                .query_row(
                    "SELECT title, substring(content, 1, 200) FROM notes WHERE path = ?",
                    [&path],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .optional()?;

            if let Some((title, snippet)) = details {
                hits.push(SearchHit {
                    path,
                    title,
                    snippet: snippet.map(|s| format!("{}...", s)),
                    score,
                });
            }
        }

        Ok(hits)
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    let dot_product: f64 = a
        .iter()
        .zip(b)
        .map(|(x, y)| (*x as f64) * (*y as f64))
        .sum();
    let norm_a: f64 = a.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a * norm_b)
}

#[derive(Debug)]
pub struct SearchHit {
    pub path: String,
    pub title: Option<String>,
    pub snippet: Option<String>,
    pub score: f64,
}
