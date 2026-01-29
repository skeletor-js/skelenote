# Skelenote Tasks

> **This file is the single source of truth for all work.**
> Nothing gets implemented without being documented here first.

## Rules

1. **Every task goes here BEFORE execution**
2. **No work happens unless it's in this file**
3. **New ideas/suggestions must be added here before implementation**
4. **Update status as work progresses**
5. **Move completed tasks to `COMPLETED_TASKS.md`** after finishing a feature/section

## Task Format

Write tasks like you're explaining to a junior dev:

```text
BAD: "add authentication"

GOOD:
- [ ] Create /api/auth/login endpoint
  - Accepts POST with {email, password}
  - Returns JWT token on success
  - Returns 401 with error message on fail
  - Add tests in /api/auth/login.test.ts
```

## Status Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Completed
- `[!]` - Blocked (add reason)

---

## Active Tasks

### v0.2 — Experience (TUI Polish)

#### Advanced Search

- [~] Add search filter syntax for tags (`tag:foo`)
  - File: `src/tui/app.rs`, `src/vault.rs`
  - Parse query for `tag:` prefix
  - Filter results by tag match (case-insensitive)
  - Tags stored as comma-separated in `notes.tags` column
  - Test: Search `tag:work`, only notes with #work tag appear
  - [x] Task 1: SearchFilters struct in `src/search.rs` (completed)
  - [x] Task 2: Add `search_filtered()` method to Index in `src/index.rs`
    - [x] Code quality fixes: tag word-boundary matching, error propagation
  - [x] Task 5: Integrate filters into Vault
    - [x] Add search_filtered method to Vault
    - [x] Write test for Vault.search_filtered
  - [ ] Task 3: Integrate into Vault.search() to use filters
    - [x] Fix LIKE pattern escaping for backlink filters
  - [ ] Task 4: Wire up TUI search to use filtered search

- [ ] Add search filter for date range (`after:2025-01-01`)
  - File: `src/tui/app.rs`, `src/vault.rs`
  - Parse `after:` and `before:` prefixes
  - Filter by `created` or `updated` frontmatter fields (ISO 8601)
  - Support both: `after:2025-01-01` and `before:2025-12-31`
  - Test: Search `after:2025-01-01`, only recent notes appear

- [x] Add search filter for backlinks (`links:note-id` or `linkedby:note-id`)
  - File: `src/tui/app.rs`, `src/vault.rs`, `src/index.rs`
  - `links:X` - find notes that link TO note X (by ID, title, or path)
  - `linkedby:X` - find notes that are linked FROM note X
  - Leverage existing `backlinks` table with three-tier resolution
  - Test: Search `linkedby:my-note`, see all notes that link to it
  - [x] Task 3.1: Add failing tests for backlink filter search
  - [x] Task 3.2: Add helper methods (get_sources_linking_to, get_targets_linked_from)
  - [x] Task 3.3: Update search_filtered to handle backlink filters
  - [x] Task 3.4: Run tests and verify all pass

- [ ] Add search filter by note ID (`id:uuid`)
  - File: `src/tui/app.rs`, `src/vault.rs`
  - Parse query for `id:` prefix
  - Match against `notes.id` column (UUID format)
  - Useful for finding notes by their unique identifier
  - Test: Search `id:550e8400`, partial match on note ID

- [ ] Add search results highlighting
  - File: `src/tui/ui.rs`, `src/tui/theme.rs`
  - Store search query in App state
  - When rendering search results, highlight matching text
  - Add `syntax_highlight: Style` to Theme
  - Test: Search for term, see it highlighted in results

- [~] Add fuzzy search mode (`/fuzzy query` or `~query`)
  - File: `src/tui/app.rs`, `src/vault.rs`
  - Add `fuzzy_search()` method using `sublime_fuzzy` crate
  - Match against note titles and content
  - Test: Search `~nts` matches "notes"
  - [x] Task 4: Add fuzzy_search() to Index in `src/index.rs`
    - [x] Add sublime_fuzzy dependency to Cargo.toml
    - [x] Write failing test for fuzzy search
    - [x] Implement fuzzy_search method
    - [x] Update search_filtered to use fuzzy mode
    - [x] Run all tests and verify

---

### v0.3 — Integration (MCP Enhancements)

#### MCP Filesystem Tools

- [ ] Add `read_file` MCP tool for arbitrary vault files
  - File: `src/mcp.rs`
  - Parameters: `path` (string, relative to vault root)
  - Returns: File content as string (or base64 for binary)
  - Validate path is within vault root (prevent traversal)
  - Test: Call via MCP, read any .md file

- [ ] Add `write_file` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path`, `content`
  - Creates parent directories if needed
  - Validate path is within vault root
  - Triggers reindex for .md files
  - Test: Create new file via MCP, verify on disk

- [ ] Add `create_directory` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path` (relative to vault root)
  - Creates directory and any missing parents
  - Test: Create nested folder, verify exists

- [ ] Add `get_file_info` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path`
  - Returns: `{ size, modified, is_directory, extension }`
  - Test: Get info for note, verify metadata correct

- [ ] Add `delete_file` MCP tool
  - File: `src/mcp.rs`
  - Parameters: `path`
  - Deletes file (not directories unless empty)
  - Triggers index removal for .md files
  - Test: Delete file via MCP, verify removed

- [ ] Enhance `list_directory` tool with metadata
  - File: `src/mcp.rs`
  - Return: `[{ name, path, is_directory, size, modified }]`
  - Add optional `recursive: bool` parameter
  - Test: List folder, verify metadata present

#### MCP Search Enhancements

- [ ] Add `search_advanced` MCP tool with filters
  - File: `src/mcp.rs`, `src/vault.rs`
  - Parameters: `query`, `tags[]`, `type`, `after`, `before`, `limit`
  - Build SQL WHERE clause dynamically
  - Test: Search with tag filter, verify filtered results

- [ ] Add `get_index_stats` MCP tool
  - File: `src/mcp.rs`, `src/index.rs`
  - Returns: `{ total_notes, total_tasks, total_backlinks, indexed_embeddings }`
  - Useful for AI agents to understand vault size
  - Test: Call tool, verify counts match

- [ ] Add `find_related` MCP tool
  - File: `src/mcp.rs`, `src/vault.rs`
  - Parameters: `path`, `limit`
  - Uses semantic search on note's embedding
  - Returns: Similar notes by content
  - Test: Find related to a note, verify semantically similar

- [ ] Add `get_tags` MCP tool
  - File: `src/mcp.rs`, `src/index.rs`
  - Returns: List of all tags with note counts
  - Useful for AI agents to understand taxonomy
  - Test: Call tool, verify tag list

- [ ] Add `get_note_graph` MCP tool
  - File: `src/mcp.rs`, `src/index.rs`
  - Returns: `{ nodes: [{path, title}], edges: [{source, target}] }`
  - Based on backlinks table
  - Test: Call tool, verify graph structure

---

### v0.4 — Sync (Rust Relay & P2P)

> **Security Model:** Relay is "honest but curious" - routes encrypted blobs but cannot
> read them. No user database or auth server. Identity derived from mnemonic.
> Device pairing = entering same 24-word mnemonic on both devices.

#### Relay Server (Zero-Knowledge)

- [ ] Add message persistence to relay server
  - File: `src/relay/server.rs`
  - Store messages in SQLite (new `relay.db`)
  - Schema: `messages(id, room, encrypted_payload, timestamp)`
  - Relay stores encrypted blobs (cannot decrypt)
  - Replay recent messages on client join
  - Test: Disconnect/reconnect, receive missed messages

- [ ] Add message versioning/sequencing
  - File: `src/relay/protocol.rs`, `src/relay/server.rs`
  - Add `seq: u64` to Sync message
  - Server tracks per-room sequence counter
  - Clients can request messages from specific seq
  - Test: Request messages from seq N, receive correct range

- [ ] Add identity announcement (replaces auth handshake)
  - File: `src/relay/protocol.rs`, `src/relay/server.rs`
  - Client sends `Announce { user_id, fingerprint }` on connect
  - Server derives room from user_id: `room = hash(user_id)`
  - NO user database - server just routes, doesn't verify
  - Devices with same mnemonic → same user_id → same room
  - Rate limit by IP to prevent spam (no identity verification needed)
  - Test: Two clients with same user_id auto-join same room

- [ ] Add E2E encryption for sync payloads
  - File: `src/sync/transport.rs` (new)
  - Encrypt all Loro updates with `KeyManager::sync_key()` before sending
  - Message format: `{ room_id, nonce, encrypted_blob }`
  - Relay cannot decrypt (doesn't have mnemonic)
  - Receiving device decrypts with same sync_key (derived from same mnemonic)
  - Test: Capture relay traffic, verify payload is encrypted gibberish

- [ ] Add room cleanup for idle rooms
  - File: `src/relay/server.rs`
  - Track last activity timestamp per room
  - Spawn cleanup task (runs every 5 min)
  - Remove rooms with no activity for 1 hour
  - Test: Create room, wait, verify cleaned up

- [ ] Add rate limiting to relay server
  - File: `src/relay/server.rs`
  - Track messages per client per minute
  - Reject clients exceeding 100 msg/min
  - Test: Send rapid messages, verify rate limited

#### P2P Discovery

- [ ] Add mDNS service advertisement
  - File: `src/relay/mdns.rs` (new)
  - Use `mdns` crate for service announcement
  - Advertise `_skelenote._tcp.local` on local network
  - Include user fingerprint in TXT record
  - Test: Run TUI, verify service visible via `dns-sd -B`

- [ ] Add mDNS peer discovery
  - File: `src/relay/mdns.rs`
  - Browse for `_skelenote._tcp.local` services
  - Maintain list of discovered peers
  - Filter by matching fingerprint (same vault identity)
  - Test: Run two instances, verify mutual discovery

- [ ] Add direct peer WebSocket connection
  - File: `src/relay/peer.rs` (new)
  - Connect directly to discovered peer's IP:port
  - Reuse existing Sync message protocol
  - Fallback to relay if direct connection fails
  - Test: Two local instances sync without relay

- [ ] Add peer connection status UI in TUI
  - File: `src/tui/app.rs`, `src/tui/ui.rs`
  - Show connected peers in status bar or dedicated view
  - Display: peer fingerprint, connection type (direct/relay)
  - Test: Connect peer, verify shown in UI

- [ ] Add "Link Another Device" info screen in TUI
  - File: `src/tui/app.rs`, `src/tui/ui.rs`
  - Accessible via settings menu or `:link` command
  - Display: "To sync with another device, enter the same 24-word recovery phrase"
  - Show current fingerprint for visual verification across devices
  - No QR codes or pairing servers - mnemonic IS the pairing mechanism
  - Test: Open screen, verify fingerprint matches identity

#### Sync Protocol (Hybrid Loro CRDT)

> **Architecture:** Notes remain plain `.md` files for AI/MCP readability.
> Loro CRDT state stored separately in SQLite. Sync transport uses Loro
> operations, applied to local markdown files after merge.

- [ ] Add `loro` crate dependency
  - File: `Cargo.toml`
  - Add `loro = "1.x"` (latest stable)
  - Loro provides `LoroDoc`, `LoroText` for text CRDT
  - Test: Compile project with new dependency

- [ ] Add sync state table to SQLite index
  - File: `src/index.rs`
  - Schema: `sync_state(path, local_version BLOB, loro_doc BLOB)`
  - Store Loro document snapshot alongside each note
  - Markdown file remains the user-facing source of truth
  - Test: Create note, verify sync_state row created

- [ ] Implement Loro wrapper for markdown files
  - File: `src/sync/crdt.rs` (new)
  - Use `loro::LoroDoc` with `LoroText` for note content
  - `LoroNote::from_markdown()` - initialize LoroText from .md file
  - `LoroNote::apply_updates()` - import remote updates via `doc.import()`
  - `LoroNote::to_markdown()` - export LoroText to plain string
  - `LoroNote::export_updates()` - get binary updates for sync
  - Markdown file updated after each merge (stays readable)
  - Test: Edit same note on two devices, verify merge, verify .md is plain text

- [ ] Add delta sync (send Loro updates, not full content)
  - File: `src/sync/delta.rs` (new)
  - Use `doc.export_from(&version)` to get updates since last sync
  - Send binary updates (compact, efficient)
  - Receiving node applies via `doc.import()`, then writes to .md file
  - Test: Edit note, verify only delta transmitted, verify .md updated

- [ ] Add conflict detection and resolution
  - File: `src/sync/crdt.rs`
  - Loro handles concurrent edits automatically via CRDT semantics
  - For delete vs edit conflicts, Loro preserves edits (configurable)
  - Surface merge results to user via status indicator
  - Test: Create conflicting edits, verify auto-merge

- [ ] Add sync status tracking per note
  - File: `src/vault.rs`, `src/index.rs`
  - Track: `synced_at`, `local_version` (Loro VersionVector)
  - Show sync status in TUI (✓ synced, ↑ pending, ⟳ syncing)
  - MCP can query sync status via existing note tools
  - Test: Edit note, verify status changes
