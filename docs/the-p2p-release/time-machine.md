# Time Machine

> Browse your entire knowledge base at any point in time. Leverage Loro's version history to see exactly what your notes looked like yesterday, last week, or months ago.

---

## 1. Overview

Time Machine enables users to navigate their entire knowledge base through time, viewing all objects as they existed at any historical point. Unlike traditional version history (which shows changes to a single document), Time Machine provides a complete temporal view of your entire workspace.

**User Value:**
- Recover accidentally deleted or modified content from any point in time
- Review how your knowledge base evolved over days, weeks, or months
- Audit changes across multiple objects for a specific date
- Restore individual objects or your entire workspace to a previous state
- Understand the context of past work by seeing related objects together
- See which device made each change across your synced devices

**Multi-Device Integration:** Time Machine works seamlessly with Local Network Sync (see `true-p2p-sync.md`) and Device Management (see `device-management.md`). Changes from all your synced devices appear in a unified timeline, with device attribution available on hover. When you restore a historical version, the change syncs automatically to all connected devices via P2P.

**Unique Differentiator:** No other note-taking application offers the ability to view your entire knowledge base at any point in time. Traditional apps only show version history for individual documents. Time Machine transforms version history from a recovery tool into a powerful knowledge exploration feature.

---

## 2. Goals

### Primary Goals
- Provide intuitive navigation through time via calendar and timeline interfaces
- Display accurate snapshots of all objects at any selected point in time
- Enable selective or full restoration from historical states
- Maintain performance with large version histories

### Success Criteria
- Users can navigate to any date with recorded changes within 500ms
- Historical object states render accurately with all properties and content
- Restore operations complete successfully with proper CRDT merging
- Calendar view correctly indicates all days with changes
- Timeline slider provides smooth, responsive scrubbing

### Non-Goals
- Real-time collaboration history (who made what change)
- Diff view between versions (future enhancement)
- Branching or alternative timelines
- Automated backup scheduling (separate feature)
- Partial object restoration (restore specific properties only)

---

## 3. User Stories

**As a knowledge worker**, I want to see my entire knowledge base as it existed last week so that I can recall the context around a specific project.

**As a user who accidentally deleted content**, I want to navigate to yesterday and restore a deleted note so that I can recover my work without losing recent changes to other objects.

**As a researcher**, I want to browse my notes from a specific date range so that I can review my thinking during a past research phase.

**As a power user**, I want to quickly scrub through time using a slider so that I can find exactly when a specific change occurred.

**As a cautious user**, I want confirmation before restoring historical states so that I don't accidentally overwrite current work.

---

## 4. Technical Approach

### Loro Version System Integration

Loro CRDT maintains a complete history of all changes through its version vector and frontier system:

- **Version Vectors**: Track the state of each peer's contributions
- **Frontiers**: Represent specific points in the document's history
- **Changes**: Individual operations with timestamps and peer IDs

Key Loro APIs to leverage (verified in `loro-crdt@1.2.3`):
- `doc.getAllChanges()` - Returns `Map<PeerID, Change[]>` with timestamps
- `doc.frontiers()` - Returns `{ peer: PeerID, counter: number }[]` (current state)
- `doc.checkout(frontiers)` - Navigate to a specific version (puts doc in detached mode)
- `doc.checkoutToLatest()` - Return to the latest version after checkout
- `doc.fork()` - Create a detached copy at current state
- `doc.forkAt(frontiers)` - Create a detached copy at specific frontiers
- `doc.export({ mode: 'snapshot' })` - Export state at current version
- `encodeFrontiers(frontiers)` - Serialize frontiers to Uint8Array if needed

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Time Machine UI                                                 │
│  ├── CalendarView - Month grid with change indicators           │
│  ├── TimelineSlider - Horizontal scrubber for fine navigation   │
│  └── SnapshotPreview - Read-only view of historical state       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Version Navigation Layer (src/lib/loro/versions.ts)            │
│  ├── extractChangePoints() - Get all changes with timestamps    │
│  ├── findFrontierAt(timestamp) - Get frontier for point in time │
│  ├── getSnapshotAt(frontier) - Export objects at frontier       │
│  ├── aggregateByDate() - Group changes by calendar day          │
│  └── resolveDeviceInfo(peerId) - Map peer ID to device name     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
            ┌─────────────────────┴─────────────────────┐
            │                                           │
            ▼                                           ▼
┌───────────────────────────────────────┐  ┌───────────────────────────────────┐
│  LoroDocStore (src/lib/loro/store.ts) │  │  Device Registry (devices.loro)   │
│  ├── getVersionHistory()              │  │  ├── DeviceRecord lookup          │
│  ├── checkoutVersion(frontier)        │  │  ├── peerId → deviceId mapping    │
│  ├── forkAtVersion(frontier)          │  │  └── RevocationRecord status      │
│  └── restoreFromVersion(frontier)     │  │                                   │
└───────────────────────────────────────┘  └───────────────────────────────────┘
            │                                           │
            └─────────────────────┬─────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  SyncContext (triggers P2P sync on restore)                     │
│  └── Restore changes sync automatically to connected devices    │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/loro/versions.ts` | Version extraction, frontier calculation, snapshot utilities |
| `src/components/history/types.ts` | TypeScript interfaces for Time Machine |
| `src/components/history/TimeMachine.tsx` | Main Time Machine container component |
| `src/components/history/TimeMachine.css` | Styles for main container |
| `src/components/history/CalendarView.tsx` | Month calendar with change indicators |
| `src/components/history/CalendarView.css` | Calendar styles |
| `src/components/history/TimelineSlider.tsx` | Horizontal timeline scrubber |
| `src/components/history/TimelineSlider.css` | Timeline styles |
| `src/components/history/SnapshotPreview.tsx` | Read-only historical object list |
| `src/components/history/SnapshotPreview.css` | Snapshot preview styles |
| `src/components/history/ObjectPreview.tsx` | Single object detail with read-only BlockNote content |
| `src/components/history/ObjectPreview.css` | Object preview styles |
| `src/components/history/RestoreDialog.tsx` | Confirmation dialog for restore actions |
| `src/components/history/RestoreDialog.css` | Dialog styles |
| `src/lib/loro/__tests__/versions.test.ts` | Unit tests for version utilities |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/loro/store.ts` | Add version navigation methods (`getVersionHistory`, `forkAtVersion`, `getObjectsAtVersion`, `restoreFromVersion`) |
| `src/lib/loro/index.ts` | Export new version utilities |
| `src/lib/sync/local/peer-registry.ts` | Import DeviceRecord lookup for device name resolution |
| `src/contexts/NavigationContext.tsx` | Add `'time-machine'` to `ViewType` union; add `openVersionComparison()` for Side-by-Side integration |
| `src/components/layout/Sidebar.tsx` | Add Time Machine as top-level navigation entry |
| `src/App.tsx` | Add time-machine view routing in MainContent |
| `src/components/palette/CommandPalette.tsx` | Add Time Machine action for Cmd+Shift+H |

> **Note:** This app uses custom `NavigationContext` for routing (not React Router). Add `'time-machine'` to the `ViewType` union and handle it in the MainContent switch.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Content preview | Full rich text via read-only BlockNote | Maintains formatting fidelity; users need to see exact historical state |
| Sidebar placement | Top-level navigation item | Easy access alongside Inbox, Today, etc. |
| Restore behavior | CRDT merge | Preserves all history; no data loss; consistent with Loro's design |
| Calendar/slider | Custom components | Matches existing BEM/CSS patterns; no external dependencies |
| Keyboard shortcuts | Via CommandPalette | Integrates with existing keyboard handling pattern |

### Snapshot vs Navigation Approach

**Chosen Approach: Fork + Preview**

Rather than modifying the live document with `checkout()`, we use a safer pattern:

1. **Fork the document** at the target frontier using `doc.fork()`
2. **Read from the fork** for preview (no risk to live data)
3. **Merge on restore** by importing the forked state into live document

This approach:
- Prevents accidental data loss during browsing
- Allows comparing current vs historical state
- Supports partial restoration (single object)
- Maintains CRDT consistency on restore

### Data Structures

```typescript
// Loro's native frontier type
type Frontier = { peer: PeerID; counter: number }[];

interface ChangePoint {
  timestamp: number;        // Unix timestamp in ms
  frontier: Frontier;       // Loro frontier for checkout (not Uint8Array)
  peerId: string;           // Loro peer ID (internal identifier)
  changeCount: number;      // Number of operations in this change
  // Device attribution (resolved from devices.loro registry)
  deviceId?: string;        // Mapped deviceId from peer registry (if available)
  deviceName?: string;      // Human-readable device name (e.g., "Work Laptop")
  isFromRevokedDevice?: boolean;  // True if device has been revoked (for visual indicator)
}

interface DayChanges {
  date: string;             // ISO date string (YYYY-MM-DD)
  changePoints: ChangePoint[];
  totalChanges: number;
}

interface VersionSnapshot {
  timestamp: number;
  frontier: Frontier;
  objects: SkelenoteObject[];
}

interface RestoreScope {
  type: 'full' | 'single';
  objectId?: string;        // Only for 'single' restore
}
```

> **Note:** Loro frontiers are `{ peer, counter }[]` arrays, not `Uint8Array`. Use `encodeFrontiers()` only if serialization to bytes is needed for storage.

> **Device Attribution:** The `deviceId` and `deviceName` fields are resolved by looking up the `peerId` in the device registry (`devices.loro`). If the device has been revoked (see `device-management.md`), `isFromRevokedDevice` will be true, and the UI should display a visual indicator.

---

## 5. Implementation Steps

1. **Create version extraction utilities** (`src/lib/loro/versions.ts`)
   - Implement `extractChangePoints()` using `doc.getAllChanges()`
   - Build `aggregateByDate()` to group changes by calendar day
   - Create `findFrontierAt(timestamp)` for point-in-time lookup

2. **Add version navigation to LoroDocStore** (`src/lib/loro/store.ts`)
   - Add `getVersionHistory()` method wrapping version utilities
   - Implement `forkAtVersion(frontier)` for safe preview
   - Add `restoreFromVersion(frontier, scope)` for restoration
   - Restoration triggers automatic P2P sync to connected devices

3. **Integrate device registry for attribution** (`src/lib/sync/local/peer-registry.ts`)
   - Add `resolveDeviceInfo(peerId)` utility function
   - Map Loro `peerId` to `deviceId` from the peer registry
   - Look up `deviceName` from DeviceRecord in `devices.loro`
   - Check RevocationRecord to set `isFromRevokedDevice` flag

4. **Build Time Machine types and interfaces** (`src/components/history/types.ts`)
   - Define component prop types
   - Define context types for state management

5. **Create CalendarView component** (`src/components/history/CalendarView.tsx`)
   - Month grid layout with navigation
   - Highlight days with changes (dot indicators)
   - Click to select date
   - Show change count on hover

6. **Create TimelineSlider component** (`src/components/history/TimelineSlider.tsx`)
   - Horizontal slider for selected day
   - Tick marks for each change point
   - Draggable thumb for scrubbing
   - Time display (HH:MM) for selected point
   - Device name shown in tooltip on hover (subtle attribution)

7. **Create SnapshotPreview component** (`src/components/history/SnapshotPreview.tsx`)
   - Read-only list of objects at selected point
   - Visual diff indicators (added/removed/modified)
   - Object detail preview on selection
   - "Objects at this moment" count
   - "Compare with Current" button to open Side-by-Side View

8. **Create RestoreDialog component** (`src/components/history/RestoreDialog.tsx`)
   - Confirmation modal with scope selection
   - Preview of changes to be applied
   - Restore single object vs full state toggle
   - Clear warning about implications
   - Note that restore will sync to connected devices

9. **Build main TimeMachine container** (`src/components/history/TimeMachine.tsx`)
   - Orchestrate child components
   - Manage selected date/time state
   - Handle version loading and caching
   - Coordinate restore operations
   - Integrate with NavigationContext for Side-by-Side version comparison

10. **Add navigation and routing**
    - Add `'time-machine'` to `ViewType` in `NavigationContext.tsx`
    - Add `openVersionComparison(objectId, frontier)` for Side-by-Side integration
    - Add Time Machine to sidebar as top-level navigation item
    - Add routing logic in `App.tsx` MainContent
    - Add keyboard shortcut (Cmd+Shift+H) via CommandPalette

11. **Performance optimization**
    - Implement change point caching
    - Lazy load calendar months
    - Debounce timeline scrubbing
    - Background loading of snapshots

12. **Testing**
    - Unit tests for version utilities (Vitest)
    - Integration tests for store methods
    - Component tests for UI interactions
    - Multi-device sync tests (see Testing Checklist)

---

## 6. UI/UX Considerations

### Main Time Machine View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Notes                               Time Machine      [?] [×]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │     ◄  December 2024  ►                                              │   │
│  │  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                        │   │
│  │  │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │                        │   │
│  │  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                        │   │
│  │  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │                        │   │
│  │  │     │  •  │     │  •  │  •  │     │     │  ← dots = changes     │   │
│  │  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                        │   │
│  │  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │                        │   │
│  │  │     │  •  │  •  │     │ ••  │     │  •  │  ← multiple dots =    │   │
│  │  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤    many changes       │   │
│  │  │ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │ 21  │                        │   │
│  │  │  •  │     │  •  │  •  │     │  •  │     │                        │   │
│  │  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                        │   │
│  │  │ 22  │ 23  │ 24  │ 25  │ 26  │[27] │ 28  │  ← [27] = selected    │   │
│  │  │     │  •  │     │  •  │  •  │ ••• │     │                        │   │
│  │  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  December 27, 2024                                          14 changes     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 09:00    10:00    11:00    12:00    13:00    14:00    15:00        │   │
│  │   │        │        │   ▲    │        │    ▲   │                   │   │
│  │   ●────────●────────●───●────●────────●────●───●──────────────○    │   │
│  │                         │                   │         ↑            │   │
│  │                      current             draggable              now│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Viewing: 11:32 AM                                    [ Restore State ]    │
│  ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Objects at this moment (47)                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📝  Project Planning Notes              Modified 11:30 AM          │   │
│  │  ✓   Review PR #42                       Created 11:32 AM    [NEW]  │   │
│  │  📅  Team standup                        Unchanged                  │   │
│  │  📝  API Design Document                 Unchanged                  │   │
│  │  🗑️  Old meeting notes                   [DELETED since then]       │   │
│  │  ...                                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Timeline Slider Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Timeline for December 27, 2024                                             │
│                                                                             │
│     9:00      10:00      11:00      12:00      13:00      14:00      15:00 │
│       │         │          │          │          │          │          │   │
│       ●─────────●──────────●──●───────●──────────●────●─────●──────────○   │
│       │         │          │  │       │          │    │     │          │   │
│    change    change     changes   change      changes   change       now   │
│                             │                     ▲                        │
│                             └── hover shows:      │                        │
│                         ┌────────────────────┐ current                     │
│                         │ 11:32 AM           │ position                    │
│                         │ Work Laptop        │                             │
│                         │ 2 changes          │ (device name in tooltip)    │
│                         └────────────────────┘                             │
│                                                                             │
│  Tick marks:  ●  = single change                                           │
│               ●● = multiple changes within 5 minutes                       │
│               ○  = current time (now)                                      │
│               ⚠  = change from revoked device (with badge)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Object Preview at Point in Time

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Preview: Project Planning Notes              [Compare with Current] [Restore]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Properties (as of 11:32 AM)                                               │
│  ─────────────────────────────                                             │
│  Status:     In Progress                                                   │
│  Priority:   High                                                          │
│  Due Date:   Dec 30, 2024                                                  │
│                                                                             │
│  Modified by: Work Laptop (hover for device info)                          │
│                                                                             │
│  Content Preview                                                           │
│  ─────────────────────────────                                             │
│  # Project Planning                                                        │
│                                                                             │
│  ## Goals                                                                  │
│  - Complete API design                                                     │
│  - Review with team                                                        │
│  - Start implementation                                                    │
│                                                                             │
│  ## Timeline                                                               │
│  Week 1: Design phase...                                                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │  Current version has 3 more paragraphs. This is 2 versions behind.  │  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

[Compare with Current] opens Side-by-Side View with:
  - Left pane: Current version (editable)
  - Right pane: Historical version (read-only)
  See side-by-side-view.md for version comparison details.
```

### Restore Confirmation Dialog

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Restore from History                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  You are about to restore from:                                         │
│  December 27, 2024 at 11:32 AM                                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ○  Restore single object                                       │   │
│  │     "Project Planning Notes"                                    │   │
│  │                                                                 │   │
│  │  ●  Restore entire knowledge base                               │   │
│  │     This will affect 47 objects                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ⚠️  This action will:                                                  │
│  • Revert selected content to the historical version                   │
│  • Merge changes using CRDT (no data will be lost)                     │
│  • Changes made after this point remain in history                     │
│  • Sync automatically to connected devices on your network             │
│                                                                         │
│                              [ Cancel ]    [ Restore ]                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+H` | Open Time Machine |
| `Escape` | Close Time Machine / Cancel restore |
| `←` / `→` | Previous / Next change point |
| `Shift+←` / `Shift+→` | Previous / Next day with changes |
| `↑` / `↓` | Navigate object list |
| `Enter` | Preview selected object |
| `Cmd+R` | Restore selected / all |
| `Cmd+D` | Compare with current (opens Side-by-Side View) |
| `T` | Jump to today |

### Accessibility Requirements

- **Calendar navigation**: Full keyboard support for date selection
- **Screen reader support**: Announce date, change count, and selected state
- **Timeline slider**: Announce current time position and change counts
- **Device attribution**: Announce device name when available (e.g., "Changed by Work Laptop")
- **Revoked device indicator**: Announce when change is from a revoked device
- **Focus management**: Return focus to trigger element when closing
- **Color contrast**: Change indicators visible in both light and dark modes
- **Reduced motion**: Respect `prefers-reduced-motion` for animations
- **ARIA labels**: All interactive elements properly labeled
  - Calendar cells: "December 27, 2024, 14 changes, selected"
  - Timeline: "Timeline scrubber, current position 11:32 AM, Work Laptop"
  - Object list: "Objects at this moment, 47 items"
  - Revoked device badge: "Change from revoked device"

---

## 7. Testing Checklist

### Unit Tests
- [ ] `extractChangePoints()` correctly parses Loro change history
- [ ] `aggregateByDate()` groups changes by calendar day correctly
- [ ] `findFrontierAt(timestamp)` returns correct frontier for given time
- [ ] Edge case: timestamp before first change returns earliest frontier
- [ ] Edge case: timestamp after last change returns current frontier
- [ ] `forkAtVersion()` creates independent document copy
- [ ] Forked document contains correct historical state
- [ ] `restoreFromVersion()` merges historical state correctly
- [ ] Single object restore doesn't affect other objects

### Integration Tests
- [ ] Full flow: open Time Machine, select date, view objects, restore
- [ ] Calendar correctly shows dots for days with changes
- [ ] Timeline slider updates preview when scrubbed
- [ ] Object preview shows accurate historical content
- [ ] Restore single object updates live document
- [ ] Restore full state updates all objects
- [ ] Restored state persists after app restart
- [ ] Version history updates after new changes made
- [ ] Multiple rapid navigations don't cause race conditions

### Multi-Device & P2P Sync Tests
- [ ] History shows changes from multiple devices with correct attribution
- [ ] Device names display correctly in timeline tooltips
- [ ] Restore on device A triggers sync to device B
- [ ] Device B receives and merges restored state correctly
- [ ] Restore while device B is offline; B catches up when reconnected
- [ ] Changes from revoked device show visual indicator badge
- [ ] "Compare with Current" opens Side-by-Side View correctly
- [ ] Side-by-Side historical pane is read-only
- [ ] Restore from Side-by-Side View closes split and applies restore

### Manual QA Checklist
- [ ] Open Time Machine from sidebar
- [ ] Navigate between months using arrows
- [ ] Click on date with changes - timeline appears
- [ ] Drag timeline slider - preview updates
- [ ] Use arrow keys to move between change points
- [ ] Click object in preview - detail view shows
- [ ] "Restore This" on single object - confirmation appears
- [ ] Confirm restore - object is restored
- [ ] Verify restored object matches historical state
- [ ] "Restore State" for full restore - confirmation appears
- [ ] Confirm full restore - all objects restored
- [ ] Close Time Machine - returns to normal view
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all interactive elements

### Edge Cases
- [ ] Empty history (new document with no changes)
- [ ] Single change point (just created)
- [ ] Very long history (thousands of changes)
- [ ] Changes spanning multiple years
- [ ] Deleted objects appear in historical view
- [ ] Objects created after selected point not shown
- [ ] Simultaneous changes from multiple devices
- [ ] Restore while sync is in progress
- [ ] Large objects with extensive content
- [ ] Objects with complex property types (relations, mentions)
- [ ] Timezone handling for change timestamps
- [ ] DST transitions don't cause date errors

### P2P-Specific Edge Cases
- [ ] Changes from device not yet in device registry (unknown peer)
- [ ] Changes from device that was later revoked
- [ ] Multiple devices restoring simultaneously (CRDT merge)
- [ ] Restore on device that has never synced with source device
- [ ] Version comparison when current version has diverged significantly
- [ ] Network disconnect during restore operation
- [ ] Device registry not yet synced (device names unavailable)

---

## 8. Future Considerations

### Potential Enhancements

- **Visual Diff Highlighting**: Show inline what changed between versions in Side-by-Side View
- **Search in History**: Find when specific content was added/removed
- **Device-Based Filtering**: Filter Time Machine to show only changes from specific devices
- **Bookmarked Versions**: Save specific points in time with labels
- **Automated Snapshots**: Daily/weekly named checkpoints for easy navigation
- **Export Historical State**: Export entire knowledge base as it existed at a point
- **History Analytics**: Visualize editing patterns over time (by device, by time of day)
- **Undo Integration**: Connect Time Machine with undo stack for recent changes
- **Mobile Support**: Optimized Time Machine UI for mobile devices
- **Cross-Device Diff View**: Compare same object state across different devices
- **Partial Restore**: Restore specific properties or content blocks only
- **History Pruning**: Option to compact old history to save space

### Integration Notes

- **Side-by-Side View**: Version comparison is implemented via Side-by-Side View (see `side-by-side-view.md`). Future enhancements like visual diff highlighting will be added there.
- **Device Management**: Device attribution relies on the device registry from Device Management (see `device-management.md`). Changes from revoked devices remain visible with a badge.
- **Local Network Sync**: Restore operations sync automatically via P2P (see `true-p2p-sync.md`). No special protocol messages needed—standard CRDT merge handles it.
