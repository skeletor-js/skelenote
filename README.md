# Skelenote

**The Permanent Operating System for Your Mind**

A headless, local-first productivity backend with a TUI and MCP interface. Your vault lives on your device, encrypted with keys only you control.

![TUI](https://img.shields.io/badge/interface-TUI%20%7C%20MCP-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Features

- **TUI (Text User Interface)**: A fast, keyboard-centric interface for managing your notes and tasks.
- **MCP (Model Context Protocol)**: Connect your notes to AI agents (Claude, etc.) via a standardized protocol.
- **Headless Backend**: Run Skelenote as a background service or daemon.
- **Local-First**: All data stored locally in SQLite/filesystem.
- **Encrypted**: Optional encryption for your vault.

## Installation

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)

### Build from Source

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
cargo build --release
```

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

- `skelenote init`: Initialize a new vault in the current directory.
- `skelenote search <query>`: Search your notes.
- `skelenote tasks`: List your tasks.
- `skelenote daily`: Open today's daily note.
- `skelenote capture "Remember to buy milk"`: Quick capture to inbox.

## Architecture

Skelenote is built as a single Rust binary (`skelenote-core`) that provides multiple interfaces:

1. **TUI**: Built with `ratatui`.
2. **MCP Server**: Built with `axum`, exposing tools and resources to AI models.
3. **CLI**: Built with `clap` for scripting and quick interactions.

## License

MIT
