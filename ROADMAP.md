# Skelenote Product Roadmap

> **Living document** — Tracks planned releases for the Headless/TUI architecture.

---

## Release Overview

| Version | Theme | Status |
|---------|-------|--------|
| **v0.1** | Foundation | ✅ Core TUI & MCP Server |
| **v0.2** | Experience | ✅ Enhanced TUI (Mouse, Themes, Search) |
| **v0.3** | Integration | ✅ Advanced MCP Tools & File Handling |
| **v0.4** | Sync | ✅ Relay, P2P, E2E Encryption |
| **v0.5** | Production | 📋 TUI-Sync Integration & Testing |
| **v0.6** | API Excellence | 📋 REST API, OpenAPI, MCP Compliance |

---

## v0.1 — Foundation

*The core headless engine.*

**Status:** ✅ Shipped

- **TUI**: Basic note navigation and editing via `ratatui`.
- **MCP**: Expose vault tools to AI agents.
- **SQLite**: Local-first structured storage with FTS5.
- **Encryption**: XChaCha20-Poly1305 with BIP39 mnemonic.

## v0.2 — Experience

*Polishing the terminal interface.*

**Status:** ✅ Shipped

- **Mouse Support**: Click notes, tabs, scroll content, toggle focus.
- **8 Themes**: Claude Inspired, One Dark Pro, Dracula, Tokyo Night, Catppuccin, Night Owl, SynthWave '84, Custom.
- **Custom Themes**: Full color customization via config.toml.
- **Advanced Search**: Tag, date range, ID, backlink filters (`tag:`, `after:`, `links:`).
- **Fuzzy Search**: Sublime-style matching with `~` prefix.
- **Search Highlighting**: Multi-word case-insensitive highlighting.
- **Text Selection**: Shift+Arrow selection, Cmd/Ctrl+C/X/V clipboard.
- **Undo/Redo**: Cmd/Ctrl+Z/Y with 100-snapshot history.
- **Theme Persistence**: Saved to config, accessible via `:theme` command.

## v0.3 — Integration

*Deep integration with AI workflows.*

**Status:** ✅ Shipped

- **MCP Filesystem Tools**: `read_file`, `write_file`, `create_directory`, `delete_file`, `get_file_info`, `list_directory` (with metadata and recursive option).
- **MCP Search Tools**: `search_advanced` (tags, dates, links), `find_related` (semantic similarity), `get_tags` (taxonomy), `get_note_graph` (knowledge graph), `get_index_stats`.
- **Path Security**: Traversal protection for all file operations.

## v0.4 — Sync

*Rust-based synchronization infrastructure.*

**Status:** ✅ Shipped

- **Relay Server**: WebSocket-based with SQLite message persistence.
- **Message Sequencing**: Per-room sequence numbers, history replay.
- **Rate Limiting**: 100 msg/min per client with stale cleanup.
- **Room Management**: Auto-derivation from identity, idle cleanup.
- **E2E Encryption**: XChaCha20-Poly1305, relay cannot decrypt.
- **Delta Sync**: Incremental updates via Loro CRDT.
- **Conflict Resolution**: Concurrent edit detection with automatic CRDT merge.
- **Sync Status**: Synced (✓), Pending (↑), Syncing (⟳) indicators.
- **mDNS Discovery**: `_skelenote._tcp.local.` service advertisement.
- **P2P Connections**: Direct peer-to-peer with relay fallback.
- **Link Device UI**: Fingerprint display and pairing instructions.

## v0.5 — Production

*Making sync production-ready.*

**Status:** 📋 Planned

- **TUI-Sync Integration**: Connect TUI to sync transport on unlock.
- **Real-time Sync UI**: Per-note status indicators in note list.
- **Integration Tests**: Multi-client sync, reconnect, concurrent edits.
- **Sync Settings**: Enable/disable, relay URL, P2P toggle in config.

## v0.6 — API Excellence

*Top-notch headless API for maximum interoperability.*

**Status:** 📋 Planned

### Phase 1: REST API Completeness

- **RESTful Routes**: Full CRUD at `/api/v1/notes`, `/api/v1/tasks`, `/api/v1/files`
- **ID-Based Access**: Notes accessed by UUID, stable for external integrations
- **Pagination**: `?page=1&per_page=20` with `Link` headers and `X-Total-Count`
- **Error Handling**: Consistent JSON errors with codes (`NOT_FOUND`, `VALIDATION_ERROR`)
- **OpenAPI/Swagger**: Auto-generated via `utoipa`, interactive docs at `/docs`

### Phase 2: MCP Protocol Compliance

- **MCP 1.0 Spec**: Full JSON-RPC 2.0 compliance at `/mcp`
- **Resources**: Expose vault structure as browsable MCP resources
- **Prompts**: Pre-built prompt templates for common AI workflows
- **Tool Descriptions**: Rich descriptions with examples for better AI understanding

### Phase 3: Batch Operations

- **Bulk CRUD**: `POST /api/v1/batch` for multi-note operations
- **Import/Export**: JSON archive, Markdown zip, Obsidian migration
- **Tag Operations**: Rename, merge, delete tags vault-wide

### Phase 4: Discovery & Intelligence

- **Orphan Notes**: `GET /api/v1/notes/orphans` - notes with no links
- **Unlinked Mentions**: `GET /api/v1/notes/:id/unlinked` - potential wikilinks
- **Recent Notes**: `GET /api/v1/notes/recent` - by modification date
- **Random Note**: `GET /api/v1/notes/random` - serendipity
- **Statistics**: Word counts, link density, vault health metrics
