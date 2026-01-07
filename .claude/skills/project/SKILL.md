---
name: project
description: View and manage GitHub Project board
---

# Project Skill

View and manage the Skelenote Roadmap GitHub Project board.

## Information Needed

- Action: view, list, or move
- For move: issue number and target status

## Steps

1. Get project details:
```bash
gh project view 1 --owner skeletor-js
```

2. List items by status (default: all):
```bash
gh project item-list 1 --owner skeletor-js --limit 50
```

3. To filter by milestone:
```bash
gh issue list --milestone "v0.2 - Exodus" --state open
```

4. To move an item to a different status, first get field IDs:
```bash
gh project field-list 1 --owner skeletor-js
```

Then update the item:
```bash
gh project item-edit --project-id PVT_kwHOAchT0M4BMEJ5 --id <ITEM_ID> --field-id <STATUS_FIELD_ID> --single-select-option-id <OPTION_ID>
```

## Example

```
User: Show me what's in progress
Assistant: Lists items with status "In Progress" from the project board
```

## Project URL

https://github.com/users/skeletor-js/projects/1
