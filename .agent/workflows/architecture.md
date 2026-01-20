---
description: Run a quick architecture review via architect-reviewer agent
---

# Architecture Skill

Invokes the architect-reviewer agent for design pattern and architecture review.

## Information Needed

1. **Target** - What to review:
   - Proposed design or approach
   - Existing module or system
   - Integration pattern

## Steps

1. Determine review scope:
   - Gather design documents or code context
   - Identify architectural concerns

2. Launch architect-reviewer agent via Task tool:

```
Task({
  subagent_type: "architect-reviewer",
  prompt: "Review the architecture of [target]. Evaluate:
    - Design patterns and SOLID principles
    - Scalability and performance implications
    - Technical debt and maintainability
    - Integration patterns
    - Trade-offs and alternatives

    Provide recommendations with rationale."
})
```

3. Review agent findings and present summary

## Review Focus Areas

| Area | What to Evaluate |
| ---- | ---------------- |
| **Design Patterns** | SOLID principles, appropriate abstractions |
| **Scalability** | Performance implications, bottlenecks |
| **Technical Debt** | Maintainability, complexity |
| **Integration** | Module boundaries, coupling |
| **Trade-offs** | Alternatives considered, decision rationale |

## Example: Review New Feature Design

User: "Review the architecture for real-time collaboration"

Launch agent:
```
Task({
  subagent_type: "architect-reviewer",
  prompt: "Review proposed architecture for real-time collaboration:

    Proposed approach:
    - Extend existing Loro CRDT sync
    - Add presence indicators via P2P
    - Cursor position sharing

    Evaluate:
    - Scalability with multiple peers
    - Integration with existing sync protocol
    - Performance implications
    - Alternative approaches (WebRTC, etc.)"
})
```

## Example: Review Existing Module

User: "Review the sync module architecture"

Launch agent:
```
Task({
  subagent_type: "architect-reviewer",
  prompt: "Review the architecture of src/lib/sync/:

    Current structure:
    - P2P discovery via mDNS
    - TCP connections for sync
    - Loro CRDT for conflict resolution

    Evaluate:
    - Module organization and boundaries
    - Error handling patterns
    - Scalability concerns
    - Potential improvements"
})
```

## Notes

- Always runs via the architect-reviewer agent (model: opus)
- Focuses on strategic evaluation, not implementation details
- Provides trade-off analysis and alternatives
- Advocates for evolutionary architecture
