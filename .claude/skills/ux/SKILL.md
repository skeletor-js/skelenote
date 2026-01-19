---
name: ux
description: Run a quick UX review via ux-design-specialist agent
---

# UX Skill

Invokes the ux-design-specialist agent for user experience review.

## Information Needed

1. **Target** - What to review:
   - New feature or screen design
   - Existing user flow
   - Accessibility concern

## Steps

1. Determine review scope:
   - Gather design context or screenshots
   - Identify UX concerns

2. Launch ux-design-specialist agent via Task tool:

```
Task({
  subagent_type: "ux-design-specialist",
  prompt: "Review the UX of [target]. Evaluate:
    - User flow and friction points
    - Information architecture
    - Accessibility (WCAG 2.1 AA)
    - Interaction patterns
    - Usability concerns

    Provide recommendations prioritized by user impact."
})
```

3. Review agent findings and present summary

## Review Focus Areas

| Area | What to Evaluate |
| ---- | ---------------- |
| **User Flow** | Task completion, friction points |
| **Information Architecture** | Organization, findability |
| **Accessibility** | WCAG compliance, keyboard nav |
| **Interaction** | Feedback, affordances, patterns |
| **Usability** | Learnability, efficiency, errors |

## Example: Review New Feature UX

User: "Review UX for the bulk action toolbar"

Launch agent:
```
Task({
  subagent_type: "ux-design-specialist",
  prompt: "Review UX for bulk action toolbar:

    Feature: Select multiple items and perform actions (delete, archive, tag)

    Evaluate:
    - Selection interaction (click, shift-click, cmd-click)
    - Toolbar visibility and positioning
    - Action confirmation patterns
    - Keyboard accessibility
    - Error handling and undo"
})
```

## Example: Accessibility Audit

User: "Audit keyboard navigation in the sidebar"

Launch agent:
```
Task({
  subagent_type: "ux-design-specialist",
  prompt: "Audit keyboard accessibility of the sidebar:

    Component: src/components/layout/Sidebar.tsx

    Evaluate:
    - Tab order and focus management
    - Arrow key navigation
    - Screen reader compatibility
    - Focus indicators
    - WCAG 2.1 AA compliance"
})
```

## Notes

- Always runs via the ux-design-specialist agent (model: opus)
- Recommendations prioritized by user impact
- Includes WCAG compliance considerations
- Analyzes friction points and proposes solutions
