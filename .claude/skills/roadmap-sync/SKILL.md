---
name: roadmap-sync
description: Sync ROADMAP.md changes with GitHub issues
---

# Roadmap Sync Skill

Check alignment between ROADMAP.md and GitHub issues, reporting any drift.

## Steps

1. Read ROADMAP.md to extract planned features

2. List all roadmap issues:
```bash
gh issue list --label roadmap --state all --limit 100
```

3. Compare and report:
   - Features in roadmap without GitHub issues
   - Issues not reflected in roadmap (may be closed/removed)
   - Status mismatches (e.g., issue closed but feature still listed as planned)

4. Optionally create missing issues or suggest roadmap updates

## Output Format

```
## Roadmap Sync Report

### Missing Issues (in roadmap, no GitHub issue)
- [ ] Feature X (v0.3)

### Orphaned Issues (in GitHub, not in roadmap)
- #123 Feature Y - may need to close or add to roadmap

### Status Mismatches
- #45 marked done but still listed as planned in v0.2

### Summary
- Roadmap features: 49
- GitHub issues: 49
- Sync status: In sync
```
