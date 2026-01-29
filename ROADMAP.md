# Skelenote Product Roadmap

> **Living document** — Tracks planned releases for the Headless/TUI architecture.

---

## Release Overview

| Version | Theme | Status |
|---------|-------|--------|
| **v0.1** | Foundation | ✅ Core TUI & MCP Server |
| **v0.2** | Experience | 📋 Enhanced TUI (Mouse, Themes) |
| **v0.3** | Integration | 📋 Advanced MCP Tools & File Handling |
| **v0.4** | Sync | 📋 Cloud Relay via Rust |

---

## v0.1 — Foundation

*The core headless engine.*

**Status:** ✅ Shipped

- **TUI**: Basic note navigation and editing via `ratatui`.
- **MCP**: Expose vault tools to AI agents.
- **SQLite**: Local-first structured storage.
- **Encryption**: XChaCha20-Poly1305.

## v0.2 — Experience

*Polishing the terminal interface.*

**Status:** 📋 Planned

- **Mouse Support**: Click to navigate in TUI.
- **Themes**: Configurable color schemes.
- **Search**: Advanced fuzzy search in TUI.

## v0.3 — Integration

*Deep integration with AI workflows.*

**Status:** 📋 Planned

- **MCP Filesystem**: Allow agents to manage vault file structure.
- **MCP Search**: Expose semantic search to agents.

## v0.4 — Sync

*Rust-based synchronization.*

**Status:** 📋 Planned

- **Relay**: Rust implementation of the sync relay.
- **P2P**: mDNS discovery and direct sync between nodes.
