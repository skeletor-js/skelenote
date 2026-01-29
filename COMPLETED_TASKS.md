# Completed Tasks

> Tasks moved here from TASKS.md after completion.
> Kept for historical reference and context.

---

## Documentation Refresh (2026-01-29)

- [x] Update documentation to reflect current codebase state
  - [x] Update ROADMAP.md - mark v0.2, v0.3, v0.4 as complete, add v0.5
  - [x] Update README.md - reflect current features, add badges, update CLI commands
  - [x] Update CLAUDE.md - refresh module structure with all new modules

---

## v0.4 — Sync (P2P Discovery Phase 4D-E)

### Peer Status & Link Device Screen (2026-01-29)

- [x] Add peer connection status UI in TUI (Phase 4D)
  - File: `src/tui/app.rs`, `src/tui/ui.rs`
  - Added `SyncState` struct with `peer_count`, `relay_connected`, `last_sync`
  - Added `sync_state` field to App struct
  - Updated status bar to show `[n peers | relay: ✓/✗]` format
  - Status displayed in right side of status bar with color coding

- [x] Add "Link Another Device" info screen in TUI (Phase 4E)
  - File: `src/tui/app.rs`, `src/tui/ui.rs`
  - Added `LinkDevice` variant to `View` enum
  - Added `:link` command handler to switch to LinkDevice view
  - Created `draw_link_device()` function showing:
    - Current fingerprint (8 chars, prominent display)
    - Instructions for syncing via recovery phrase
    - Note about matching fingerprints
  - Added key handler to return from LinkDevice view (any key returns)

---

## v0.2 — Experience (TUI Polish)

### Advanced Search (2026-01-28)

- [x] Add search filter syntax for tags (`tag:foo`)
  - Parse query for `tag:` prefix with case-insensitive word-boundary matching
  - Created `SearchFilters` struct in `src/search.rs` with `parse()` method
  - Added `search_filtered()` method to Index with dynamic SQL building
  - Integrated into Vault and TUI search workflow

- [x] Add search filter for date range (`after:2025-01-01`, `before:...`)
  - Parse `after:` and `before:` prefixes (ISO 8601 format)
  - Filter by `created` or `updated` frontmatter fields
  - Supports combined filters with text queries

- [x] Add search filter for backlinks (`links:note-id` or `linkedby:note-id`)
  - `links:X` - find notes that link TO note X (by ID, title, or path)
  - `linkedby:X` - find notes that are linked FROM note X
  - Added `get_sources_linking_to()` and `get_targets_linked_from()` helpers
  - Leverages existing `backlinks` table with three-tier resolution

- [x] Add search filter by note ID (`id:uuid`)
  - Partial matching on note ID column
  - Supports combined filters

- [x] Add fuzzy search mode (`~query`)
  - Added `sublime_fuzzy` crate dependency
  - Implemented `fuzzy_search()` method with title weighting (2x)
  - Triggered via `~` prefix in search query

- [x] Add search results highlighting
  - Added `search_highlight: Style` to Theme (all 7 themes + custom)
  - Implemented `highlight_matches()` for case-insensitive multi-word highlighting
  - Updated `draw_notes_list` to highlight matching query terms

- See: `docs/plans/2026-01-28-advanced-search.md`

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

---

## v0.3 — Integration (MCP Enhancements)

### MCP Filesystem Tools (2026-01-29)

- [x] Add `validate_vault_path()` helper function
  - File: `src/mcp.rs`
  - Rejects absolute paths and path traversal attempts (..)
  - Returns validated full path within vault

- [x] Make vault event handlers public
  - File: `src/vault.rs`
  - Changed `handle_create_modify` and `handle_remove` to `pub`
  - Enables MCP tools to trigger reindexing

- [x] Add `read_file` MCP tool for arbitrary vault files
  - File: `src/mcp.rs`
  - Parameters: `path` (string, relative to vault root)
  - Returns: File content as string (or base64 for binary)
  - Validates path is within vault root (prevents traversal)

- [x] Add `write_file` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path`, `content`
  - Creates parent directories if needed
  - Validates path is within vault root
  - Triggers reindex for .md files via `vault.handle_create_modify()`

- [x] Add `create_directory` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path` (relative to vault root)
  - Creates directory and any missing parents via `create_dir_all`

- [x] Add `get_file_info` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path`
  - Returns: JSON `{ size, modified, is_directory, extension }`

- [x] Add `delete_file` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path`
  - Deletes files, or empty directories only
  - Triggers index removal for .md files via `vault.handle_remove()`

- [x] Enhance `list_directory` tool with metadata
  - File: `src/mcp.rs`, `src/vault.rs`
  - Added `FileEntry` struct with name, path, is_directory, size, modified
  - Added `list_files_detailed()` method to Vault
  - Returns: JSON array `[{ name, path, is_directory, size, modified }]`
  - Added optional `recursive: bool` parameter for deep listing

### MCP Search Enhancements (2026-01-29)

- [x] Add `search_advanced` MCP tool with filters
  - File: `src/mcp.rs`
  - Parameters: `query`, `tags[]`, `after`, `before`, `links_to`, `linked_by`, `limit`
  - Builds SearchFilters and calls vault.search_filtered()
  - Returns JSON array of results with path, title, snippet, score

- [x] Add `get_index_stats` MCP tool
  - File: `src/mcp.rs`, `src/index.rs`
  - Added `IndexStats` struct with total_notes, total_tasks, total_backlinks, indexed_embeddings
  - Added `get_stats()` method to Index
  - Added `get_index_stats()` wrapper to Vault
  - Returns JSON object with vault statistics

- [x] Add `find_related` MCP tool
  - File: `src/mcp.rs`, `src/vault.rs`
  - Parameters: `path`, `limit`
  - Added `find_related()` method to Vault
  - Uses note's embedding for semantic search
  - Excludes the source note from results
  - Returns JSON array of similar notes

- [x] Add `get_tags` MCP tool
  - File: `src/mcp.rs`, `src/index.rs`
  - Added `get_all_tags()` method to Index
  - Parses comma-separated tags from all notes
  - Returns JSON array of `{tag, count}` sorted by count desc

- [x] Add `get_note_graph` MCP tool
  - File: `src/mcp.rs`, `src/index.rs`
  - Added `GraphNode` and `GraphEdge` structs
  - Added `get_graph()` method to Index
  - Added `get_note_graph()` wrapper to Vault
  - Returns JSON `{nodes: [{path, title}], edges: [{source, target}]}`
  - Resolves backlinks to actual note paths

---

## v0.4 — Sync (Rust Relay & P2P)

### Sync State Table (2026-01-29)

- [x] Add sync state table to SQLite index
  - File: `src/index.rs`
  - Schema: `sync_state(path, local_version BLOB, loro_doc BLOB, synced_at TEXT, sync_status TEXT)`
  - Added `SyncState` struct for representing sync state
  - Added `get_sync_state()` - retrieves sync state for a note path
  - Added `update_sync_state()` - creates or updates sync state with UPSERT
  - Added `get_pending_syncs()` - returns paths of all notes with 'pending' status
  - Added `delete_sync_state()` - removes sync state for a path
  - Updated `remove_note()` to also delete sync state
  - Added tests: `test_sync_state_crud`, `test_get_pending_syncs`, `test_remove_note_deletes_sync_state`

### Relay Server Rate Limiting & Room Cleanup (2026-01-29)

- [x] Add rate limiting to relay server (Phase 2D)
  - File: `src/relay/rate_limit.rs` (new), `src/relay/server.rs`
  - Created `RateLimiter` struct with per-client tracking
  - Tracks message count per client IP per minute
  - Default limit: 100 messages/minute per client
  - Returns RATE_LIMITED error when exceeded
  - Background task cleans up stale client entries (every 2 min)
  - Uses `ConnectInfo<SocketAddr>` extractor for client address
  - Added unit tests for rate limiter

- [x] Add room cleanup for idle rooms (Phase 2E)
  - File: `src/relay/server.rs`
  - Added `last_activity: Instant` to `RoomState` struct
  - Background cleanup task runs every 5 minutes
  - Removes rooms with no activity for 1 hour
  - Also prunes old messages from database (keeps 24 hours)
  - Updated room handlers to track activity timestamps

### Message Persistence & Sequencing (2026-01-29)

- [x] Add message persistence to relay server (Phase 2A-C)
  - File: `src/relay/db.rs` (new), `src/relay/server.rs`
  - Created `RelayDb` struct with SQLite persistence at `~/.skelenote/relay.db`
  - Schema: `messages(id, room, seq, encrypted_payload, timestamp)` with UNIQUE(room, seq)
  - Added `store_message()`, `get_messages_since()`, `get_recent_messages()`, `get_next_seq()`, `prune_old_messages()`
  - Added `next_seq: AtomicU64` to `RoomState` for per-room sequencing
  - Server assigns sequence numbers to incoming Sync messages
  - Persists messages to RelayDb before broadcasting
  - Replays last 100 messages on client join via History message
  - Handles RequestHistory by querying RelayDb for messages since given seq
  - Added unit tests for all RelayDb methods

- [x] Add message versioning/sequencing
  - File: `src/relay/protocol.rs`, `src/relay/server.rs`
  - Protocol already has `seq: u64` in Sync message
  - Server tracks per-room sequence counter via `AtomicU64`
  - Clients can request messages from specific seq via RequestHistory
  - Returns History message with all messages since requested seq

- [x] Add identity announcement (complete)
  - File: `src/relay/protocol.rs`, `src/relay/server.rs`
  - Announce message with user_id and fingerprint
  - Server derives room from user_id via sha256
  - No user database - zero-knowledge routing
  - Devices with same mnemonic get same user_id, join same room

### Sync Transport Layer - Phase 3 (2026-01-29)

- [x] Add E2E encryption for sync payloads (Phase 3A)
  - File: `src/sync/transport.rs` (new)
  - Created `SyncTransport` struct for encrypted WebSocket communication
  - Uses `KeyManager::sync_key()` for XChaCha20-Poly1305 encryption
  - Format: 24-byte nonce prepended to ciphertext
  - Methods: `connect()`, `send_update()`, `recv_update()`, `recv_history()`, `close()`
  - `new_disconnected()` for testing without network
  - `encrypt()` / `decrypt()` public for standalone use
  - Relay cannot decrypt payloads (doesn't have mnemonic)
  - Tests: 7 unit tests for encryption roundtrip, wrong key failure, large data, etc.

- [x] Add delta sync (Phase 3B)
  - File: `src/sync/delta.rs` (new)
  - Created `DeltaSync` struct for managing incremental sync state per note
  - `local_edit()` - apply local changes, save to index, return delta to send
  - `remote_update()` - apply remote update, merge via Loro, return content
  - `get_pending()` - get all notes with pending local changes
  - `mark_synced()` / `mark_syncing()` - status management
  - `get_delta()` - get delta from specific version
  - `init_sync_state()` - initialize sync for existing notes
  - Uses existing `sync_state` table in Index
  - Tests: 8 unit tests covering local/remote edits, merges, status tracking

- [x] Add conflict detection and resolution (Phase 3C)
  - File: `src/sync/crdt.rs`
  - Added `MergeResult` struct with `content: String` and `had_concurrent_edits: bool`
  - Added `apply_updates_with_result()` method to `LoroNote`
  - Compares version vectors before/after to detect concurrent edits
  - Loro handles CRDT merge automatically; we surface detection for UI
  - Tests: 3 unit tests for MergeResult and concurrent edit detection

- [x] Add sync status tracking (Phase 3D)
  - File: `src/sync/mod.rs`
  - Created `SyncStatus` enum: `Synced`, `Pending`, `Syncing`
  - Implemented `Display` trait for TUI indicators:
    - `Synced` -> ✓ (checkmark)
    - `Pending` -> ↑ (up arrow)
    - `Syncing` -> ⟳ (cycle)
  - Added `from_str()` / `as_str()` for database serialization
  - Status tracked via `DeltaSync` methods and index `sync_state` table
  - Tests: 5 unit tests for display, parsing, equality

- [x] Update sync module exports
  - File: `src/sync/mod.rs`
  - Added `pub mod delta`, `pub mod transport`
  - Exported: `LoroNote`, `MergeResult`, `DeltaSync`, `SyncTransport`, `SyncStatus`
  - Preserved existing exports: `MdnsService`, `PeerDiscovery`, `DiscoveredPeer`, `PeerConnection`

### P2P Discovery - Phase 4 (2026-01-29)

- [x] Add mDNS service advertisement (Phase 4A)
  - File: `src/sync/mdns.rs` (new), `Cargo.toml`
  - Added `mdns-sd = "0.11"` and `hostname` crate dependencies
  - Created `MdnsService` struct for advertising on local network
  - Advertises `_skelenote._tcp.local.` service type
  - Includes fingerprint in TXT record: `fingerprint=<8-char>`
  - Methods: `advertise(fingerprint, port)`, `stop()`, `service_name()`
  - Implements `Drop` for automatic cleanup on drop
  - Tests: 2 unit tests for DiscoveredPeer clone and service type format

- [x] Add mDNS peer discovery (Phase 4B)
  - File: `src/sync/mdns.rs`
  - Created `DiscoveredPeer` struct with ip, port, fingerprint, last_seen, service_name
  - Created `PeerDiscovery` struct for browsing network services
  - Methods: `start(our_fingerprint)`, `poll()`, `matching_peers()`, `all_peers()`, `stop()`
  - `matching_peers()` filters to same vault identity (matching fingerprint)
  - `remove_stale_peers(max_age_secs)` for cleanup of old entries
  - Handles ServiceResolved/ServiceRemoved events from mDNS daemon
  - Implements `Drop` for automatic cleanup

- [x] Add direct peer WebSocket connection (Phase 4C)
  - File: `src/sync/peer.rs` (new)
  - Created `PeerConnection` struct for P2P or relay connections
  - Direct connect: `PeerConnection::connect(&peer, key_manager)`
  - Relay connect: `PeerConnection::connect_relay(url, key_manager)`
  - Methods: `send_update()`, `recv_update()`, `announce()`, `close()`, `is_direct()`, `peer()`
  - Encrypts/decrypts updates using KeyManager sync key
  - Handles Sync, History, Error, Ack message types
  - Created `connect_with_fallback()` function for direct-first with relay fallback
  - Reuses `Message` protocol from relay module
  - Added `Clone` derive to `KeyManager` in `src/crypto.rs`
  - Tests: 1 unit test for type compilation verification
