# Completed Tasks

> Tasks moved here from TASKS.md after completion.
> Kept for historical reference and context.

---

## v0.2 — Experience (TUI Polish)

### Custom Theme Support (2026-01-28)

- [x] Add custom theme support via config file
  - File: `src/config.rs`, `src/tui/theme.rs`, `src/tui/app.rs`
  - Added `CustomThemeConfig` struct with color fields (background, foreground, accent, secondary, etc.)
  - Added `parse_color()` method supporting hex (`#ff5500`), RGB (`rgb(255,85,0)`), and named colors
  - Added `ThemeVariant::Custom` that loads from `[custom_theme]` section in config.toml
  - Added `Theme::from_custom_config()` with base theme inheritance for unspecified colors
  - Updated theme loading in App constructors and `toggle_theme()` to handle custom themes
  - Test: Define custom theme in config.toml, verify it loads and displays correctly

### Mouse Support (2026-01-28)

- [x] Add mouse click handler for note list selection
  - File: `src/tui/app.rs`
  - Handle `MouseEvent::Down` in `handle_event()`
  - Calculate clicked list index from mouse row position
  - Update `self.selected` and trigger note load

- [x] Add mouse click handler for view tab switching
  - File: `src/tui/app.rs`, `src/tui/ui.rs`
  - Track tab boundaries during render (store in App state)
  - Handle click on tab area, switch to corresponding view

- [x] Add mouse scroll support for content pane
  - File: `src/tui/app.rs`
  - Handle `MouseEvent::ScrollUp/ScrollDown`
  - Adjust `self.content_scroll` accordingly

- [x] Add mouse click to toggle focus between list and content
  - File: `src/tui/app.rs`
  - Detect click in left (list) vs right (content) pane
  - Update `self.focus` accordingly

### Theme Persistence (2026-01-28)

- [x] Add theme persistence to config file
  - File: `src/config.rs`, `src/tui/app.rs`
  - Add `theme: String` field to Config struct
  - Load theme on startup from `config.toml`
  - Save theme when changed via `T` key

- [x] Add theme selection menu (accessible via `:theme` command)
  - File: `src/tui/app.rs`, `src/tui/ui.rs`
  - Add `Popup::ThemeSelect` state
  - Render theme list as popup overlay
  - j/k to navigate, Enter to select
  - Access via `/:theme` in search bar

---

### Encryption Setup (2026-01-28)

> **Security Model:** 24-word BIP39 mnemonic for disaster recovery, master password
> for daily unlock. Mnemonic-derived identity enables device sync without user accounts.

- [x] Add `argon2` crate dependency
  - File: `Cargo.toml`
  - Add `argon2 = "0.5"` for password-based key derivation
  - Test: `cargo build` compiles

- [x] Add password-based identity encryption to crypto module
  - File: `src/crypto.rs`
  - Add `derive_password_key(password, salt) -> [u8; 32]` using Argon2id
  - Add `IdentityFile` struct: `{ version, salt, nonce, ciphertext }`
  - Add `save_identity(mnemonic, password, path)` - encrypt mnemonic, save to file
  - Add `load_identity(password, path)` - load file, decrypt mnemonic
  - Add `verify_words(mnemonic, indices, answers)` - for verification step
  - Test: Round-trip encrypt/decrypt mnemonic with password

- [x] Add Setup view for first-run encryption initialization
  - File: `src/tui/app.rs`
  - Add `View::Setup` variant
  - Add `SetupPhase` enum: Welcome, ShowMnemonic, VerifyMnemonic, SetPassword, ConfirmPassword, Complete
  - Add setup state fields: `setup_phase`, `generated_mnemonic`, `password_buffer`, `verify_indices`
  - On first launch (no `.skelenote/identity.enc`), start in Setup view
  - Test: Delete identity file, restart TUI, see Setup screen

- [x] Add Unlock view for subsequent launches
  - File: `src/tui/app.rs`
  - Add `View::Unlock` variant
  - Prompt for master password
  - On success, decrypt identity, create `KeyManager`, proceed to Notes view
  - On failure, show error, allow retry
  - Add [F] "Forgot password" option to restore from mnemonic
  - Test: Restart TUI, enter password, vault unlocks

- [x] Render Setup screens in TUI
  - File: `src/tui/ui.rs`
  - `render_setup_welcome()` - explain encryption, [N]ew / [R]estore options
  - `render_setup_mnemonic()` - display 24 words in 4x6 grid with warning
  - `render_setup_verify()` - prompt for 4 random words to confirm backup
  - `render_setup_password()` - password input with confirmation and strength meter
  - `render_unlock()` - password prompt with fingerprint display
  - Test: Navigate through all setup screens

- [x] Wire KeyManager into App startup
  - File: `src/main.rs`, `src/tui/app.rs`
  - Check for `.skelenote/identity.enc` at startup
  - If missing → View::Setup
  - If exists → View::Unlock
  - After unlock, store `KeyManager` in App state (or separate secure struct)
  - Test: Full flow from fresh install to normal use

- [x] Add clipboard copy for mnemonic on setup screen
  - File: `Cargo.toml`, `src/tui/app.rs`, `src/tui/ui.rs`
  - Add `arboard` crate for cross-platform clipboard
  - Add [Y] keybinding on ShowMnemonic screen to copy phrase
  - Show "Copied!" feedback message
  - Test: Press Y, paste elsewhere, verify mnemonic copied

---

## Infrastructure

### Text Selection & Clipboard (2026-01-28)

- [x] Update event system to pass full KeyEvent with modifiers
  - File: `src/tui/event.rs`
  - Changed `Event::Key(KeyCode)` to `Event::Key(KeyEvent)`
  - Added `is_command_key()` helper (CMD on Mac, Ctrl on others)
  - Updated `poll()` to pass full KeyEvent

- [x] Add Selection struct and text selection state
  - File: `src/tui/app.rs`
  - Added `Selection { anchor, cursor }` struct
  - Added `editor_selection: Option<Selection>` to App
  - Implemented `normalized()` to get start/end positions

- [x] Implement cursor movement with selection extension
  - File: `src/tui/app.rs`
  - Modified `move_cursor_left/right/up/down` to accept `extend: bool`
  - Shift+Arrow extends selection, plain Arrow collapses

- [x] Add selection highlighting in content pane
  - File: `src/tui/ui.rs`, `src/tui/theme.rs`
  - Added `content_selection: Style` to Theme struct (all 7 themes)
  - Modified `draw_content` to render selected ranges with highlight

- [x] Implement clipboard operations (CMD-C, CMD-X, CMD-V, CMD-A)
  - File: `src/tui/app.rs`
  - Added `ClipboardManager` wrapper using `arboard`
  - Implemented `get_selected_text()`, `delete_selection_if_any()`
  - Added `copy_selection()`, `cut_selection()`, `paste()`, `select_all()`

- [x] Implement undo/redo (CMD-Z, CMD-Y)
  - File: `src/tui/app.rs`
  - Added `EditorSnapshot { content, cursor, selection }`
  - Added `UndoHistory` with undo/redo stacks (max 100)
  - Push snapshot before each mutation
  - CMD-Z pops undo, CMD-Y (or CMD-Shift-Z) pops redo

---

### Repository Cleanup (2026-01-28)

- [x] Repository cleanup after pivot to pure Rust
  - Removed 11,352 files (old TypeScript/React frontend, docs, workers)
  - Added `.fastembed_cache/` to .gitignore
  - Fixed README.md build path

### Task Management Enforcement (2026-01-28)

- [x] Improve CLAUDE.md and hook to enforce TASKS.md workflow
  - File: `CLAUDE.md`, `.claude/settings.json`
  - Added explicit workflow steps with examples in CLAUDE.md
  - Enhanced hook to cover full workflow (read → edit → update → move)
  - Emphasized editing TASKS.md directly, not just TodoWrite

---

## Properties & Note Linking (2026-01-28)

- [x] Simplify frontmatter to "Properties" (id, title, tags, created, updated)
  - [x] Remove `type`, `aliases`, `daily` from Frontmatter struct
  - [x] Update index schema to remove note_type column
  - [x] Update vault templates and index_note calls
  - [x] Rename MetadataField to PropertyField (Title/Tags only)
  - [x] Rename all UI strings from "metadata" to "properties"
  - [x] Add ID-based note linking with computed backlinks
    - [x] Task 6: Auto-generate UUIDs for notes without IDs during reindex
    - [x] Task 7: Add ID column to index for link resolution
    - [x] Task 8: Add link resolution (by ID, title, or path)
    - [x] Task 9: Update backlinks to track source IDs
  - [x] Task 10: Update Vault get_backlinks to use new resolution
  - [x] Task 11: Add properties button indicator in TUI
  - [x] Task 12: Verify tests pass
  - [x] Task 13: Run clippy and format
  - See: `docs/plans/2026-01-28-properties-and-linking.md`
