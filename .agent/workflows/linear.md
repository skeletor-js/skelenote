---
description: Create and manage Linear issues, link to projects and cycles
---

# Linear Skill

Creates and manages Linear issues using the Linear MCP server.

## Information Needed

1. **Action** - create, list, update, or search
2. **Title** (for create) - Issue title
3. **Description** (optional) - Issue description in Markdown
4. **Project** (optional) - Project name to add issue to
5. **Cycle** (optional) - Cycle to add issue to
6. **Labels** (optional) - Labels to apply (Feature, Bug, Improvement, etc.)
7. **Assignee** (optional) - User to assign (use "me" for current user)

## Steps

### Create an Issue

1. Gather issue details from user
2. Use Linear MCP to create issue:

```
mcp__linear-server__create_issue({
  title: "Issue title",
  description: "Description in Markdown",
  team: "Skelenote",
  project: "v0.2 - Exodus",
  labels: ["Feature"],
  assignee: "me"
})
```

3. Return the issue identifier (e.g., NOTE-123)

### List Issues

1. Determine filter criteria (project, cycle, assignee, state)
2. Use Linear MCP to list issues:

```
mcp__linear-server__list_issues({
  team: "Skelenote",
  project: "v0.2 - Exodus",
  state: "In Progress",
  assignee: "me"
})
```

3. Format and display results

### Update an Issue

1. Get issue ID or identifier
2. Use Linear MCP to update:

```
mcp__linear-server__update_issue({
  id: "issue-uuid",
  state: "Done",
  labels: ["Feature", "shipped"]
})
```

### Search Issues

1. Get search query from user
2. Use Linear MCP to search:

```
mcp__linear-server__list_issues({
  query: "search term"
})
```

## Key Linear Labels

| Label             | Usage                               |
| ----------------- | ----------------------------------- |
| `Feature`         | New functionality                   |
| `Bug`             | Defect fixes                        |
| `Improvement`     | Technical debt, refactoring         |
| `competitive-gap` | Features in competitor apps         |
| `package`         | Candidates for OSS extraction       |

## MCP Tools Available

- `mcp__linear-server__create_issue` - Create new issue
- `mcp__linear-server__list_issues` - List/search issues
- `mcp__linear-server__get_issue` - Get issue details
- `mcp__linear-server__update_issue` - Update existing issue
- `mcp__linear-server__list_projects` - List projects
- `mcp__linear-server__list_cycles` - List cycles
- `mcp__linear-server__create_comment` - Add comment to issue
- `mcp__linear-server__list_comments` - List issue comments

## Example: Create Feature Issue

User: "Create an issue for adding PDF export"

```
mcp__linear-server__create_issue({
  title: "Add PDF export functionality",
  description: "## Summary\n\nAllow users to export notes and objects as styled PDF documents.\n\n## Requirements\n\n- Export single object\n- Export with frontmatter\n- Skelenote typography",
  team: "Skelenote",
  project: "v0.2 - Exodus",
  labels: ["Feature"]
})
```

Result: Created NOTE-456

## Notes

- Always use team "Skelenote" unless user specifies otherwise
- Link to existing cycles when adding to sprint work
- Use "me" for assignee to assign to current user
- Issue IDs follow format NOTE-XXX
