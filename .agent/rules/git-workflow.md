# Git Workflow Rules

## Branch Naming

Always create a feature branch before starting work on main:

```bash
git checkout -b feature/descriptive-name
```

**Branch prefixes:**

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation updates

**With Linear integration:**

- Use Linear's "Copy git branch name" (Cmd+Shift+.)
- Format: `name/linear-id-title`
- Example: `jordan/NOTE-123-add-pdf-export`

## Commit Guidelines

**Make regular commits as you work.** This maintains cleanliness and provides fallback points if things break. Don't wait until the end to commit everything.

**Commit message format:**

```
<type>: <summary>

<optional body>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, refactor, docs, chore, test, style

## PR Workflow

1. Validate locally before merging (CI doesn't run on PRs):

   ```bash
   pnpm lint                  # ESLint
   pnpm exec tsc --noEmit     # TypeScript
   pnpm test:run              # Frontend tests
   cd src-tauri && cargo test # Rust tests
   ```

2. Link to Linear issue in PR description:
   - `Fixes NOTE-123` or `Closes NOTE-123` to auto-close

## CI/CD Notes

- CI runs only on push to main
- CI does NOT run on feature branches or PRs
- Always validate locally before merging
