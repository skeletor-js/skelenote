---
name: docs
description: Update documentation after implementing features or making changes
---

# Docs Skill

Invokes the docs-maintainer agent to update documentation.

## Information Needed

1. **What Changed** - Feature, fix, or architectural change
2. **Docs to Update** (optional) - Specific docs if known

## Steps

1. Identify what was changed:
   - Review recent commits or conversation context
   - Determine scope of documentation impact

2. Launch docs-maintainer agent via Task tool:

```
Task({
  subagent_type: "docs-maintainer",
  prompt: "Update documentation for [change description].

    Changes made:
    - [list of changes]

    Identify and update relevant documentation:
    - CLAUDE.md (if development patterns changed)
    - Architecture docs (if system design changed)
    - API reference (if Tauri commands changed)
    - User guides (if user-facing features changed)
    - Style guide (if UI patterns changed)"
})
```

1. Review agent's documentation updates

## Documentation Map

| Doc Type | Location | When to Update |
| -------- | -------- | -------------- |
| **CLAUDE.md** | `/CLAUDE.md` | Development patterns, gotchas |
| **Architecture** | `docs/developer/architecture.md` | System design, data flow |
| **Tauri API** | `docs/developer/tauri-api.md` | Rust command changes |
| **Testing** | `docs/developer/testing.md` | Test patterns, coverage |
| **Design System** | `docs/product/design/` | UI colors, components, patterns |
| **User Guides** | `docs/user/guides/` | Feature how-tos |

## Example: Document New Feature

User: "Update docs for the PDF export feature"

Launch agent:

```
Task({
  subagent_type: "docs-maintainer",
  prompt: "Document the new PDF export feature:

    Feature: Export objects to styled PDF documents
    Location: src/lib/export/pdf.ts

    Update:
    - CLAUDE.md Export System section
    - User guide for export functionality
    - Add code examples for PDF export API"
})
```

## Example: Document API Change

User: "Document the new haptic_notification command"

Launch agent:

```
Task({
  subagent_type: "docs-maintainer",
  prompt: "Document the new Tauri command haptic_notification:

    Command: haptic_notification(type: string)
    Types: success, warning, error

    Update:
    - docs/developer/tauri-api.md
    - CLAUDE.md Rust/Tauri Commands section"
})
```

## Notes

- Always runs via the docs-maintainer agent (model: opus)
- Maintains consistency with project conventions
- Updates docs in the same PR as code changes
- CLAUDE.md is the single source of truth for development patterns
