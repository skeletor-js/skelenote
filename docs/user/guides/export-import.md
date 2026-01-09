# Export & Import Guide

Skelenote lets you export your data to standard formats and import from other tools.

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

## Import Overview

Bring your notes, tasks, and projects from other tools into Skelenote.

**Access:** Settings (`Cmd+,`) → Data → Import

**Supported Sources:**

| Source | What it imports |
|--------|-----------------|
| **Notion** | Databases and pages via API |
| **Obsidian** | Vault folder with wiki-links |
| **Markdown** | Individual .md files |

All imported objects arrive in your **Inbox** for triage.

---

## Import from Notion

Connect directly to your Notion workspace and import databases with intelligent type mapping.

### Step 1: Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it (e.g., "Skelenote Import")
4. Select your workspace
5. Under Capabilities, enable:
   - **Read content**
   - **Read user information** (optional, for People properties)
6. Click **Submit**
7. Copy the **Internal Integration Token**

### Step 2: Connect in Skelenote

1. Open Settings → Data → Import
2. Select **Notion**
3. Paste your integration token
4. Click **Connect**

> **Security note:** Your token is never stored. It's only held in memory during the import session.

### Step 3: Share Databases with Your Integration

In Notion, for each database you want to import:

1. Open the database page
2. Click **...** (top right) → **Connections**
3. Select your integration

Only databases shared with your integration will appear in Skelenote.

### Step 4: Select Databases

The import wizard shows all accessible databases with:

- **Page count** - How many items will be imported
- **Auto-detected type** - Skelenote's best guess (Task, Note, Project, etc.)
- **Confidence indicator** - How sure we are about the type mapping

Check the databases you want to import.

### Step 5: Review Type Mapping

For each selected database, confirm or change the Skelenote type:

| If Notion database looks like... | Skelenote suggests... |
|----------------------------------|----------------------|
| Has Status, Due Date columns | Task |
| Has meeting attendees | Meeting |
| Named "Projects" or similar | Project |
| Has Areas/Categories | Area |
| Everything else | Note |

Click on a database to expand property mapping options.

### Step 6: Property Mapping

Skelenote auto-maps Notion properties to Skelenote properties:

| Notion Type | Maps to | Notes |
|-------------|---------|-------|
| Title | title/name | Object's main title |
| Rich Text | Text | Formatting preserved |
| Number | Number | Direct conversion |
| Select | Select | Options auto-created |
| Multi-select | Multi-select/Tags | Can map to tags |
| Date | Date | Converted to timestamp |
| Checkbox | Checkbox | Boolean values |
| Status | Select (status) | Task status mapping |
| URL, Email, Phone | Text | As plain text |
| Relation | @mention | Becomes mention in content |
| People | Skipped | Not currently mapped |
| Files & Media | Skipped | References only |

Properties without a clear match are skipped by default. You can manually assign them or leave them skipped.

### Step 7: Standalone Pages

Pages not in any database (workspace root pages) can be:

- **Imported as Notes** - They'll appear in your Inbox
- **Skipped** - Leave them in Notion

### What Gets Imported

- **Content** - Headings, paragraphs, lists, code blocks, quotes
- **Properties** - Mapped according to your configuration
- **Nested content** - Toggle blocks, callouts, columns (flattened)
- **Relations** - Become @mentions linking to imported objects

### Troubleshooting Notion Import

| Issue | Solution |
|-------|----------|
| "Invalid token" | Regenerate token in Notion and reconnect |
| No databases shown | Share databases with your integration in Notion |
| Import stuck | Large workspaces take time; check progress indicator |
| Missing properties | Review property mapping; some types can't be mapped |
| Missing pages | Only pages in shared databases are accessible |

---

## Import from Obsidian

Import an entire Obsidian vault with wiki-links, hashtags, and frontmatter preserved.

### How to Import

1. Open Settings → Data → Import
2. Select **Obsidian**
3. Choose your vault folder
4. Preview detected files
5. Adjust type mappings if needed
6. Click **Import**

### What Gets Converted

**Wiki-links → @mentions**

Obsidian's `[[note-name]]` links become Skelenote @mentions. After import, clicking a mention navigates to the linked object.

```markdown
See [[Meeting Notes]] for details.
```

Becomes a mention that links to the "Meeting Notes" object.

**Hashtags → Tags**

Obsidian `#tags` become Skelenote Tag objects:

- `#work` → Tag named "work"
- `#project/alpha` → Tag named "project/alpha" (hierarchy preserved)

Tags are created automatically if they don't exist.

**Frontmatter → Properties**

YAML frontmatter is parsed into object properties:

```yaml
---
type: Task
status: in-progress
priority: high
due: 2024-01-15
tags: [work, urgent]
---
```

### Type Inference

Skelenote infers object types in this order:

1. **Frontmatter `type:` field** - Explicit type wins
2. **Folder name** - Files in `/tasks/` become Tasks
3. **Content patterns** - Due dates suggest Task type
4. **Default** - Everything else becomes a Note

| Folder pattern | Inferred type |
|----------------|---------------|
| `/tasks/` or `/todo/` | Task |
| `/projects/` | Project |
| `/areas/` | Area |
| `/people/` or `/contacts/` | Person |
| `/meetings/` | Meeting |

### Troubleshooting Obsidian Import

| Issue | Solution |
|-------|----------|
| Broken wiki-links | Links match by file name (case-insensitive) |
| Duplicate file names | First match used; check preview |
| Large vault slow | 1000+ notes take a minute; progress shown |
| Special characters | File names are sanitized automatically |
| Missing tags | Check if hashtags use valid format: `#tag-name` |

---

## Import from Markdown

Import individual Markdown files with optional frontmatter.

### How to Import

1. Open Settings → Data → Import
2. Select **Markdown Files**
3. Choose one or more `.md` files
4. Preview parsed content
5. Adjust types if needed
6. Click **Import**

### What Gets Parsed

**YAML Frontmatter:**

```markdown
---
title: My Note
type: Note
created: 2024-01-01
tags: [work, ideas]
---

# Content starts here
```

**Title inference:**

- Uses frontmatter `title:` if present
- Falls back to first H1 heading
- Otherwise uses filename

**Type inference:**

- Uses frontmatter `type:` if present
- Otherwise defaults to Note

---

## Import Tips

### Best Practices

1. **Start small** - Import a test subset first to verify mappings
2. **Review the preview** - Check auto-detected types before importing
3. **Clean up after** - Review auto-created tags and merge duplicates
4. **Process your inbox** - Imported objects need triage like any other

### After Importing

1. Check your **Inbox** for new objects
2. Review auto-created **Tags** (from hashtags or multi-select properties)
3. Verify **@mention links** resolved correctly
4. Archive or delete unwanted imports

### Common Issues

| Issue | Explanation |
|-------|-------------|
| Duplicate objects | Import creates new objects, not merge with existing |
| Missing wiki-links | Links need exact file name match to resolve |
| Slow import | Large datasets take time; progress indicator shows status |
| Property mismatch | Some Notion types can't map directly; adjust or skip |
| Too many tags | Multi-select fields can create many tags; clean up after |

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
