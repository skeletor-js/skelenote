---
description: Create a semantic git commit from staged or unstaged changes
---

# Commit Skill

Creates a well-formatted semantic commit message based on the actual changes made.

## Steps

1. Check for changes:
```bash
git status --short
```

2. If no changes, inform user and stop.

3. Review the diff to understand changes:
```bash
git diff HEAD --stat
git diff HEAD
```

4. Stage all changes:
```bash
git add -A
```

5. Generate a commit message following these conventions:
   - Use semantic prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `style:`
   - First line: Brief summary (50 chars max)
   - Body: Explain what and why (if needed)
   - Footer: Add co-authored-by

6. Commit with the generated message:
```bash
git commit -m "<generated message>"
```

## Commit Message Format

```
<type>: <short summary>

<optional body explaining what changed and why>

🤖 Generated with Claude Code

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

## Example

For changes to task filtering:
```
feat: add task priority filtering

- Add priority dropdown to TasksView header
- Implement usePriorityFilter hook
- Update TaskList to respect filter

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```
