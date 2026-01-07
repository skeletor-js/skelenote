---
name: ship
description: Full PR workflow - push, create PR, wait for CI, squash merge
---

# Ship Skill

Complete end-to-end workflow from feature branch to merged main.

## Steps

1. Verify we're on a feature branch:
```bash
git branch --show-current
```

2. Push the branch:
```bash
git push -u origin HEAD
```

3. Check if PR already exists:
```bash
gh pr view 2>/dev/null
```

4. If no PR exists, create one:
```bash
gh pr create --fill
```

5. Wait for CI checks to complete:
```bash
gh pr checks --watch
```

6. Once CI passes, squash merge:
```bash
gh pr merge --squash --delete-branch
```

7. Switch to main and pull:
```bash
git checkout main
git pull origin main
```

## When to Use

- Small, self-contained changes that don't need manual review
- Changes where you're confident in the implementation
- Quick fixes and documentation updates

## When NOT to Use

- Large feature implementations that need team review
- Breaking changes
- Security-sensitive code
- Changes to core architecture

## Example Output

```
✓ Pushed to origin/feature/fix-typo
✓ Created PR #43
✓ Waiting for CI checks...
✓ CI passed
✓ Squash merged PR #43
✓ Switched to main

Done! Commit abc1234 is now on main.
```

## Notes

- This skill combines /pr and /squash into a single workflow
- It will wait (potentially for several minutes) for CI to complete
- If CI fails, it will stop and report the failure
