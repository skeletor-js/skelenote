---
name: lint
description: Run ESLint and optionally auto-fix issues
---

# Lint Skill

Runs ESLint to check code style and offers to auto-fix issues.

## Steps

1. Run ESLint:
// turbo
```bash
pnpm lint
```

2. If issues found, show the summary.

3. Offer to auto-fix:
```bash
pnpm lint --fix
```

4. Report what was fixed.

## What Gets Checked

- Unused variables and imports
- Import ordering
- React hooks rules
- TypeScript-specific patterns
- Code formatting issues

## Example Output

### No Issues
```
✓ No linting errors found
```

### Issues Found
```
ESLint found 3 issues:

src/components/TaskList.tsx
  12:1  warning  'useState' is defined but never used  @typescript-eslint/no-unused-vars
  45:5  error    React Hook "useEffect" is called conditionally  react-hooks/rules-of-hooks

src/hooks/useFilters.ts
  8:1   warning  'debug' is assigned but never used  @typescript-eslint/no-unused-vars

1 error, 2 warnings

Would you like me to run `pnpm lint --fix` to auto-fix what's possible?
```

### After Auto-fix
```
✓ Fixed 2 issues automatically

Remaining issue (requires manual fix):
  src/components/TaskList.tsx:45:5
    React Hook "useEffect" is called conditionally
```

## Configuration

ESLint config is in `eslint.config.js`. Rules are optimized for:
- TypeScript strict mode
- React best practices
- Skelenote coding conventions
