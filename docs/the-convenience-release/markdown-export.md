# Markdown Export

> Export objects to .md files with YAML frontmatter and wiki-link style mentions.

---

## 1. Overview

Enable users to export any Skelenote object as a portable Markdown file. Exports include properties as YAML frontmatter and rich content converted to standard Markdown syntax, with object mentions formatted as `[[Object Name]]` wiki-links for compatibility with tools like Obsidian and LogSeq.

**User Value:**
- Data portability - never locked into Skelenote
- Share notes with non-Skelenote users
- Backup content in human-readable format
- Import into other knowledge management tools

---

## 2. Goals

### Primary Goals
- Export any object with content to a valid Markdown file
- Convert BlockNote JSON to clean Markdown syntax
- Include properties as YAML frontmatter
- Format mentions as `[[Object Name]]` wiki-links
- Save via native file dialog

### Success Criteria
- Exported files open correctly in VS Code, Obsidian, and GitHub
- All BlockNote block types convert to appropriate Markdown
- Mentions preserve object names (not IDs)
- YAML frontmatter is valid and parseable

### Non-Goals
- Bulk export (single object only for v1)
- Import from Markdown (future feature)
- Export attachments or embedded media
- Custom template selection

---

## 3. User Stories

**As a note-taker**, I want to export a note to Markdown so that I can share it with colleagues who don't use Skelenote.

**As a power user**, I want exported files to work in Obsidian so that I can maintain a backup vault.

**As a developer**, I want YAML frontmatter in exports so that I can process notes programmatically.

**As a project manager**, I want to export project documentation so that I can include it in external documentation systems.

---

## 4. Technical Approach

### Export Format

```markdown
---
title: Meeting Notes - Q1 Planning
type: note
created: 2024-12-27T10:30:00Z
updated: 2024-12-27T14:45:00Z
tags:
  - work
  - planning
project: Website Redesign
---

# Meeting Notes - Q1 Planning

Discussed priorities with [[John Smith]] and [[Sarah Johnson]].

## Action Items

- [ ] Review budget proposal
- [x] Schedule follow-up meeting
- [ ] Update roadmap document

See related notes in [[Q1 Goals]] and [[Team Structure]].
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/export/markdown.ts` | BlockNote to Markdown converter |
| `src/lib/export/frontmatter.ts` | YAML frontmatter generator |
| `src/lib/export/types.ts` | Export configuration types |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/object/ObjectDetailView.tsx` | Add export button to header |
| `src/components/object/ObjectHeader.tsx` | Include export action in menu |

### BlockNote to Markdown Conversion

| BlockNote Type | Markdown Output |
|----------------|-----------------|
| `paragraph` | Plain text with newline |
| `heading` (1-3) | `#`, `##`, `###` prefix |
| `bulletListItem` | `- ` prefix with nesting |
| `numberedListItem` | `1. ` prefix with nesting |
| `checkListItem` | `- [ ]` or `- [x]` |
| `codeBlock` | Triple backticks with language |
| `blockquote` | `> ` prefix |
| `table` | GFM table syntax |
| `image` | `![alt](url)` |

### Inline Content Conversion

| Inline Type | Markdown Output |
|-------------|-----------------|
| `text` | Plain text |
| `text` (bold) | `**text**` |
| `text` (italic) | `*text*` |
| `text` (code) | `` `text` `` |
| `text` (strikethrough) | `~~text~~` |
| `link` | `[text](url)` |
| `mention` | `[[Object Name]]` |

### Frontmatter Generation

Properties are converted to YAML based on their type:

```typescript
// Example property type conversions
{
  title: string          -> title: "value"
  dueDate: Date         -> dueDate: 2024-12-27
  priority: select      -> priority: high
  tags: relation[]      -> tags:\n  - tag1\n  - tag2
  project: relation     -> project: "Project Name"
  completed: boolean    -> completed: true
}
```

---

## 5. Implementation Steps

1. **Create export types** (`src/lib/export/types.ts`)
   - Define ExportOptions interface
   - Define block conversion result types

2. **Implement frontmatter generator** (`src/lib/export/frontmatter.ts`)
   - Convert object properties to YAML
   - Handle different property types
   - Resolve relation IDs to names
   - Add metadata (created, updated, type)

3. **Implement BlockNote converter** (`src/lib/export/markdown.ts`)
   - Traverse block tree recursively
   - Convert each block type to Markdown
   - Handle inline content styles
   - Convert mentions to `[[Name]]` format
   - Handle nested lists properly

4. **Create export orchestrator** (`src/lib/export/index.ts`)
   - Combine frontmatter and content
   - Generate filename from title
   - Handle file save via Tauri dialog

5. **Add export button to UI** (`src/components/object/ObjectHeader.tsx`)
   - Add export option to object menu
   - Trigger export flow on click

6. **Implement file save dialog** (Tauri integration)
   - Open native save dialog
   - Default filename from object title
   - Filter for .md extension

---

## 6. UI/UX Considerations

### Export Button Location

The export button should be accessible from the object header menu (three-dot menu):

```
┌─────────────────────────────────────────────────────────┐
│  [icon] Meeting Notes - Q1 Planning            [•••]    │
│                                          ┌────────────┐ │
│                                          │ Pin        │ │
│                                          │ Duplicate  │ │
│                                          │ Export ▸   │ │
│                                          │ Delete     │ │
│                                          └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Export Flow

1. User clicks Export in menu
2. Native save dialog opens
3. Default filename: `{sanitized-title}.md`
4. User confirms location
5. Toast: "Exported to {filename}"

### Keyboard Shortcut
- `Cmd+Shift+E` - Export current object

### Accessibility
- Export menu item should have aria-label
- Success toast should announce to screen readers
- Error states should be clearly communicated

---

## 7. Testing Checklist

### Unit Tests
- [ ] Paragraph blocks convert correctly
- [ ] Heading blocks (H1-H3) convert correctly
- [ ] Bullet lists convert with proper indentation
- [ ] Numbered lists convert with proper numbering
- [ ] Checklists convert with [ ] and [x]
- [ ] Code blocks include language identifier
- [ ] Blockquotes convert with > prefix
- [ ] Tables convert to GFM format
- [ ] Bold/italic/code inline styles convert
- [ ] Links convert to [text](url) format
- [ ] Mentions convert to [[Object Name]] format
- [ ] Frontmatter generates valid YAML
- [ ] Date properties format correctly
- [ ] Relation properties resolve to names
- [ ] Empty content produces valid file

### Integration Tests
- [ ] Full export flow for Note type
- [ ] Full export flow for Task type
- [ ] Full export flow for Project type
- [ ] Export preserves all property types
- [ ] Export handles missing properties gracefully
- [ ] Nested lists maintain structure

### Manual QA Checklist
- [ ] Export button appears in object menu
- [ ] Save dialog opens with correct default name
- [ ] Exported file opens in VS Code
- [ ] Exported file opens in Obsidian
- [ ] Exported file renders on GitHub
- [ ] Wiki-links display correctly in Obsidian
- [ ] YAML frontmatter is valid
- [ ] All content is preserved

### Edge Cases
- [ ] Object with no content (properties only)
- [ ] Object with no properties (content only)
- [ ] Object title with special characters
- [ ] Very long content (performance)
- [ ] Deeply nested lists (4+ levels)
- [ ] Mention to deleted object
- [ ] Mention to object with special characters in name
- [ ] Empty table cells
- [ ] Code block with no language specified

---

## 8. Future Considerations

### Potential Enhancements
- Bulk export (export all objects of a type)
- Export to folder (one file per object)
- Custom export templates
- Include backlinks section in export
- Export as PDF (via Markdown rendering)
- Copy as Markdown (clipboard instead of file)

### Integration Opportunities
- API endpoint for programmatic export
- Scheduled exports to cloud storage
- Obsidian vault sync (bi-directional)
- Git-based backup system
