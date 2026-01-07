---
description: Run all pre-commit validation (lint, typecheck, tests) (project)
allowed-tools: Bash(pnpm lint:*), Bash(pnpm exec tsc:*), Bash(pnpm test:*), Bash(cargo test:*)
---

Run all validation that CI will run, catching failures locally before pushing.

## Steps (stop on first failure)

1. ESLint:
```bash
pnpm lint
```

2. TypeScript type checking:
```bash
pnpm exec tsc --noEmit
```

3. Frontend tests:
```bash
pnpm test:run
```

4. Backend tests:
```bash
cd src-tauri && cargo test
```

## What This Catches

- **Lint errors**: Code style issues, unused variables
- **Type errors**: TypeScript compilation issues
- **Test failures**: Broken functionality
- **Rust issues**: Backend compilation and test failures

## When to Use

- Before committing (especially to main)
- Before creating a PR
- After making significant changes
