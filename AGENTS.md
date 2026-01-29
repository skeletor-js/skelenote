# Skelenote Developer Context

## ⚠️ CRITICAL: Task Management

**TASKS.md is the single source of truth.**

Before doing ANY work:

1. Check `TASKS.md` for the task
2. If the task doesn't exist, add it first
3. Mark task as in-progress `[~]`
4. Complete work
5. Mark task as complete `[x]` with brief status note

**You are NOT allowed to:**

- Execute work not documented in TASKS.md
- Skip the task documentation step
- Implement suggestions without adding them to TASKS.md first

See [TASKS.md](./TASKS.md) for current work items.

## Overview

Skelenote is a headless, local-first productivity backend featuring:

- **TUI**: Terminal User Interface (`ratatui`)
- **MCP**: Model Context Protocol Server (`axum`)
- **Core**: Rust-based vault management, search, and encryption.

## Build & Run

Run all commands from Project Root.

- **Build**: `cargo build`
- **Run TUI**: `cargo run -- tui`
- **Run MCP**: `cargo run -- serve --port 3000`
- **Test**: `cargo test`
- **Lint**: `cargo clippy`
- **Format**: `cargo fmt`

## Architecture

- `src/main.rs`: CLI entry point & clap commands.
- `src/tui/`: UI rendering and event loop (Ratatui).
- `src/mcp/`: MCP server implementation (Axum).
- `src/lib.rs`: Core vault logic (SQLite, FS, Search).

## Coding Standards

- **Rust**: idiomatic Rust, 2021 edition.
- **Errors**: Use `anyhow` for app errors, `thiserror` for library errors.
- **Async**: `tokio` runtime.
- **Logging**: `tracing` for instrumentation.
