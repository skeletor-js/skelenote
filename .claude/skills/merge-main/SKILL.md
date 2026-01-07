---
name: merge-main
description: Merge main into current branch, helping with conflicts if needed
---

# Merge Main Skill

Fetches and merges origin/main into the current feature branch.

## Steps

1. Verify we're on a feature branch:
```bash
git branch --show-current
```

2. Fetch the latest main:
```bash
git fetch origin main
```

3. Attempt to merge main into current branch:
```bash
git merge origin/main
```

4. If merge succeeds with no conflicts, inform user.

5. If there are merge conflicts:
   - List conflicted files:
   ```bash
   git diff --name-only --diff-filter=U
   ```
   - Show the conflicts in each file
   - Help resolve conflicts by understanding both sides
   - After resolution, stage and commit:
   ```bash
   git add -A
   git commit -m "chore: merge main into <branch-name>"
   ```

## When to Use

- Before creating a PR to ensure branch is up-to-date
- When main has changes that affect your work
- To resolve conflicts early rather than at PR time

## Example Output

### No Conflicts
```
✓ Fetched origin/main
✓ Merged main into feature/add-filters
Branch is now up-to-date with main.
```

### With Conflicts
```
⚠️ Merge conflicts detected in:
  - src/components/TaskList.tsx
  - src/hooks/useFilters.ts

Let me help resolve these...
[Shows conflict resolution assistance]

✓ Conflicts resolved
✓ Merge committed
```
