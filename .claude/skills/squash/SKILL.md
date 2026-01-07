---
name: squash
description: Squash merge a PR after CI passes, then cleanup
---

# Squash Skill

Squash merges the current branch's PR after verifying CI has passed.

## Steps

1. Verify we're on a feature branch:
```bash
git branch --show-current
```

2. Check that a PR exists for this branch:
```bash
gh pr view --json state,statusCheckRollup
```

3. Verify CI checks have passed:
   - If checks are still running, inform user to wait
   - If checks failed, inform user and stop
   - Only proceed if all checks passed

4. Squash merge the PR and delete the branch:
```bash
gh pr merge --squash --delete-branch
```

5. Switch to main and pull:
```bash
git checkout main
git pull origin main
```

6. Confirm the merge was successful and show the commit.

## Prerequisites

- GitHub CLI (`gh`) must be installed and authenticated
- Must have an open PR for the current branch
- All CI checks must have passed

## Safety Checks

This skill will REFUSE to merge if:
- CI checks are failing
- CI checks are still running
- No PR exists for the current branch
- Currently on main branch

## Example Output

```
✓ CI checks passed
✓ PR #42 squash merged
✓ Branch feature/add-filters deleted
✓ Switched to main and pulled

Merge commit: abc1234 feat: add task priority filtering
```
