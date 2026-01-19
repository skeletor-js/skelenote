# Alpha Testing Checklist

Use this checklist to systematically test Skelenote. You don't need to complete everything - test what you can and report any issues.

---

## First Run Experience

- [ ] App launches without errors
- [ ] Skeleton Key setup wizard appears
- [ ] Can generate a new 24-word mnemonic
- [ ] Can write down and confirm the mnemonic
- [ ] App unlocks after setup
- [ ] Default UI loads (sidebar, main content area)

---

## Core Object Operations

### Tasks

- [ ] Create a new task via Quick Add (Cmd/Ctrl+N)
- [ ] Set task title
- [ ] Set due date
- [ ] Set priority (Low, Medium, High, Urgent)
- [ ] Assign to a project
- [ ] Add tags
- [ ] Mark task as complete
- [ ] Mark task as incomplete (toggle back)
- [ ] Delete a task
- [ ] Archive a task

### Notes

- [ ] Create a new note
- [ ] Add title
- [ ] Write content in the editor
- [ ] Use formatting (bold, italic, lists)
- [ ] Add @mention to another object
- [ ] Verify backlink appears on mentioned object

### Projects

- [ ] Create a new project
- [ ] Add description
- [ ] Link tasks to the project
- [ ] View tasks within project
- [ ] Archive a project

### Areas

- [ ] Create a new area
- [ ] Assign projects to the area
- [ ] View hierarchy (Area > Projects > Tasks)

### Other Object Types

- [ ] Create a Person
- [ ] Create a Meeting with attendees (link to People)
- [ ] Create a Link with URL

---

## Daily Notes

- [ ] Daily note auto-creates for today
- [ ] Title shows correct date format
- [ ] Can add content to daily note
- [ ] Link objects to today's note (right-click > Link to Today)
- [ ] Linked objects appear in daily note
- [ ] Navigate to previous/next daily notes

---

## Templates

- [ ] Create a new template
- [ ] Set target type (Task, Note, etc.)
- [ ] Add default property values
- [ ] Add template content with placeholders
- [ ] Apply template to create new object
- [ ] Verify placeholders expand correctly ({{date}}, {{title}})
- [ ] Set a template as Daily Note template
- [ ] Verify daily notes use the template

---

## Search

### Quick Search (Cmd/Ctrl+K)

- [ ] Opens command palette
- [ ] Search by object title
- [ ] Results appear as you type
- [ ] Can navigate with arrow keys
- [ ] Enter opens selected object
- [ ] Escape closes palette

### Content Search

- [ ] Search finds text within object content
- [ ] Results highlight matching text
- [ ] Can filter by object type

### Lantern (if enabled)

- [ ] Enable Lantern in Settings
- [ ] Wait for initial indexing
- [ ] Search by meaning (not just keywords)
- [ ] Results ranked by relevance

---

## Navigation

### Sidebar

- [ ] All sections visible (Inbox, Today, Tasks, etc.)
- [ ] Click navigates to correct view
- [ ] Counts update correctly

### Split View

- [ ] Click "Open in Split" opens split pane
- [ ] Can resize split pane
- [ ] Can close split pane
- [ ] Each pane navigates independently

### Keyboard Navigation

Test shortcuts from [Keyboard Shortcuts Guide](../guides/keyboard-shortcuts.md):

- [ ] Cmd/Ctrl+K opens command palette
- [ ] Cmd/Ctrl+N opens quick add
- [ ] Cmd/Ctrl+, opens settings
- [ ] Arrow keys navigate lists
- [ ] Enter opens selected item
- [ ] Escape closes modals/menus

---

## Inbox Workflow

- [ ] New objects appear in Inbox
- [ ] Can process item (remove from Inbox)
- [ ] Can archive item
- [ ] Processed items leave Inbox
- [ ] Tags, Projects, Areas don't appear in Inbox

---

## Sync: Hearth

**Requires two devices on the same network.**

### Setup

- [ ] Enable Hearth in Settings > Sync
- [ ] Same Skeleton Key on both devices
- [ ] Devices discover each other
- [ ] Fingerprints match

### Basic Sync

- [ ] Create object on Device A
- [ ] Object appears on Device B
- [ ] Edit object on Device B
- [ ] Changes appear on Device A
- [ ] Delete object on Device A
- [ ] Object removed from Device B

### Conflict Resolution

- [ ] Edit same object on both devices simultaneously
- [ ] Changes merge without data loss
- [ ] No duplicate objects created

---

## Sync: Courier

**Requires relay server (self-hosted or hosted).**

- [ ] Enter relay URL in Settings
- [ ] Connection established
- [ ] Objects sync to another device via relay
- [ ] Works when devices are on different networks

---

## Import/Export

### Export Single Object

- [ ] Right-click object > Export
- [ ] Markdown file downloads
- [ ] Content is readable
- [ ] Properties in YAML frontmatter

### Bulk Export

- [ ] Settings > Data > Export All
- [ ] ZIP file downloads
- [ ] Contains organized folders
- [ ] All objects present

---

## Settings

- [ ] All settings sections accessible
- [ ] Changes persist after app restart
- [ ] Theme/appearance settings work
- [ ] Danger Zone operations require confirmation

---

## Edge Cases

### Large Content

- [ ] Create object with very long title (200+ chars)
- [ ] Create note with large content (10+ pages)
- [ ] Paste large amount of text
- [ ] App remains responsive

### Offline/Online

- [ ] Work offline (disable network)
- [ ] Changes save locally
- [ ] Reconnect to network
- [ ] Sync resumes

### Multiple Windows (if supported)

- [ ] Open second window
- [ ] Changes in one reflect in other

---

## Reporting Issues

When you find a bug:

1. Note exactly what you did
2. Note what happened vs what you expected
3. Check [Known Issues](./KNOWN_ISSUES.md)
4. [File a bug report](https://linear.app/skeletorjs/team/skelenote)

When you have a suggestion:

1. [Request a feature](https://linear.app/skeletorjs/team/skelenote)

Questions or discussion:

1. Join [Discord](https://discord.gg/4apsgSRB7D)

---

*Thank you for testing!*
