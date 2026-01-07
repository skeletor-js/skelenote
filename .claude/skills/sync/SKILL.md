---
name: sync
description: Sync current branch with its remote tracking branch
---

# Sync Skill

Syncs the current branch with its remote, handling different scenarios.

## Steps

1. Get current branch:
```bash
git branch --show-current
```

2. Based on branch, perform appropriate sync:

### If on main:
```bash
git pull origin main
```

### If on feature branch:
Check if we're ahead, behind, or both:
```bash
git status -sb
```

- **If behind tracking branch**: Pull with rebase
  ```bash
  git pull --rebase
  ```

- **If ahead of tracking branch**: Push
  ```bash
  git push
  ```

- **If diverged**: Fetch and rebase
  ```bash
  git fetch origin
  git rebase origin/<branch-name>
  ```

- **If no tracking branch**: Set upstream and push
  ```bash
  git push -u origin HEAD
  ```

## Example Output

### On main
```
✓ Pulled latest main
Already up-to-date.
```

### On feature branch (ahead)
```
✓ Pushed 3 commits to origin/feature/add-filters
```

### On feature branch (behind)
```
✓ Rebased on origin/feature/add-filters
✓ Applied 2 local commits
```

## Notes

- Uses rebase to keep history clean on feature branches
- Automatically handles tracking branch setup
