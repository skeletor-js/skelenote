# Skelenote Tasks

> **This file is the single source of truth for all work.**
> Nothing gets implemented without being documented here first.

## Rules

1. **Every task goes here BEFORE execution**
2. **No work happens unless it's in this file**
3. **New ideas/suggestions must be added here before implementation**
4. **Update status as work progresses**

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

- [~] Repository cleanup after pivot to pure Rust
  - Remove 11,352 deleted files from git tracking (old TypeScript/React code)
  - Add `.fastembed_cache/` to .gitignore
  - Fix README.md build path (was referencing old `skelenote-core` subdirectory)
  - Commit all changes

---

## Completed Tasks

<!-- Move completed tasks here with date -->
