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
                id TEXT,
                title TEXT,
                tags TEXT,
                created TEXT,
                updated TEXT,
                modified TEXT,
                content_hash TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_notes_id ON notes(id);

            -- Full-text search index (standalone, not content-external)
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                path,
                title,
                content,
                tags
            );

            -- Triggers to keep FTS in sync with notes table
            -- Note: Content is initially empty, updated separately via update_fts_content()
            CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(path, title, content, tags)
                VALUES (new.path, new.title, '', new.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                DELETE FROM notes_fts WHERE path = old.path;
            END;

            CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                UPDATE notes_fts SET title = new.title, tags = new.tags WHERE path = old.path;
            END;

            -- Backlinks (source -> target_link text)
            CREATE TABLE IF NOT EXISTS backlinks (
                source_path TEXT NOT NULL,
                source_id TEXT,
                target_link TEXT NOT NULL,
                PRIMARY KEY (source_path, target_link)
            );

            CREATE INDEX IF NOT EXISTS idx_backlinks_target ON backlinks(target_link);

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
        id: Option<&str>,
        title: Option<&str>,
        tags: &[String],
        content_hash: &str,
    ) -> anyhow::Result<()> {
        let tags_str = tags.join(",");

        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO notes (path, id, title, tags, modified, content_hash)
            VALUES (?, ?, ?, ?, datetime('now'), ?)
            "#,
            params![path, id, title, tags_str, content_hash],
        )?;

        Ok(())
    }

    /// Update the FTS content for a note
    pub fn update_fts_content(&self, path: &str, content: &str) -> anyhow::Result<()> {
        // Simply update the content in the FTS table
        self.conn.execute(
            "UPDATE notes_fts SET content = ? WHERE path = ?",
            params![content, path],
        )?;

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
    pub fn update_backlinks(
        &self,
        source_path: &str,
        source_id: Option<&str>,
        targets: &[String],
    ) -> anyhow::Result<()> {
        // Clear existing backlinks from this source
        self.conn
            .execute("DELETE FROM backlinks WHERE source_path = ?", [source_path])?;

        // Insert new backlinks
        let mut stmt = self.conn.prepare(
            "INSERT OR IGNORE INTO backlinks (source_path, source_id, target_link) VALUES (?, ?, ?)",
        )?;

        for target in targets {
            stmt.execute(params![source_path, source_id, target])?;
        }

        Ok(())
    }

    /// Get backlinks to a target note (simple version for backward compatibility)
    pub fn get_backlinks(&self, target_path: &str) -> anyhow::Result<Vec<String>> {
        let path_without_ext = target_path.trim_end_matches(".md");

        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT source_path FROM backlinks WHERE target_link = ? OR target_link = ?",
        )?;

        let paths = stmt
            .query_map(params![target_path, path_without_ext], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(paths)
    }

    /// Get notes that link to this note (by ID, title, or path)
    pub fn get_backlinks_for_note(
        &self,
        note_id: Option<&str>,
        title: Option<&str>,
        path: &str,
    ) -> anyhow::Result<Vec<String>> {
        let mut sources = Vec::new();
        let path_without_ext = path.trim_end_matches(".md");

        // Find backlinks where target matches our ID, title, or path
        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT source_path FROM backlinks WHERE target_link = ? OR target_link = ? OR target_link = ? OR target_link = ?",
        )?;

        let rows = stmt.query_map(
            params![
                note_id.unwrap_or(""),
                title.unwrap_or(""),
                path,
                path_without_ext
            ],
            |row| row.get(0),
        )?;

        for row in rows {
            sources.push(row?);
        }

        Ok(sources)
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

    /// Get paths of notes that link TO a target (by ID, title, or path).
    ///
    /// This finds all source notes that have a wikilink pointing to the target.
    pub fn get_sources_linking_to(&self, target: &str) -> anyhow::Result<Vec<String>> {
        // Find all source paths where target_link matches (ID, title, or path)
        // Use exact match first, then partial match for flexibility
        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT source_path FROM backlinks
             WHERE LOWER(target_link) = LOWER(?)
             OR LOWER(target_link) LIKE LOWER(?)",
        )?;

        let results: Vec<String> = stmt
            .query_map([target, &format!("%{}%", escape_like_pattern(target))], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(results)
    }

    /// Get paths of notes that are linked FROM a source (by ID, title, or path).
    ///
    /// This finds all target notes that the source note links to.
    pub fn get_targets_linked_from(&self, source: &str) -> anyhow::Result<Vec<String>> {
        // First, find the source path by ID, title, or path match
        let source_path: Option<String> = self
            .conn
            .query_row(
                "SELECT path FROM notes WHERE id = ? OR LOWER(title) = LOWER(?) OR path LIKE ?",
                [source, source, &format!("%{}%", escape_like_pattern(source))],
                |row| row.get(0),
            )
            .optional()?;

        let Some(source_path) = source_path else {
            return Ok(Vec::new());
        };

        // Get all target_links from that source
        let mut stmt = self
            .conn
            .prepare("SELECT target_link FROM backlinks WHERE source_path = ?")?;

        let links: Vec<String> = stmt
            .query_map([&source_path], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;

        // Resolve each link to a path
        drop(stmt);

        let mut paths = Vec::new();
        for link in links {
            if let Some(path) = self.resolve_link(&link)? {
                paths.push(path);
            }
        }

        Ok(paths)
    }

    /// Search notes with structured filters.
    ///
    /// Builds a dynamic SQL query based on active filters.
    pub fn search_filtered(
        &self,
        filters: &crate::search::SearchFilters,
        limit: usize,
    ) -> anyhow::Result<Vec<SearchHit>> {
        let mut sql = String::from("SELECT n.path, n.title FROM notes n");
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Tag filter (case-insensitive, exact match within comma-separated list)
        // Wrapping with commas ensures we match whole tags, not substrings
        // e.g., "work" won't match "homework" or "network"
        for tag in &filters.tags {
            conditions.push("(',' || LOWER(n.tags) || ',') LIKE ?".to_string());
            params.push(Box::new(format!("%,{},%", tag.to_lowercase())));
        }

        // Date range filters
        if let Some(after) = &filters.after {
            conditions.push("(n.created >= ? OR n.updated >= ?)".to_string());
            let date_str = after.format("%Y-%m-%d").to_string();
            params.push(Box::new(date_str.clone()));
            params.push(Box::new(date_str));
        }
        if let Some(before) = &filters.before {
            conditions.push("(n.created <= ? OR n.updated <= ?)".to_string());
            let date_str = before.format("%Y-%m-%d").to_string();
            params.push(Box::new(date_str.clone()));
            params.push(Box::new(date_str));
        }

        // ID filter (partial match)
        if let Some(id) = &filters.id {
            conditions.push("n.id LIKE ?".to_string());
            params.push(Box::new(format!("%{}%", id)));
        }

        // Backlink filter: links:target (notes that link TO target)
        let link_source_paths = if let Some(target) = &filters.links_to {
            Some(self.get_sources_linking_to(target)?)
        } else {
            None
        };

        // Backlink filter: linkedby:source (notes linked FROM source)
        let link_target_paths = if let Some(source) = &filters.linked_by {
            Some(self.get_targets_linked_from(source)?)
        } else {
            None
        };

        // Add path constraints for backlink filters
        if let Some(paths) = &link_source_paths {
            if paths.is_empty() {
                return Ok(Vec::new()); // No matches possible
            }
            let placeholders: Vec<&str> = paths.iter().map(|_| "?").collect();
            conditions.push(format!("n.path IN ({})", placeholders.join(", ")));
            for p in paths {
                params.push(Box::new(p.clone()));
            }
        }

        if let Some(paths) = &link_target_paths {
            if paths.is_empty() {
                return Ok(Vec::new()); // No matches possible
            }
            let placeholders: Vec<&str> = paths.iter().map(|_| "?").collect();
            conditions.push(format!("n.path IN ({})", placeholders.join(", ")));
            for p in paths {
                params.push(Box::new(p.clone()));
            }
        }

        // Text query via FTS5
        if let Some(text) = &filters.text_query {
            // When text query is present, use FTS with JOIN to notes for other filters
            // This allows us to apply date/ID filters that require columns from notes table
            sql = String::from(
                "SELECT n.path, n.title, bm25(notes_fts) as score \
                 FROM notes_fts \
                 JOIN notes n ON notes_fts.path = n.path \
                 WHERE notes_fts MATCH ?",
            );

            // Prepend the text query as first parameter
            let mut fts_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
            fts_params.push(Box::new(text.clone()));

            // Note: We skip snippet() here for simplicity since filtered search prioritizes
            // structured filters over snippet generation. The main search() method provides
            // snippets for text-only searches.

            // Apply all conditions (tags, dates, id) - they reference n.* columns
            for cond in &conditions {
                sql.push_str(&format!(" AND {}", cond));
            }
            // Add the parameters from conditions
            fts_params.extend(params);

            sql.push_str(&format!(" ORDER BY score LIMIT {}", limit));
            params = fts_params;
        } else if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
            sql.push_str(&format!(" ORDER BY n.updated DESC LIMIT {}", limit));
        } else {
            sql.push_str(&format!(" ORDER BY n.updated DESC LIMIT {}", limit));
        }

        let mut stmt = self.conn.prepare(&sql)?;

        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        let results = if filters.text_query.is_some() {
            stmt.query_map(rusqlite::params_from_iter(param_refs), |row| {
                Ok(SearchHit {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    snippet: None,
                    score: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(rusqlite::params_from_iter(param_refs), |row| {
                Ok(SearchHit {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    snippet: None,
                    score: 0.0,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?
        };

        Ok(results)
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

    /// Resolve a wikilink to a note path
    /// Tries: exact ID match, then title match, then path match
    pub fn resolve_link(&self, link: &str) -> anyhow::Result<Option<String>> {
        // Try exact ID match first
        let by_id: Option<String> = self
            .conn
            .query_row("SELECT path FROM notes WHERE id = ?", [link], |row| {
                row.get(0)
            })
            .optional()?;

        if by_id.is_some() {
            return Ok(by_id);
        }

        // Try title match (case-insensitive)
        let by_title: Option<String> = self
            .conn
            .query_row(
                "SELECT path FROM notes WHERE LOWER(title) = LOWER(?)",
                [link],
                |row| row.get(0),
            )
            .optional()?;

        if by_title.is_some() {
            return Ok(by_title);
        }

        // Try path match (with or without .md extension)
        let path_with_ext = if link.ends_with(".md") {
            link.to_string()
        } else {
            format!("{}.md", link)
        };

        let by_path: Option<String> = self
            .conn
            .query_row(
                "SELECT path FROM notes WHERE path = ? OR path = ?",
                params![link, path_with_ext],
                |row| row.get(0),
            )
            .optional()?;

        Ok(by_path)
    }
}

/// Escape SQL LIKE pattern special characters.
fn escape_like_pattern(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_with_tag_filter() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Index a note with tags
        let path = "work-meeting.md";
        index
            .index_note(
                path,
                None,
                Some("Work Meeting"),
                &["work".to_string(), "urgent".to_string()],
                "hash1",
            )
            .unwrap();
        index.update_fts_content(path, "Meeting notes").unwrap();

        // Index a note without matching tag
        let path2 = "personal.md";
        index
            .index_note(
                path2,
                None,
                Some("Personal"),
                &["home".to_string()],
                "hash2",
            )
            .unwrap();
        index.update_fts_content(path2, "Personal stuff").unwrap();

        let mut filters = crate::search::SearchFilters::default();
        filters.tags.push("work".to_string());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("work-meeting"));
    }

    #[test]
    fn test_search_with_date_filter() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Index a recent note - we need to manually insert created date
        let path = "recent.md";
        index.conn.execute(
            "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
            params![path, None::<String>, "Recent", "", "2025-06-01", "hash1"],
        ).unwrap();
        index.update_fts_content(path, "Recent note").unwrap();

        // Index an old note
        let path2 = "old.md";
        index.conn.execute(
            "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
            params![path2, None::<String>, "Old", "", "2020-01-01", "hash2"],
        ).unwrap();
        index.update_fts_content(path2, "Old note").unwrap();

        let mut filters = crate::search::SearchFilters::default();
        filters.after = Some(chrono::NaiveDate::from_ymd_opt(2025, 1, 1).unwrap());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("recent"));
    }

    #[test]
    fn test_search_with_id_filter() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        let path = "note.md";
        index
            .index_note(
                path,
                Some("550e8400-e29b-41d4-a716-446655440000"),
                Some("Test"),
                &[],
                "hash1",
            )
            .unwrap();
        index.update_fts_content(path, "Content").unwrap();

        let mut filters = crate::search::SearchFilters::default();
        filters.id = Some("550e8400".to_string());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_search_with_multiple_tags() {
        // Test combining multiple tag filters (AND logic)
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        let path = "meeting.md";
        index
            .index_note(
                path,
                None,
                Some("Meeting"),
                &["work".to_string(), "urgent".to_string()],
                "hash1",
            )
            .unwrap();

        let path2 = "meeting2.md";
        index
            .index_note(
                path2,
                None,
                Some("Meeting 2"),
                &["work".to_string()],
                "hash2",
            )
            .unwrap();

        // Search for notes with both "work" AND "urgent" tags
        let mut filters = crate::search::SearchFilters::default();
        filters.tags.push("work".to_string());
        filters.tags.push("urgent".to_string());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("meeting.md"));
    }

    #[test]
    fn test_search_with_tag_and_date() {
        // Test combining tag filter with date filter
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Recent work note
        index.conn.execute(
            "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
            params!["recent-work.md", None::<String>, "Recent Work", "work", "2025-06-01", "hash1"],
        ).unwrap();

        // Old work note
        index.conn.execute(
            "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
            params!["old-work.md", None::<String>, "Old Work", "work", "2020-01-01", "hash2"],
        ).unwrap();

        // Recent personal note
        index.conn.execute(
            "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
            params!["recent-personal.md", None::<String>, "Recent Personal", "personal", "2025-06-01", "hash3"],
        ).unwrap();

        // Search for work notes created after 2025-01-01
        let mut filters = crate::search::SearchFilters::default();
        filters.tags.push("work".to_string());
        filters.after = Some(chrono::NaiveDate::from_ymd_opt(2025, 1, 1).unwrap());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("recent-work"));
    }

    #[test]
    fn test_search_with_text_and_tag() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Index a note with work tag and project content
        let path = "meeting.md";
        index
            .index_note(path, None, Some("Meeting"), &["work".to_string()], "hash1")
            .unwrap();
        index
            .update_fts_content(path, "Project discussion")
            .unwrap();

        // Index a note with personal tag and project content
        let path2 = "meeting2.md";
        index
            .index_note(
                path2,
                None,
                Some("Meeting 2"),
                &["personal".to_string()],
                "hash2",
            )
            .unwrap();
        index
            .update_fts_content(path2, "Project discussion")
            .unwrap();

        // Verify basic FTS search works (using filtered search with text query only)
        let basic_filters = crate::search::SearchFilters::parse("project");
        let basic_results = index.search_filtered(&basic_filters, 50).unwrap();
        assert_eq!(
            basic_results.len(),
            2,
            "Basic FTS should find 2 notes with 'project'"
        );

        // Search with both text query and tag filter
        let filters = crate::search::SearchFilters::parse("tag:work project");

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("meeting.md"));
    }

    #[test]
    fn test_search_with_text_and_date() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Index a recent note with project content
        let path = "recent.md";
        index
            .conn
            .execute(
                "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
                params![path, None::<String>, "Recent Meeting", "", "2025-06-01", "hash1"],
            )
            .unwrap();
        index
            .update_fts_content(path, "Project discussion")
            .unwrap();

        // Index an old note with project content
        let path2 = "old.md";
        index
            .conn
            .execute(
                "INSERT OR REPLACE INTO notes (path, id, title, tags, created, modified, content_hash) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)",
                params![path2, None::<String>, "Old Meeting", "", "2020-01-01", "hash2"],
            )
            .unwrap();
        index
            .update_fts_content(path2, "Project discussion")
            .unwrap();

        // Search with both text query and date filter
        let filters = crate::search::SearchFilters::parse("after:2025-01-01 project");

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("recent"));
    }

    #[test]
    fn test_search_links_to() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Note that is linked to (target)
        let target_path = "target.md";
        index
            .index_note(
                target_path,
                Some("target-id"),
                Some("Target Note"),
                &[],
                "hash1",
            )
            .unwrap();
        index
            .update_fts_content(target_path, "Target content")
            .unwrap();

        // Note that links to target (source)
        let source_path = "source.md";
        index
            .index_note(source_path, None, Some("Source"), &[], "hash2")
            .unwrap();
        index
            .update_fts_content(source_path, "Links to [[target-id]]")
            .unwrap();
        // Add the backlink
        index
            .update_backlinks(source_path, None, &["target-id".to_string()])
            .unwrap();

        // Note with no links
        let other_path = "other.md";
        index
            .index_note(other_path, None, Some("Other"), &[], "hash3")
            .unwrap();
        index
            .update_fts_content(other_path, "No links here")
            .unwrap();

        // Find notes that link TO target-id
        let mut filters = crate::search::SearchFilters::default();
        filters.links_to = Some("target-id".to_string());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.contains("source"));
    }

    #[test]
    fn test_search_linked_by() {
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Source note with outgoing links
        let source_path = "source.md";
        index
            .index_note(source_path, Some("source-id"), Some("Source"), &[], "hash1")
            .unwrap();
        index
            .update_fts_content(source_path, "Links to [[target1]] and [[target2]]")
            .unwrap();
        // Add the backlinks from source
        index
            .update_backlinks(
                source_path,
                Some("source-id"),
                &["target1".to_string(), "target2".to_string()],
            )
            .unwrap();

        // Target notes
        let target1_path = "target1.md";
        index
            .index_note(
                target1_path,
                Some("target1"),
                Some("Target 1"),
                &[],
                "hash2",
            )
            .unwrap();
        index
            .update_fts_content(target1_path, "First target")
            .unwrap();

        let target2_path = "target2.md";
        index
            .index_note(
                target2_path,
                Some("target2"),
                Some("Target 2"),
                &[],
                "hash3",
            )
            .unwrap();
        index
            .update_fts_content(target2_path, "Second target")
            .unwrap();

        // Find notes that are linked FROM source-id
        let mut filters = crate::search::SearchFilters::default();
        filters.linked_by = Some("source-id".to_string());

        let results = index.search_filtered(&filters, 50).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_tag_word_boundary_matching() {
        // Regression test: tag:work should NOT match notes tagged only "homework" or "network"
        let dir = tempfile::tempdir().unwrap();
        let index = Index::open(dir.path().join("index.db").as_path()).unwrap();

        // Note with exact "work" tag - should match
        index
            .index_note(
                "actual-work.md",
                None,
                Some("Actual Work"),
                &["work".to_string()],
                "hash1",
            )
            .unwrap();

        // Note with "homework" tag - should NOT match "work"
        index
            .index_note(
                "school.md",
                None,
                Some("School Stuff"),
                &["homework".to_string()],
                "hash2",
            )
            .unwrap();

        // Note with "network" tag - should NOT match "work"
        index
            .index_note(
                "networking.md",
                None,
                Some("Networking Notes"),
                &["network".to_string()],
                "hash3",
            )
            .unwrap();

        // Note with multiple tags including "work" - should match
        index
            .index_note(
                "work-meeting.md",
                None,
                Some("Work Meeting"),
                &["work".to_string(), "urgent".to_string()],
                "hash4",
            )
            .unwrap();

        // Search for tag:work
        let mut filters = crate::search::SearchFilters::default();
        filters.tags.push("work".to_string());

        let results = index.search_filtered(&filters, 50).unwrap();

        // Should only find notes with exact "work" tag, not "homework" or "network"
        assert_eq!(
            results.len(),
            2,
            "Should find exactly 2 notes with 'work' tag, got {:?}",
            results.iter().map(|r| &r.path).collect::<Vec<_>>()
        );

        let paths: Vec<&str> = results.iter().map(|r| r.path.as_str()).collect();
        assert!(
            paths.contains(&"actual-work.md"),
            "Should find actual-work.md"
        );
        assert!(
            paths.contains(&"work-meeting.md"),
            "Should find work-meeting.md"
        );
        assert!(
            !paths.contains(&"school.md"),
            "Should NOT find school.md (homework tag)"
        );
        assert!(
            !paths.contains(&"networking.md"),
            "Should NOT find networking.md (network tag)"
        );
    }
}
