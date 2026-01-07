---
description: Clean up local branches that have been merged and deleted on remote (project)
allowed-tools: Bash(git fetch:*), Bash(git branch:*)
---

Remove local branches that have been merged and deleted from the remote.

## Steps

1. Fetch and prune remote tracking branches:
```bash
git fetch --prune
```

2. Find branches that are marked as gone (deleted on remote):
```bash
git branch -vv | grep ': gone]' | awk '{print $1}'
```

3. If branches found, list them and delete:
```bash
git branch -D <branch-name>
```

4. Report what was cleaned up.

## When to Use

- Periodically to keep local repo tidy
- After merging several PRs
- When `git branch` output is cluttered

## Notes

- Only deletes branches whose remote tracking branch is gone
- Safe to run anytime - won't delete active work
- Uses -D (force delete) since branches are already merged
