---
description: Sync current branch with its remote tracking branch (project)
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git pull:*), Bash(git push:*), Bash(git fetch:*), Bash(git rebase:*)
---

Sync the current branch with its remote, handling different scenarios.

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
Check status with `git status -sb`:

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

## Notes

- Uses rebase to keep history clean on feature branches
- Automatically handles tracking branch setup
