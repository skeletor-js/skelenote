---
description: Generate comprehensive tests via test-generator agent
---

# Tests Skill

Invokes the test-generator agent for comprehensive test generation.

## Information Needed

1. **Target** - What to test:
   - Specific file or component
   - New feature
   - Module or directory

## Steps

1. Determine test scope:
   - Identify files or components to test
   - Determine test type (unit, integration)

2. Launch test-generator agent via Task tool:

```
Task({
  subagent_type: "test-generator",
  prompt: "Generate comprehensive tests for [target]:

    Testing approach:
    - Integration tests for P0/P1/P2 components (95%+ coverage)
    - Unit tests for P3/P4/P5 components (50-70% coverage)
    - Mock only at boundaries (Tauri APIs, file system)
    - Use real implementations for business logic

    Follow Testing Pyramid methodology."
})
```

3. Review generated tests

## Test Priority Levels

| Priority | Components | Coverage Target |
| -------- | ---------- | --------------- |
| **P0** | Core data (Loro, ObjectStore) | 95%+ integration |
| **P1** | Sync, encryption | 95%+ integration |
| **P2** | Business logic | 90%+ integration |
| **P3** | UI components | 70% unit |
| **P4** | Utilities | 50-70% unit |
| **P5** | Edge cases | As needed |

## Example: Generate Component Tests

User: "Generate tests for TasksView"

Launch agent:
```
Task({
  subagent_type: "test-generator",
  prompt: "Generate tests for src/components/views/TasksView.tsx:

    Component functionality:
    - Displays filtered task list
    - Supports priority filtering
    - Shows overdue, today, this week sections

    Generate:
    - Integration tests with real ObjectStore
    - Mock only Tauri APIs
    - Test filter interactions
    - Test empty states"
})
```

## Example: Generate Hook Tests

User: "Generate tests for useInbox hook"

Launch agent:
```
Task({
  subagent_type: "test-generator",
  prompt: "Generate tests for src/hooks/useInbox.ts:

    Hook functionality:
    - Returns inbox items (inboxed: true)
    - Excludes Tags, Projects, Areas
    - Provides processItem function

    Generate:
    - Unit tests with mocked ObjectContext
    - Test filtering logic
    - Test processItem behavior"
})
```

## Notes

- Always runs via the test-generator agent (model: opus)
- Follows Testing Pyramid methodology
- Mocks only at boundaries, not internal implementation
- Test files co-located with source (.test.ts or .spec.ts)
