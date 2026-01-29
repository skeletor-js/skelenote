# Contributing to Skelenote

Thank you for your interest in contributing to Skelenote! We are building a headless productivity backend with TUI and MCP interfaces.

## Prerequisites

- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)

## Development Setup

1. **Clone the Repository**

    ```bash
    git clone https://github.com/skeletor-js/skelenote.git
    cd skelenote/skelenote-core
    ```

2. **Run Development Build**

    ```bash
    cargo run -- tui
    ```

3. **Run Tests**

    ```bash
    cargo test
    ```

## Code Style

- **Rust**: Follow standard Rust conventions.
- **Formatting**: Run `cargo fmt` before committing.
- **Linting**: Run `cargo clippy` to catch common issues.

## Architecture

The project is contained within `skelenote-core/`.

- `src/main.rs`: Entry point.
- `src/tui/`: Text User Interface implementation (`ratatui`).
- `src/mcp/`: Model Context Protocol server implementation.
- `src/lib.rs`: Core logic and library exports.

## Pull Request Process

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Ensure `cargo test` passes.
5. Format code with `cargo fmt`.
6. Open a Pull Request.

## License

By contributing, you agree that your contributions will be licensed under the MIT license.
