---
description: Create a semantic git commit from staged or unstaged changes (project)
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
---

Create a well-formatted semantic commit from the current changes.

## Steps

1. Check for changes: `git status --short`
2. If no changes, inform user and stop
3. Review the diff: `git diff HEAD --stat` and `git diff HEAD`
4. Stage all changes: `git add -A`
5. Generate a semantic commit message
6. Commit with the message

## Commit Message Format

```
<type>: <short summary>

<optional body explaining what changed and why>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Type Guidelines

- `feat:` - New feature or capability
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `docs:` - Documentation only
- `chore:` - Build, deps, config changes
- `test:` - Adding or fixing tests
- `style:` - Formatting, whitespace, etc.
