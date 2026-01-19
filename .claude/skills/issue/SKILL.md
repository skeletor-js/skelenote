---
name: issue
description: Create and manage Linear issues linked to roadmap
---

# Issue Skill

Create and manage Linear issues for the Skelenote roadmap using Linear MCP.

## Information Needed

- **Action**: create, view, update, or list
- **For create**: title, description, project, labels

## Steps

### Create an Issue

```
mcp__linear-server__create_issue({
  title: "Issue title",
  description: "Description in Markdown",
  team: "Skelenote",
  project: "v0.2 - Exodus",
  labels: ["Feature"]
})
```

### View an Issue

```
mcp__linear-server__get_issue({
  id: "NOTE-123"
})
```

### List Issues by Project

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  project: "v0.2 - Exodus",
  state: "In Progress"
})
```

### Update an Issue

```
mcp__linear-server__update_issue({
  id: "issue-id",
  state: "Done",
  labels: ["Feature", "shipped"]
})
```

### Add Comment

```
mcp__linear-server__create_comment({
  issueId: "issue-id",
  body: "Comment in Markdown"
})
```

## Issue Description Template

```markdown
## Summary

[Feature description]

## Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2

## Technical Notes

[Implementation details]

## Related

- Roadmap: ROADMAP.md
```

## Labels

| Label             | Usage                               |
| ----------------- | ----------------------------------- |
| `Feature`         | New functionality                   |
| `Bug`             | Defect fixes                        |
| `Improvement`     | Technical debt, refactoring         |
| `competitive-gap` | Features in competitor apps         |
| `package`         | Candidates for OSS extraction       |

## Projects

| Project              | Description                    |
| -------------------- | ------------------------------ |
| v0.2 - Exodus        | Data freedom & portability     |
| v0.3 - Pocket        | Mobile apps & notifications    |
| v0.4 - Oracle        | Sovereign AI on-device         |
| v0.5 - Sentinel      | Security hardening             |
| v1.0 - Cartographer  | Visualization & spatial        |
