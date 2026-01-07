# Import Sources

Import capabilities for migrating data from other apps into Skelenote.

---

## Core Dependency: Markdown to BlockNote Converter

All import sources (except JSON) require converting Markdown to BlockNote format. This is the foundational piece.

**Effort**: 3-4 days

---

## Notion Import

**Input**: Notion's "Export" format (ZIP with Markdown + CSV)

### Property Mapping

| Notion | Skelenote |
|--------|-----------|
| Page | Note |
| Database row | Inferred type based on properties |
| Status property | status |
| Date property | dueDate or date |
| Multi-select | tags (creates Tag objects) |
| Checkbox | checkbox |

### Flow

1. User exports from Notion as "Markdown & CSV"
2. User selects unzipped folder in Skelenote
3. Preview shows detected documents with type inference
4. User can override types before import
5. Import with progress indicator

**Effort**: 2-3 days

---

## Obsidian Import

**Input**: Folder of Markdown files (Obsidian vault)

### Features

- Parse YAML frontmatter for properties
- Convert `[[wiki-links]]` to Skelenote mentions
- Preserve folder structure as Projects/Areas (optional)
- Handle `#tags` in content

**Effort**: 2-3 days

---

## Markdown Files Import

**Input**: Individual .md files or folder

### Features

- Parse YAML frontmatter if present
- Convert Markdown to BlockNote format
- Infer type from content/frontmatter

**Effort**: Included in core converter

---

## JSON Import (Backup Restore)

**Input**: Skelenote JSON export

### Options

- Preserve IDs (complete restore) or generate new IDs (merge)
- Conflict handling: skip, replace, or duplicate

**Effort**: 1 day

---

## Apple Notes Import

**Input**: HTML export from Apple Notes

> [!NOTE]
> Limited support due to proprietary format. Lower priority.

**Effort**: 3-4 days (if time permits)

---

## Import UX

### Entry Point
Settings > Data > "Import Data"

### Source Selection Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Import Data                                         [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Choose where to import from:                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Notion     │  │   Obsidian   │  │   Markdown   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Skelenote   │  │ Apple Notes  │                        │
│  │   Backup     │  │              │                        │
│  └──────────────┘  └──────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Import Configuration (after source selected)

1. Source-specific instructions
2. File/folder picker
3. Preview with type inference
4. Options: skip duplicates, add to inbox, preserve dates
5. Import button with document count

### Progress State

- Progress bar with percentage
- Current document name
- Estimated time remaining
- Cannot close modal during import

### Success State

- Checkmark icon
- "Imported X documents" with breakdown by type
- Error summary if any failed
- "View in Inbox" button

**UI Effort**: 2 days

---

## Dependencies

```json
{
  "marked": "^12.x",  // Markdown parsing
  "jszip": "^3.x"     // Already present
}
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/lib/import/index.ts` | New file - export all importers |
| `src/lib/import/markdown-to-blocknote.ts` | Core converter |
| `src/lib/import/notion.ts` | Notion importer |
| `src/lib/import/obsidian.ts` | Obsidian importer |
| `src/lib/import/json.ts` | JSON backup restore |
| `src/lib/import/apple-notes.ts` | Apple Notes importer |
| `src/components/settings/panels/DataSettings.tsx` | Add import section |
| `src/components/import/ImportModal.tsx` | New component |

---

## Open Questions

- [ ] **Conflict resolution**: How to detect duplicates? Title + date hash?
- [ ] **Type inference**: How aggressively guess types from content/properties?
- [ ] **Wiki-links**: Create placeholder objects for unresolved links?
- [ ] **Rollback**: Should imports be reversible (undo all imported objects)?

---

## Effort Summary

| Component | Effort |
|-----------|--------|
| Markdown to BlockNote converter | 3-4 days |
| Notion import | 2-3 days |
| Obsidian import | 2-3 days |
| JSON import (backup restore) | 1 day |
| Apple Notes import | 3-4 days |
| Import UI (modal, progress) | 2 days |
| **Total** | **13-17 days** |
