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

/// What panel has focus
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Focus {
    List,
    Content,
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

    /// Which panel has focus
    pub focus: Focus,

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

    /// Currently viewed note content
    pub current_note: Option<Note>,

    /// Scroll position in content view
    pub content_scroll: usize,

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
            focus: Focus::List,
            input_mode: InputMode::Normal,
            editing_context: EditingContext::Search,
            input: String::new(),
            selected: 0,
            notes: Vec::new(),
            tasks: Vec::new(),
            current_note: None,
            content_scroll: 0,
            status: "j/k:nav  Enter:view  Tab:switch  c:capture  n:new  q:quit".to_string(),
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
            KeyCode::Char('q') => {
                if self.focus == Focus::Content {
                    // Close content view, go back to list
                    self.focus = Focus::List;
                    self.current_note = None;
                } else {
                    self.should_quit = true;
                }
            }
            KeyCode::Esc => {
                if self.focus == Focus::Content {
                    self.focus = Focus::List;
                    self.current_note = None;
                }
            }

            // Switch focus between list and content
            KeyCode::Tab => {
                if self.current_note.is_some() {
                    self.focus = match self.focus {
                        Focus::List => Focus::Content,
                        Focus::Content => Focus::List,
                    };
                }
            }

            // Navigation
            KeyCode::Char('j') | KeyCode::Down => {
                if self.focus == Focus::Content {
                    self.content_scroll = self.content_scroll.saturating_add(1);
                } else {
                    self.next();
                }
            }
            KeyCode::Char('k') | KeyCode::Up => {
                if self.focus == Focus::Content {
                    self.content_scroll = self.content_scroll.saturating_sub(1);
                } else {
                    self.previous();
                }
            }
            KeyCode::Char('g') => {
                if self.focus == Focus::Content {
                    self.content_scroll = 0;
                } else {
                    self.selected = 0;
                }
            }
            KeyCode::Char('G') => {
                if self.focus == Focus::List {
                    self.go_to_end();
                }
            }

            // Page up/down for content
            KeyCode::Char('d') if self.focus == Focus::Content => {
                self.content_scroll = self.content_scroll.saturating_add(10);
            }
            KeyCode::Char('u') if self.focus == Focus::Content => {
                self.content_scroll = self.content_scroll.saturating_sub(10);
            }

            // View switching (only in list focus)
            KeyCode::Char('1') if self.focus == Focus::List => {
                self.view = View::Notes;
                self.current_note = None;
                self.refresh().await?;
            }
            KeyCode::Char('2') if self.focus == Focus::List => {
                self.view = View::Tasks;
                self.current_note = None;
                self.refresh().await?;
            }
            KeyCode::Char('3') if self.focus == Focus::List => {
                self.view = View::Daily;
                self.current_note = None;
                self.refresh().await?;
            }

            // Search
            KeyCode::Char('/') if self.focus == Focus::List => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::Search;
                self.input.clear();
                self.status = "Search: ".to_string();
            }

            // Open/view selected
            KeyCode::Enter => {
                self.open_selected().await?;
            }

            // Actions (only in list focus)
            KeyCode::Char('x') if self.focus == Focus::List => {
                self.toggle_task().await?;
            }
            KeyCode::Char('n') if self.focus == Focus::List => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::NewNote;
                self.input.clear();
                self.status = "New note title: ".to_string();
            }
            KeyCode::Char('c') if self.focus == Focus::List => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::Capture;
                self.input.clear();
                self.status = "Capture: ".to_string();
            }
            KeyCode::Char('r') if self.focus == Focus::List => {
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
                self.status = "j/k:nav  Enter:view  Tab:switch  c:capture  n:new  q:quit".to_string();
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

        self.status = format!("Created: {}", note.path.display());
        self.current_note = Some(note);
        self.focus = Focus::Content;
        self.content_scroll = 0;

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

        self.status = format!("✓ Captured: {}", content);
        Ok(())
    }

    async fn open_selected(&mut self) -> Result<()> {
        match self.view {
            View::Notes | View::Daily | View::Search => {
                if let Some(note) = self.notes.get(self.selected).cloned() {
                    self.current_note = Some(note.clone());
                    self.focus = Focus::Content;
                    self.content_scroll = 0;
                    self.status = format!("Viewing: {} | Tab:list  j/k:scroll  q:close", note.title());
                }
            }
            View::Tasks => {
                // Open task's source note
                if let Some(task) = self.tasks.get(self.selected) {
                    let vault = self.vault.read().await;
                    if let Ok(Some(note)) = vault.get_note(&task.source).await {
                        self.current_note = Some(note.clone());
                        self.focus = Focus::Content;
                        self.content_scroll = 0;
                        self.status = format!("Viewing: {} | Tab:list  j/k:scroll  q:close", note.title());
                    }
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
}
