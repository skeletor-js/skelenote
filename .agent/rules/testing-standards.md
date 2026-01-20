# Testing Standards

## Test Framework

- **Frontend**: Vitest + @testing-library/react
- **Backend**: Cargo test (Rust)

## Running Tests

```bash
pnpm test                   # Run all tests in watch mode
pnpm test:run               # Run all tests once (CI mode)
pnpm test -- path/to/test   # Run specific test file
pnpm test:ui                # Run tests with Vitest UI
pnpm bench                  # Run benchmark suites
```

**Rust tests:**

```bash
cd src-tauri
cargo test                  # Run all Rust tests
cargo test -- --nocapture   # Show println! output
cargo tarpaulin             # Generate coverage report
```

## Test File Location

Test files are co-located with source files using `.test.ts` or `.spec.ts` suffix.

## Benchmark Suites

- ObjectStore CRUD
- Bulk operations
- CRDT merge
- Fuse.js search indexing
- Vector/semantic search
- Task recurrence
- Markdown import/export
- Templates
- Daily notes
- Sync operations

## Mock Patterns

Mock at boundaries only:

- Tauri APIs (`invoke`)
- File system operations
- Network requests

Use real implementations for:

- React contexts
- Loro CRDT operations
- Business logic
