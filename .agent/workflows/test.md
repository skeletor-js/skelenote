---
description: Run all tests (frontend and backend)
---

# Test Skill

Runs the complete test suite for both frontend (Vitest) and backend (Cargo).

## Steps

1. Run frontend tests:
// turbo
```bash
pnpm test:run
```

2. Run Rust backend tests:
// turbo
```bash
cd src-tauri && cargo test
```

3. Report combined results.

## Test Frameworks

### Frontend (Vitest)
- Test files are co-located with source files: `*.test.ts`, `*.spec.ts`
- Uses `@testing-library/react` for component tests
- Mocks Tauri APIs for unit testing

### Backend (Cargo)
- Test in `src-tauri/src/` modules
- Uses standard Rust test framework
- Tests crypto, network, and command handlers

## Example Output

```
=== Frontend Tests ===
 ✓ src/lib/loro/object-store.test.ts (12 tests)
 ✓ src/hooks/useInbox.test.ts (5 tests)
 ✓ src/lib/templates/template-engine.test.ts (8 tests)

Test Files: 3 passed
Tests:      25 passed
Duration:   2.3s

=== Backend Tests ===
running 8 tests
test crypto::tests::test_key_derivation ... ok
test crypto::tests::test_encryption ... ok
test network::tests::test_discovery ... ok
...

test result: ok. 8 passed; 0 failed

=== Summary ===
✓ Frontend: 25 tests passed
✓ Backend: 8 tests passed
```

## Running Specific Tests

For more granular testing:
```bash
pnpm test -- src/path/to/test.ts     # Specific frontend test
cd src-tauri && cargo test test_name  # Specific Rust test
```
