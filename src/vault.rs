//! Vault management - the core interface to notes storage

use crate::config::Config;
use crate::embeddings::EmbeddingEngine;
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

use crate::watcher::{start_watcher, VaultEvent, WatcherHandle};

/// The vault manages all notes and their index
#[derive(Clone)]
pub struct Vault {
    /// Root path of the vault
    pub root: PathBuf,

    /// Configuration
    pub config: Config,

    /// SQLite index (wrapped in std Mutex because rusqlite isn't Send)
    index: Arc<Mutex<Index>>,

    /// In-memory cache of notes
    notes_cache: Arc<RwLock<HashMap<PathBuf, Note>>>,

    /// Embedding engine (optional)
    pub embeddings: Option<Arc<EmbeddingEngine>>,

    /// File watcher handle
    watcher: Arc<Mutex<Option<WatcherHandle>>>,

    /// Event broadcast channel
    #[allow(dead_code)] // it is used but maybe not all fields read
    event_tx: tokio::sync::broadcast::Sender<VaultEvent>,
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

        // Initialize embeddings
        let embeddings = match EmbeddingEngine::new(&config.embeddings).await {
            Ok(engine) => Some(Arc::new(engine)),
            Err(e) => {
                tracing::warn!("Failed to initialize embeddings: {}", e);
                None
            }
        };

        let (event_tx, _) = tokio::sync::broadcast::channel(100);

        let vault = Self {
            root: path.to_path_buf(),
            config,
            index: Arc::new(Mutex::new(index)),
            notes_cache: Arc::new(RwLock::new(HashMap::new())),
            embeddings,
            watcher: Arc::new(Mutex::new(None)),
            event_tx,
        };

        // Initial index build
        vault.reindex().await?;

        // Start watcher (must spawn) - wait, start_watcher is async method.
        // We probably want to start it explicitly or here?
        // The plan says "Start watcher when running serve command".
        // So we leave it as None here.

        Ok(vault)
    }

    /// Full reindex of all notes
    pub async fn reindex(&self) -> anyhow::Result<()> {
        let mut notes_to_process = Vec::new();

        // 1. Scan filesystem and identify changed files
        for entry in WalkDir::new(&self.root)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "md"))
            .filter(|e| !e.path().starts_with(self.root.join(".skelenote")))
        {
            let path = entry.path();
            let rel_path = path.strip_prefix(&self.root).unwrap_or(path).to_path_buf();

            if let Ok(note) = Note::read(&self.root, &rel_path) {
                // Auto-generate ID if missing
                let note = if note.frontmatter.id.is_none() {
                    let mut note = note;
                    note.frontmatter.id = Some(uuid::Uuid::new_v4().to_string());
                    note.write(&self.root)?;
                    note
                } else {
                    note
                };

                let hash = content_hash(&note.content);

                let needs_reindex = {
                    let index = self.index.lock().unwrap();
                    index
                        .get_content_hash(rel_path.to_string_lossy().as_ref())?
                        .map_or(true, |h| h != hash)
                };

                if needs_reindex {
                    notes_to_process.push((rel_path, note, hash));
                } else {
                    // Update cache even if index is fresh
                    self.notes_cache.write().await.insert(rel_path, note);
                }
            }
        }

        // 2. Process changed files (Generate embeddings -> Update DB)
        for (rel_path, note, hash) in notes_to_process {
            let path_str = rel_path.to_string_lossy().to_string();

            // Generate embedding (Async, no lock held)
            let embedding = if let Some(engine) = &self.embeddings {
                let input = format!(
                    "{}\n\n{}",
                    note.frontmatter.title.as_deref().unwrap_or(""),
                    note.content
                );
                match engine.embed_text(&input).await {
                    Ok(vec) => Some(vec),
                    Err(e) => {
                        tracing::warn!("Failed to embed {}: {}", path_str, e);
                        None
                    }
                }
            } else {
                None
            };

            // Update Index (Hold lock)
            {
                let index = self.index.lock().unwrap();

                // Index metadata
                index.index_note(
                    &path_str,
                    note.frontmatter.id.as_deref(),
                    note.frontmatter.title.as_deref(),
                    &note.frontmatter.tags,
                    &hash,
                )?;

                // Index content for FTS
                index.update_fts_content(&path_str, &note.content)?;

                // Index backlinks
                let wikilinks = note.wikilinks();
                let targets: Vec<String> = wikilinks
                    .iter()
                    .map(|link| normalize_wikilink(link))
                    .collect();
                index.update_backlinks(&path_str, note.frontmatter.id.as_deref(), &targets)?;

                // Index tasks
                let tasks = Task::extract_from_content(&rel_path, &note.content);
                index.index_tasks(&path_str, &tasks)?;

                // Store embedding
                if let Some(emb) = embedding {
                    if let Err(e) = index.store_embedding(&path_str, &hash, &emb) {
                        tracing::warn!("Failed to store embedding: {}", e);
                    }
                }
            }

            // Update cache
            self.notes_cache.write().await.insert(rel_path, note);
        }

        Ok(())
    }

    /// Start file watcher for live updates
    pub async fn start_watcher(&self) -> anyhow::Result<()> {
        if self.watcher.lock().unwrap().is_some() {
            tracing::info!("Watcher already running");
            return Ok(());
        }

        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        let handle = start_watcher(&self.root, tx)?;
        *self.watcher.lock().unwrap() = Some(handle);

        tracing::info!("File watcher started on {}", self.root.display());

        let vault = self.clone();
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                if let Err(e) = vault.handle_event(event).await {
                    tracing::error!("Error handling file event: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Handle file system event
    async fn handle_event(&self, event: VaultEvent) -> anyhow::Result<()> {
        match event {
            VaultEvent::Create(ref path) | VaultEvent::Modify(ref path) => {
                self.handle_create_modify(path.clone()).await?;
            }
            VaultEvent::Remove(ref path) => {
                self.handle_remove(path.clone()).await?;
            }
            VaultEvent::Rename(ref from, ref to) => {
                // Treat as Remove + Create
                self.handle_remove(from.clone()).await?;
                self.handle_create_modify(to.clone()).await?;
            }
        }

        // Broadcast event
        let _ = self.event_tx.send(event);

        Ok(())
    }

    /// Subscribe to vault events
    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<VaultEvent> {
        self.event_tx.subscribe()
    }

    async fn handle_create_modify(&self, path: PathBuf) -> anyhow::Result<()> {
        let rel_path = path.strip_prefix(&self.root).unwrap_or(&path).to_path_buf();
        tracing::info!("File changed: {}", rel_path.display());

        if let Ok(note) = Note::read(&self.root, &rel_path) {
            self.index_note_internal(rel_path, note).await?;
        }
        Ok(())
    }

    async fn handle_remove(&self, path: PathBuf) -> anyhow::Result<()> {
        let rel_path = path.strip_prefix(&self.root).unwrap_or(&path);
        tracing::info!("File removed: {}", rel_path.display());
        {
            let index = self.index.lock().unwrap();
            index.remove_note(&rel_path.to_string_lossy())?;
        } // Drop lock
        self.notes_cache.write().await.remove(rel_path);
        Ok(())
    }

    /// Helper to index a single note (metadata + embeddings)
    async fn index_note_internal(&self, rel_path: PathBuf, note: Note) -> anyhow::Result<()> {
        let hash = content_hash(&note.content);
        let path_str = rel_path.to_string_lossy().to_string();

        // Generate embedding (Async, no lock held)
        let embedding = if let Some(engine) = &self.embeddings {
            let input = format!(
                "{}\n\n{}",
                note.frontmatter.title.as_deref().unwrap_or(""),
                note.content
            );
            match engine.embed_text(&input).await {
                Ok(vec) => Some(vec),
                Err(e) => {
                    tracing::warn!("Failed to embed {}: {}", path_str, e);
                    None
                }
            }
        } else {
            None
        };

        // Update Index (Hold lock)
        {
            let index = self.index.lock().unwrap();

            // Index metadata
            index.index_note(
                &path_str,
                note.frontmatter.id.as_deref(),
                note.frontmatter.title.as_deref(),
                &note.frontmatter.tags,
                &hash,
            )?;

            // Index content for FTS
            index.update_fts_content(&path_str, &note.content)?;

            // Index backlinks
            let wikilinks = note.wikilinks();
            let targets: Vec<String> = wikilinks
                .iter()
                .map(|link| normalize_wikilink(link))
                .collect();
            index.update_backlinks(&path_str, note.frontmatter.id.as_deref(), &targets)?;

            // Index tasks
            let tasks = Task::extract_from_content(&rel_path, &note.content);
            index.index_tasks(&path_str, &tasks)?;

            // Store embedding
            if let Some(emb) = embedding {
                if let Err(e) = index.store_embedding(&path_str, &hash, &emb) {
                    tracing::warn!("Failed to store embedding: {}", e);
                }
            }
        }

        // Update cache
        self.notes_cache.write().await.insert(rel_path, note);
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

    /// Semantic search
    pub async fn semantic_search(
        &self,
        query: &str,
        limit: usize,
    ) -> anyhow::Result<Vec<SearchResult>> {
        if let Some(engine) = &self.embeddings {
            let engine_ref: &EmbeddingEngine = engine;
            let embedding_result: anyhow::Result<Vec<f32>> = engine_ref.embed_text(query).await;
            let query_embedding = embedding_result?;

            let index = self.index.lock().unwrap();
            let hits = index.semantic_search(&query_embedding, limit)?;

            Ok(hits
                .into_iter()
                .map(|hit| SearchResult {
                    path: PathBuf::from(&hit.path),
                    title: hit.title.unwrap_or_else(|| hit.path.clone()),
                    snippet: hit.snippet,
                    score: hit.score as f32,
                })
                .collect())
        } else {
            // Fallback to FTS if no embedding engine is configured
            tracing::info!("No embedding engine configured, falling back to FTS");
            self.search(query, limit).await
        }
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
tags: [daily]
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
tags: [inbox]
---

# Inbox

"#
            .to_string()
        };

        let timestamp = Local::now().format("%Y-%m-%d %H:%M");
        let new_content = format!(
            "{}\n- [ ] {} ({})\n",
            existing.trim_end(),
            content,
            timestamp
        );

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

    /// Resolve a wikilink to a note
    pub async fn resolve_link(&self, link: &str) -> anyhow::Result<Option<Note>> {
        let path = {
            let index = self.index.lock().unwrap();
            index.resolve_link(link)?
        };

        if let Some(path) = path {
            self.get_note(Path::new(&path)).await
        } else {
            Ok(None)
        }
    }

    /// Get all cached notes (for TUI)
    pub async fn get_all_notes(&self) -> Vec<crate::notes::Note> {
        let cache = self.notes_cache.read().await;
        let mut notes: Vec<_> = cache.values().cloned().collect();
        notes.sort_by(|a, b| b.modified.cmp(&a.modified));
        notes
    }

    /// Get notes in a specific folder
    pub async fn get_notes_in_folder(&self, folder: &str) -> Vec<crate::notes::Note> {
        let cache = self.notes_cache.read().await;
        let mut notes: Vec<_> = cache
            .values()
            .filter(|n| {
                n.path
                    .parent()
                    .map_or(false, |p| p.to_string_lossy() == folder)
            })
            .cloned()
            .collect();
        notes.sort_by(|a, b| b.modified.cmp(&a.modified));
        notes
    }

    /// Update a note's content (replacing it entirely)
    pub async fn update_note(&self, path: &Path, content: &str) -> anyhow::Result<Note> {
        let full_path = self.root.join(path);
        // Ensure parent exists (in case it was deleted externally)
        if !full_path.parent().map(|p| p.exists()).unwrap_or(false) {
            // Or should we fail?
            // Let's assume write will fail if parent doesn't exist, unless we create it.
            // But update implies existence usually.
        }

        // We check existence via index/cache or fs?
        // Let's rely on FS for source of truth for updates
        if !full_path.exists() {
            return Err(anyhow::anyhow!("Note not found: {}", path.display()));
        }

        let existing_note = Note::read(&self.root, path)?;

        let mut final_note = if content.starts_with("---") {
            // New content has FM, use it.
            let (mut fm, body) = crate::notes::parse_frontmatter(content)?;

            // Preserve ID and Created date from existing if missing in new
            if fm.id.is_none() {
                fm.id = existing_note.frontmatter.id;
            }
            if fm.created.is_none() {
                fm.created = existing_note.frontmatter.created;
            }

            Note {
                path: path.to_path_buf(),
                frontmatter: fm,
                content: body.to_string(),
                modified: chrono::Utc::now(),
            }
        } else {
            // New content has no FM, keep existing FM and replace body
            Note {
                path: path.to_path_buf(),
                frontmatter: existing_note.frontmatter,
                content: content.to_string(),
                modified: chrono::Utc::now(),
            }
        };

        // Update modified time
        final_note.frontmatter.updated = Some(chrono::Utc::now());

        final_note.write(&self.root)?;

        // Update cache and index
        self.notes_cache
            .write()
            .await
            .insert(path.to_path_buf(), final_note.clone());
        self.index_note_internal(path.to_path_buf(), final_note.clone())
            .await?;

        Ok(final_note)
    }

    /// Patch metadata associated with a note
    pub async fn patch_metadata<F>(&self, path: &Path, f: F) -> anyhow::Result<Note>
    where
        F: FnOnce(&mut crate::notes::Frontmatter),
    {
        if let Some(mut note) = self.get_note(path).await? {
            f(&mut note.frontmatter);
            note.frontmatter.updated = Some(chrono::Utc::now());
            note.modified = chrono::Utc::now();

            note.write(&self.root)?;

            self.notes_cache
                .write()
                .await
                .insert(path.to_path_buf(), note.clone());
            self.index_note_internal(path.to_path_buf(), note.clone())
                .await?;
            Ok(note)
        } else {
            Err(anyhow::anyhow!("Note not found"))
        }
    }

    /// Rename/Move a note
    pub async fn rename_note(&self, from: &Path, to: &str) -> anyhow::Result<PathBuf> {
        let old_full_path = self.root.join(from);
        if !old_full_path.exists() {
            return Err(anyhow::anyhow!("Source note not found"));
        }

        // Determine new path
        // Use 'to' as relative path if it contains separators, else as filename in same dir
        let new_path_buf = if to.contains(std::path::MAIN_SEPARATOR) || to.contains('/') {
            PathBuf::from(to)
        } else {
            from.parent().unwrap_or(Path::new("")).join(to)
        };

        // Add extension if missing
        let new_path_buf = if new_path_buf.extension().is_none() {
            new_path_buf.with_extension("md")
        } else {
            new_path_buf
        };

        let new_full_path = self.root.join(&new_path_buf);

        if new_full_path.exists() {
            return Err(anyhow::anyhow!("Destination already exists"));
        }

        // Ensure parent dir
        if let Some(p) = new_full_path.parent() {
            std::fs::create_dir_all(p)?;
        }

        // Perform move
        std::fs::rename(&old_full_path, &new_full_path)?;

        // Use handle methods to update index/cache
        self.handle_remove(from.to_path_buf()).await?;
        self.handle_create_modify(new_path_buf.clone()).await?;

        Ok(new_path_buf)
    }

    /// Delete a note
    pub async fn delete_note(&self, path: &Path) -> anyhow::Result<()> {
        let full_path = self.root.join(path);
        if full_path.exists() {
            std::fs::remove_file(full_path)?;
            self.handle_remove(path.to_path_buf()).await?;
        }
        Ok(())
    }

    /// List files in a directory
    pub async fn list_files(&self, path: Option<&str>) -> anyhow::Result<Vec<String>> {
        let rel_path = path.map(PathBuf::from).unwrap_or(PathBuf::from(""));
        let target_dir = self.root.join(&rel_path);

        if !target_dir.exists() {
            return Err(anyhow::anyhow!("Directory not found"));
        }

        let mut entries = Vec::new();
        let mut read_dir = tokio::fs::read_dir(target_dir).await?;

        while let Some(entry) = read_dir.next_entry().await? {
            let name = entry.file_name().to_string_lossy().to_string();
            // Skip dotfiles
            if name.starts_with('.') {
                continue;
            }

            let file_type = entry.file_type().await?;
            if file_type.is_dir() {
                entries.push(format!("{}/", name));
            } else {
                entries.push(name);
            }
        }

        entries.sort();
        Ok(entries)
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
