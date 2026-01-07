---
description: Create a new feature branch with proper naming conventions (project)
allowed-tools: Bash(git fetch:*), Bash(git checkout:*), Bash(git branch:*)
---

Create a new git branch with consistent naming following project conventions.

## Steps

1. Ask the user for:
   - Branch name (e.g., "add-task-filters", "fix-dark-mode")
   - Branch type: `feature/`, `fix/`, `refactor/`, or `docs/`

2. Fetch the latest from origin:
```bash
git fetch origin main
```

3. Create and checkout the new branch from origin/main:
```bash
git checkout -b <type>/<branch-name> origin/main
```

4. Confirm the branch was created:
```bash
git branch --show-current
```

## Branch Naming Conventions

| Prefix | Use Case |
|--------|----------|
| `feature/` | New features and capabilities |
| `fix/` | Bug fixes |
| `refactor/` | Code improvements without behavior changes |
| `docs/` | Documentation updates |

## Examples

- `feature/add-task-filters`
- `fix/dark-mode-calendar`
- `refactor/simplify-sync-logic`
- `docs/update-api-reference`
