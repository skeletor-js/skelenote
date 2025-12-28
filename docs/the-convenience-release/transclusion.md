# Transclusion

> Embed live content from other notes inline, creating dynamic connections throughout your knowledge base.

---

## 1. Overview

Transclusion enables embedding content from one note directly into another, maintaining a live connection to the source. When source content changes, all transcluded instances update automatically. This transforms Skelenote from a collection of linked notes into a truly interconnected knowledge graph where content can be composed, reused, and kept synchronized.

**User Value:**
- Avoid content duplication by embedding shared sections (e.g., project status in multiple reports)
- Build composite documents from modular content blocks
- Keep repeated information synchronized automatically
- Maintain single source of truth while displaying content in multiple contexts
- Create meeting notes that embed relevant task lists or project briefs

---

## 2. Goals

### Primary Goals
- Create a custom BlockNote block type for embedding content from other objects
- Render transcluded content inline with clear visual distinction from native content
- Provide live updates when source content changes via Loro subscriptions
- Enable navigation to source object with single click
- Detect and prevent circular transclusion chains

### Success Criteria
- Transcluded content renders within 100ms of block insertion
- Live updates propagate within 500ms of source changes
- Circular references are detected before rendering (prevents infinite loops)
- Source navigation works via click and keyboard
- Transcluded content is clearly distinguishable from native content

### Non-Goals
- Editing transcluded content in-place (read-only for v1)
- Partial block transclusion (entire blocks only for v1)
- Cross-device transclusion preview before sync completes
- Transclusion of non-content objects (properties/metadata)

---

## 3. User Stories

**As a project manager**, I want to embed a project's task list into weekly status reports so that the report always reflects current task status without manual updates.

**As a researcher**, I want to embed key findings from multiple research notes into a synthesis document so that updates to findings automatically update the synthesis.

**As a team lead**, I want to embed team guidelines into onboarding documents so that policy updates propagate to all onboarding materials.

**As a knowledge worker**, I want to see which notes reference content I'm editing so that I understand the impact of my changes.

**As a note-taker**, I want to quickly navigate from transcluded content to its source so that I can edit the original or see full context.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Editor (BlockNoteView)                                      │
│  ├── Native blocks (paragraph, heading, list, etc.)         │
│  └── TransclusionBlock (custom block)                       │
│       ├── Renders source content inline                     │
│       ├── Subscribes to source changes via Loro             │
│       └── Click handler for navigation                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  TransclusionManager (src/lib/editor/transclusion.ts)        │
│  ├── Content fetching from ObjectStore                      │
│  ├── Circular reference detection (DAG validation)          │
│  ├── Loro subscription management                           │
│  └── Cache for performance optimization                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ObjectStore / Loro CRDT                                     │
│  ├── Object content storage                                 │
│  └── Change subscription API                                │
└─────────────────────────────────────────────────────────────┘
```

### Custom BlockNote Block

The transclusion block is implemented as a custom BlockNote block type (not inline content like mentions), allowing it to embed multi-block content.

```typescript
// Block specification
{
  type: 'transclusion',
  propSchema: {
    targetId: { default: '' },        // ID of source object
    blockRange: { default: null },    // Optional: specific blocks (null = all)
    collapsed: { default: false },    // Collapsed/expanded state
  },
  content: 'none', // Content rendered dynamically from source
}
```

### Live Update Mechanism

1. **Initial Render**: TransclusionBlock fetches content via ObjectStore.getContent(targetId)
2. **Subscription**: Block subscribes to Loro document changes for target object
3. **Update Handling**: On source change, re-fetch and re-render content
4. **Cleanup**: Unsubscribe when block is removed or editor unmounts

```typescript
// Subscription pattern using Loro's event system
const unsubscribe = loroDoc.subscribe((event) => {
  if (affectsObject(event, targetId)) {
    refreshTranscludedContent();
  }
});
```

### Circular Reference Detection

Before rendering, validate the transclusion graph to prevent infinite loops.

```typescript
// DAG validation algorithm
function detectCircularReference(
  sourceId: string,
  targetId: string,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(targetId)) return true;
  if (targetId === sourceId) return true;

  visited.add(targetId);

  // Get all transclusions in target
  const targetTransclusions = getTransclusionsInObject(targetId);

  for (const transclusion of targetTransclusions) {
    if (detectCircularReference(sourceId, transclusion.targetId, visited)) {
      return true;
    }
  }

  return false;
}
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/editor/TransclusionBlock.tsx` | Custom BlockNote block component |
| `src/components/editor/TransclusionBlock.css` | Styling for transclusion visual treatment |
| `src/components/editor/TransclusionPicker.tsx` | Object picker modal for inserting transclusions |
| `src/lib/editor/transclusion.ts` | Content fetching, subscription, and circular detection |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/editor/schema.ts` | Add transclusion to blockSpecs |
| `src/lib/editor/persistence.ts` | Handle transclusion serialization/deserialization |
| `src/components/editor/Editor.tsx` | Register transclusion insertion command |
| `src/components/editor/Editor.css` | Import transclusion styles |

### Data Flow

```
Insert Transclusion
        │
        ▼
┌───────────────────┐
│ Object Picker     │ ← User selects target note
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Circular Check    │ ← Validate no cycles
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
  Valid    Invalid
    │         │
    ▼         ▼
Insert     Show Error
Block      Message
    │
    ▼
┌───────────────────┐
│ Fetch Content     │ ← Get source object content
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Subscribe to      │ ← Watch for source changes
│ Loro Changes      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Render Inline     │ ← Display with visual indicator
└───────────────────┘
```

---

## 5. Implementation Steps

1. **Create transclusion types and interfaces** (`src/lib/editor/transclusion.ts`)
   - Define TransclusionBlock props type
   - Define circular detection interface
   - Define subscription management types

2. **Implement circular reference detection** (`src/lib/editor/transclusion.ts`)
   - Parse transclusion blocks from object content
   - Build transclusion graph
   - Implement DAG validation algorithm
   - Return detailed error for circular chains

3. **Create TransclusionManager class** (`src/lib/editor/transclusion.ts`)
   - Content fetching with caching
   - Loro subscription lifecycle management
   - Debounced refresh for rapid changes
   - Error state handling (deleted source, etc.)

4. **Build TransclusionBlock component** (`src/components/editor/TransclusionBlock.tsx`)
   - Create BlockNote block specification
   - Implement content rendering (parse and display source blocks)
   - Add loading and error states
   - Handle collapsed/expanded toggle
   - Implement click-to-navigate

5. **Create transclusion styling** (`src/components/editor/TransclusionBlock.css`)
   - Visual container with border/background
   - Source indicator bar
   - Hover states
   - Collapsed view styling

6. **Build TransclusionPicker component** (`src/components/editor/TransclusionPicker.tsx`)
   - Search/filter objects
   - Show object previews
   - Block range selection (future)
   - Confirmation action

7. **Update editor schema** (`src/lib/editor/schema.ts`)
   - Import TransclusionBlock
   - Add to blockSpecs

8. **Add transclusion command to editor** (`src/components/editor/Editor.tsx`)
   - Register slash command: `/embed` or `/transclude`
   - Handle keyboard shortcut (Cmd+Shift+E)
   - Open picker modal on trigger

9. **Update persistence layer** (`src/lib/editor/persistence.ts`)
   - Serialize transclusion blocks to JSON
   - Deserialize and validate on load
   - Handle missing targets gracefully

10. **Implement live update subscription** (`src/components/editor/TransclusionBlock.tsx`)
    - Subscribe on mount
    - Refresh content on source change
    - Unsubscribe on unmount
    - Handle deleted source object

---

## 6. UI/UX Considerations

### Transcluded Content Appearance

```
┌─────────────────────────────────────────────────────────────┐
│  Note: Project Alpha Status Report                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ## Weekly Update                                           │
│                                                             │
│  This week we focused on the backend refactor.              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ↗ From: Project Alpha Tasks                           │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                       │ │
│  │  ## Current Tasks                                     │ │
│  │                                                       │ │
│  │  - [x] Database migration                             │ │
│  │  - [ ] API endpoints                                  │ │
│  │  - [ ] Frontend integration                           │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Next week we'll tackle the frontend work.                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Legend:
┌──────┐  Transcluded content container
│ ↗    │  Link icon indicating embedded content
│ From:│  Source object name (clickable)
└──────┘  Subtle border distinguishing from native content
```

### Insert Transclusion Flow

```
Step 1: Trigger insertion (slash command or keyboard shortcut)

┌─────────────────────────────────────────────────────────────┐
│  Type /embed or press Cmd+Shift+E                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ /embed                                               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📎 Embed content from another note                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Step 2: Object picker modal

┌─────────────────────────────────────────────────────────────┐
│  Embed Content From                                    [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [ Search notes...                              ]        │
│                                                             │
│  Recent                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 Project Alpha Tasks                              │   │
│  │    Last edited: 2 hours ago                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📄 Meeting Notes - Dec 15                           │   │
│  │    Last edited: 3 days ago                          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📄 Q4 Goals                                         │   │
│  │    Last edited: 1 week ago                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ Cannot embed from current note (would create loop)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Step 3: Confirmation (optional - show preview)

┌─────────────────────────────────────────────────────────────┐
│  Embed: Project Alpha Tasks                            [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Preview:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ## Current Tasks                                    │   │
│  │                                                     │   │
│  │ - [x] Database migration                            │   │
│  │ - [ ] API endpoints                                 │   │
│  │ - [ ] Frontend integration                          │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [ Cancel ]  [ Embed Content ]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual Indicators

```
Native content:          Transcluded content:

## Heading               ┌──────────────────────────────┐
                         │ ↗ Source Note               │
Regular paragraph        ├──────────────────────────────┤
text flows normally.     │ ## Heading                  │
                         │                              │
- List item              │ Transcluded paragraph       │
- Another item           │ appears in bordered box.    │
                         │                              │
                         │ - Embedded list             │
                         │ - Still synced              │
                         └──────────────────────────────┘

Visual cues:
- Subtle background tint (e.g., rgba(100, 150, 255, 0.05))
- Left border accent (3px, brand color)
- Header bar with source link
- ↗ icon indicating external source
- Hover: show "Click to open source" tooltip
```

### Collapsed State

```
Expanded (default):

┌─────────────────────────────────────────────────────────────┐
│ ↗ Project Alpha Tasks                               [−] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ## Current Tasks                                            │
│ - [x] Database migration                                    │
│ - [ ] API endpoints                                         │
│ ...                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Collapsed:

┌─────────────────────────────────────────────────────────────┐
│ ↗ Project Alpha Tasks (3 blocks)                    [+] │
└─────────────────────────────────────────────────────────────┘
```

### Navigation to Source

```
Click on source link:

┌───────────────────────────────────────────────────────────┐
│ ↗ Project Alpha Tasks   ← Click here                     │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Opens source note in editor │
            │ (same pane or split view)   │
            └─────────────────────────────┘

Alternative: Right-click context menu

┌─────────────────────────────────────┐
│ Open Source Note                    │
│ Open in Split View                  │
│ ────────────────────────────────── │
│ Remove Transclusion                 │
│ Replace with Content Copy           │
└─────────────────────────────────────┘
```

### Error States

```
Source Deleted:

┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Source note was deleted                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ The embedded content is no longer available.                │
│                                                             │
│ [ Remove Block ]  [ Restore from History ]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Circular Reference Detected:

┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Circular reference detected                              │
│                                                             │
│ Cannot embed "Note A" because it creates a loop:            │
│ Current Note → Note A → Note B → Current Note              │
│                                                             │
│ [ Cancel ]                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+E` | Insert transclusion (opens picker) |
| `/embed` | Slash command to insert transclusion |
| `/transclude` | Alias slash command |
| `Enter` (on transclusion) | Navigate to source |
| `Cmd+Enter` (on transclusion) | Open source in split view |
| `Backspace` (on selected transclusion) | Delete transclusion block |
| `Cmd+/` (on transclusion) | Toggle collapsed/expanded |

### Accessibility Requirements

- Transclusion container has `role="region"` with `aria-label="Embedded content from [Source Name]"`
- Source link is keyboard focusable with `tabindex="0"`
- Collapse toggle is a proper button with `aria-expanded` state
- Screen reader announces "Embedded content block" when navigating to transclusion
- Error states are announced via `aria-live="polite"`
- High contrast mode: border color meets 3:1 contrast ratio
- Focus indicator visible on transclusion container and controls
- Source link announces "Link to [Source Name], press Enter to navigate"

---

## 7. Testing Checklist

### Unit Tests
- [ ] Circular reference detection correctly identifies direct cycles
- [ ] Circular reference detection correctly identifies indirect cycles (A→B→C→A)
- [ ] Circular reference detection allows valid non-cyclic transclusions
- [ ] Content fetching returns correct content for valid target ID
- [ ] Content fetching returns error for non-existent target
- [ ] Content fetching returns error for deleted target
- [ ] Transclusion block props serialization is correct
- [ ] Transclusion block props deserialization handles missing fields
- [ ] Subscription cleanup runs on unmount
- [ ] Debounced refresh prevents excessive re-renders

### Integration Tests
- [ ] Insert transclusion via slash command creates valid block
- [ ] Insert transclusion via keyboard shortcut creates valid block
- [ ] Transcluded content displays correctly after insertion
- [ ] Source content update propagates to transclusion within 500ms
- [ ] Multiple transclusions of same source all update together
- [ ] Click on source link navigates to source object
- [ ] Collapsed/expanded state persists across editor sessions
- [ ] Transclusion survives editor remount (objectId change)
- [ ] Transclusion works with sync (content syncs between devices)
- [ ] Deleting source object shows error state in transclusion
- [ ] Object picker filters out current object
- [ ] Object picker shows circular reference warning

### Manual QA Checklist
- [ ] Insert transclusion using Cmd+Shift+E
- [ ] Insert transclusion using /embed command
- [ ] Search and select object in picker
- [ ] Verify transcluded content matches source
- [ ] Edit source in another tab/pane, verify transclusion updates
- [ ] Click source link navigates correctly
- [ ] Right-click context menu shows expected options
- [ ] Toggle collapse/expand works
- [ ] Transclusion renders correctly after app restart
- [ ] Multiple transclusions in single document work correctly
- [ ] Transclusion syncs between devices
- [ ] Delete source object, verify error state
- [ ] Attempt to create circular reference, verify prevention
- [ ] Keyboard navigation through transclusion works
- [ ] VoiceOver/screen reader announces correctly

### Edge Cases
- [ ] Very long source content (performance)
- [ ] Source with deeply nested blocks
- [ ] Source containing mentions (renders correctly)
- [ ] Source containing code blocks (syntax highlighting preserved)
- [ ] Multiple levels of transclusion (A embeds B embeds C)
- [ ] Transclusion of empty object
- [ ] Rapid source edits (debounce works correctly)
- [ ] Transclusion in collapsed section
- [ ] Undo/redo of transclusion insertion
- [ ] Cut/paste of transclusion block
- [ ] Transclusion during offline mode
- [ ] Sync conflict with transclusion (both devices edit)
- [ ] 50+ transclusions in single document (performance)
- [ ] Transclusion of object with very long title

---

## 8. Future Considerations

### Potential Enhancements

**Block Range Selection**
- Allow embedding specific blocks from source (e.g., only headings, specific paragraphs)
- UI for selecting block range visually
- Range updates when source structure changes

**Editable Transclusions**
- Optionally allow editing transcluded content in-place
- Changes propagate back to source
- Conflict resolution for simultaneous edits

**Transclusion References Panel**
- Show all objects that transclude from current object
- "Impact analysis" before editing
- Backlinks-style view for transclusions

**Transclusion Sync Indicator**
- Show when transcluded content is out of sync (offline mode)
- Manual refresh option
- Sync status in transclusion header

**Filtered Transclusions**
- Transclude only blocks matching criteria (e.g., all tasks, all headings)
- Dynamic filtering as source changes

**Transclusion Templates**
- Predefined transclusion patterns (e.g., "embed all tasks from project")
- Smart transclusions that update query dynamically

**Performance Optimizations**
- Virtualized rendering for large transclusions
- Background prefetching for likely transclusion targets
- Incremental updates (diff-based) instead of full content refresh

**Transclusion Graph Visualization**
- Visual representation of transclusion relationships
- Identify heavily-transcluded "hub" documents
- Detect potential circular reference risks
