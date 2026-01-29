//! TUI Application state

use crate::notes::Note;
use crate::tasks::Task;
use crate::Vault;
use anyhow::Result;
use crossterm::event::KeyCode;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Current view mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum View {
    Notes,
    Tasks,
    Daily,
    Search,
}

/// Input mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputMode {
    Normal,
    Editing,
}

/// What the editing input is for
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditingContext {
    Search,
    NewNote,
    Capture,
}

/// Application state
pub struct App {
    /// The vault
    pub vault: Arc<RwLock<Vault>>,

    /// Current view
    pub view: View,

    /// Input mode
    pub input_mode: InputMode,

    /// What editing is for
    pub editing_context: EditingContext,

    /// Search/input buffer
    pub input: String,

    /// Currently selected index in list
    pub selected: usize,

    /// Notes list (cached)
    pub notes: Vec<Note>,

    /// Tasks list (cached)
    pub tasks: Vec<Task>,

    /// Status message
    pub status: String,

    /// Should quit
    pub should_quit: bool,

    /// Pending action: path to open in editor after TUI restores
    pub pending_editor_path: Option<std::path::PathBuf>,
}

impl App {
    pub fn new(vault: Vault) -> Self {
        Self {
            vault: Arc::new(RwLock::new(vault)),
            view: View::Notes,
            input_mode: InputMode::Normal,
            editing_context: EditingContext::Search,
            input: String::new(),
            selected: 0,
            notes: Vec::new(),
            tasks: Vec::new(),
            status: "Press ? for help | r:refresh".to_string(),
            should_quit: false,
            pending_editor_path: None,
        }
    }

    /// Handle key events
    pub async fn handle_key(&mut self, key: KeyCode) -> Result<()> {
        match self.input_mode {
            InputMode::Normal => self.handle_normal_key(key).await,
            InputMode::Editing => self.handle_editing_key(key).await,
        }
    }

    async fn handle_normal_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            // Quit
            KeyCode::Char('q') => self.should_quit = true,

            // Navigation
            KeyCode::Char('j') | KeyCode::Down => self.next(),
            KeyCode::Char('k') | KeyCode::Up => self.previous(),
            KeyCode::Char('g') => self.selected = 0,
            KeyCode::Char('G') => self.go_to_end(),

            // View switching
            KeyCode::Char('1') => {
                self.view = View::Notes;
                self.refresh().await?;
            }
            KeyCode::Char('2') => {
                self.view = View::Tasks;
                self.refresh().await?;
            }
            KeyCode::Char('3') => {
                self.view = View::Daily;
                self.refresh().await?;
            }

            // Search
            KeyCode::Char('/') => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::Search;
                self.input.clear();
                self.status = "Search: ".to_string();
            }

            // Actions
            KeyCode::Enter => self.open_selected().await?,
            KeyCode::Char('x') => self.toggle_task().await?,
            KeyCode::Char('n') => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::NewNote;
                self.input.clear();
                self.status = "New note title: ".to_string();
            }
            KeyCode::Char('c') => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::Capture;
                self.input.clear();
                self.status = "Capture: ".to_string();
            }
            KeyCode::Char('r') => {
                self.refresh().await?;
                self.status = "Refreshed".to_string();
            }

            _ => {}
        }
        Ok(())
    }

    async fn handle_editing_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Esc => {
                self.input_mode = InputMode::Normal;
                self.input.clear();
                self.status = "Cancelled".to_string();
            }
            KeyCode::Enter => {
                let input = self.input.clone();
                self.input_mode = InputMode::Normal;
                self.input.clear();

                match self.editing_context {
                    EditingContext::Search => {
                        self.do_search(&input).await?;
                    }
                    EditingContext::NewNote => {
                        self.do_create_note(&input).await?;
                    }
                    EditingContext::Capture => {
                        self.do_capture(&input).await?;
                    }
                }
            }
            KeyCode::Backspace => {
                self.input.pop();
            }
            KeyCode::Char(c) => {
                self.input.push(c);
            }
            _ => {}
        }
        Ok(())
    }

    fn next(&mut self) {
        let len = self.list_len();
        if len > 0 {
            self.selected = (self.selected + 1) % len;
        }
    }

    fn previous(&mut self) {
        let len = self.list_len();
        if len > 0 {
            self.selected = self.selected.saturating_sub(1);
        }
    }

    fn go_to_end(&mut self) {
        let len = self.list_len();
        if len > 0 {
            self.selected = len - 1;
        }
    }

    fn list_len(&self) -> usize {
        match self.view {
            View::Notes | View::Daily | View::Search => self.notes.len(),
            View::Tasks => self.tasks.len(),
        }
    }

    /// Refresh current view data
    pub async fn refresh(&mut self) -> Result<()> {
        let vault = self.vault.read().await;

        match self.view {
            View::Notes => {
                self.notes = vault.get_all_notes().await;
            }
            View::Tasks => {
                self.tasks = vault.list_tasks("today").await?;
            }
            View::Daily => {
                let note = vault.get_or_create_daily(None).await?;
                self.notes = vec![note];
            }
            View::Search => {
                // Keep current search results
            }
        }

        self.selected = self.selected.min(self.list_len().saturating_sub(1));
        Ok(())
    }

    async fn do_search(&mut self, query: &str) -> Result<()> {
        if query.is_empty() {
            self.status = "Empty search".to_string();
            return Ok(());
        }

        let vault = self.vault.read().await;
        let results = vault.search(query, 50).await?;

        self.notes = Vec::new();
        for result in results {
            if let Ok(Some(note)) = vault.get_note(&result.path).await {
                self.notes.push(note);
            }
        }

        self.view = View::Search;
        self.selected = 0;
        self.status = format!("Found {} notes for '{}'", self.notes.len(), query);
        Ok(())
    }

    async fn do_create_note(&mut self, title: &str) -> Result<()> {
        if title.is_empty() {
            self.status = "Note title cannot be empty".to_string();
            return Ok(());
        }

        let vault = self.vault.write().await;
        let note = vault.create_note(title, "", None, &[]).await?;
        let full_path = vault.root.join(&note.path);

        self.status = format!("Created: {} - press Enter to edit", note.path.display());
        self.pending_editor_path = Some(full_path);

        // Refresh to show new note
        drop(vault);
        self.view = View::Notes;
        self.refresh().await?;

        Ok(())
    }

    async fn do_capture(&mut self, content: &str) -> Result<()> {
        if content.is_empty() {
            self.status = "Nothing to capture".to_string();
            return Ok(());
        }

        let vault = self.vault.write().await;
        vault.quick_capture(content).await?;

        self.status = format!("Captured: {}", content);
        Ok(())
    }

    async fn open_selected(&mut self) -> Result<()> {
        match self.view {
            View::Notes | View::Daily | View::Search => {
                if let Some(note) = self.notes.get(self.selected) {
                    let vault = self.vault.read().await;
                    let full_path = vault.root.join(&note.path);
                    self.pending_editor_path = Some(full_path.clone());
                    self.status = format!("Opening: {}", note.title());
                }
            }
            View::Tasks => {
                // Open task's source file
                if let Some(task) = self.tasks.get(self.selected) {
                    let vault = self.vault.read().await;
                    let full_path = vault.root.join(&task.source);
                    self.pending_editor_path = Some(full_path.clone());
                    self.status = format!("Opening task source: {}", task.source.display());
                }
            }
        }
        Ok(())
    }

    async fn toggle_task(&mut self) -> Result<()> {
        if self.view != View::Tasks {
            self.status = "Press 2 to switch to Tasks view first".to_string();
            return Ok(());
        }

        if let Some(task) = self.tasks.get(self.selected) {
            let vault = self.vault.read().await;
            let full_path = vault.root.join(&task.source);

            if let Ok(content) = std::fs::read_to_string(&full_path) {
                let new_content = Task::toggle_in_content(&content, task.line);
                std::fs::write(&full_path, new_content)?;
                let status_icon = if task.done { "☐" } else { "☑" };
                self.status = format!("{} {}", status_icon, task.text);
            }
        }

        // Refresh tasks
        drop(self.vault.read().await);
        self.refresh().await?;
        Ok(())
    }

    /// Check if there's a pending editor action
    pub fn has_pending_editor(&self) -> bool {
        self.pending_editor_path.is_some()
    }

    /// Take the pending editor path (for launching editor)
    pub fn take_pending_editor(&mut self) -> Option<std::path::PathBuf> {
        self.pending_editor_path.take()
    }
}
