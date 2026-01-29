//! TUI Application state

use crate::notes::Note;
use crate::tasks::Task;
use crate::Vault;
use anyhow::Result;
use crossterm::event::KeyCode;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Current view mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum View {
    Notes,
    Inbox,
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
    Editing,     // Input bar for search/capture/new note
    NoteEditing, // Editing note content
}

/// What the editing input is for
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditingContext {
    Search,
    NewNote,
    Capture,
    NewFolder,
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

    /// Folders in current view
    pub folders: Vec<PathBuf>,

    /// Current folder filter (None = all notes)
    pub current_folder: Option<PathBuf>,

    /// Currently viewed/edited note
    pub current_note: Option<Note>,

    /// Editor buffer (for editing mode)
    pub editor_buffer: String,

    /// Cursor position in editor (line, column)
    pub editor_cursor: (usize, usize),

    /// Scroll position in content view
    pub content_scroll: usize,

    /// Status message
    pub status: String,

    /// Should quit
    pub should_quit: bool,

    /// Unsaved changes flag
    pub unsaved_changes: bool,
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
            folders: Vec::new(),
            current_folder: None,
            current_note: None,
            editor_buffer: String::new(),
            editor_cursor: (0, 0),
            content_scroll: 0,
            status: "1-4:views  j/k:nav  Enter:open  e:edit  c:capture  n:new  q:quit".to_string(),
            should_quit: false,
            unsaved_changes: false,
        }
    }

    /// Handle key events
    pub async fn handle_key(&mut self, key: KeyCode) -> Result<()> {
        match self.input_mode {
            InputMode::Normal => self.handle_normal_key(key).await,
            InputMode::Editing => self.handle_input_key(key).await,
            InputMode::NoteEditing => self.handle_editor_key(key).await,
        }
    }

    async fn handle_normal_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            // Quit
            KeyCode::Char('q') => {
                if self.focus == Focus::Content {
                    self.close_content();
                } else {
                    self.should_quit = true;
                }
            }
            KeyCode::Esc => {
                if self.focus == Focus::Content {
                    self.close_content();
                }
            }

            // Switch focus
            KeyCode::Tab => {
                if self.current_note.is_some() {
                    self.focus = match self.focus {
                        Focus::List => Focus::Content,
                        Focus::Content => Focus::List,
                    };
                    self.update_status();
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
            KeyCode::Char('d') if self.focus == Focus::Content => {
                self.content_scroll = self.content_scroll.saturating_add(10);
            }
            KeyCode::Char('u') if self.focus == Focus::Content => {
                self.content_scroll = self.content_scroll.saturating_sub(10);
            }

            // View switching
            KeyCode::Char('1') if self.focus == Focus::List => {
                self.view = View::Notes;
                self.current_folder = None;
                self.close_content();
                self.refresh().await?;
            }
            KeyCode::Char('2') if self.focus == Focus::List => {
                self.view = View::Inbox;
                self.current_folder = Some(PathBuf::from("inbox"));
                self.close_content();
                self.refresh().await?;
            }
            KeyCode::Char('3') if self.focus == Focus::List => {
                self.view = View::Tasks;
                self.close_content();
                self.refresh().await?;
            }
            KeyCode::Char('4') if self.focus == Focus::List => {
                self.view = View::Daily;
                self.close_content();
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

            // Edit note
            KeyCode::Char('e') if self.current_note.is_some() => {
                self.start_editing();
            }

            // Actions
            KeyCode::Char('x') if self.focus == Focus::List && self.view == View::Tasks => {
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
                self.status = "Capture to inbox: ".to_string();
            }
            KeyCode::Char('f') if self.focus == Focus::List => {
                self.input_mode = InputMode::Editing;
                self.editing_context = EditingContext::NewFolder;
                self.input.clear();
                self.status = "New folder name: ".to_string();
            }
            KeyCode::Char('r') if self.focus == Focus::List => {
                self.refresh().await?;
                self.status = "Refreshed".to_string();
            }

            _ => {}
        }
        Ok(())
    }

    async fn handle_input_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Esc => {
                self.input_mode = InputMode::Normal;
                self.input.clear();
                self.update_status();
            }
            KeyCode::Enter => {
                let input = self.input.clone();
                self.input_mode = InputMode::Normal;
                self.input.clear();

                match self.editing_context {
                    EditingContext::Search => self.do_search(&input).await?,
                    EditingContext::NewNote => self.do_create_note(&input).await?,
                    EditingContext::Capture => self.do_capture(&input).await?,
                    EditingContext::NewFolder => self.do_create_folder(&input).await?,
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

    async fn handle_editor_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Esc => {
                // Save and exit editing
                self.save_current_note().await?;
                self.input_mode = InputMode::Normal;
                self.update_status();
            }
            KeyCode::Enter => {
                // Insert newline at cursor
                let lines: Vec<&str> = self.editor_buffer.lines().collect();
                let (row, col) = self.editor_cursor;

                if row < lines.len() {
                    let line = lines[row];
                    let (before, after) = line.split_at(col.min(line.len()));
                    let mut new_content = String::new();

                    for (i, l) in lines.iter().enumerate() {
                        if i == row {
                            new_content.push_str(before);
                            new_content.push('\n');
                            new_content.push_str(after);
                        } else {
                            new_content.push_str(l);
                        }
                        if i < lines.len() - 1 {
                            new_content.push('\n');
                        }
                    }
                    self.editor_buffer = new_content;
                    self.editor_cursor = (row + 1, 0);
                } else {
                    self.editor_buffer.push('\n');
                    self.editor_cursor = (row + 1, 0);
                }
                self.unsaved_changes = true;
            }
            KeyCode::Backspace => {
                let (row, col) = self.editor_cursor;
                if col > 0 {
                    // Delete char before cursor
                    let lines: Vec<&str> = self.editor_buffer.lines().collect();
                    if row < lines.len() {
                        let line = lines[row];
                        let mut new_line = line[..col - 1].to_string();
                        new_line.push_str(&line[col..]);

                        let mut new_content = String::new();
                        for (i, l) in lines.iter().enumerate() {
                            if i == row {
                                new_content.push_str(&new_line);
                            } else {
                                new_content.push_str(l);
                            }
                            if i < lines.len() - 1 {
                                new_content.push('\n');
                            }
                        }
                        self.editor_buffer = new_content;
                        self.editor_cursor = (row, col - 1);
                    }
                } else if row > 0 {
                    // Merge with previous line
                    let lines: Vec<&str> = self.editor_buffer.lines().collect();
                    let prev_len = lines[row - 1].len();
                    let mut new_content = String::new();
                    for (i, l) in lines.iter().enumerate() {
                        if i == row {
                            continue; // Skip this line, merge into prev
                        }
                        if i == row - 1 {
                            new_content.push_str(l);
                            new_content.push_str(lines[row]);
                        } else {
                            new_content.push_str(l);
                        }
                        if i < lines.len() - 1 && i != row - 1 {
                            new_content.push('\n');
                        } else if i == row - 1 && row < lines.len() - 1 {
                            new_content.push('\n');
                        }
                    }
                    self.editor_buffer = new_content;
                    self.editor_cursor = (row - 1, prev_len);
                }
                self.unsaved_changes = true;
            }
            KeyCode::Left => {
                if self.editor_cursor.1 > 0 {
                    self.editor_cursor.1 -= 1;
                }
            }
            KeyCode::Right => {
                let lines: Vec<&str> = self.editor_buffer.lines().collect();
                if self.editor_cursor.0 < lines.len() {
                    let line_len = lines[self.editor_cursor.0].len();
                    if self.editor_cursor.1 < line_len {
                        self.editor_cursor.1 += 1;
                    }
                }
            }
            KeyCode::Up => {
                if self.editor_cursor.0 > 0 {
                    self.editor_cursor.0 -= 1;
                }
            }
            KeyCode::Down => {
                let line_count = self.editor_buffer.lines().count();
                if self.editor_cursor.0 < line_count.saturating_sub(1) {
                    self.editor_cursor.0 += 1;
                }
            }
            KeyCode::Char(c) => {
                // Insert char at cursor
                let lines: Vec<&str> = self.editor_buffer.lines().collect();
                let (row, col) = self.editor_cursor;

                if lines.is_empty() {
                    self.editor_buffer = c.to_string();
                    self.editor_cursor = (0, 1);
                } else if row < lines.len() {
                    let line = lines[row];
                    let col = col.min(line.len());
                    let mut new_line = line[..col].to_string();
                    new_line.push(c);
                    new_line.push_str(&line[col..]);

                    let mut new_content = String::new();
                    for (i, l) in lines.iter().enumerate() {
                        if i == row {
                            new_content.push_str(&new_line);
                        } else {
                            new_content.push_str(l);
                        }
                        if i < lines.len() - 1 {
                            new_content.push('\n');
                        }
                    }
                    self.editor_buffer = new_content;
                    self.editor_cursor = (row, col + 1);
                }
                self.unsaved_changes = true;
            }
            _ => {}
        }
        Ok(())
    }

    fn close_content(&mut self) {
        self.focus = Focus::List;
        self.current_note = None;
        self.editor_buffer.clear();
        self.content_scroll = 0;
        self.unsaved_changes = false;
        self.update_status();
    }

    fn update_status(&mut self) {
        self.status = match (&self.focus, &self.input_mode) {
            (Focus::List, InputMode::Normal) => {
                "1-4:views  j/k:nav  Enter:open  e:edit  c:capture  n:new  f:folder  q:quit".to_string()
            }
            (Focus::Content, InputMode::Normal) => {
                "Tab:list  j/k:scroll  e:edit  q:close".to_string()
            }
            (_, InputMode::NoteEditing) => {
                let marker = if self.unsaved_changes { "●" } else { "" };
                format!("EDITING {}  Arrows:move  Type to insert  Esc:save & close", marker)
            }
            _ => String::new(),
        }
    }

    fn start_editing(&mut self) {
        if let Some(note) = &self.current_note {
            self.editor_buffer = note.content.clone();
            self.editor_cursor = (0, 0);
            self.input_mode = InputMode::NoteEditing;
            self.unsaved_changes = false;
            self.update_status();
        }
    }

    async fn save_current_note(&mut self) -> Result<()> {
        if !self.unsaved_changes {
            return Ok(());
        }

        if let Some(note) = &mut self.current_note {
            let vault = self.vault.read().await;
            let full_path = vault.root.join(&note.path);

            // Read existing file to preserve frontmatter
            let existing = std::fs::read_to_string(&full_path)?;

            // Find where frontmatter ends
            let new_content = if existing.starts_with("---") {
                if let Some(end) = existing[3..].find("---") {
                    let frontmatter = &existing[..end + 6]; // Include closing ---\n
                    format!("{}\n{}", frontmatter.trim_end(), self.editor_buffer)
                } else {
                    self.editor_buffer.clone()
                }
            } else {
                self.editor_buffer.clone()
            };

            std::fs::write(&full_path, &new_content)?;
            note.content = self.editor_buffer.clone();
            self.unsaved_changes = false;
            self.status = format!("Saved: {}", note.path.display());
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
            View::Notes | View::Inbox | View::Daily | View::Search => self.notes.len(),
            View::Tasks => self.tasks.len(),
        }
    }

    /// Refresh current view data
    pub async fn refresh(&mut self) -> Result<()> {
        match self.view {
            View::Notes => {
                let vault = self.vault.read().await;
                self.notes = vault.get_all_notes().await;
                drop(vault);

                // Get unique folders
                self.folders = self.notes
                    .iter()
                    .filter_map(|n| n.path.parent().map(|p| p.to_path_buf()))
                    .collect::<std::collections::HashSet<_>>()
                    .into_iter()
                    .collect();
                self.folders.sort();
            }
            View::Inbox => {
                let vault = self.vault.read().await;
                self.notes = vault.get_notes_in_folder("inbox").await;
            }
            View::Tasks => {
                let vault = self.vault.read().await;
                self.tasks = vault.list_tasks("today").await?;
            }
            View::Daily => {
                let vault = self.vault.read().await;
                let note = vault.get_or_create_daily(None).await?;
                self.notes = vec![note];
            }
            View::Search => {
                // Keep current search results
            }
        }

        self.selected = self.selected.min(self.list_len().saturating_sub(1));
        self.update_status();
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

        // Use current folder or inbox
        let folder = self.current_folder.as_ref()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "inbox".to_string());

        let note = {
            let vault = self.vault.write().await;
            vault.create_note(title, "", Some(&folder), &[]).await?
        };

        self.status = format!("Created: {}", note.path.display());
        self.current_note = Some(note);
        self.focus = Focus::Content;
        self.content_scroll = 0;
        self.start_editing();
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

    async fn do_create_folder(&mut self, name: &str) -> Result<()> {
        if name.is_empty() {
            self.status = "Folder name cannot be empty".to_string();
            return Ok(());
        }

        let folder_path = {
            let vault = self.vault.read().await;
            vault.root.join(name)
        };
        std::fs::create_dir_all(&folder_path)?;

        self.status = format!("Created folder: {}", name);
        self.refresh().await?;
        Ok(())
    }

    async fn open_selected(&mut self) -> Result<()> {
        match self.view {
            View::Notes | View::Inbox | View::Daily | View::Search => {
                if let Some(note) = self.notes.get(self.selected).cloned() {
                    self.current_note = Some(note);
                    self.focus = Focus::Content;
                    self.content_scroll = 0;
                    self.update_status();
                }
            }
            View::Tasks => {
                if let Some(task) = self.tasks.get(self.selected).cloned() {
                    let vault = self.vault.read().await;
                    let note = vault.get_note(&task.source).await;
                    drop(vault);

                    if let Ok(Some(note)) = note {
                        self.current_note = Some(note);
                        self.focus = Focus::Content;
                        self.content_scroll = 0;
                        self.update_status();
                    }
                }
            }
        }
        Ok(())
    }

    async fn toggle_task(&mut self) -> Result<()> {
        if let Some(task) = self.tasks.get(self.selected) {
            let vault = self.vault.read().await;
            let full_path = vault.root.join(&task.source);

            if let Ok(content) = std::fs::read_to_string(&full_path) {
                let new_content = Task::toggle_in_content(&content, task.line);
                std::fs::write(&full_path, new_content)?;
                let icon = if task.done { "☐" } else { "☑" };
                self.status = format!("{} {}", icon, task.text);
            }
        }

        drop(self.vault.read().await);
        self.refresh().await?;
        Ok(())
    }
}
