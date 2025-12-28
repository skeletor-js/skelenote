# Side-by-Side View

> View and edit two objects simultaneously with a resizable split pane layout. Compare current vs. historical versions via Time Machine integration.

---

## 1. Overview

Enable users to work with two objects at once by splitting the main content area into two panes. This feature enhances productivity for workflows that involve referencing, comparing, or transferring content between objects—such as taking notes while reading a source document, comparing task details, or copying content between notes.

**User Value:**
- Reference one object while editing another without context switching
- Compare related objects side-by-side (e.g., draft vs. final version)
- **Compare current vs. historical versions** via Time Machine integration
- Easily copy/paste or drag content between objects
- Maintain focus on related work without losing place in either document

**Time Machine Integration:** Side-by-Side View serves as the comparison interface for Time Machine (see `time-machine.md`). When viewing historical versions, users can open a "Compare with Current" view that shows the current editable version on the left and the read-only historical version on the right.

---

## 2. Goals

### Primary Goals
- Implement a split pane component with smooth, resizable divider
- Extend NavigationContext to manage dual-pane state (primary + secondary object)
- Provide intuitive interaction patterns for opening/closing split view
- Maintain consistent UX across both panes (same object detail view experience)

### Success Criteria
- Users can open any object in a secondary pane via Cmd+click or context menu
- Divider can be dragged to resize panes between 25% and 75% width
- Each pane functions independently (navigation, editing, properties)
- Split view state persists during session but resets on app restart
- Performance: No noticeable lag when resizing or switching objects

### Non-Goals
- More than two panes (three-way split or grid layout)
- Different view types per pane (e.g., list view + object view)
- Persistent split view state across app restarts (v1)
- Synchronized scrolling between panes
- Mobile/responsive split view (single pane on small screens)

---

## 3. User Stories

**As a researcher**, I want to view my notes alongside a source document so that I can reference material while writing without switching between views.

**As a project manager**, I want to compare two tasks side-by-side so that I can ensure consistency in descriptions and identify dependencies.

**As a writer**, I want to have my outline open next to my draft so that I can follow my structure while expanding each section.

**As a knowledge worker**, I want to quickly open a related object in a split view so that I can copy relevant content without losing my place.

**As a power user**, I want to close the secondary pane with a single action so that I can return to focused single-object editing.

**As a user reviewing history**, I want to compare a historical version of my note with the current version side-by-side so that I can see exactly what changed before deciding to restore.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layout.tsx                                                          │
│  ├── Sidebar                                                         │
│  └── Main Content Area                                               │
│      └── SplitPane.tsx (NEW)                                         │
│          ├── Primary Pane                                            │
│          │   └── ObjectDetailView (existing)                         │
│          ├── Resizable Divider                                       │
│          └── Secondary Pane (conditional)                            │
│              └── ObjectDetailView (existing, secondary instance)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Navigation State Extension

Extend `NavigationContext` to track secondary pane state:

```typescript
interface NavigationState {
  view: ViewType;
  objectId: string | null;
}

// Loro's native frontier type (for version comparison)
type Frontier = { peer: PeerID; counter: number }[];

interface SplitPaneState {
  isOpen: boolean;
  objectId: string | null;
  width: number;  // Percentage (25-75)
  // Version comparison mode (Time Machine integration)
  mode: 'object' | 'version-compare';
  historicalFrontier?: Frontier;  // Loro frontier for version comparison
  historicalTimestamp?: number;   // Display timestamp for header
}

interface NavigationContextValue {
  // Existing...
  currentView: ViewType;
  selectedObjectId: string | null;
  navigateToObject: (objectId: string) => void;

  // New split pane additions...
  splitPane: SplitPaneState;
  openInSplit: (objectId: string) => void;
  closeSplit: () => void;
  setSplitWidth: (width: number) => void;
  swapPanes: () => void;

  // Version comparison (Time Machine integration)
  openVersionComparison: (objectId: string, frontier: Frontier, timestamp: number) => void;
}
```

### Split Pane Component

The `SplitPane` component manages the layout and resizing logic:

```typescript
interface SplitPaneProps {
  primaryContent: ReactNode;
  secondaryContent: ReactNode | null;
  splitWidth: number;  // Percentage for secondary pane
  onWidthChange: (width: number) => void;
  onClose: () => void;
  // Version comparison mode
  mode: 'object' | 'version-compare';
  onRestore?: () => void;  // Callback when user clicks "Restore" in version-compare mode
}
```

Key behaviors:
- Primary pane always visible, takes full width when split is closed
- Secondary pane renders when `secondaryContent` is provided
- Divider appears between panes, draggable horizontally
- Minimum/maximum constraints prevent panes from becoming too narrow
- **In `version-compare` mode:**
  - Secondary pane header shows historical timestamp instead of object title
  - Secondary pane content is read-only
  - "Restore" button appears in secondary pane header
  - Swapping panes is disabled (current always on left)

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/SplitPane.tsx` | Split pane container with resizable divider |
| `src/components/layout/SplitPane.css` | Styles for split layout and divider |
| `src/components/layout/SplitDivider.tsx` | Draggable divider component (optional, can be inline) |
| `src/components/history/HistoricalObjectView.tsx` | Read-only view for historical object state (version comparison) |
| `src/components/history/HistoricalObjectView.css` | Styles for historical object view |

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/NavigationContext.tsx` | Add `splitPane` state, `openInSplit`, `closeSplit`, `setSplitWidth`, `swapPanes`, `openVersionComparison` |
| `src/components/object/ObjectDetailView.tsx` | Add `paneType` prop to differentiate primary/secondary behavior |
| `src/components/layout/Layout.tsx` | Integrate SplitPane wrapper around main content |
| `src/components/layout/index.ts` | Export SplitPane component |
| `src/components/object/ObjectHeader.tsx` | Add "Open in Split" context menu option |
| `src/components/history/ObjectPreview.tsx` | Add "Compare with Current" button that calls `openVersionComparison` |
| `src/lib/loro/store.ts` | Add `getObjectAtFrontier(objectId, frontier)` for version comparison |

### Data Flow

**Object Split View:**
```
User Cmd+clicks object link
        │
        ▼
NavigationContext.openInSplit(objectId)
        │
        ▼
splitPane.isOpen = true
splitPane.objectId = objectId
splitPane.mode = 'object'
        │
        ▼
Layout re-renders with SplitPane
        │
        ▼
SplitPane renders two ObjectDetailView instances
  - Primary: selectedObjectId (existing)
  - Secondary: splitPane.objectId (new)
```

**Version Comparison (Time Machine):**
```
User clicks "Compare with Current" in Time Machine
        │
        ▼
NavigationContext.openVersionComparison(objectId, frontier, timestamp)
        │
        ▼
splitPane.isOpen = true
splitPane.objectId = objectId
splitPane.mode = 'version-compare'
splitPane.historicalFrontier = frontier
splitPane.historicalTimestamp = timestamp
        │
        ▼
Layout re-renders with SplitPane
        │
        ▼
SplitPane renders:
  - Primary (left): ObjectDetailView (current, editable)
  - Secondary (right): HistoricalObjectView (historical, read-only)
        │
        ▼
User clicks "Restore" in secondary pane
        │
        ▼
LoroDocStore.restoreFromVersion(frontier, { type: 'single', objectId })
        │
        ▼
closeSplit() → returns to single-pane view with restored content
```

---

## 5. Implementation Steps

1. **Extend NavigationContext with split pane state**
   - Add `SplitPaneState` interface with `mode`, `historicalFrontier`, `historicalTimestamp`
   - Add `splitPane` state with `isOpen`, `objectId`, `width`, `mode`
   - Implement `openInSplit(objectId)` - opens object in secondary pane (mode: 'object')
   - Implement `openVersionComparison(objectId, frontier, timestamp)` - opens version comparison (mode: 'version-compare')
   - Implement `closeSplit()` - closes secondary pane
   - Implement `setSplitWidth(width)` - updates divider position
   - Implement `swapPanes()` - swaps primary and secondary objects (disabled in version-compare mode)

2. **Create SplitPane component**
   - Build container with CSS flexbox/grid layout
   - Implement resizable divider with mouse drag handling
   - Add width constraints (min 25%, max 75%)
   - Handle keyboard resize (arrow keys when divider focused)
   - Add close button to secondary pane header

3. **Create SplitPane styles**
   - Flexbox container for horizontal split
   - Divider styling (visible grab handle, hover state)
   - Cursor changes during drag operation
   - Smooth width transitions when not dragging

4. **Update ObjectDetailView for pane context**
   - Add optional `paneType: 'primary' | 'secondary'` prop
   - Adjust back button behavior based on pane type
   - Secondary pane shows close button instead of back button
   - Ensure both panes can independently navigate object relations

5. **Integrate SplitPane into Layout**
   - Wrap main content in SplitPane component
   - Pass primary content (current view)
   - Conditionally pass secondary content (split object detail)
   - Connect to NavigationContext for state

6. **Add interaction triggers**
   - Cmd+click on object links opens in split
   - Context menu "Open in Split View" option
   - Keyboard shortcut for opening focused object in split

7. **Handle edge cases**
   - Opening same object in both panes (prevent or allow?)
   - Navigating away from primary view while split is open
   - Deleting object that's open in secondary pane
   - Responsive behavior on narrow viewports

8. **Create HistoricalObjectView for version comparison** (`src/components/history/HistoricalObjectView.tsx`)
   - Render object at historical frontier using `LoroDocStore.getObjectAtFrontier()`
   - Display read-only content (BlockNote in read-only mode)
   - Show header with historical timestamp and "Restore" button
   - Handle missing content gracefully (object may have been deleted)

9. **Integrate with Time Machine**
   - Add "Compare with Current" button to Time Machine's ObjectPreview
   - Button calls `openVersionComparison(objectId, frontier, timestamp)`
   - "Restore" button in HistoricalObjectView calls `restoreFromVersion()` then `closeSplit()`
   - Restored content syncs automatically to other devices via P2P

10. **Polish and accessibility**
    - Announce split open/close to screen readers
    - Ensure keyboard navigation works across panes
    - Add visual focus indicators for active pane
    - Announce "historical version, read-only" for version comparison mode
    - Test with screen readers

---

## 6. UI/UX Considerations

### Split Pane Layout (Object Mode)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Sidebar  │              Main Content Area                                │
│           │                                                               │
│  Inbox    │  ┌─────────────────────┐ ║ ┌─────────────────────┐           │
│  Today    │  │    PRIMARY PANE     │ ║ │   SECONDARY PANE    │           │
│  ...      │  │                     │ ║ │                     │           │
│           │  │  ← Back             │ ║ │              [X]    │           │
│  ──────   │  │                     │ ║ │                     │           │
│           │  │  # Object Title     │ ║ │  # Object Title     │           │
│  Types    │  │                     │ ║ │                     │           │
│  • Note   │  │  Properties...      │ ║ │  Properties...      │           │
│  • Task   │  │                     │ ║ │                     │           │
│  • Event  │  │  Content...         │ ║ │  Content...         │           │
│           │  │                     │ ║ │                     │           │
│           │  │                     │ ║ │                     │           │
│           │  └─────────────────────┘ ║ └─────────────────────┘           │
│           │                          ║                                    │
│           │                      Divider                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Version Comparison Layout (Time Machine)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Sidebar  │              Main Content Area                                │
│           │                                                               │
│  Inbox    │  ┌─────────────────────┐ ║ ┌─────────────────────┐           │
│  Today    │  │   CURRENT VERSION   │ ║ │ Dec 27, 2024 11:32  │           │
│  ...      │  │                     │ ║ │ (Read-only)         │           │
│           │  │  ← Back             │ ║ │       [Restore] [X] │           │
│  ──────   │  │                     │ ║ │                     │           │
│           │  │  # My Note          │ ║ │  # My Note          │           │
│  Types    │  │                     │ ║ │                     │           │
│  • Note   │  │  Updated text...    │ ║ │  Original text...   │           │
│  • Task   │  │                     │ ║ │                     │           │
│  • Event  │  │  [Editable]         │ ║ │  [Read-only]        │           │
│           │  │                     │ ║ │                     │           │
│           │  │                     │ ║ │                     │           │
│           │  └─────────────────────┘ ║ └─────────────────────┘           │
│           │                          ║                                    │
│           │                      Divider                                  │
└──────────────────────────────────────────────────────────────────────────┘

Version comparison is opened from Time Machine via "Compare with Current" button.
- Left pane: Current version (editable)
- Right pane: Historical version (read-only) with Restore button
- Clicking "Restore" applies the historical version and closes split view
```

### Resizable Divider

```
                    ┌─────┐
                    │     │
                    │  ║  │  ← Visible divider line (2-4px)
                    │  ║  │
                    │     │  ← Hover/drag zone (8-12px)
                    │  ║  │
                    │  ║  │
                    │     │
                    └─────┘

States:
─────────────────────────────────────────────────
Default         │  Subtle border, standard cursor
Hover           │  Highlighted, col-resize cursor
Dragging        │  Active highlight, live resize
─────────────────────────────────────────────────
```

### Open in Split Interactions

```
Method 1: Cmd+Click on Link
────────────────────────────────────────────────────────
  User Cmd+clicks a [[mention]] or object link
  → Object opens in secondary pane
  → Primary pane remains unchanged

Method 2: Context Menu
────────────────────────────────────────────────────────
  Right-click on object in list or mention
  ┌─────────────────────────┐
  │  Open                   │
  │  Open in Split View     │  ← New option
  │  ─────────────────────  │
  │  Copy Link              │
  │  Delete                 │
  └─────────────────────────┘

Method 3: Object Header Action
────────────────────────────────────────────────────────
  When viewing an object, header menu:
  ┌─────────────────────────┐
  │  [···]                  │  ← Object actions menu
  ├─────────────────────────┤
  │  Open in Split View     │
  │  Export to Markdown     │
  │  Copy Link              │
  │  ─────────────────────  │
  │  Delete                 │
  └─────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+\` | Toggle split view (open/close secondary pane) |
| `Cmd+Click` | Open clicked link in secondary pane |
| `Cmd+Shift+\` | Swap primary and secondary panes |
| `Escape` | Close secondary pane (when focused) |
| `Cmd+1` | Focus primary pane |
| `Cmd+2` | Focus secondary pane |
| `Ctrl+Left/Right` | Resize split (when divider focused) |

### Accessibility Requirements

- **Focus management**: Clear visual indicator for which pane is active
- **Screen reader announcements**:
  - "Split view opened with [Object Title]"
  - "Split view closed"
  - "Now editing in [primary/secondary] pane"
- **Keyboard navigation**:
  - Tab cycles through all interactive elements in active pane
  - Shortcut to move focus between panes
  - Divider is focusable and resizable via keyboard
- **ARIA attributes**:
  - `role="region"` for each pane with descriptive labels
  - `aria-live="polite"` for split state changes
  - Divider: `role="separator"` with `aria-valuenow` for position
- **Reduced motion**: Respect `prefers-reduced-motion` for resize animations
- **Minimum sizes**: Ensure panes never become too narrow to be usable

---

## 7. Testing Checklist

### Unit Tests
- [ ] `openInSplit` correctly sets secondary object ID
- [ ] `closeSplit` resets split state
- [ ] `setSplitWidth` clamps values between 25-75%
- [ ] `swapPanes` correctly exchanges primary and secondary objects
- [ ] Split state initializes as closed
- [ ] Divider drag calculations produce correct width percentages

### Integration Tests
- [ ] Cmd+click on mention opens object in split
- [ ] Context menu "Open in Split View" works
- [ ] Closing split returns to single pane layout
- [ ] Both panes independently display correct objects
- [ ] Editing in primary pane doesn't affect secondary
- [ ] Editing in secondary pane doesn't affect primary
- [ ] Navigation in primary pane preserves secondary
- [ ] Divider resize persists until split is closed
- [ ] Keyboard shortcuts trigger correct actions

### Version Comparison Tests (Time Machine Integration)
- [ ] "Compare with Current" opens version comparison mode
- [ ] Left pane shows current editable version
- [ ] Right pane shows historical read-only version
- [ ] Right pane header displays correct historical timestamp
- [ ] Historical content renders correctly (BlockNote read-only)
- [ ] "Restore" button applies historical version
- [ ] Restore closes split view and shows updated content
- [ ] Restored content syncs to other devices via P2P
- [ ] Swap panes is disabled in version-compare mode
- [ ] Keyboard shortcut Cmd+D opens version comparison from Time Machine

### Manual QA Checklist
- [ ] Open object in split via Cmd+click
- [ ] Open object in split via context menu
- [ ] Drag divider to resize panes
- [ ] Verify minimum/maximum width constraints
- [ ] Close split via X button
- [ ] Close split via Escape key
- [ ] Close split via Cmd+\ shortcut
- [ ] Swap panes and verify content switches
- [ ] Focus moves correctly between panes
- [ ] Both editors function independently
- [ ] Backlinks work in both panes
- [ ] Mentions work in both panes
- [ ] Property editing works in both panes
- [ ] Delete object from secondary pane closes split gracefully
- [ ] Verify no layout shifts during resize

### Edge Cases
- [ ] Opening same object in both panes
- [ ] Opening split when already in split view (replace secondary)
- [ ] Deleting primary object while split is open
- [ ] Deleting secondary object while split is open
- [ ] Navigating to non-object view while split is open
- [ ] Very long content in narrow pane
- [ ] Rapid resize dragging performance
- [ ] Window resize with split open
- [ ] Split open on very narrow viewport (should collapse)
- [ ] Creating new object from secondary pane
- [ ] Following mention from secondary to object already in primary

### Version Comparison Edge Cases
- [ ] Object was deleted after historical point (show historical, current is empty)
- [ ] Object didn't exist at historical point (show empty historical, current exists)
- [ ] Very large content difference between versions
- [ ] Historical version has properties that don't exist in current schema
- [ ] Restore while another device is syncing
- [ ] Network disconnect during restore operation
- [ ] Opening version comparison for object not in current view

---

## 8. Future Considerations

### Potential Enhancements
- **Persistent split state**: Remember last split configuration across sessions
- **Vertical split option**: Stack panes vertically for wide monitors
- **Three-pane view**: Add third pane for power users
- **Linked scrolling**: Optionally synchronize scroll position between panes
- **Visual diff highlighting**: Inline highlighting of what changed between versions
- **Drag-and-drop between panes**: Move blocks or properties between objects
- **Split view history**: Navigate back/forward within secondary pane
- **Mobile split**: Swipe gesture to switch between panes on mobile
- **View mixing**: Allow list view in one pane, object view in other
- **Quick peek**: Hover preview of links without full split

### Implemented Integrations
- ✅ **Time Machine**: Compare current vs. historical version in split view (version-compare mode)

### Future Integration Opportunities
- Templates: View template and new object side-by-side during creation
- Bulk operations: Preview selected objects in secondary pane
- Daily notes: Today's note primary, reference note secondary

### Related Features
- **Time Machine** (`time-machine.md`): Provides "Compare with Current" button that opens version comparison
- **Local Network Sync** (`true-p2p-sync.md`): Restored content syncs automatically to connected devices
- **Device Management** (`device-management.md`): Version comparison may show historical content from revoked devices
