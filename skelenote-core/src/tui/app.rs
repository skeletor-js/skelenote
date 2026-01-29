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

/// Application state
pub struct App {
    /// The vault
    pub vault: Arc<RwLock<Vault>>,

    /// Current view
    pub view: View,

    /// Input mode
    pub input_mode: InputMode,

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
}

impl App {
    pub fn new(vault: Vault) -> Self {
        Self {
            vault: Arc::new(RwLock::new(vault)),
            view: View::Notes,
            input_mode: InputMode::Normal,
            input: String::new(),
            selected: 0,
            notes: Vec::new(),
            tasks: Vec::new(),
            status: "Press ? for help".to_string(),
            should_quit: false,
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
                self.input.clear();
                self.status = "Search: ".to_string();
            }

            // Actions
            KeyCode::Enter => self.open_selected().await?,
            KeyCode::Char('x') => self.toggle_task().await?,
            KeyCode::Char('n') => self.create_note().await?,
            KeyCode::Char('c') => self.quick_capture().await?,
            KeyCode::Char('r') => self.refresh().await?,

            _ => {}
        }
        Ok(())
    }

    async fn handle_editing_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Esc => {
                self.input_mode = InputMode::Normal;
                self.input.clear();
                self.status = "Press ? for help".to_string();
            }
            KeyCode::Enter => {
                self.search().await?;
                self.input_mode = InputMode::Normal;
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
                // Get all notes
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

    async fn search(&mut self) -> Result<()> {
        if self.input.is_empty() {
            return Ok(());
        }

        let vault = self.vault.read().await;
        let results = vault.search(&self.input, 50).await?;

        self.notes = Vec::new();
        for result in results {
            if let Ok(Some(note)) = vault.get_note(&result.path).await {
                self.notes.push(note);
            }
        }

        self.view = View::Search;
        self.selected = 0;
        self.status = format!("Found {} notes for '{}'", self.notes.len(), self.input);
        Ok(())
    }

    async fn open_selected(&mut self) -> Result<()> {
        match self.view {
            View::Notes | View::Daily | View::Search => {
                if let Some(note) = self.notes.get(self.selected) {
                    let vault = self.vault.read().await;
                    let full_path = vault.root.join(&note.path);

                    // Open in $EDITOR
                    let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
                    
                    // We need to exit TUI temporarily
                    self.status = format!("Opening {} in {}", note.title(), editor);
                    
                    // TODO: Actually suspend TUI and open editor
                }
            }
            View::Tasks => {
                // Go to task source
                if let Some(task) = self.tasks.get(self.selected) {
                    self.status = format!("Task in: {}", task.source.display());
                }
            }
        }
        Ok(())
    }

    async fn toggle_task(&mut self) -> Result<()> {
        if self.view != View::Tasks {
            return Ok(());
        }

        if let Some(task) = self.tasks.get(self.selected) {
            let vault = self.vault.read().await;
            let full_path = vault.root.join(&task.source);

            if let Ok(content) = std::fs::read_to_string(&full_path) {
                let new_content = Task::toggle_in_content(&content, task.line);
                std::fs::write(&full_path, new_content)?;
                self.status = format!("Toggled: {}", task.text);
            }
        }

        // Refresh tasks
        self.refresh().await?;
        Ok(())
    }

    async fn create_note(&mut self) -> Result<()> {
        // Switch to editing mode to get title
        self.input_mode = InputMode::Editing;
        self.input.clear();
        self.status = "New note title: ".to_string();
        // TODO: Create note after title entered
        Ok(())
    }

    async fn quick_capture(&mut self) -> Result<()> {
        self.input_mode = InputMode::Editing;
        self.input.clear();
        self.status = "Capture: ".to_string();
        // TODO: Capture after text entered
        Ok(())
    }
}
