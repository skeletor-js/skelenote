# Skelenote Future Feature Considerations

| Feature | Complexity | Notes |
|---------|------------|-------|
| Web Version (PWA) | High | Requires replacing Tauri-specific code with web alternatives |
| Mobile (Native) | Medium | Tauri 2 supports iOS/Android; PWA may suffice initially |
| Browser Extension | Medium | Quick capture from web; depends on API foundation |
| Import Wizards | Medium | Obsidian, Notion, Roam parsers |
| Canvas View | Medium-High | Spatial object arrangement (React Flow) |
| Graph View | Medium | Visualize relations/backlinks |
| Sharing/Collaboration | High | Requires multi-user key management |
| Voice Notes + Whisper | High | Audio recording, local ML transcription |
| Auto-lock | Low-Medium | Inactivity tracking, biometric unlock |
| Daily Review Mode | Medium | Guided end-of-day reflection workflow |
| Morning Briefing | Low-Medium | Today's tasks and context view |
| Local AI Integration | Medium | Ollama/local LLM for tagging, summarizing |

---


## Selected Features

### 1. Graph View
**Complexity:** Medium | **Priority:** High

Visual knowledge graph showing object connections through a force-directed layout.

**Key Features:**
- Force-directed layout showing backlinks and relations
- Click to navigate, hover to preview
- Filter by type, tag, or date range
- Zoom and pan controls
- Highlight paths between objects

**Why it fits our ethos:** Visualizes the "object-based thinking" philosophy. All processing is local—no external graph services.

---

### 2. Quick Link Autocomplete (`[[`)
**Complexity:** Medium | **Priority:** High

When typing in the editor, `[[` triggers inline object search for quick linking.

**Key Features:**
- Fuzzy search across all objects as you type
- Creates mention/link inline without leaving the editor
- Option to create new object if no match found
- Shows object type icon for disambiguation
- Keyboard navigation through results

**Why it fits our ethos:** Accelerates the creation of your personal knowledge graph. Pure local search, no external calls.

---

### 3. AI-Powered Smart Suggestions
**Complexity:** Medium | **Priority:** Medium

Leverage existing semantic search infrastructure to provide intelligent suggestions.

**Key Features:**
- "Related objects you might want to link" panel
- "Similar notes that might be duplicates" detection
- Auto-tag suggestions based on content analysis
- "You mentioned X, link to existing object?" prompts
- All suggestions computed locally using existing embeddings

**Why it fits our ethos:** Extends semantic search investment. Runs entirely on-device with opt-in AI.

---

### 4. Focus Mode
**Complexity:** Low | **Priority:** Medium

Distraction-free writing environment for deep work.

**Key Features:**
- Hides sidebar, maximizes editor
- Typewriter scrolling (keeps cursor vertically centered)
- Optional ambient background sounds
- Pomodoro timer integration
- `Cmd/Ctrl+Shift+F` to toggle

**Why it fits our ethos:** Enhances the clean, focused UI principle. No external dependencies.

---

### 5. Archive System
**Complexity:** Low | **Priority:** Medium

Archive objects without permanent deletion for better organization.

**Key Features:**
- "Archive" action in context menus and bulk operations
- Archived objects hidden from normal views and search
- Dedicated "Archive" section in sidebar
- Easy restore to active state
- Archived objects still accessible via direct links

**Why it fits our ethos:** Data stays local, user controls lifecycle. No "trash" that auto-deletes.

---

### 6. Object Preview on Hover
**Complexity:** Low | **Priority:** High

Floating preview cards when hovering over backlinks, mentions, or search results.

**Key Features:**
- Shows first ~200 characters of content
- Object type, tags, and key properties visible
- Quick actions: Open, Open in Split View, Copy Link
- Keyboard shortcut to trigger from selection
- Respects dark/light theme

**Why it fits our ethos:** Reduces navigation friction. All data already local, just smarter presentation.

---

### 7. Natural Language Date Parsing
**Complexity:** Low | **Priority:** Medium

Parse natural language in date fields for faster input.

**Key Features:**
- "tomorrow" → next day
- "next monday" → correct date
- "in 2 weeks" → calculated date
- "dec 25" → December 25th of current/next year
- Fallback to standard date picker

**Implementation:** Use `chrono-node` library (runs locally, no network).

**Why it fits our ethos:** Convenience feature, fully offline, no external parsing service.

---

### 8. Reminders & Notifications
**Complexity:** Medium | **Priority:** Medium

Desktop notifications for tasks with due dates.

**Key Features:**
- Desktop notifications via Tauri's notification API
- Configurable reminder timing (at time, 15min before, 1 day before)
- "Snooze" and "Mark Complete" quick actions
- Optional notification sound
- Notification center in-app for missed reminders

**Why it fits our ethos:** Uses native OS notifications. No push notification server required.

---

### 9. Import/Export Enhancements
**Complexity:** Medium | **Priority:** High

Comprehensive import/export for interoperability.

**Import From:**
- Obsidian (markdown vault with `[[wikilinks]]`)
- Notion (JSON export)
- Evernote (ENEX format)
- Apple Notes (if accessible)
- Plain markdown folders

**Export To:**
- Full markdown vault with wikilinks (Obsidian-compatible)
- JSON backup (complete data dump)
- PDF (single object or collection)
- HTML (static site generation)

**Why it fits our ethos:** Core to "no vendor lock-in". Your data is truly portable.

---

### 10. Table/Database View
**Complexity:** Medium | **Priority:** High

View objects in a spreadsheet-like table format.

**Key Features:**
- Columns = object properties (configurable)
- Sortable and filterable columns
- Inline cell editing
- Bulk select rows for batch operations
- Save table configurations as views
- Export table to CSV

**Why it fits our ethos:** Alternative visualization of local data. Inspired by Notion but fully local.

---

### 11. Duplicate Detection
**Complexity:** Medium | **Priority:** Low

Find and manage potentially duplicate objects.

**Key Features:**
- Uses semantic search to find similar content (>80% similarity)
- "These notes are X% similar" indicator
- Side-by-side comparison view
- Merge action: combine content, preserve both backlinks
- Manual review workflow (not auto-merge)

**Why it fits our ethos:** Leverages existing local AI. User always in control of merge decisions.

---

### 12. Command Palette Enhancements
**Complexity:** Low | **Priority:** Medium

Power-user improvements to the existing command palette.

**Key Features:**
- "Recent commands" section at top
- Improved fuzzy search algorithm
- Preview pane showing command result/target
- User-definable command aliases
- Command history (`↑` to repeat last command)

**Why it fits our ethos:** Keyboard-first UX. All local, instant response.

---

### 13. Breadcrumb Navigation
**Complexity:** Low | **Priority:** Medium

Show navigation context for better orientation.

**Key Features:**
- Path display: `Inbox → Project Alpha → Task: Fix Bug`
- Click any level to navigate
- Shows parent project/container relationships
- Collapsible on small screens
- Keyboard shortcut to go "up" one level

**Why it fits our ethos:** Better UX for exploring your knowledge graph locally.

---

### 15. Local Backup Snapshots
**Complexity:** Medium | **Priority:** High

Automatic local backups beyond Time Machine.

**Key Features:**
- Scheduled snapshots (daily, weekly)
- Configurable retention (keep last N backups)
- One-click restore to any snapshot
- Backup location configurable (external drive support)
- Backup integrity verification

**Why it fits our ethos:** Data safety without cloud. User controls backup location.

---

### 19. Local File Attachments
**Complexity:** Medium | **Priority:** Medium

Attach files to objects without cloud storage.

**Key Features:**
- Drag-and-drop files into editor
- Files stored in app data directory (or user-specified)
- Reference by path (not embedded to save space)
- Preview for images, PDFs
- Files included in backup/export

**Why it fits our ethos:** Files stay local. No upload to external storage.

---
