---
description: Push branch and create a pull request with auto-generated description
---

# PR Skill

Pushes the current branch and creates a pull request with a well-formatted description.

## Steps

1. Verify we're not on main:
```bash
git branch --show-current
```
If on main, inform user to create a feature branch first.

2. Push the branch with upstream tracking:
```bash
git push -u origin HEAD
```

3. Get all commits on this branch vs main:
```bash
git log origin/main..HEAD --oneline
```

4. Generate PR title and description from commits.

5. Create the PR:
```bash
gh pr create --title "<title>" --body "<body>"
```

6. Return the PR URL to the user.

## PR Description Format

```markdown
## Summary
<Brief description of what this PR does>

## Changes
- <Bullet points from commits>

## Testing
<How this was tested>

---
🤖 Generated with Claude Code
```

## Prerequisites

- GitHub CLI (`gh`) must be installed and authenticated
- Must be on a feature branch (not main)

## Example Output

```
Created pull request: https://github.com/skeletor-js/skelenote/pull/42

Title: feat: add task priority filtering
```
