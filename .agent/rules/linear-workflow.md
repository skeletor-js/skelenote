# Linear Workflow Rules

Skelenote uses **Linear** for issue tracking and project management.

## Structure

- **Projects**: Maps to releases (e.g., `v0.2 - Exodus`, `v0.35 - Architect`)
- **Epics**: Modeled as **Parent Issues** containing sub-issues. All "Epic" labeled issues MUST be parents.
- **Cycles**: Active 2-week sprints to maintain momentum
- **Views**: Use shared team views for "Needs Triage" and "My Epics"

## Key Labels

| Label             | Usage                                    |
| ----------------- | ---------------------------------------- |
| `Feature`         | New functionality (enhancements)         |
| `Bug`             | Defect fixes                             |
| `Improvement`     | Technical debt, refactoring              |
| `competitive-gap` | Features present in competitor apps      |
| `package`         | Candidates for extraction to OSS packages |

## Workflow

1. **Pick an issue**: Assign yourself to an issue in the current Cycle or Project
2. **Create a branch**: Use Linear's "Copy git branch name" (Cmd+Shift+.) or format `name/linear-id-title`
   - Example: `jordan/NOTE-123-add-pdf-export`
3. **Link PR**: Add `Fixes NOTE-123` or `Closes NOTE-123` in PR description to auto-close

## Skills Available

- `/linear` - Create or update Linear issues
- `/issue` - Context-aware issue search
- `/project` - View Linear projects
- `/roadmap-sync` - Sync ROADMAP.md with Linear issues

## Commit Message Linking

Reference Linear issues in commit messages:

```
feat: add PDF export functionality

Implements the export to PDF feature with custom styling.

Fixes NOTE-123

Co-Authored-By: Claude <noreply@anthropic.com>
```
