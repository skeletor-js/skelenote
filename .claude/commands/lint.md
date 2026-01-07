---
description: Run ESLint and optionally auto-fix issues (project)
allowed-tools: Bash(pnpm lint:*)
---

Run ESLint to check code style and offer to auto-fix issues.

## Steps

1. Run ESLint:
```bash
pnpm lint
```

2. If issues found, show the summary

3. Offer to auto-fix:
```bash
pnpm lint --fix
```

4. Report what was fixed

## What Gets Checked

- Unused variables and imports
- Import ordering
- React hooks rules
- TypeScript-specific patterns
- Code formatting issues
