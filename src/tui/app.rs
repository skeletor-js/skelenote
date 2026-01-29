//! TUI Application state

use crate::crypto::{self, KeyManager};
use crate::notes::Note;
use crate::tasks::Task;
use crate::tui::event::{is_command_key, is_shift_key};
use crate::tui::theme::{Theme, ThemeVariant};
use crate::Vault;
use anyhow::Result;
use crossterm::event::{KeyCode, KeyEvent, MouseButton, MouseEvent, MouseEventKind};
use ratatui::layout::Rect;
use std::cell::RefCell;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Current view mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum View {
    /// First-run encryption setup
    Setup,
    /// Password prompt on subsequent launches
    Unlock,
    /// Main views
    Notes,
    Inbox,
    Tasks,
    Daily,
    Search,
}

/// Setup wizard phase
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SetupPhase {
    /// Welcome screen explaining encryption
    Welcome,
    /// Show generated 24-word mnemonic
    ShowMnemonic,
    /// Verify user wrote down mnemonic
    VerifyMnemonic,
    /// Enter mnemonic (for restore)
    EnterMnemonic,
    /// Set master password
    SetPassword,
    /// Confirm master password
    ConfirmPassword,
    /// Setup complete
    Complete,
}

/// Setup state for encryption initialization
#[derive(Debug)]
pub struct SetupState {
    /// Current phase of setup
    pub phase: SetupPhase,
    /// Whether user is restoring (true) or creating new (false)
    pub is_restore: bool,
    /// Generated or entered mnemonic
    pub mnemonic: String,
    /// Word indices to verify (1-indexed)
    pub verify_indices: [usize; 4],
    /// Current verification field (0-3)
    pub verify_field: usize,
    /// Verification answers
    pub verify_answers: [String; 4],
    /// Mnemonic input buffer (for restore)
    pub mnemonic_input: String,
    /// Password input buffer
    pub password: String,
    /// Password confirmation buffer
    pub password_confirm: String,
    /// Which password field is active (0=password, 1=confirm)
    pub password_field: usize,
    /// Error message to display
    pub error: Option<String>,
    /// Whether mnemonic was copied to clipboard
    pub copied_to_clipboard: bool,
}

impl Default for SetupState {
    fn default() -> Self {
        Self {
            phase: SetupPhase::Welcome,
            is_restore: false,
            mnemonic: String::new(),
            verify_indices: [0; 4],
            verify_field: 0,
            verify_answers: Default::default(),
            mnemonic_input: String::new(),
            password: String::new(),
            password_confirm: String::new(),
            password_field: 0,
            error: None,
            copied_to_clipboard: false,
        }
    }
}

/// Unlock state for password entry
#[derive(Debug, Default)]
pub struct UnlockState {
    /// Password input buffer
    pub password: String,
    /// Error message to display
    pub error: Option<String>,
    /// Whether to show forgot password option
    pub show_forgot: bool,
}

/// What panel has focus
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Focus {
    List,
    Content,
    Metadata,
}

/// Input mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputMode {
    Normal,
    Editing,          // Input bar for search/capture/new note
    NoteEditing,      // Editing note content
    PropertyEditing,  // Editing a property field
}

/// What the editing input is for
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditingContext {
    Search,
    NewNote,
    Capture,
    NewFolder,
    PropertyField,
    Rename,
    ConfirmDelete,
}

/// Property field being edited
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PropertyField {
    Title,
    Tags,
}

/// Popup overlay state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Popup {
    #[default]
    None,
    ThemeSelect,
}

/// UI layout tracking for mouse hit-testing
#[derive(Debug, Clone, Default)]
pub struct UiLayout {
    /// Tab bar area
    pub tab_area: Option<Rect>,
    /// Tab boundaries: (start_col, end_col, View)
    pub tab_bounds: Vec<(u16, u16, View)>,
    /// List pane area
    pub list_area: Option<Rect>,
    /// Content pane area
    pub content_area: Option<Rect>,
}

/// Text selection represented as anchor + cursor positions
/// Anchor is where selection started, cursor is current position
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Selection {
    /// Anchor position (line, column) - where selection started
    pub anchor: (usize, usize),
    /// Cursor position (line, column) - current end of selection
    pub cursor: (usize, usize),
}

impl Selection {
    /// Create a new selection at position
    pub fn new(pos: (usize, usize)) -> Self {
        Self {
            anchor: pos,
            cursor: pos,
        }
    }

    /// Check if selection is empty (anchor == cursor)
    pub fn is_empty(&self) -> bool {
        self.anchor == self.cursor
    }

    /// Get normalized start and end (start <= end)
    pub fn normalized(&self) -> ((usize, usize), (usize, usize)) {
        if self.anchor <= self.cursor {
            (self.anchor, self.cursor)
        } else {
            (self.cursor, self.anchor)
        }
    }

    /// Collapse selection to cursor position
    pub fn collapse(&mut self) {
        self.anchor = self.cursor;
    }

    /// Extend selection by moving cursor
    pub fn extend_to(&mut self, pos: (usize, usize)) {
        self.cursor = pos;
    }
}

/// A snapshot of editor state for undo/redo
#[derive(Debug, Clone)]
pub struct EditorSnapshot {
    /// The full text content
    pub content: String,
    /// Cursor position at time of snapshot
    pub cursor: (usize, usize),
    /// Selection state (if any)
    pub selection: Option<Selection>,
}

/// Undo/Redo history manager
#[derive(Debug, Default)]
pub struct UndoHistory {
    /// Stack of undo snapshots
    undo_stack: Vec<EditorSnapshot>,
    /// Stack of redo snapshots
    redo_stack: Vec<EditorSnapshot>,
    /// Maximum history size
    max_size: usize,
}

impl UndoHistory {
    pub fn new(max_size: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_size,
        }
    }

    /// Push current state before making a change
    pub fn push(&mut self, snapshot: EditorSnapshot) {
        self.undo_stack.push(snapshot);
        // Clear redo stack on new action
        self.redo_stack.clear();
        // Enforce max size
        if self.undo_stack.len() > self.max_size {
            self.undo_stack.remove(0);
        }
    }

    /// Undo: pop from undo stack, push current to redo
    pub fn undo(&mut self, current: EditorSnapshot) -> Option<EditorSnapshot> {
        if let Some(previous) = self.undo_stack.pop() {
            self.redo_stack.push(current);
            Some(previous)
        } else {
            None
        }
    }

    /// Redo: pop from redo stack, push current to undo
    pub fn redo(&mut self, current: EditorSnapshot) -> Option<EditorSnapshot> {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(current);
            Some(next)
        } else {
            None
        }
    }

    /// Clear all history
    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }
}

/// Clipboard manager wrapper
pub struct ClipboardManager {
    clipboard: Option<arboard::Clipboard>,
}

impl std::fmt::Debug for ClipboardManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ClipboardManager")
            .field("available", &self.clipboard.is_some())
            .finish()
    }
}

impl Default for ClipboardManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ClipboardManager {
    pub fn new() -> Self {
        Self {
            clipboard: arboard::Clipboard::new().ok(),
        }
    }

    pub fn copy(&mut self, text: &str) -> Result<(), String> {
        match &mut self.clipboard {
            Some(cb) => cb.set_text(text).map_err(|e| e.to_string()),
            None => Err("Clipboard unavailable".to_string()),
        }
    }

    pub fn paste(&mut self) -> Result<String, String> {
        match &mut self.clipboard {
            Some(cb) => cb.get_text().map_err(|e| e.to_string()),
            None => Err("Clipboard unavailable".to_string()),
        }
    }
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

    /// Text selection in editor (None = no selection)
    pub editor_selection: Option<Selection>,

    /// Undo/redo history for editor
    pub undo_history: UndoHistory,

    /// Clipboard manager for copy/cut/paste
    pub clipboard: ClipboardManager,

    /// Scroll position in content view
    pub content_scroll: usize,

    /// Status message
    pub status: String,

    /// Should quit
    pub should_quit: bool,

    /// Unsaved changes flag
    pub unsaved_changes: bool,

    /// Property editing - which field is selected
    pub property_field: PropertyField,

    /// Buffer for property field editing
    pub property_buffer: String,

    /// Show properties panel
    pub show_properties: bool,

    /// Current visual theme
    pub theme: Theme,

    /// Current popup overlay
    pub popup: Popup,

    /// Selected index in popup menu
    pub popup_selected: usize,

    /// UI layout for mouse hit-testing (updated each render)
    pub ui_layout: RefCell<UiLayout>,

    // === Encryption Setup State ===
    /// Setup wizard state (for first-run)
    pub setup_state: SetupState,

    /// Unlock state (for subsequent runs)
    pub unlock_state: UnlockState,

    /// KeyManager after successful unlock (None until authenticated)
    pub key_manager: Option<KeyManager>,

    /// Path to identity file
    pub identity_path: PathBuf,
}

impl App {
    /// Create app in normal mode (vault already unlocked)
    pub fn new(vault: Vault, key_manager: KeyManager, identity_path: PathBuf) -> Self {
        // Load theme from config
        let theme = if vault.config.theme.to_lowercase() == "custom" {
            if let Some(ref custom_config) = vault.config.custom_theme {
                Theme::from_custom_config(custom_config)
            } else {
                tracing::warn!("theme = 'custom' but no [custom_theme] section found");
                Theme::from_variant(ThemeVariant::Claude)
            }
        } else {
            ThemeVariant::from_str(&vault.config.theme)
                .map(Theme::from_variant)
                .unwrap_or_else(|| Theme::from_variant(ThemeVariant::Claude))
        };

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
            editor_selection: None,
            undo_history: UndoHistory::new(100),
            clipboard: ClipboardManager::new(),
            content_scroll: 0,
            status: "1-4:views  j/k:nav  Enter:open  e:edit  p:props  c:capture  n:new  q:quit"
                .to_string(),
            should_quit: false,
            unsaved_changes: false,
            property_field: PropertyField::Title,
            property_buffer: String::new(),
            show_properties: false,
            theme,
            popup: Popup::None,
            popup_selected: 0,
            ui_layout: RefCell::new(UiLayout::default()),
            setup_state: SetupState::default(),
            unlock_state: UnlockState::default(),
            key_manager: Some(key_manager),
            identity_path,
        }
    }

    /// Create app in setup mode (first run, no identity file)
    pub fn new_setup(vault: Vault, identity_path: PathBuf) -> Self {
        // Load theme from config
        let theme = if vault.config.theme.to_lowercase() == "custom" {
            if let Some(ref custom_config) = vault.config.custom_theme {
                Theme::from_custom_config(custom_config)
            } else {
                tracing::warn!("theme = 'custom' but no [custom_theme] section found");
                Theme::from_variant(ThemeVariant::Claude)
            }
        } else {
            ThemeVariant::from_str(&vault.config.theme)
                .map(Theme::from_variant)
                .unwrap_or_else(|| Theme::from_variant(ThemeVariant::Claude))
        };

        Self {
            vault: Arc::new(RwLock::new(vault)),
            view: View::Setup,
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
            editor_selection: None,
            undo_history: UndoHistory::new(100),
            clipboard: ClipboardManager::new(),
            content_scroll: 0,
            status: String::new(),
            should_quit: false,
            unsaved_changes: false,
            property_field: PropertyField::Title,
            property_buffer: String::new(),
            show_properties: false,
            theme,
            popup: Popup::None,
            popup_selected: 0,
            ui_layout: RefCell::new(UiLayout::default()),
            setup_state: SetupState::default(),
            unlock_state: UnlockState::default(),
            key_manager: None,
            identity_path,
        }
    }

    /// Create app in unlock mode (identity file exists, need password)
    pub fn new_unlock(vault: Vault, identity_path: PathBuf) -> Self {
        // Load theme from config
        let theme = if vault.config.theme.to_lowercase() == "custom" {
            if let Some(ref custom_config) = vault.config.custom_theme {
                Theme::from_custom_config(custom_config)
            } else {
                tracing::warn!("theme = 'custom' but no [custom_theme] section found");
                Theme::from_variant(ThemeVariant::Claude)
            }
        } else {
            ThemeVariant::from_str(&vault.config.theme)
                .map(Theme::from_variant)
                .unwrap_or_else(|| Theme::from_variant(ThemeVariant::Claude))
        };

        Self {
            vault: Arc::new(RwLock::new(vault)),
            view: View::Unlock,
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
            editor_selection: None,
            undo_history: UndoHistory::new(100),
            clipboard: ClipboardManager::new(),
            content_scroll: 0,
            status: String::new(),
            should_quit: false,
            unsaved_changes: false,
            property_field: PropertyField::Title,
            property_buffer: String::new(),
            show_properties: false,
            theme,
            popup: Popup::None,
            popup_selected: 0,
            ui_layout: RefCell::new(UiLayout::default()),
            setup_state: SetupState::default(),
            unlock_state: UnlockState::default(),
            key_manager: None,
            identity_path,
        }
    }

    /// Get the user's fingerprint (for display)
    pub fn fingerprint(&self) -> Option<String> {
        self.key_manager.as_ref().map(|km| km.fingerprint())
    }

    /// Handle key events
    pub async fn handle_key(&mut self, key: KeyEvent) -> Result<()> {
        // Handle setup and unlock views specially
        match self.view {
            View::Setup => return self.handle_setup_key(key.code).await,
            View::Unlock => return self.handle_unlock_key(key.code).await,
            _ => {}
        }

        // Handle popup first
        if self.popup != Popup::None {
            return self.handle_popup_key(key.code).await;
        }

        // Normal view handling
        match self.input_mode {
            InputMode::Normal => self.handle_normal_key(key.code).await,
            InputMode::Editing => self.handle_input_key(key.code).await,
            InputMode::NoteEditing => self.handle_editor_key(key).await,
            InputMode::PropertyEditing => self.handle_property_key(key.code).await,
        }
    }

    /// Handle mouse events
    pub async fn handle_mouse(&mut self, mouse: MouseEvent) -> Result<()> {
        // Skip mouse handling during setup/unlock or when popup is open
        if matches!(self.view, View::Setup | View::Unlock) || self.popup != Popup::None {
            return Ok(());
        }

        let col = mouse.column;
        let row = mouse.row;

        match mouse.kind {
            MouseEventKind::Down(MouseButton::Left) => {
                self.handle_left_click(col, row).await?;
            }
            MouseEventKind::ScrollUp => {
                self.handle_scroll_up(col, row);
            }
            MouseEventKind::ScrollDown => {
                self.handle_scroll_down(col, row);
            }
            _ => {} // Ignore other mouse events
        }

        Ok(())
    }

    async fn handle_left_click(&mut self, col: u16, row: u16) -> Result<()> {
        // Extract layout data without holding the borrow across await points
        let (tab_click, list_click, content_click) = {
            let layout = self.ui_layout.borrow();

            // Check tab area
            let tab_click = if let Some(tab_area) = layout.tab_area {
                if row == tab_area.y {
                    layout
                        .tab_bounds
                        .iter()
                        .find(|(start, end, _)| col >= *start && col < *end)
                        .map(|(_, _, view)| *view)
                } else {
                    None
                }
            } else {
                None
            };

            // Check list area
            let list_click = if let Some(list_area) = layout.list_area {
                if col >= list_area.x
                    && col < list_area.x + list_area.width
                    && row >= list_area.y
                    && row < list_area.y + list_area.height
                {
                    let content_start_row = list_area.y + 2; // +1 border, +1 title
                    if row >= content_start_row {
                        Some(Some((row - content_start_row) as usize))
                    } else {
                        Some(None) // Clicked in list but not on an item
                    }
                } else {
                    None
                }
            } else {
                None
            };

            // Check content area
            let content_click = if let Some(content_area) = layout.content_area {
                col >= content_area.x
                    && col < content_area.x + content_area.width
                    && row >= content_area.y
                    && row < content_area.y + content_area.height
            } else {
                false
            };

            (tab_click, list_click, content_click)
        }; // RefCell borrow dropped here

        // Handle tab click
        if let Some(target_view) = tab_click {
            return self.switch_to_view(target_view).await;
        }

        // Handle list click
        if let Some(clicked_idx) = list_click {
            if let Some(clicked_index) = clicked_idx {
                let list_len = self.list_len();
                if clicked_index < list_len {
                    self.selected = clicked_index;
                    self.focus = Focus::List;
                    self.open_selected().await?;
                    return Ok(());
                }
            }
            // Click in list area but not on item - just focus list
            self.focus = Focus::List;
            self.update_status();
            return Ok(());
        }

        // Handle content click
        if content_click {
            self.focus = Focus::Content;
            self.update_status();
            return Ok(());
        }

        Ok(())
    }

    fn handle_scroll_up(&mut self, col: u16, row: u16) {
        let layout = self.ui_layout.borrow();

        // Scroll in content pane
        if let Some(content_area) = layout.content_area {
            if col >= content_area.x
                && col < content_area.x + content_area.width
                && row >= content_area.y
                && row < content_area.y + content_area.height
            {
                drop(layout);
                self.content_scroll = self.content_scroll.saturating_sub(3);
                return;
            }
        }

        // Scroll in list pane
        if let Some(list_area) = layout.list_area {
            if col >= list_area.x
                && col < list_area.x + list_area.width
                && row >= list_area.y
                && row < list_area.y + list_area.height
            {
                drop(layout);
                if self.selected > 0 {
                    self.selected = self.selected.saturating_sub(3);
                }
            }
        }
    }

    fn handle_scroll_down(&mut self, col: u16, row: u16) {
        let layout = self.ui_layout.borrow();

        // Scroll in content pane
        if let Some(content_area) = layout.content_area {
            if col >= content_area.x
                && col < content_area.x + content_area.width
                && row >= content_area.y
                && row < content_area.y + content_area.height
            {
                drop(layout);
                self.content_scroll = self.content_scroll.saturating_add(3);
                return;
            }
        }

        // Scroll in list pane
        if let Some(list_area) = layout.list_area {
            if col >= list_area.x
                && col < list_area.x + list_area.width
                && row >= list_area.y
                && row < list_area.y + list_area.height
            {
                drop(layout);
                let max = self.list_len().saturating_sub(1);
                self.selected = (self.selected + 3).min(max);
            }
        }
    }

    async fn switch_to_view(&mut self, view: View) -> Result<()> {
        if self.view != view {
            self.view = view;
            self.current_folder = match view {
                View::Inbox => Some(PathBuf::from("inbox")),
                _ => None,
            };
            self.close_content();
            self.refresh().await?;
        }
        Ok(())
    }

    /// Handle commands (prefixed with :)
    async fn handle_command(&mut self, cmd: &str) -> Result<()> {
        match cmd.trim().to_lowercase().as_str() {
            "theme" | "themes" => {
                self.popup = Popup::ThemeSelect;
                // Select current theme in the list
                self.popup_selected = ThemeVariant::all()
                    .iter()
                    .position(|v| *v == self.theme.variant)
                    .unwrap_or(0);
                self.status = "j/k:navigate  Enter:select  Esc:cancel".to_string();
            }
            _ => {
                self.status = format!("Unknown command: :{}", cmd);
            }
        }
        Ok(())
    }

    async fn handle_popup_key(&mut self, key: KeyCode) -> Result<()> {
        match self.popup {
            Popup::ThemeSelect => {
                let variants = ThemeVariant::all();
                match key {
                    KeyCode::Esc | KeyCode::Char('q') => {
                        self.popup = Popup::None;
                        self.update_status();
                    }
                    KeyCode::Char('j') | KeyCode::Down => {
                        self.popup_selected = (self.popup_selected + 1) % variants.len();
                    }
                    KeyCode::Char('k') | KeyCode::Up => {
                        self.popup_selected = self
                            .popup_selected
                            .checked_sub(1)
                            .unwrap_or(variants.len() - 1);
                    }
                    KeyCode::Enter => {
                        if let Some(variant) = variants.get(self.popup_selected) {
                            self.theme = Theme::from_variant(*variant);
                            self.status = format!("Theme: {}", variant.name());
                            self.save_theme_to_config();
                        }
                        self.popup = Popup::None;
                    }
                    _ => {}
                }
            }
            Popup::None => {}
        }
        Ok(())
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
                        Focus::Content => {
                            if self.show_properties {
                                Focus::Metadata
                            } else {
                                Focus::List
                            }
                        }
                        Focus::Metadata => Focus::List,
                    };
                    self.update_status();
                }
            }

            // Navigation
            KeyCode::Char('j') | KeyCode::Down => match self.focus {
                Focus::Content => {
                    self.content_scroll = self.content_scroll.saturating_add(1);
                }
                Focus::Metadata => {
                    self.next_property_field();
                    self.status = format!("PROPERTIES | {:?}", self.property_field);
                }
                Focus::List => {
                    self.next();
                }
            },
            KeyCode::Char('k') | KeyCode::Up => match self.focus {
                Focus::Content => {
                    self.content_scroll = self.content_scroll.saturating_sub(1);
                }
                Focus::Metadata => {
                    self.prev_property_field();
                    self.status = format!("PROPERTIES | {:?}", self.property_field);
                }
                Focus::List => {
                    self.previous();
                }
            },
            KeyCode::Enter if self.focus == Focus::Metadata => {
                self.start_property_edit();
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

            // Open/view selected or follow link
            KeyCode::Enter => {
                if self.focus == Focus::Content {
                    self.follow_link().await?;
                } else {
                    self.open_selected().await?;
                }
            }

            // Edit note
            KeyCode::Char('e') if self.current_note.is_some() => {
                self.start_editing();
            }

            // Properties panel
            KeyCode::Char('p') if self.current_note.is_some() => {
                self.toggle_properties();
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
            KeyCode::Char('R') if self.focus == Focus::List => {
                self.start_rename();
            }
            KeyCode::Char('D') if self.focus == Focus::List => {
                self.start_delete_confirm();
            }
            KeyCode::Char('T') => {
                self.toggle_theme();
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
                    EditingContext::Rename => self.do_rename(&input).await?,
                    EditingContext::ConfirmDelete => self.do_delete(&input).await?,
                    EditingContext::PropertyField => {} // Handled by PropertyEditing mode
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

    async fn handle_editor_key(&mut self, key: KeyEvent) -> Result<()> {
        match key.code {
            KeyCode::Esc => {
                // Save and exit editing
                self.save_current_note().await?;
                self.input_mode = InputMode::Normal;
                self.update_status();
            }
            KeyCode::Enter => {
                self.push_undo_snapshot();
                self.delete_selection_if_any();
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
                self.push_undo_snapshot();
                // If there's a selection, delete it instead of single char
                if self.delete_selection_if_any() {
                    return Ok(());
                }

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
                let extend = is_shift_key(key.modifiers);
                self.move_cursor_left(extend);
            }
            KeyCode::Right => {
                let extend = is_shift_key(key.modifiers);
                self.move_cursor_right(extend);
            }
            KeyCode::Up => {
                let extend = is_shift_key(key.modifiers);
                self.move_cursor_up(extend);
            }
            KeyCode::Down => {
                let extend = is_shift_key(key.modifiers);
                self.move_cursor_down(extend);
            }
            KeyCode::Char(c) => {
                let is_cmd = is_command_key(key.modifiers);

                match (c, is_cmd) {
                    // Clipboard operations
                    ('c', true) => {
                        self.copy_selection();
                    }
                    ('x', true) => {
                        self.cut_selection();
                    }
                    ('v', true) => {
                        self.paste();
                    }
                    ('a', true) => {
                        self.select_all();
                    }
                    // Undo/Redo
                    ('z', true) => {
                        if is_shift_key(key.modifiers) {
                            self.redo();
                        } else {
                            self.undo();
                        }
                    }
                    ('y', true) => {
                        self.redo();
                    }
                    // Regular character insertion
                    (c, false) => {
                        // Delete selection if any before inserting
                        self.push_undo_snapshot();
                        self.delete_selection_if_any();

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
                    _ => {} // CMD + other letters - ignore
                }
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
                "1-4:views  j/k:nav  Enter:open  e:edit  c:capture  n:new  f:folder  q:quit"
                    .to_string()
            }
            (Focus::Content, InputMode::Normal) => {
                "Tab:list  j/k:scroll  e:edit  q:close".to_string()
            }
            (_, InputMode::NoteEditing) => {
                let marker = if self.unsaved_changes { "●" } else { "" };
                format!(
                    "EDITING {}  Arrows:move  Type to insert  Esc:save & close",
                    marker
                )
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

    fn toggle_properties(&mut self) {
        self.show_properties = !self.show_properties;
        if self.show_properties {
            self.focus = Focus::Metadata;
            self.property_field = PropertyField::Title;
            self.status = "PROPERTIES | j/k:field  Enter:edit  Esc:close".to_string();
        } else {
            self.focus = Focus::Content;
            self.update_status();
        }
    }

    async fn handle_property_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Esc => {
                // Save and close
                self.apply_property_edit().await?;
                self.input_mode = InputMode::Normal;
                self.property_buffer.clear();
                self.update_status();
            }
            KeyCode::Enter => {
                // Commit this field and move to next
                self.apply_property_edit().await?;
                self.next_property_field();
                self.load_property_field();
            }
            KeyCode::Backspace => {
                self.property_buffer.pop();
            }
            KeyCode::Char(c) => {
                self.property_buffer.push(c);
            }
            _ => {}
        }
        Ok(())
    }

    fn start_property_edit(&mut self) {
        self.load_property_field();
        self.input_mode = InputMode::PropertyEditing;
        self.status = format!("Editing {:?}: ", self.property_field);
    }

    fn load_property_field(&mut self) {
        if let Some(note) = &self.current_note {
            self.property_buffer = match self.property_field {
                PropertyField::Title => note.frontmatter.title.clone().unwrap_or_default(),
                PropertyField::Tags => note.frontmatter.tags.join(", "),
            };
            self.status = format!("Edit {:?}: {}_", self.property_field, self.property_buffer);
        }
    }

    fn next_property_field(&mut self) {
        self.property_field = match self.property_field {
            PropertyField::Title => PropertyField::Tags,
            PropertyField::Tags => PropertyField::Title,
        };
    }

    fn prev_property_field(&mut self) {
        self.property_field = match self.property_field {
            PropertyField::Title => PropertyField::Tags,
            PropertyField::Tags => PropertyField::Title,
        };
    }

    async fn apply_property_edit(&mut self) -> Result<()> {
        if let Some(note) = &mut self.current_note {
            // Update in-memory frontmatter
            match self.property_field {
                PropertyField::Title => {
                    note.frontmatter.title = if self.property_buffer.is_empty() {
                        None
                    } else {
                        Some(self.property_buffer.clone())
                    };
                }
                PropertyField::Tags => {
                    note.frontmatter.tags = self
                        .property_buffer
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                }
            }

            // Save to file
            let vault = self.vault.read().await;
            let full_path = vault.root.join(&note.path);
            drop(vault);

            // Generate new frontmatter YAML
            let yaml = serde_yaml::to_string(&note.frontmatter)?;
            let new_content = format!("---\n{}---\n\n{}", yaml, note.content);
            std::fs::write(&full_path, &new_content)?;

            self.status = format!("Saved {:?}: {}", self.property_field, self.property_buffer);
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

    // === Cursor Movement with Selection Support ===

    fn move_cursor_left(&mut self, extend_selection: bool) {
        let (row, col) = self.editor_cursor;
        let new_pos = if col > 0 {
            (row, col - 1)
        } else if row > 0 {
            // Move to end of previous line
            let lines: Vec<&str> = self.editor_buffer.lines().collect();
            let prev_line_len = lines.get(row - 1).map(|l| l.len()).unwrap_or(0);
            (row - 1, prev_line_len)
        } else {
            (row, col)
        };

        self.editor_cursor = new_pos;
        self.update_selection(extend_selection, (row, col), new_pos);
    }

    fn move_cursor_right(&mut self, extend_selection: bool) {
        let lines: Vec<&str> = self.editor_buffer.lines().collect();
        let (row, col) = self.editor_cursor;
        let line_len = lines.get(row).map(|l| l.len()).unwrap_or(0);

        let new_pos = if col < line_len {
            (row, col + 1)
        } else if row < lines.len().saturating_sub(1) {
            // Move to start of next line
            (row + 1, 0)
        } else {
            (row, col)
        };

        self.editor_cursor = new_pos;
        self.update_selection(extend_selection, (row, col), new_pos);
    }

    fn move_cursor_up(&mut self, extend_selection: bool) {
        let (row, col) = self.editor_cursor;
        let new_pos = if row > 0 {
            // Try to maintain column position
            let lines: Vec<&str> = self.editor_buffer.lines().collect();
            let prev_line_len = lines.get(row - 1).map(|l| l.len()).unwrap_or(0);
            (row - 1, col.min(prev_line_len))
        } else {
            (row, col)
        };

        self.editor_cursor = new_pos;
        self.update_selection(extend_selection, (row, col), new_pos);
    }

    fn move_cursor_down(&mut self, extend_selection: bool) {
        let lines: Vec<&str> = self.editor_buffer.lines().collect();
        let (row, col) = self.editor_cursor;
        let line_count = lines.len();

        let new_pos = if row < line_count.saturating_sub(1) {
            // Try to maintain column position
            let next_line_len = lines.get(row + 1).map(|l| l.len()).unwrap_or(0);
            (row + 1, col.min(next_line_len))
        } else {
            (row, col)
        };

        self.editor_cursor = new_pos;
        self.update_selection(extend_selection, (row, col), new_pos);
    }

    fn update_selection(
        &mut self,
        extend: bool,
        old_pos: (usize, usize),
        new_pos: (usize, usize),
    ) {
        if extend {
            // Extend or start selection
            if let Some(ref mut sel) = self.editor_selection {
                sel.extend_to(new_pos);
            } else {
                self.editor_selection = Some(Selection {
                    anchor: old_pos,
                    cursor: new_pos,
                });
            }
        } else {
            // Collapse selection
            self.editor_selection = None;
        }
    }

    // === Clipboard Operations ===

    fn get_selected_text(&self) -> Option<String> {
        let sel = self.editor_selection.as_ref()?;
        if sel.is_empty() {
            return None;
        }

        let ((start_line, start_col), (end_line, end_col)) = sel.normalized();
        let lines: Vec<&str> = self.editor_buffer.lines().collect();

        if start_line == end_line {
            // Single line selection
            let line = lines.get(start_line)?;
            let end = end_col.min(line.len());
            let start = start_col.min(end);
            Some(line[start..end].to_string())
        } else {
            // Multi-line selection
            let mut result = String::new();
            for i in start_line..=end_line {
                if let Some(line) = lines.get(i) {
                    if i == start_line {
                        let start = start_col.min(line.len());
                        result.push_str(&line[start..]);
                    } else if i == end_line {
                        let end = end_col.min(line.len());
                        result.push_str(&line[..end]);
                    } else {
                        result.push_str(line);
                    }
                    if i < end_line {
                        result.push('\n');
                    }
                }
            }
            Some(result)
        }
    }

    /// Delete selection and return true if there was one
    fn delete_selection_if_any(&mut self) -> bool {
        let sel = match self.editor_selection.take() {
            Some(s) if !s.is_empty() => s,
            _ => return false,
        };

        let ((start_line, start_col), (end_line, end_col)) = sel.normalized();
        let lines: Vec<&str> = self.editor_buffer.lines().collect();

        let mut new_content = String::new();

        for (i, line) in lines.iter().enumerate() {
            if i < start_line {
                new_content.push_str(line);
                new_content.push('\n');
            } else if i == start_line && i == end_line {
                // Same line: keep before start and after end
                let start = start_col.min(line.len());
                let end = end_col.min(line.len());
                new_content.push_str(&line[..start]);
                new_content.push_str(&line[end..]);
                if i < lines.len() - 1 {
                    new_content.push('\n');
                }
            } else if i == start_line {
                let start = start_col.min(line.len());
                new_content.push_str(&line[..start]);
            } else if i == end_line {
                let end = end_col.min(line.len());
                new_content.push_str(&line[end..]);
                if i < lines.len() - 1 {
                    new_content.push('\n');
                }
            } else if i > end_line {
                new_content.push_str(line);
                if i < lines.len() - 1 {
                    new_content.push('\n');
                }
            }
            // Skip lines between start and end (exclusive)
        }

        self.editor_buffer = new_content;
        self.editor_cursor = (start_line, start_col);
        self.unsaved_changes = true;
        true
    }

    fn select_all(&mut self) {
        let line_count = self.editor_buffer.lines().count();
        if line_count == 0 {
            return;
        }
        let last_line_len = self.editor_buffer.lines().last().map(|l| l.len()).unwrap_or(0);

        self.editor_selection = Some(Selection {
            anchor: (0, 0),
            cursor: (line_count.saturating_sub(1), last_line_len),
        });
        self.editor_cursor = (line_count.saturating_sub(1), last_line_len);
    }

    fn copy_selection(&mut self) {
        if let Some(text) = self.get_selected_text() {
            match self.clipboard.copy(&text) {
                Ok(_) => self.status = format!("Copied {} chars", text.len()),
                Err(e) => self.status = format!("Copy failed: {}", e),
            }
        } else {
            self.status = "Nothing selected".to_string();
        }
    }

    fn cut_selection(&mut self) {
        if let Some(text) = self.get_selected_text() {
            match self.clipboard.copy(&text) {
                Ok(_) => {
                    self.push_undo_snapshot();
                    self.delete_selection_if_any();
                    self.status = format!("Cut {} chars", text.len());
                }
                Err(e) => self.status = format!("Cut failed: {}", e),
            }
        } else {
            self.status = "Nothing selected".to_string();
        }
    }

    fn paste(&mut self) {
        match self.clipboard.paste() {
            Ok(text) => {
                if !text.is_empty() {
                    self.push_undo_snapshot();
                    self.delete_selection_if_any();
                    self.insert_text(&text);
                    self.status = format!("Pasted {} chars", text.len());
                }
            }
            Err(e) => self.status = format!("Paste failed: {}", e),
        }
    }

    fn insert_text(&mut self, text: &str) {
        let lines: Vec<&str> = self.editor_buffer.lines().collect();
        let (row, col) = self.editor_cursor;

        let current_line = lines.get(row).copied().unwrap_or("");
        let col = col.min(current_line.len());
        let before = &current_line[..col];
        let after = &current_line[col..];

        let insert_lines: Vec<&str> = text.lines().collect();

        let mut new_content = String::new();

        // Add lines before current
        for line in lines.iter().take(row) {
            new_content.push_str(line);
            new_content.push('\n');
        }

        // Handle insertion
        if insert_lines.is_empty() {
            // Empty paste - just reconstruct
            new_content.push_str(before);
            new_content.push_str(after);
        } else if insert_lines.len() == 1 {
            // Single line insert
            new_content.push_str(before);
            new_content.push_str(insert_lines[0]);
            new_content.push_str(after);
            self.editor_cursor = (row, col + insert_lines[0].len());
        } else {
            // Multi-line insert
            new_content.push_str(before);
            new_content.push_str(insert_lines[0]);
            new_content.push('\n');

            for (i, line) in insert_lines.iter().enumerate().skip(1) {
                if i == insert_lines.len() - 1 {
                    // Last line of insert
                    new_content.push_str(line);
                    new_content.push_str(after);
                    self.editor_cursor = (row + i, line.len());
                } else {
                    new_content.push_str(line);
                    new_content.push('\n');
                }
            }
        }

        // Add lines after current
        for (i, line) in lines.iter().enumerate().skip(row + 1) {
            new_content.push('\n');
            new_content.push_str(line);
            // Don't add trailing newline after last line
            if i < lines.len() - 1 {
                // Already handled by the newline before each line
            }
        }

        self.editor_buffer = new_content;
        self.editor_selection = None;
        self.unsaved_changes = true;
    }

    // === Undo/Redo ===

    fn current_snapshot(&self) -> EditorSnapshot {
        EditorSnapshot {
            content: self.editor_buffer.clone(),
            cursor: self.editor_cursor,
            selection: self.editor_selection,
        }
    }

    fn apply_snapshot(&mut self, snapshot: EditorSnapshot) {
        self.editor_buffer = snapshot.content;
        self.editor_cursor = snapshot.cursor;
        self.editor_selection = snapshot.selection;
        self.unsaved_changes = true;
    }

    fn push_undo_snapshot(&mut self) {
        let snapshot = self.current_snapshot();
        self.undo_history.push(snapshot);
    }

    fn undo(&mut self) {
        let current = self.current_snapshot();
        if let Some(previous) = self.undo_history.undo(current) {
            self.apply_snapshot(previous);
            self.status = "Undo".to_string();
        } else {
            self.status = "Nothing to undo".to_string();
        }
    }

    fn redo(&mut self) {
        let current = self.current_snapshot();
        if let Some(next) = self.undo_history.redo(current) {
            self.apply_snapshot(next);
            self.status = "Redo".to_string();
        } else {
            self.status = "Nothing to redo".to_string();
        }
    }

    fn list_len(&self) -> usize {
        match self.view {
            View::Notes | View::Inbox | View::Daily | View::Search => self.notes.len(),
            View::Tasks => self.tasks.len(),
            View::Setup | View::Unlock => 0,
        }
    }

    pub fn toggle_theme(&mut self) {
        let mut new_variant = self.theme.variant.next();

        // Skip Custom if not configured
        if new_variant == ThemeVariant::Custom {
            let has_custom_config = self
                .vault
                .try_read()
                .map(|v| v.config.custom_theme.is_some())
                .unwrap_or(false);

            if !has_custom_config {
                new_variant = new_variant.next(); // Skip to Claude
            }
        }

        // Load the theme
        if new_variant == ThemeVariant::Custom {
            if let Ok(vault) = self.vault.try_read() {
                if let Some(ref custom) = vault.config.custom_theme {
                    self.theme = Theme::from_custom_config(custom);
                    self.status = format!("Theme: {}", self.theme.variant.name());
                    self.save_theme_to_config();
                    return;
                }
            }
            // Fallback if we can't load custom
            new_variant = ThemeVariant::Claude;
        }

        self.theme = Theme::from_variant(new_variant);
        self.status = format!("Theme: {}", self.theme.variant.name());
        self.save_theme_to_config();
    }

    /// Save current theme to config file
    fn save_theme_to_config(&self) {
        // Use try_read to avoid blocking - if we can't get the lock, skip saving
        if let Ok(vault) = self.vault.try_read() {
            let mut config = vault.config.clone();
            config.theme = self.theme.variant.to_config_string().to_string();
            if let Err(e) = config.save() {
                tracing::warn!("Failed to save theme to config: {}", e);
            }
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
                self.folders = self
                    .notes
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
            View::Setup | View::Unlock => {
                // Nothing to refresh in setup/unlock views
            }
        }

        self.selected = self.selected.min(self.list_len().saturating_sub(1));
        self.update_status();
        Ok(())
    }

    async fn do_search(&mut self, query: &str) -> Result<()> {
        // Handle commands (start with :)
        if let Some(cmd) = query.strip_prefix(':') {
            return self.handle_command(cmd).await;
        }

        if query.is_empty() {
            self.status = "Empty search".to_string();
            return Ok(());
        }

        let vault = self.vault.read().await;

        let (results, mode_desc) = if let Some(stripped) = query
            .strip_prefix("/s ")
            .or_else(|| query.strip_prefix("/semantic "))
        {
            let res = vault.semantic_search(stripped, 50).await?;
            (res, format!("Semantic search: '{}'", stripped))
        } else {
            let res = vault.search(query, 50).await?;
            (res, format!("Full-text search: '{}'", query))
        };

        self.notes = Vec::new();
        for result in &results {
            if let Ok(Some(note)) = vault.get_note(&result.path).await {
                self.notes.push(note);
            }
        }

        self.view = View::Search;
        self.selected = 0;
        self.status = format!("{} ({} results)", mode_desc, self.notes.len());
        Ok(())
    }

    async fn do_create_note(&mut self, title: &str) -> Result<()> {
        if title.is_empty() {
            self.status = "Note title cannot be empty".to_string();
            return Ok(());
        }

        // Use current folder or inbox
        let folder = self
            .current_folder
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "inbox".to_string());

        let vault = self.vault.write().await;

        // Check if exists
        let path = if folder == "inbox" {
            PathBuf::from("inbox").join(format!("{}.md", title))
        } else {
            PathBuf::from(&folder).join(format!("{}.md", title))
        };

        if vault.root.join(&path).exists() {
            self.status = "Note already exists".to_string();
            return Ok(());
        }

        match vault.create_note(title, "", Some(&folder), &[]).await {
            Ok(note) => {
                drop(vault);
                self.refresh().await?;
                self.focus_note(&note);
                self.start_editing();

                // If created in inbox but viewing another folder, switch view?
                // For now just focus it.
            }
            Err(e) => {
                self.status = format!("Error: {}", e);
            }
        }
        Ok(())
    }

    fn start_rename(&mut self) {
        if let Some(note) = self.get_selected_note() {
            self.input_mode = InputMode::Editing;
            self.editing_context = EditingContext::Rename;
            self.input = note
                .path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            self.status = format!("Rename '{}' to: ", self.input);
        }
    }

    async fn do_rename(&mut self, new_name: &str) -> Result<()> {
        if new_name.is_empty() {
            return Ok(());
        }

        if let Some(note) = self.get_selected_note() {
            let old_path = note.path.clone();
            let vault = self.vault.write().await;

            // Construct new path sibling to old path
            let result = vault.rename_note(&old_path, new_name).await;

            match result {
                Ok(new_path) => {
                    drop(vault);
                    self.status = format!("Renamed to {}", new_path.display());
                    self.refresh().await?;
                    // Try to re-select?
                }
                Err(e) => {
                    self.status = format!("Rename error: {}", e);
                }
            }
        }
        Ok(())
    }

    fn start_delete_confirm(&mut self) {
        if let Some(note) = self.get_selected_note() {
            self.input_mode = InputMode::Editing;
            self.editing_context = EditingContext::ConfirmDelete;
            self.input.clear();
            self.status = format!("Delete '{}'? Type 'yes' to confirm: ", note.title());
        }
    }

    async fn do_delete(&mut self, confirmation: &str) -> Result<()> {
        if confirmation.to_lowercase() == "yes" {
            if let Some(note) = self.get_selected_note() {
                let vault = self.vault.write().await;
                match vault.delete_note(&note.path).await {
                    Ok(_) => {
                        drop(vault);
                        self.status = "Note deleted".to_string();
                        self.refresh().await?;
                    }
                    Err(e) => {
                        self.status = format!("Delete error: {}", e);
                    }
                }
            }
        } else {
            self.status = "Delete cancelled".to_string();
        }
        Ok(())
    }

    async fn follow_link(&mut self) -> Result<()> {
        let (row, col) = self.editor_cursor;
        let lines: Vec<&str> = self.editor_buffer.lines().collect();
        if row >= lines.len() {
            return Ok(());
        }

        let line = lines[row];

        // improved regex or manual logic to find [[link]] around col
        // Simple scan: look for [[ before and ]] after

        let mut start_idx = None;
        let mut end_idx = None;

        // Find opening [[ before col
        let bytes = line.as_bytes();
        let mut scan_pos = col;

        // Look backwards
        while scan_pos > 0 {
            if scan_pos >= 2 && &bytes[scan_pos - 2..scan_pos] == b"[[" {
                start_idx = Some(scan_pos);
                break;
            }
            scan_pos -= 1;
        }
        // Also check if we are ON the [[
        if start_idx.is_none() && col + 2 <= line.len() && &bytes[col..col + 2] == b"[[" {
            start_idx = Some(col + 2);
        }

        if let Some(start) = start_idx {
            // Look forward for ]]
            if let Some(end) = line[start..].find("]]") {
                end_idx = Some(start + end);
            }
        }

        if let (Some(s), Some(e)) = (start_idx, end_idx) {
            let link_text = &line[s..e];
            // Handle [[File|Alias]]
            let target = link_text.split('|').next().unwrap_or(link_text);

            // Try to find note
            self.status = format!("Following link: {}", target);

            let vault = self.vault.read().await;
            // Fuzzy match or exact match
            // Assuming filename match

            if let Ok(Some(note)) = vault
                .get_note(std::path::Path::new(&format!("{}.md", target)))
                .await
            {
                drop(vault);
                self.focus_note(&note);
                self.start_editing();
                return Ok(());
            }

            // Try search
            let hits = vault.search(target, 1).await?;
            if let Some(hit) = hits.first() {
                if let Ok(Some(note)) = vault.get_note(&hit.path).await {
                    drop(vault);
                    self.focus_note(&note);
                    self.start_editing();
                    return Ok(());
                }
            }

            self.status = format!("Link target not found: {}", target);
        }

        Ok(())
    }

    fn get_selected_note(&self) -> Option<Note> {
        if self.selected < self.notes.len() {
            Some(self.notes[self.selected].clone())
        } else {
            None
        }
    }

    fn focus_note(&mut self, note: &Note) {
        self.current_note = Some(note.clone());
        self.focus = Focus::Content;
        self.editor_buffer = note.content.clone();
        self.editor_cursor = (0, 0);
        self.update_status();
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
            View::Setup | View::Unlock => {
                // No items to open in setup/unlock views
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

    // =========================================================================
    // Setup & Unlock Handlers
    // =========================================================================

    /// Handle key events during setup wizard
    async fn handle_setup_key(&mut self, key: KeyCode) -> Result<()> {
        // Clear any previous error on new input
        if !matches!(key, KeyCode::Enter) {
            self.setup_state.error = None;
        }

        match self.setup_state.phase {
            SetupPhase::Welcome => self.handle_setup_welcome(key),
            SetupPhase::ShowMnemonic => self.handle_setup_show_mnemonic(key),
            SetupPhase::VerifyMnemonic => self.handle_setup_verify(key),
            SetupPhase::EnterMnemonic => self.handle_setup_enter_mnemonic(key),
            SetupPhase::SetPassword => self.handle_setup_password(key),
            SetupPhase::ConfirmPassword => self.handle_setup_confirm_password(key),
            SetupPhase::Complete => self.handle_setup_complete(key).await,
        }
    }

    fn handle_setup_welcome(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Char('n') | KeyCode::Char('N') => {
                // New vault - generate mnemonic
                self.setup_state.is_restore = false;
                self.setup_state.mnemonic = KeyManager::generate_mnemonic();
                self.setup_state.phase = SetupPhase::ShowMnemonic;
            }
            KeyCode::Char('r') | KeyCode::Char('R') => {
                // Restore from existing mnemonic
                self.setup_state.is_restore = true;
                self.setup_state.phase = SetupPhase::EnterMnemonic;
            }
            KeyCode::Char('q') | KeyCode::Esc => {
                self.should_quit = true;
            }
            _ => {}
        }
        Ok(())
    }

    fn handle_setup_show_mnemonic(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Char('c') | KeyCode::Char('C') | KeyCode::Enter => {
                // Continue to verification
                self.setup_state.verify_indices = crypto::generate_verification_indices();
                self.setup_state.verify_field = 0;
                self.setup_state.verify_answers = Default::default();
                self.setup_state.copied_to_clipboard = false;
                self.setup_state.phase = SetupPhase::VerifyMnemonic;
            }
            KeyCode::Char('y') | KeyCode::Char('Y') => {
                // Copy mnemonic to clipboard
                match arboard::Clipboard::new() {
                    Ok(mut clipboard) => {
                        if clipboard.set_text(&self.setup_state.mnemonic).is_ok() {
                            self.setup_state.copied_to_clipboard = true;
                        } else {
                            self.setup_state.error = Some("Failed to copy to clipboard".to_string());
                        }
                    }
                    Err(_) => {
                        self.setup_state.error = Some("Clipboard not available".to_string());
                    }
                }
            }
            KeyCode::Esc => {
                // Go back to welcome
                self.setup_state.phase = SetupPhase::Welcome;
            }
            _ => {}
        }
        Ok(())
    }

    fn handle_setup_verify(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Enter => {
                // Verify answers
                let answers: Vec<&str> = self
                    .setup_state
                    .verify_answers
                    .iter()
                    .map(|s| s.as_str())
                    .collect();

                if crypto::verify_mnemonic_words(
                    &self.setup_state.mnemonic,
                    &self.setup_state.verify_indices,
                    &answers,
                ) {
                    // Success - proceed to password
                    self.setup_state.phase = SetupPhase::SetPassword;
                } else {
                    self.setup_state.error = Some("Incorrect words. Please try again.".to_string());
                    self.setup_state.verify_field = 0;
                    self.setup_state.verify_answers = Default::default();
                }
            }
            KeyCode::Tab => {
                // Move to next field
                self.setup_state.verify_field = (self.setup_state.verify_field + 1) % 4;
            }
            KeyCode::BackTab => {
                // Move to previous field
                self.setup_state.verify_field = self.setup_state.verify_field.saturating_sub(1);
            }
            KeyCode::Backspace => {
                self.setup_state.verify_answers[self.setup_state.verify_field].pop();
            }
            KeyCode::Char(c) if c.is_alphabetic() => {
                self.setup_state.verify_answers[self.setup_state.verify_field]
                    .push(c.to_ascii_lowercase());
            }
            KeyCode::Esc => {
                // Go back to show mnemonic
                self.setup_state.phase = SetupPhase::ShowMnemonic;
            }
            _ => {}
        }
        Ok(())
    }

    fn handle_setup_enter_mnemonic(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Enter => {
                // Validate mnemonic
                let mnemonic = self.setup_state.mnemonic_input.trim();
                if KeyManager::validate_mnemonic(mnemonic) {
                    self.setup_state.mnemonic = mnemonic.to_string();
                    self.setup_state.phase = SetupPhase::SetPassword;
                } else {
                    self.setup_state.error =
                        Some("Invalid recovery phrase. Check spelling and word count.".to_string());
                }
            }
            KeyCode::Backspace => {
                self.setup_state.mnemonic_input.pop();
            }
            KeyCode::Char(c) if c.is_alphabetic() || c == ' ' => {
                self.setup_state.mnemonic_input.push(c.to_ascii_lowercase());
            }
            KeyCode::Esc => {
                self.setup_state.phase = SetupPhase::Welcome;
                self.setup_state.mnemonic_input.clear();
            }
            _ => {}
        }
        Ok(())
    }

    fn handle_setup_password(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Enter => {
                if self.setup_state.password.len() < 8 {
                    self.setup_state.error =
                        Some("Password must be at least 8 characters.".to_string());
                } else {
                    self.setup_state.phase = SetupPhase::ConfirmPassword;
                }
            }
            KeyCode::Backspace => {
                self.setup_state.password.pop();
            }
            KeyCode::Char(c) => {
                self.setup_state.password.push(c);
            }
            KeyCode::Esc => {
                if self.setup_state.is_restore {
                    self.setup_state.phase = SetupPhase::EnterMnemonic;
                } else {
                    self.setup_state.phase = SetupPhase::VerifyMnemonic;
                }
                self.setup_state.password.clear();
            }
            _ => {}
        }
        Ok(())
    }

    fn handle_setup_confirm_password(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Enter => {
                if self.setup_state.password_confirm == self.setup_state.password {
                    // Passwords match - save identity and complete
                    if let Err(e) = crypto::save_identity(
                        &self.setup_state.mnemonic,
                        &self.setup_state.password,
                        &self.identity_path,
                    ) {
                        self.setup_state.error = Some(format!("Failed to save: {}", e));
                    } else {
                        self.setup_state.phase = SetupPhase::Complete;
                    }
                } else {
                    self.setup_state.error = Some("Passwords do not match.".to_string());
                    self.setup_state.password_confirm.clear();
                }
            }
            KeyCode::Backspace => {
                self.setup_state.password_confirm.pop();
            }
            KeyCode::Char(c) => {
                self.setup_state.password_confirm.push(c);
            }
            KeyCode::Esc => {
                self.setup_state.phase = SetupPhase::SetPassword;
                self.setup_state.password_confirm.clear();
            }
            _ => {}
        }
        Ok(())
    }

    async fn handle_setup_complete(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Enter | KeyCode::Char(' ') => {
                // Create KeyManager and transition to normal mode
                match KeyManager::from_mnemonic(&self.setup_state.mnemonic) {
                    Ok(km) => {
                        self.key_manager = Some(km);
                        self.view = View::Notes;

                        // Clear sensitive data
                        self.setup_state.mnemonic.clear();
                        self.setup_state.password.clear();
                        self.setup_state.password_confirm.clear();

                        // Load notes
                        self.refresh().await?;
                    }
                    Err(e) => {
                        self.setup_state.error = Some(format!("Failed to initialize: {}", e));
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }

    /// Handle key events during unlock
    async fn handle_unlock_key(&mut self, key: KeyCode) -> Result<()> {
        // Clear error on new input (except Enter)
        if !matches!(key, KeyCode::Enter) {
            self.unlock_state.error = None;
        }

        match key {
            KeyCode::Enter => {
                // Try to unlock
                match crypto::load_identity(&self.unlock_state.password, &self.identity_path) {
                    Ok(mnemonic) => match KeyManager::from_mnemonic(&mnemonic) {
                        Ok(km) => {
                            self.key_manager = Some(km);
                            self.view = View::Notes;
                            self.unlock_state.password.clear();
                            self.refresh().await?;
                        }
                        Err(e) => {
                            self.unlock_state.error = Some(format!("Key error: {}", e));
                            self.unlock_state.password.clear();
                        }
                    },
                    Err(crypto::CryptoError::InvalidPassword) => {
                        self.unlock_state.error = Some("Incorrect password.".to_string());
                        self.unlock_state.password.clear();
                    }
                    Err(e) => {
                        self.unlock_state.error = Some(format!("Unlock failed: {}", e));
                        self.unlock_state.password.clear();
                    }
                }
            }
            KeyCode::Backspace => {
                self.unlock_state.password.pop();
            }
            KeyCode::Char('f') | KeyCode::Char('F')
                if self.unlock_state.password.is_empty() =>
            {
                // Forgot password - switch to setup in restore mode
                self.view = View::Setup;
                self.setup_state = SetupState::default();
                self.setup_state.is_restore = true;
                self.setup_state.phase = SetupPhase::EnterMnemonic;
            }
            KeyCode::Char(c) => {
                self.unlock_state.password.push(c);
            }
            KeyCode::Esc => {
                self.should_quit = true;
            }
            _ => {}
        }
        Ok(())
    }
}
