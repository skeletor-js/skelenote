# Skelenote

**The Permanent Operating System for Your Mind**

A headless, local-first productivity backend with a TUI and MCP interface. Your vault lives on your device, encrypted with keys only you control.

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![Rust](https://img.shields.io/badge/rust-2021-orange)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)
![Interface](https://img.shields.io/badge/interface-TUI%20%7C%20MCP%20%7C%20CLI-blue)
![Encryption](https://img.shields.io/badge/encryption-XChaCha20--Poly1305-purple)
![Sync](https://img.shields.io/badge/sync-P2P%20%7C%20Relay-teal)
![Local-First](https://img.shields.io/badge/local--first-yes-brightgreen)

---

## Vision

Skelenote is the **plumbing for personal knowledge**. It's not trying to be the prettiest note app — it's trying to be the most *interoperable* one.

Your notes should be accessible to:

- You, via terminal
- Your AI assistant, via MCP
- Your scripts, via the API
- Your other devices, via sync
- Future interfaces you haven't built yet

The markdown files are yours. The index makes them fast. The sync keeps them everywhere. The MCP makes them useful to AI.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Your Devices                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  Terminal   │    │  AI Agent   │    │   Mobile    │        │
│   │    (TUI)    │    │ (via MCP)   │    │   (future)  │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │  Skelenote Core │                          │
│                    │  (Rust daemon)  │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│          ┌──────────────────┼──────────────────┐                │
│          │                  │                  │                │
│   ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐        │
│   │  Markdown   │    │   SQLite    │    │    Loro     │        │
│   │   Files     │    │   Index     │    │    CRDT     │        │
│   │  (source)   │    │  (search)   │    │   (sync)    │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Sync Layer    │
                    │ (Relay or P2P)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
       │   Laptop    │ │  Desktop  │ │   Phone     │
       └─────────────┘ └───────────┘ └─────────────┘
```

Skelenote is built as a single Rust binary that provides multiple interfaces:

1. **TUI**: Built with `ratatui` — fast, keyboard-driven terminal interface
2. **MCP Server**: Built with `axum` — expose your vault to AI agents
3. **CLI**: Built with `clap` — scripting and quick interactions

---

## Core Principles

### Markdown is the Source of Truth

- Notes are plain `.md` files with YAML frontmatter
- Always human-readable, always portable
- No proprietary format lock-in
- AI agents read the same files you do

### SQLite for Speed

- FTS5 full-text search across all notes
- Semantic search via local embeddings (fastembed)
- Backlink graph for knowledge connections
- Task extraction with due dates and priorities

### Loro CRDT for Sync

- Conflict-free merging across devices
- CRDT state stored separately — markdown stays clean
- Delta sync (only changes transmitted)
- Works offline, syncs when connected

### XChaCha20 Encryption

- End-to-end encrypted sync
- BIP39 mnemonic for key derivation
- Deterministic user identity from seed phrase
- Zero-knowledge relay server

---

## Features

### AI-Native Knowledge Base

Your notes become a first-class data source for AI agents. Via MCP, agents can:

- Search your vault (full-text + semantic + advanced filters)
- Read and write notes and arbitrary files
- Traverse the knowledge graph (nodes + edges)
- Manage tasks and daily notes
- Query tag taxonomy with counts
- Find semantically related notes
- Get vault statistics

### Local-First, Sync-Ready

- Works completely offline
- Your data never leaves your machine unless you want it to
- E2E encrypted sync (XChaCha20-Poly1305, relay cannot decrypt)
- mDNS discovery for P2P sync on local network
- WebSocket relay for cross-network sync
- Delta sync via Loro CRDT (only changes transmitted)
- Automatic conflict resolution

### Terminal-Native Interface

- Fast, keyboard-driven TUI with Vim-style navigation
- **Mouse support**: Click notes, tabs, scroll content
- **8 built-in themes**: Claude Inspired, One Dark Pro, Dracula, Tokyo Night, Catppuccin, Night Owl, SynthWave '84
- **Custom themes**: Define your own colors in config.toml
- **Text selection**: Shift+Arrow with Cmd/Ctrl+C/X/V clipboard
- **Undo/Redo**: Cmd/Ctrl+Z/Y with 100-snapshot history
- Works over SSH, in tmux, anywhere

### Advanced Search

- Full-text search with FTS5
- Semantic search via local embeddings (fastembed)
- **Filter syntax**: `tag:work`, `after:2025-01-01`, `before:2025-12-31`
- **Backlink queries**: `links:note-id`, `linkedby:note-id`
- **Fuzzy search**: `~query` for Sublime-style matching
- **Result highlighting**: Multi-word case-insensitive

### Knowledge Graph

- Automatic backlink tracking (`[[wikilinks]]`)
- ID-based linking with UUID auto-generation
- Three-tier link resolution (by ID, title, or path)
- Semantic similarity ("find related notes")
- Tag taxonomy with counts
- Graph export via MCP (nodes + edges)

### Task Management

- Tasks extracted from markdown (`- [ ]`, `- [x]`, `- [/]`)
- Due dates (`@due(2025-02-01)`)
- Priority levels (`@priority(urgent|high|medium|low)`)
- Projects and areas (`@project()`, `@area()`)
- Recurring tasks (`@recurrence()`)

### Security

- **24-word BIP39 mnemonic** for disaster recovery
- **Master password** for daily unlock (Argon2id key derivation)
- **Identity file**: Encrypted mnemonic stored locally
- **Fingerprint display**: 8-character identity for device pairing

---

## Installation

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)

### Build from Source

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
cargo build --release
```

---

## Usage

### TUI Mode

Launch the Text User Interface:

```bash
cargo run --release -- tui
# OR if installed
skelenote tui
```

Options:

- `--watch`: Enable file watcher for real-time updates.

### MCP Server

Start the MCP server to connect with AI agents:

```bash
cargo run --release -- serve --port 3000
# OR if installed
skelenote serve --port 3000
```

### CLI Commands

- `skelenote init [path]`: Initialize a new vault.
- `skelenote search <query>`: Search your notes (`--semantic` for embedding search).
- `skelenote tasks [--filter today|week|overdue|all]`: List your tasks.
- `skelenote daily [DATE]`: Open a daily note.
- `skelenote capture "text"`: Quick capture to inbox.
- `skelenote relay --port 8080`: Start sync relay server.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for release details:

- **v0.1** ✅: Core TUI & MCP Server
- **v0.2** ✅: Enhanced TUI (Mouse, Themes, Search)
- **v0.3** ✅: Advanced MCP Tools & File Handling
- **v0.4** ✅: Relay, P2P Discovery, E2E Encryption
- **v0.5** 📋: TUI-Sync Integration & Production Testing

---

## License

MIT
