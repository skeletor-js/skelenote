---
description: Create and manage GitHub issues (project)
allowed-tools: Bash(gh issue:*), Bash(gh project item-add:*)
---

Create and manage GitHub issues for the Skelenote roadmap.

## Quick Commands

- Create: `gh issue create --title "..." --label "roadmap,enhancement" --milestone "v0.2 - Exodus"`
- View: `gh issue view <NUMBER>`
- List: `gh issue list --milestone "v0.2 - Exodus" --state open`
- Close: `gh issue close <NUMBER>`
