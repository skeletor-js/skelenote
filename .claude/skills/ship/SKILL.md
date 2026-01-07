---
name: ship
description: Full PR workflow - push, create PR, squash merge (no CI wait)
---

# Ship Skill

Complete end-to-end workflow from feature branch to merged main.

**Important:** CI does NOT run on PRs. You must run `/check` locally before using this skill.

## Steps

1. Run `/check` to validate locally (REQUIRED):
```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm test:run && cd src-tauri && cargo test
```

2. Verify we're on a feature branch:
```bash
git branch --show-current
```

3. Push the branch:
```bash
git push -u origin HEAD
```

4. Check if PR already exists:
```bash
gh pr view 2>/dev/null
```

5. If no PR exists, create one:
```bash
gh pr create --fill
```

6. Squash merge immediately (no CI wait):
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
✓ Local checks passed
✓ Pushed to origin/feature/fix-typo
✓ Created PR #43
✓ Squash merged PR #43
✓ Switched to main

Done! Commit abc1234 is now on main.
CI will run on main after merge.
```

## Notes

- This skill combines /pr and /squash into a single workflow
- CI runs AFTER merge to main, not on the PR
- If you skip `/check` and CI fails after merge, fix immediately on main or revert
