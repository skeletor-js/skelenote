---
description: View and manage Linear projects
---

# Project Skill

View and manage Skelenote projects in Linear using Linear MCP.

## Information Needed

- **Action**: view, list, or update
- **For update**: project name and changes

## Steps

### List All Projects

```
mcp__linear-server__list_projects({
  team: "Skelenote"
})
```

### View Project Details

```
mcp__linear-server__get_project({
  query: "v0.2 - Exodus"
})
```

### List Issues in Project

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  project: "v0.2 - Exodus"
})
```

### List Issues by State

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  project: "v0.2 - Exodus",
  state: "In Progress"
})
```

### List Current Cycle

```
mcp__linear-server__list_cycles({
  teamId: "team-id",
  type: "current"
})
```

### Update Project

```
mcp__linear-server__update_project({
  id: "project-id",
  state: "completed"
})
```

## Projects

| Project              | Description                    |
| -------------------- | ------------------------------ |
| v0.2 - Exodus        | Data freedom & portability     |
| v0.3 - Pocket        | Mobile apps & notifications    |
| v0.4 - Oracle        | Sovereign AI on-device         |
| v0.5 - Sentinel      | Security hardening             |
| v1.0 - Cartographer  | Visualization & spatial        |

## Example

User: "Show me what's in progress for v0.2"

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  project: "v0.2 - Exodus",
  state: "In Progress"
})
```

## Progress Report

To generate a progress report:

1. List all issues in project
2. Group by state (Backlog, Todo, In Progress, Done)
3. Calculate completion percentage
4. Present formatted summary

```markdown
## v0.2 - Exodus Progress

| Status      | Count |
| ----------- | ----- |
| Done        | 5     |
| In Progress | 3     |
| Todo        | 8     |
| Backlog     | 4     |

**Progress:** 25% complete (5/20 issues)
```
