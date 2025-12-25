# Product Specification: Object-Based Note App

> Personal productivity tool with object-based architecture, local-first sync, and minimal monochromatic UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Tech Stack](#tech-stack)
4. [Object Model](#object-model)
5. [Built-in Types](#built-in-types)
6. [Custom Types](#custom-types)
7. [Views](#views)
8. [Universal Object Detail View](#universal-object-detail-view)
9. [Quick Capture](#quick-capture)
10. [Command Palette](#command-palette)
11. [Editor & Mentions](#editor--mentions)
12. [Recurring Tasks](#recurring-tasks)
13. [Daily Notes](#daily-notes)
14. [Navigation Sidebar](#navigation-sidebar)
15. [Search](#search)
16. [Sync Architecture](#sync-architecture)
17. [Google Calendar Integration](#google-calendar-integration)
18. [Mobile](#mobile)
19. [Visual Design](#visual-design)
20. [Keyboard & Interaction](#keyboard--interaction)
21. [Edge Cases](#edge-cases)
22. [First Run Experience](#first-run-experience)
23. [Out of Scope (v1)](#out-of-scope-v1)

---

## Overview

A personal note-taking and task management app inspired by Anytype and Capacities. Everything is an object. Objects have types. Types define properties. Relations connect objects. The knowledge graph emerges from relations and backlinks.

### Core Principles

- **Object-based**: Notes, tasks, projects, meetings, links, and custom types are all first-class objects
- **Relational**: Objects connect via typed relations; backlinks are automatic
- **Local-first**: Data lives on device; syncs via CRDT when online
- **Inbox-driven**: All new objects land in Inbox for intentional triage
- **Minimal UI**: Monochromatic design with Fragment Mono font; tags are the only color
- **Calendar-aware**: Google Calendar integration surfaces meetings as objects

---

## Design Philosophy

### Visual

- Monochromatic UI (black/white/grays only)
- Tags are the sole source of color—they pop against the grayscale
- Typography: Fragment Mono as default font
- Density: balanced—not cramped, not wasteful

### Interaction

- Command palette is central (Cmd+K)
- Global quick capture (Cmd+Shift+Space)
- Keyboard-navigable with arrow keys + tab
- Explicit actions over implicit magic

### Data

- Everything is an object
- Relations are explicit, stored as object ID arrays
- Backlinks are computed at query time
- Deletion is permanent; use tags for archival

---

## Tech Stack

| Layer | Choice | License | Cost |
|-------|--------|---------|------|
| Shell | Tauri 2.0 | MIT | Free |
| Editor | BlockNote (core packages) | MPL-2.0 | Free |
| Data/CRDT | Loro | MIT | Free |
| Sync | Cloudflare Workers + Durable Objects | N/A | $5/mo |

### Why These Choices

- **Tauri**: Cross-platform (macOS, Windows, Linux, iOS, Android) from single codebase; ~600KB vs Electron's 120MB+
- **BlockNote**: Batteries-included Notion-style block editor; React-native; built on ProseMirror/TipTap
- **Loro**: Excellent TypeScript DX; MovableTree for object hierarchies; built-in version history
- **Cloudflare**: Developer familiarity; reliable; Durable Objects provide stateful WebSocket relay

---

## Object Model

### Core Schema

```typescript
interface Object {
  id: string;                              // UUID
  typeId: string;                          // references a TypeDefinition
  properties: Record<string, PropertyValue>;
  content?: LoroDoc;                       // rich text for types with hasContent
  inboxed: boolean;                        // true until explicitly processed
  createdAt: number;                       // Unix timestamp
  updatedAt: number;                       // Unix timestamp
}

type PropertyValue = 
  | string 
  | number 
  | boolean 
  | string[]                               // object IDs for relations
  | null;

interface TypeDefinition {
  id: string;
  name: string;
  icon: string;                            // emoji
  schema: PropertyDefinition[];
  hasContent: boolean;                     // whether type has rich text body
  isBuiltIn: boolean;                      // false for user-created types
}

interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  required: boolean;
  multiple: boolean;                       // can hold multiple values
  config?: {
    options?: string[];                    // for select type
    targetTypeIds?: string[];              // for relation type
  };
}

type PropertyType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'checkbox' 
  | 'select' 
  | 'relation' 
  | 'url' 
  | 'email' 
  | 'phone' 
  | 'file';
```

### Relations & Backlinks

Relations are properties that hold object IDs. They're stored on the source object.

```typescript
// Example: Task related to a Project
{
  id: "task-123",
  typeId: "task",
  properties: {
    title: "Build object model",
    project: ["proj-456"],      // relation stored here
    tags: ["tag-789", "tag-abc"]
  }
}
```

**Backlinks** are computed, not stored. To find backlinks for `proj-456`:
- Query all objects where any relation property contains `"proj-456"`

### Inheritance Behavior

When creating a Task inside a Note that belongs to a Project:
- UI auto-suggests adding the Project relation to the Task
- User confirms or dismisses
- Data stays denormalized but queryable with simple lookups

---

## Built-in Types

### Task

| Property | Type | Required | Multiple | Config |
|----------|------|----------|----------|--------|
| title | text | ✓ | | |
| status | select | | | options: todo, in-progress, blocked, done |
| dueDate | date | | | |
| priority | select | | | options: low, medium, high, urgent |
| project | relation | | | target: project |
| note | relation | | ✓ | target: note |
| tags | relation | | ✓ | target: tag |
| recurrence | text | | | e.g., "daily", "weekly", "monthly" |

`hasContent: true` (optional description body)

### Note

| Property | Type | Required | Multiple | Config |
|----------|------|----------|----------|--------|
| title | text | ✓ | | |
| date | date | | | for daily notes |
| isDailyNote | checkbox | | | |
| project | relation | | | target: project |
| tags | relation | | ✓ | target: tag |

`hasContent: true`

### Project

| Property | Type | Required | Multiple | Config |
|----------|------|----------|----------|--------|
| name | text | ✓ | | |
| status | select | | | options: active, paused, completed, archived |
| tags | relation | | ✓ | target: tag |

`hasContent: true` (optional description body)

### Link

| Property | Type | Required | Multiple | Config |
|----------|------|----------|----------|--------|
| url | url | ✓ | | |
| title | text | | | |
| description | text | | | |
| tags | relation | | ✓ | target: tag |

`hasContent: false`

### Meeting

Synced from Google Calendar (read-only sync). Meeting objects are auto-created from calendar events.

| Property | Type | Required | Multiple | Config |
|----------|------|----------|----------|--------|
| title | text | ✓ | | |
| startTime | date | ✓ | | includes time |
| endTime | date | ✓ | | includes time |
| location | text | | | physical location or video link |
| attendees | text | | ✓ | email addresses |
| calendarEventId | text | | | Google Calendar event ID (for sync) |
| project | relation | | | target: project |
| tags | relation | | ✓ | target: tag |

`hasContent: true` (meeting notes)

**Sync behavior**: See [Google Calendar Integration](#google-calendar-integration) section.

### Tag

Lightweight object—only source of color in the UI.

| Property | Type | Required | Multiple | Config |
|----------|------|----------|----------|--------|
| name | text | ✓ | | |
| color | select | | | options: gray, red, orange, yellow, green, blue, purple, pink |
| description | text | | | |

`hasContent: false`

---

## Custom Types

### Creation Flow

1. Navigate to Settings → Create Object Type
2. Enter name and pick icon (emoji)
3. `title` property is auto-included and required
4. Add additional properties:
   - Set name
   - Choose type (text, number, date, checkbox, select, relation, url, email, phone, file)
   - Mark required or optional
   - Configure type-specific options (select choices, relation targets)
5. Toggle `hasContent` if type should have rich text body
6. Save

### Behavior

- Custom types appear in Quick Capture type selector
- Objects of custom types appear in Search
- Custom types get their own section in sidebar (optional, future)

---

## Views

### Universal Inbox

All new objects land here until explicitly processed.

| Column | Source |
|--------|--------|
| Type | Icon from typeId |
| Name | `title` or `name` property |
| Created | `createdAt` formatted |
| Preview | First tag or relation if any |

**Filter**: `inboxed = true` (all types)

**Processing**: User clicks explicit "Process" button to clear `inboxed` flag. No implicit clearing.

### Task Views

| View | Filter | Default Sort |
|------|--------|--------------|
| Today | `typeId = task` AND `status ≠ done` AND `dueDate = today` | priority desc |
| This Week | `typeId = task` AND `status ≠ done` AND `dueDate > today` AND `dueDate ≤ endOfWeek` | dueDate asc |
| Overdue | `typeId = task` AND `status ≠ done` AND `dueDate < today` | dueDate asc |
| Blocked | `typeId = task` AND `status = blocked` | updatedAt desc |
| Eventually | `typeId = task` AND `status ≠ done` AND `dueDate > endOfWeek` | dueDate asc |
| Completed | `typeId = task` AND `status = done` | updatedAt desc |

**View modes**: List, Kanban (grouped by status or project)

### Daily Notes

- Calendar view to browse all daily notes
- Click any date to open/create that day's note
- Previous/Next day navigation within a daily note

---

## Universal Object Detail View

Every object type uses the same layout pattern:

```
┌─────────────────────────────────────────────────────────┐
│  [icon] Title                                  [Edit]   │
├─────────────────────────────────────────────────────────┤
│  [Properties rendered based on type schema]             │
│  Status: Active        Tags: #work, #q1                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Content area - BlockNote editor]                      │
│  (Only shown if type.hasContent = true)                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ☑️ Tasks                                    [+ Add]    │
│  ─────────────────────────────────────────────────────  │
│  ☐ Task title here                      Due: Dec 27    │
│  ☐ Another task                         Due: Dec 30    │
│  (Shows all tasks where any relation → this object)    │
├─────────────────────────────────────────────────────────┤
│  🔗 Backlinks                            [▼ collapse]   │
│  ─────────────────────────────────────────────────────  │
│  📝 Note that mentions this object                      │
│  📁 Project that links here                             │
│  (Collapsible section, collapsed by default)           │
└─────────────────────────────────────────────────────────┘
```

### Behavior

- Title is editable inline
- Properties show type-appropriate controls (date picker, dropdown, relation chips)
- "+ Add" in Tasks section creates task pre-linked to current object
- Backlinks section queries all objects referencing this one

---

## Quick Capture

### Trigger

- **Global hotkey**: `Cmd+Shift+Space` (works even when app is minimized/unfocused)
- **In-app**: Via Command Palette or dedicated button

### Flow

1. Modal appears (command palette style)
2. User selects type (Task, Note, Project, Link, or custom type)
3. Form shows required fields for selected type
4. User fills fields and submits
5. Object created with `inboxed: true`
6. Relation automatically added to today's daily note (creates daily note if needed)

### Date Handling

Quick capture uses actual current date. No "day boundary" logic—2am capture links to that calendar day.

---

## Command Palette

### Trigger

`Cmd+K` (in-app only)

### Actions

| Action | Description |
|--------|-------------|
| Quick capture | Opens capture modal |
| Navigate to [object] | Search objects by name, jump to selection |
| Jump to [view] | Inbox, Today, This Week, Overdue, Blocked, Eventually, Completed, Daily Notes |
| Create new [type] | Shortcut to create specific type |
| Toggle sidebar | Show/hide navigation sidebar |
| Search | Full-text search across all objects |

### Behavior

- Fuzzy matching on action names and object titles
- Recent actions/objects weighted higher
- Keyboard navigable (arrow keys + enter)

---

## Editor & Mentions

### Block Editor

BlockNote with default configuration. Supports:

- Paragraphs, headings (H1-H3)
- Bullet lists, numbered lists, checklists
- Code blocks
- Blockquotes
- Images (drag & drop)
- Tables

### Object Mentions

**Trigger**: `@` character in editor

**Behavior**:

1. User types `@`
2. Suggestion menu appears with all objects
3. Typing filters by object name
4. Selecting inserts styled mention chip
5. Mention creates relation (appears in backlinks of mentioned object)

**Implementation**: Custom BlockNote `SuggestionMenuController` with `triggerCharacter="@"`

### No Inline Task Creation

Tasks are only created as full objects (via Quick Capture, "+ Add" button, or Command Palette). No inline checkbox-to-task conversion to avoid confusion.

---

## Recurring Tasks

### Recurrence Property

Stored as text: `"daily"`, `"weekly"`, `"monthly"`, `"yearly"`, or custom patterns.

### Completion Behavior (Clone Forward)

When a recurring task is marked done:

1. Current task object set to `status: done`
2. New task object created with:
   - Same: title, priority, project, tags, note relations
   - New: id, createdAt, updatedAt
   - Calculated: dueDate (based on recurrence rule)
   - Reset: `status: todo`, `inboxed: false`

### Why Clone Forward

- Preserves history of completed instances
- Each completion is a distinct record
- Simpler mental model than mutating same object

---

## Daily Notes

### Auto-Creation

Daily note for today is created when:
- User opens "Today" view
- User performs Quick Capture (links to daily note)

### Properties

```typescript
{
  id: "note-2024-12-25",
  typeId: "note",
  properties: {
    title: "December 25, 2024",    // human-readable date
    date: "2024-12-25",            // ISO date
    isDailyNote: true
  },
  content: /* LoroDoc */,
  inboxed: false                   // daily notes skip inbox
}
```

### Content

Starts blank. No template.

### Linked Objects

Objects created on a given day automatically get a relation to that day's daily note (via Quick Capture flow).

### Navigation

- Calendar view shows all daily notes
- Within a daily note: Previous Day / Next Day buttons
- Click any date in calendar to open/create that note

---

## Navigation Sidebar

```
┌─────────────────────────────────────┐
│  📥 Inbox                     (12)  │
├─────────────────────────────────────┤
│  📅 Today                           │
│  📆 Daily Notes                     │
├─────────────────────────────────────┤
│  TASKS                              │
│     This Week                       │
│     Overdue                         │
│     Blocked                         │
│     Eventually                      │
│     Completed                       │
├─────────────────────────────────────┤
│  PROJECTS                           │
│     Website Redesign                │
│     Q1 Planning                     │
│     [+ New Project]                 │
├─────────────────────────────────────┤
│  TAGS                               │
│     🔴 #urgent                      │
│     🔵 #work                        │
│     🟢 #personal                    │
└─────────────────────────────────────┘
```

### Behavior

- Inbox shows unprocessed count badge
- Projects section lists all projects with `status ≠ archived`
- Tags section lists all tags with color indicators
- Clicking any item navigates to that view/object
- Toggle sidebar visibility via Cmd+K → "Toggle sidebar"

---

## Search

### Scope

Full-text search across:
- Object titles/names
- Property values (text, url, email, etc.)
- Rich text content (BlockNote documents)

### UI

Inline dropdown results (Raycast/Spotlight style):
- Opens as overlay
- Results appear as user types
- Shows: type icon, title, snippet of matching content
- Keyboard navigable
- Enter opens selected result

### Implementation

Query Loro documents + SQLite index for property search.

---

## Sync Architecture

### V1: Relay Server

```
┌──────────┐     WebSocket     ┌─────────────────────┐     WebSocket     ┌──────────┐
│ Device A │ ←───────────────→ │ Cloudflare Durable  │ ←───────────────→ │ Device B │
│          │                   │      Object         │                   │          │
│  Loro    │                   │                     │                   │  Loro    │
│  Doc     │                   │  (stateful relay)   │                   │  Doc     │
└──────────┘                   └─────────────────────┘                   └──────────┘
```

### How It Works

1. Each device maintains full local Loro document
2. On change, device sends Loro update bytes to Durable Object
3. Durable Object broadcasts to other connected devices
4. Receiving devices apply updates via Loro merge
5. CRDT guarantees convergence

### Offline Behavior

- App works fully offline
- Changes queue locally
- On reconnect, sync automatically
- **Offline indicator**: Visible status when disconnected or sync fails

---

## Google Calendar Integration

### Overview

Read-only sync with Google Calendar. Meeting objects are automatically created and updated from calendar events. User can view meeting info and take notes, but cannot modify calendar events from the app.

### Authentication

- OAuth 2.0 flow via Google API
- Scopes: `calendar.readonly` (view only)
- Token stored locally, refreshed automatically

### Sync Behavior

| Trigger | Action |
|---------|--------|
| App launch | Fetch events for today + next 7 days |
| Periodic (every 15 min) | Refresh upcoming events |
| Manual refresh | User-triggered full sync |
| Event approaching | Fetch event details if not already synced |

### Event → Meeting Object Mapping

| Google Calendar Field | Meeting Property |
|-----------------------|------------------|
| `summary` | title |
| `start.dateTime` | startTime |
| `end.dateTime` | endTime |
| `location` | location |
| `hangoutLink` or `conferenceData` | location (if no physical location) |
| `attendees[].email` | attendees |
| `id` | calendarEventId |

### Sync Rules

- **New event**: Creates Meeting object with `inboxed: false` (meetings skip inbox)
- **Updated event**: Updates Meeting object properties (preserves user-added content, tags, project)
- **Deleted event**: Meeting object remains but marked with property `calendarDeleted: true`
- **Conflict**: Google Calendar is source of truth for synced fields; user fields (notes, tags, project) preserved locally

### Meeting in Daily Notes

Meetings for a given day automatically appear in that day's daily note view (query by `startTime` date).

### Settings

- Connect/disconnect Google account
- Select which calendars to sync (if user has multiple)
- Sync window: how far ahead to sync (default: 7 days)

---

## Mobile

### V1 Scope

- Quick Capture
- View/browse objects (read-only or limited editing)
- Sync with desktop

### Deferred

- Full rich text editing
- All desktop features

### Implementation

Tauri 2.0 mobile builds (iOS, Android)

---

## Visual Design

### Typography

- **Primary font**: Fragment Mono
- **Fallback**: System monospace
- **Weights**: Regular (400) for body, Medium (500) for emphasis, Bold (700) for headings

### Color Philosophy

Monochromatic with depth. Use the full grayscale spectrum to create visual hierarchy and layered surfaces. Tags are the only color—they should pop.

### Light Mode Palette

| Element | Color | Use |
|---------|-------|-----|
| Background (base) | #FFFFFF | Page background |
| Background (raised) | #FAFAFA | Cards, modals, popovers |
| Background (sunken) | #F5F5F5 | Input fields, code blocks |
| Border (subtle) | #E5E5E5 | Dividers, card edges |
| Border (strong) | #D4D4D4 | Input borders, focused elements |
| Text (primary) | #0A0A0A | Body text, headings |
| Text (secondary) | #525252 | Labels, placeholders, metadata |
| Text (muted) | #A3A3A3 | Disabled, timestamps |
| Surface (hover) | #F5F5F5 | List item hover state |
| Surface (active) | #E5E5E5 | Selected items, pressed state |

### Dark Mode Palette

| Element | Color | Use |
|---------|-------|-----|
| Background (base) | #0A0A0A | Page background |
| Background (raised) | #171717 | Cards, modals, popovers |
| Background (sunken) | #0D0D0D | Input fields, code blocks |
| Border (subtle) | #262626 | Dividers, card edges |
| Border (strong) | #404040 | Input borders, focused elements |
| Text (primary) | #FAFAFA | Body text, headings |
| Text (secondary) | #A3A3A3 | Labels, placeholders, metadata |
| Text (muted) | #525252 | Disabled, timestamps |
| Surface (hover) | #1F1F1F | List item hover state |
| Surface (active) | #292929 | Selected items, pressed state |

### Depth & Layering

Create visual hierarchy through surface elevation:

```
┌─────────────────────────────────────────────┐  ← Modal (raised + shadow)
│  ┌───────────────────────────────────────┐  │
│  │  Content                              │  │  ← Card (raised)
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Input field                          │  │  ← Input (sunken)
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
     ↑ Base background
```

**Shadows** (light mode):
- `sm`: `0 1px 2px rgba(0, 0, 0, 0.05)` — subtle lift
- `md`: `0 4px 6px rgba(0, 0, 0, 0.07)` — cards, dropdowns
- `lg`: `0 10px 15px rgba(0, 0, 0, 0.1)` — modals, command palette

**Shadows** (dark mode):
- `sm`: `0 1px 2px rgba(0, 0, 0, 0.3)` — subtle lift
- `md`: `0 4px 6px rgba(0, 0, 0, 0.4)` — cards, dropdowns
- `lg`: `0 10px 15px rgba(0, 0, 0, 0.5)` — modals, command palette

### Tag Colors

Tags are the only chromatic elements. They should feel vibrant against the grayscale UI.

| Tag Color | Light Mode | Dark Mode |
|-----------|------------|-----------|
| gray | #737373 | #A3A3A3 |
| red | #DC2626 | #EF4444 |
| orange | #EA580C | #F97316 |
| yellow | #CA8A04 | #EAB308 |
| green | #16A34A | #22C55E |
| blue | #2563EB | #3B82F6 |
| purple | #9333EA | #A855F7 |
| pink | #DB2777 | #EC4899 |

### Spacing Scale

Base unit: 4px

| Token | Value | Use |
|-------|-------|-----|
| `xs` | 4px | Tight gaps, icon padding |
| `sm` | 8px | Compact spacing |
| `md` | 16px | Default spacing |
| `lg` | 24px | Section gaps |
| `xl` | 32px | Major sections |
| `2xl` | 48px | Page margins |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 4px | Buttons, inputs, tags |
| `md` | 8px | Cards, dropdowns |
| `lg` | 12px | Modals, large containers |

---

## Keyboard & Interaction

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+Space` | Quick Capture (works when app unfocused) |
| `Cmd+K` | Command Palette |

### Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection in lists |
| `Tab` | Move between focusable elements |
| `Enter` | Open selected item / confirm action |
| `Escape` | Close modal / cancel |

### Task Completion

- Click checkbox to toggle `status` between `todo` and `done`
- Alternatively, edit status property directly via dropdown

### Editor

Default BlockNote keyboard shortcuts.

---

## Edge Cases

### Deleted Object Relations

When an object is deleted:
- Any relations pointing to it become `null`
- Backlink queries simply won't find the deleted object
- No cascading deletes
- No blocking of deletion

### Deletion

Permanent only. No soft delete or trash.

For archival, create and apply an "Archive" tag.

### Empty States

- **Empty Inbox**: "All clear! Nothing to process."
- **Empty view**: "No [tasks/notes/etc] here yet."

---

## First Run Experience

### Seed Data

On first launch, create:

1. **Today's Daily Note**
   - `isDailyNote: true`
   - `date: [today's date]`
   - `inboxed: false`
   - Content: empty

2. **Welcome Note**
   - `title: "Welcome to [App Name]"`
   - `isDailyNote: false`
   - `inboxed: false`
   - Relation: linked to today's daily note
   - Content: explains the app's core concepts
     - Everything is an object
     - Quick Capture with Cmd+Shift+Space
     - Command Palette with Cmd+K
     - Inbox workflow
     - Object relations and backlinks

---

## Out of Scope (v1)

The following are explicitly deferred:

- Custom saved/filtered views
- Markdown export
- File attachment uploads (property type exists, upload mechanism deferred)
- True P2P sync (using relay server instead)
- Sharing/collaboration
- Templates for daily notes or other objects
- Formulas/computed properties
- API/integrations
- Browser extension
- Web version (desktop/mobile apps only)

---

## Revision History

| Date | Changes |
|------|---------|
| 2024-12-25 | Initial specification |

---

## Open Questions

None currently. Spec is ready for implementation planning.
