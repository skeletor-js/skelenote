//! Vault management - the core interface to notes storage

use crate::config::Config;
use crate::index::Index;
use crate::notes::{Note, SearchResult};
use crate::tasks::{Task, TaskFilter};
use chrono::{Local, NaiveDate};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use walkdir::WalkDir;

/// The vault manages all notes and their index
pub struct Vault {
    /// Root path of the vault
    pub root: PathBuf,

    /// Configuration
    pub config: Config,

    /// SQLite index (wrapped in std Mutex because rusqlite isn't Send)
    index: Arc<Mutex<Index>>,

    /// In-memory cache of notes
    notes_cache: Arc<RwLock<HashMap<PathBuf, Note>>>,
}

impl Vault {
    /// Initialize a new vault at the given path
    pub async fn init(path: &Path) -> anyhow::Result<()> {
        // Create directory structure
        std::fs::create_dir_all(path)?;
        std::fs::create_dir_all(path.join(".skelenote"))?;
        std::fs::create_dir_all(path.join("daily"))?;
        std::fs::create_dir_all(path.join("inbox"))?;
        std::fs::create_dir_all(path.join("archive"))?;

        // Create default config
        let config = Config::load_or_create(path)?;
        config.save()?;

        // Create welcome note
        let welcome = r#"---
title: Welcome to Skelenote
type: note
tags: [getting-started]
---

# Welcome to Skelenote

Your headless productivity backend is ready.

## Quick Start

- Create notes in this folder as `.md` files
- Use `[[wikilinks]]` to link between notes
- Add tasks with `- [ ] task text`
- Add metadata with `@due(2026-01-30)`, `@priority(high)`, etc.

## Commands

- `skelenote serve` - Start the MCP server
- `skelenote tui` - Start the TUI (default)
- `skelenote search "query"` - Search notes
- `skelenote tasks` - List today's tasks
- `skelenote daily` - Open today's daily note
- `skelenote capture "text"` - Quick capture to inbox

## MCP Integration

Any AI agent can connect to your notes via MCP at `http://localhost:3000/mcp`.
"#;

        std::fs::write(path.join("welcome.md"), welcome)?;

        Ok(())
    }

    /// Open an existing vault
    pub async fn open(path: &Path, config: Config) -> anyhow::Result<Self> {
        // Ensure .skelenote directory exists
        std::fs::create_dir_all(path.join(".skelenote"))?;

        // Open index
        let index = Index::open(&config.index_path())?;

        let vault = Self {
            root: path.to_path_buf(),
            config,
            index: Arc::new(Mutex::new(index)),
            notes_cache: Arc::new(RwLock::new(HashMap::new())),
        };

        // Initial index build
        vault.reindex().await?;

        Ok(vault)
    }

    /// Full reindex of all notes
    pub async fn reindex(&self) -> anyhow::Result<()> {
        let index = self.index.lock().unwrap();
        let mut cache = self.notes_cache.write().await;

        for entry in WalkDir::new(&self.root)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "md"))
            .filter(|e| !e.path().starts_with(self.root.join(".skelenote")))
        {
            let path = entry.path();
            let rel_path = path.strip_prefix(&self.root).unwrap_or(path);

            if let Ok(note) = Note::read(&self.root, rel_path) {
                // Compute content hash
                let hash = content_hash(&note.content);

                // Check if we need to reindex
                let needs_reindex = index
                    .get_content_hash(rel_path.to_string_lossy().as_ref())?
                    .map_or(true, |h| h != hash);

                if needs_reindex {
                    // Index metadata
                    index.index_note(
                        &rel_path.to_string_lossy(),
                        note.frontmatter.title.as_deref(),
                        note.frontmatter.note_type.as_deref(),
                        &note.frontmatter.tags,
                        &hash,
                    )?;

                    // Index content for FTS
                    index.update_fts_content(&rel_path.to_string_lossy(), &note.content)?;

                    // Index backlinks
                    let wikilinks = note.wikilinks();
                    let targets: Vec<String> = wikilinks
                        .iter()
                        .map(|link| normalize_wikilink(link))
                        .collect();
                    index.update_backlinks(&rel_path.to_string_lossy(), &targets)?;

                    // Index tasks
                    let tasks = Task::extract_from_content(&rel_path.to_path_buf(), &note.content);
                    index.index_tasks(&rel_path.to_string_lossy(), &tasks)?;
                }

                cache.insert(rel_path.to_path_buf(), note);
            }
        }

        Ok(())
    }

    /// Start file watcher for live updates
    /// NOTE: File watching is currently disabled due to async constraints.
    /// Call reindex() manually after file changes.
    pub async fn start_watcher(&self) -> anyhow::Result<()> {
        tracing::info!("File watcher disabled - call reindex() after changes");
        // TODO: Implement with tokio::task::spawn_blocking for SQLite
        Ok(())
    }

    /// Full-text search
    pub async fn search(&self, query: &str, limit: usize) -> anyhow::Result<Vec<SearchResult>> {
        let index = self.index.lock().unwrap();
        let hits = index.search(query, limit)?;

        Ok(hits
            .into_iter()
            .map(|hit| SearchResult {
                path: PathBuf::from(&hit.path),
                title: hit.title.unwrap_or_else(|| hit.path.clone()),
                snippet: hit.snippet,
                score: hit.score as f32,
            })
            .collect())
    }

    /// Semantic search (placeholder - needs embedding model)
    pub async fn semantic_search(
        &self,
        _query: &str,
        limit: usize,
    ) -> anyhow::Result<Vec<SearchResult>> {
        // TODO: Implement with embedding model
        // For now, fall back to FTS
        self.search(_query, limit).await
    }

    /// List tasks with filter
    pub async fn list_tasks(&self, filter: &str) -> anyhow::Result<Vec<Task>> {
        let cache = self.notes_cache.read().await;
        let task_filter = TaskFilter::from_string(filter);
        let today = Local::now().date_naive();

        let mut all_tasks: Vec<Task> = Vec::new();

        for note in cache.values() {
            let tasks = Task::extract_from_content(&note.path, &note.content);
            for task in tasks {
                if task_filter.matches(&task, today) {
                    all_tasks.push(task);
                }
            }
        }

        // Sort by priority (highest first), then by due date
        all_tasks.sort_by(|a, b| {
            let priority_ord = b
                .priority
                .map(|p| p.sort_order())
                .unwrap_or(0)
                .cmp(&a.priority.map(|p| p.sort_order()).unwrap_or(0));

            if priority_ord != std::cmp::Ordering::Equal {
                return priority_ord;
            }

            a.due.cmp(&b.due)
        });

        Ok(all_tasks)
    }

    /// Get or create today's daily note
    pub async fn get_or_create_daily(&self, date: Option<&str>) -> anyhow::Result<Note> {
        let date = if let Some(d) = date {
            NaiveDate::parse_from_str(d, "%Y-%m-%d")?
        } else {
            Local::now().date_naive()
        };

        let filename = format!("{}.md", date);
        let rel_path = PathBuf::from(&self.config.daily_folder).join(&filename);
        let full_path = self.root.join(&rel_path);

        if full_path.exists() {
            Note::read(&self.root, &rel_path)
        } else {
            // Create new daily note
            let title = date.format("%A, %B %d, %Y").to_string();
            let content = format!(
                r#"---
title: {}
type: note
daily: true
created: {}
---

# {}

## Tasks

- [ ] 

## Notes

"#,
                title,
                chrono::Utc::now().to_rfc3339(),
                title
            );

            std::fs::create_dir_all(full_path.parent().unwrap())?;
            std::fs::write(&full_path, &content)?;

            Note::read(&self.root, &rel_path)
        }
    }

    /// Quick capture to inbox
    pub async fn quick_capture(&self, content: &str) -> anyhow::Result<()> {
        let inbox_path = self.config.inbox_path().join("inbox.md");

        let existing = if inbox_path.exists() {
            std::fs::read_to_string(&inbox_path)?
        } else {
            std::fs::create_dir_all(self.config.inbox_path())?;
            r#"---
title: Inbox
type: note
---

# Inbox

"#
            .to_string()
        };

        let timestamp = Local::now().format("%Y-%m-%d %H:%M");
        let new_content = format!("{}\n- [ ] {} ({})\n", existing.trim_end(), content, timestamp);

        std::fs::write(&inbox_path, new_content)?;
        Ok(())
    }

    /// Get a note by path
    pub async fn get_note(&self, path: &Path) -> anyhow::Result<Option<Note>> {
        let cache = self.notes_cache.read().await;
        Ok(cache.get(path).cloned())
    }

    /// Create a new note
    pub async fn create_note(
        &self,
        title: &str,
        content: &str,
        folder: Option<&str>,
        tags: &[String],
    ) -> anyhow::Result<Note> {
        let folder = folder.unwrap_or("inbox");
        let filename = slugify(title) + ".md";
        let rel_path = PathBuf::from(folder).join(&filename);
        let full_path = self.root.join(&rel_path);

        let frontmatter = crate::notes::Frontmatter {
            id: Some(uuid::Uuid::new_v4().to_string()),
            title: Some(title.to_string()),
            tags: tags.to_vec(),
            created: Some(chrono::Utc::now()),
            ..Default::default()
        };

        let note = Note {
            path: rel_path.clone(),
            frontmatter,
            content: content.to_string(),
            modified: chrono::Utc::now(),
        };

        std::fs::create_dir_all(full_path.parent().unwrap())?;
        note.write(&self.root)?;

        // Update cache
        self.notes_cache
            .write()
            .await
            .insert(rel_path.clone(), note.clone());

        Ok(note)
    }

    /// Get backlinks to a note
    pub async fn get_backlinks(&self, path: &Path) -> anyhow::Result<Vec<String>> {
        let index = self.index.lock().unwrap();
        index.get_backlinks(&path.to_string_lossy())
    }

    /// Get all cached notes (for TUI)
    pub async fn get_all_notes(&self) -> Vec<crate::notes::Note> {
        let cache = self.notes_cache.read().await;
        let mut notes: Vec<_> = cache.values().cloned().collect();
        notes.sort_by(|a, b| b.modified.cmp(&a.modified));
        notes
    }
}

/// Compute SHA256 hash of content
fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Normalize a wikilink to a relative path
fn normalize_wikilink(link: &str) -> String {
    let link = link.trim();
    if link.ends_with(".md") {
        link.to_string()
    } else {
        format!("{}.md", link)
    }
}

/// Convert a title to a filename-safe slug
fn slugify(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
