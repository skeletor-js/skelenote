---
name: issue
description: Create and manage GitHub issues linked to roadmap
---

# Issue Skill

Create and manage GitHub issues for the Skelenote roadmap.

## Information Needed

- Action: create, view, close, or list
- For create: title, description, milestone, labels

## Steps

### Create an issue:
```bash
gh issue create --title "<title>" --body "<body>" --label "roadmap,enhancement" --milestone "v0.2 - Exodus"
```

### Add issue to project:
```bash
gh project item-add 1 --owner skeletor-js --url <ISSUE_URL>
```

### View issue:
```bash
gh issue view <NUMBER>
```

### List issues by milestone:
```bash
gh issue list --milestone "v0.2 - Exodus" --state open
```

### Close issue:
```bash
gh issue close <NUMBER>
```

## Issue Body Template

```markdown
## Description
[Feature description]

## Acceptance Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]

## Technical Notes
[Implementation details]

## Related
- Roadmap: ROADMAP.md
```

## Labels

- `roadmap` - All roadmap-tracked issues
- `enhancement` - Feature issues
- `phase-1/2/3/4` - Phase within release
- `competitive-gap` - From competitor analysis
- `package` - Package extraction
