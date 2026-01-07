---
name: check
description: Run all pre-commit validation (lint, typecheck, tests)
---

# Check Skill

**Primary validation for Skelenote development.** Since CI does NOT run on feature branches or PRs, this skill is REQUIRED before merging to main.

Runs all validation that CI will run after merge, catching failures locally.

## Steps

Run these commands in sequence, stopping on first failure:

1. ESLint:
// turbo
```bash
pnpm lint
```

2. TypeScript type checking:
// turbo
```bash
pnpm exec tsc --noEmit
```

3. Frontend tests:
// turbo
```bash
pnpm test:run
```

4. Backend tests:
// turbo
```bash
cd src-tauri && cargo test
```

## What This Catches

- **Lint errors**: Code style issues, unused variables, import problems
- **Type errors**: TypeScript compilation issues
- **Test failures**: Broken functionality
- **Rust issues**: Backend compilation and test failures

## When to Use

- **ALWAYS before merging a PR** (CI won't catch issues on PRs)
- Before creating a PR (to avoid post-merge failures)
- After making significant changes
- When you want to validate everything is working

## Example Output

### All Passing
```
=== ESLint ===
✓ No linting errors

=== TypeScript ===
✓ No type errors

=== Frontend Tests ===
✓ 25 tests passed

=== Backend Tests ===
✓ 8 tests passed

All checks passed! Safe to commit.
```

### With Failures
```
=== ESLint ===
✓ No linting errors

=== TypeScript ===
✗ Type errors found:

src/components/TaskList.tsx:42:5
  error TS2339: Property 'foo' does not exist on type 'Task'

Stopping. Fix type errors before continuing.
```

## CI Equivalence

This runs the same checks as `.github/workflows/test.yml`:
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test:run`
- `cargo test`

**Important:** CI only runs after merge to main. Running `/check` locally is your primary gate for code quality.
