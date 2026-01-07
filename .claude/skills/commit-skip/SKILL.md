---
name: commit-skip
description: Create a commit with [skip ci] to skip CI pipeline
---

# Commit Skip Skill

Creates a commit that skips CI entirely, useful for documentation-only changes pushed to main.

**Note:** Since CI only runs on push to main (not on feature branches or PRs), this skill is primarily useful for:
- Documentation changes pushed directly to main
- Typo fixes on main
- Changes that don't affect code behavior

## Steps

1. Check for changes:
```bash
git status --short
```

2. If no changes, inform user and stop.

3. Review the diff:
```bash
git diff HEAD --stat
```

4. Stage all changes:
```bash
git add -A
```

5. Generate a commit message with `[skip ci]` appended:
```bash
git commit -m "<type>: <summary> [skip ci]

<optional body>

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## When to Use

- Documentation-only changes **pushed directly to main**
- Typo fixes on main
- README updates
- Comment improvements
- Config changes that don't affect build/test (e.g., `.gitignore`)

## When NOT to Use

- Any code changes that affect functionality (use `/check` + `/ship` instead)
- Changes to test files
- Changes to build configuration
- Feature branch work (CI doesn't run there anyway)
- PRs (CI doesn't run on PRs, so `[skip ci]` has no effect)

## Example

```
docs: update README installation steps [skip ci]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```
