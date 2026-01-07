---
name: commit-skip
description: Create a commit with [skip ci] to skip CI pipeline
---

# Commit Skip Skill

Creates a commit that skips CI, useful for documentation, typos, or WIP saves.

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

- Documentation-only changes
- Typo fixes
- README updates
- Comment improvements
- WIP saves that don't need testing

## When NOT to Use

- Any code changes that affect functionality
- Changes to test files
- Changes to build configuration
- Anything that should be validated by CI

## Example

```
docs: update README installation steps [skip ci]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```
