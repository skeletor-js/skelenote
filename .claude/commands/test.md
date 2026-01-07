---
description: Run all tests (frontend and backend) (project)
allowed-tools: Bash(pnpm test:*), Bash(cargo test:*)
---

Run the complete test suite for both frontend (Vitest) and backend (Cargo).

## Steps

1. Run frontend tests:
```bash
pnpm test:run
```

2. Run Rust backend tests:
```bash
cd src-tauri && cargo test
```

3. Report combined results.

## Test Frameworks

- **Frontend**: Vitest with @testing-library/react
- **Backend**: Standard Rust test framework

## Expected Output

```
=== Frontend Tests ===
✓ X tests passed

=== Backend Tests ===
✓ X tests passed

=== Summary ===
All tests passed!
```
