# Export & Import Guide

Skelenote lets you export your data to standard formats and (coming soon) import from other tools.

---

## Export Overview

All exports produce Markdown files that work with:
- Obsidian
- Notion (via import)
- Bear
- Any Markdown editor
- Git repositories

---

## Single Object Export

Export individual objects as Markdown.

### How to Export

1. Open the object you want to export
2. Press `Cmd+Shift+E` or use the object menu
3. Choose save location
4. File saves as `{title}.md`

### Export Format

```markdown
---
id: abc123-def456
type: Task
status: in_progress
priority: high
due: 2024-01-15
created: 2024-01-01T10:00:00Z
updated: 2024-01-10T15:30:00Z
tags:
  - work
  - urgent
---

# Task Title

Your content here with formatting preserved.

Mentions become [[wiki-links]] that work in Obsidian.
```

---

## Bulk Export (All Objects)

Export everything as a ZIP archive.

### How to Export

1. Open Settings (`Cmd+,`)
2. Go to **Data** section
3. Configure options:
   - **Organize by type** - Creates folders for each type
   - **Include archived** - Adds archived objects
4. Click **Export All**
5. Choose save location
6. Wait for completion

### ZIP Structure

With "Organize by type" enabled:

```
skelenote-export-2024-01-15/
├── tasks/
│   ├── finish-report.md
│   ├── call-client.md
│   └── ...
├── notes/
│   ├── meeting-notes-jan-10.md
│   └── ...
├── projects/
│   ├── q1-planning.md
│   └── ...
├── daily-notes/
│   ├── 2024-01-14.md
│   ├── 2024-01-15.md
│   └── ...
└── areas/
    ├── health.md
    └── ...
```

Without organization (flat):

```
skelenote-export-2024-01-15/
├── finish-report.md
├── call-client.md
├── meeting-notes-jan-10.md
└── ...
```

---

## Backup Strategy

### Recommended Approach

1. **Weekly exports** - Set a reminder to export weekly
2. **Cloud storage** - Save ZIPs to iCloud, Dropbox, or Google Drive
3. **Version control** - Optionally commit exports to a Git repo

### Recovery Scenarios

| Scenario | Solution |
|----------|----------|
| Device lost/broken | Restore from backup + re-enter Skeleton Key |
| Accidental deletion | Use Time Machine (in-app) or restore from backup |
| Corrupted data | Export provides clean Markdown as fallback |

---

## Data Portability

### Using with Obsidian

Exported files work directly in Obsidian:

1. Export from Skelenote
2. Extract ZIP to your Obsidian vault folder
3. Files appear with full formatting

Wiki-links (`[[note-name]]`) are compatible with Obsidian's linking.

### Using with Git

For version-controlled notes:

1. Export to a Git repository folder
2. Commit changes
3. Push to GitHub/GitLab for cloud backup

```bash
# Example workflow
cd ~/my-notes-backup
unzip ~/Downloads/skelenote-export-*.zip
git add .
git commit -m "Backup: $(date +%Y-%m-%d)"
git push
```

---

## Import (Coming Soon)

Future releases will support importing from:

- **Obsidian** - Markdown files with YAML frontmatter
- **Notion** - Via Notion export
- **Roam Research** - JSON export
- **Bear** - Markdown export
- **Apple Notes** - Via export

### Current Workaround

While import isn't built-in yet:

1. Create objects manually in Skelenote
2. Copy content from other tools
3. Paste into the Skelenote editor

The editor preserves most formatting from clipboard.

---

## Frontmatter Reference

Exported YAML frontmatter includes:

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique object ID | `abc123-def456` |
| `type` | Object type name | `Task`, `Note`, `Project` |
| `created` | Creation timestamp | `2024-01-01T10:00:00Z` |
| `updated` | Last modified | `2024-01-10T15:30:00Z` |
| `archived` | Archive status | `true` or omitted |
| `pinned` | Pin status | `true` or omitted |
| *(properties)* | Type-specific | `status`, `due`, `priority`, etc. |

### Property Types

| Skelenote Type | Frontmatter Format |
|----------------|-------------------|
| Text | `property: "value"` |
| Number | `property: 42` |
| Date | `property: 2024-01-15` |
| Checkbox | `property: true` |
| Select | `property: option-value` |
| Relation | `property: "[[Object Name]]"` |
| Multi-relation | `property: ["[[A]]", "[[B]]"]` |

---

## Troubleshooting

### Export is slow

Large vaults (1000+ objects) may take a minute. The progress bar shows status.

### Some content missing

Rich embeds (images, files) are referenced but not embedded. The text content is always preserved.

### File name conflicts

If multiple objects have the same title, files are numbered: `note.md`, `note-1.md`, etc.

### Special characters in titles

Titles are sanitized for file systems. Characters like `/`, `\`, `:` become `-`.
