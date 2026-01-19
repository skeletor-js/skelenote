---
name: roadmap-sync
description: Sync ROADMAP.md changes with Linear issues
---

# Roadmap Sync Skill

Check alignment between ROADMAP.md and Linear issues, reporting any drift.

## Steps

1. Read ROADMAP.md to extract planned features

2. List all issues from Linear:

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  limit: 250
})
```

3. Compare and report:
   - Features in roadmap without Linear issues
   - Issues not reflected in roadmap
   - Status mismatches (issue done but still listed as planned)

4. Optionally create missing issues or suggest roadmap updates

## Output Format

```markdown
## Roadmap Sync Report

### Missing Issues (in roadmap, no Linear issue)

- [ ] Feature X (v0.3)
- [ ] Feature Y (v0.2)

### Orphaned Issues (in Linear, not in roadmap)

- NOTE-123 Feature Z - may need to cancel or add to roadmap

### Status Mismatches

- NOTE-45 marked done but still listed as planned in v0.2

### Summary

- Roadmap features: 49
- Linear issues: 45
- Missing issues: 4
- Sync status: Needs attention
```

## Creating Missing Issues

For each missing roadmap item, create a Linear issue:

```
mcp__linear-server__create_issue({
  title: "Feature title from roadmap",
  description: "## Summary\n\n[From roadmap]\n\n## Source\n\nROADMAP.md - v0.2 - Exodus",
  team: "Skelenote",
  project: "v0.2 - Exodus",
  labels: ["Feature"]
})
```

## Checking Specific Project

To sync only a specific project:

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  project: "v0.2 - Exodus"
})
```

Then compare against the v0.2 section of ROADMAP.md.

## Notes

- Always verify project assignment before creating issues
- Ask user to confirm before creating multiple issues
- Report sync status even if everything is aligned
