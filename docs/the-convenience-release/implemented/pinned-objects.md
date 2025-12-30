# Pinned Objects

> Pin important items to the sidebar with manual drag-to-reorder capability for quick access.

---

## 1. Overview

Enable users to pin any object to a dedicated sidebar section for instant access. Pinned objects appear in a collapsible "Pinned" section at the top of the sidebar, with full drag-and-drop reordering support. This provides a personalized quick-access layer on top of Skelenote's existing navigation structure.

**User Value:**
- Instant access to frequently used objects (projects, notes, tasks)
- Personalized sidebar organization via manual ordering
- Reduced navigation friction for daily workflows
- Visual distinction for important items

---

## 2. Goals

### Primary Goals
- Allow any object to be pinned/unpinned via context menu
- Display pinned objects in a dedicated, collapsible sidebar section
- Support drag-and-drop reordering of pinned items
- Persist pin state and order across sessions via Loro sync

### Success Criteria
- Pin/unpin action completes in under 50ms
- Drag-and-drop reorder feels responsive (no visual lag)
- Pin state syncs correctly across devices
- Maximum of 20 pinned items (soft limit with user warning)

### Non-Goals
- Automatic pinning based on usage frequency (manual only)
- Nested/hierarchical pins (flat list only for v1)
- Pin-specific views or filters
- Keyboard-only reordering (drag-and-drop only for v1)

---

## 3. User Stories

**As a project manager**, I want to pin my active projects so that I can switch between them without scrolling through the Projects section.

**As a daily note user**, I want to pin my current week's daily notes so that I can quickly reference recent entries.

**As a task-focused user**, I want to pin high-priority tasks so that they remain visible regardless of which view I'm in.

**As an organized user**, I want to drag pinned items into my preferred order so that my most-used items are always at the top.

**As a multi-device user**, I want my pinned items and their order to sync so that I have the same quick-access layout everywhere.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar Component                                          │
│  ├── PinnedSection (new)                                   │
│  │   ├── Drag-and-drop container                           │
│  │   └── PinnedItem[] (draggable)                         │
│  ├── Primary navigation (Inbox, Today, etc.)              │
│  └── Collapsible sections (Tasks, Projects, Tags)         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Layer                                                 │
│  ├── SkelenoteObject.pinned: boolean (on object itself)    │
│  └── pinnedOrder: LoroList<string> (separate ordered list) │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/PinnedSection.tsx` | Collapsible pinned section with drag-and-drop |
| `src/components/layout/PinnedSection.css` | Styles for pinned section and drag states |
| `src/components/layout/PinnedItem.tsx` | Individual draggable pinned item component |
| `src/components/layout/PinnedItem.css` | Styles for pinned items including drag handles |
| `src/hooks/usePinnedObjects.ts` | Hook for managing pinned objects and ordering |
| `src/lib/loro/pinned.ts` | Loro operations for pinned order list |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types/object.ts` | Add `pinned: boolean` to `SkelenoteObject` interface |
| `src/lib/loro/schema.ts` | Add `PINNED_ORDER_KEY` constant and accessor |
| `src/lib/loro/objects.ts` | Add pin/unpin methods to ObjectStore |
| `src/components/layout/Sidebar.tsx` | Insert PinnedSection above primary navigation |
| `src/contexts/SidebarContext.tsx` | Add pinned section collapse state |
| `src/components/object/ObjectContextMenu.tsx` | Add Pin/Unpin menu item |

### Data Model Changes

**Object property addition** (`src/lib/types/object.ts`):
```typescript
export interface SkelenoteObject {
  // ... existing properties
  /** Whether this object is pinned to the sidebar */
  pinned: boolean;
}
```

**Pinned order storage** (new key in Loro document):
```typescript
// In schema.ts
export const PINNED_ORDER_KEY = 'pinnedOrder';

// The pinnedOrder is a LoroList<string> containing object IDs
// Order in the list = display order in sidebar
export function getPinnedOrderList(doc: LoroDoc): LoroList {
  return doc.getList(PINNED_ORDER_KEY);
}
```

**Pin operations** (`src/lib/loro/objects.ts` additions):
```typescript
interface ObjectStore {
  // ... existing methods

  /** Pin an object to the sidebar */
  pin(objectId: string): void;

  /** Unpin an object from the sidebar */
  unpin(objectId: string): void;

  /** Reorder pinned objects */
  reorderPinned(objectIds: string[]): void;

  /** Get all pinned objects in order */
  getPinnedObjects(): SkelenoteObject[];
}
```

### Drag-and-Drop Implementation

Use the HTML5 Drag and Drop API with React for simplicity and zero dependencies:

```typescript
// PinnedItem.tsx - Key drag handlers
interface PinnedItemProps {
  object: SkelenoteObject;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

// PinnedSection.tsx - Container logic
const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

const handleDragEnd = () => {
  if (draggedIndex !== null && dragOverIndex !== null) {
    const newOrder = reorderArray(pinnedObjects, draggedIndex, dragOverIndex);
    store.reorderPinned(newOrder.map(obj => obj.id));
  }
  setDraggedIndex(null);
  setDragOverIndex(null);
};
```

**Drag states to handle:**
- `dragging` - Item being dragged (reduced opacity)
- `drag-over` - Drop target indicator (border highlight)
- `drag-placeholder` - Visual gap where item will be inserted

---

## 5. Implementation Steps

1. **Update object type definition** (`src/lib/types/object.ts`)
   - Add `pinned: boolean` property to `SkelenoteObject`
   - Update `createObject` to default `pinned: false`
   - Update type guard `isSkelenoteObject`

2. **Add Loro schema for pinned order** (`src/lib/loro/schema.ts`)
   - Add `PINNED_ORDER_KEY` constant
   - Add `getPinnedOrderList()` accessor function

3. **Implement pin operations** (`src/lib/loro/objects.ts`)
   - Add `pin()` method - sets pinned=true, appends to order list
   - Add `unpin()` method - sets pinned=false, removes from order list
   - Add `reorderPinned()` method - replaces order list contents
   - Add `getPinnedObjects()` method - returns objects in order

4. **Create usePinnedObjects hook** (`src/hooks/usePinnedObjects.ts`)
   - Expose `pinnedObjects`, `pin`, `unpin`, `reorder` functions
   - Subscribe to Loro changes for reactivity

5. **Build PinnedItem component** (`src/components/layout/PinnedItem.tsx`)
   - Draggable item with type icon and title
   - Drag handle visual (grip dots)
   - Click to navigate, right-click for context menu

6. **Build PinnedSection component** (`src/components/layout/PinnedSection.tsx`)
   - Collapsible section header
   - Drag-and-drop container logic
   - Empty state when no pins
   - Drop zone visual feedback

7. **Integrate into Sidebar** (`src/components/layout/Sidebar.tsx`)
   - Add PinnedSection above primary navigation
   - Pass navigation handlers

8. **Add context menu integration** (`src/components/object/ObjectContextMenu.tsx`)
   - Add "Pin to Sidebar" / "Unpin from Sidebar" menu item
   - Show appropriate option based on current pin state

9. **Update SidebarContext** (`src/contexts/SidebarContext.tsx`)
   - Add "pinned" to collapsible sections
   - Default to expanded

10. **Add keyboard shortcut** (optional enhancement)
    - Register `Cmd/Ctrl+Shift+P` for pin toggle on focused object

---

## 6. UI/UX Considerations

### Sidebar Wireframe

```
┌─────────────────────────────────────┐
│  ▼ Pinned                           │
│  ┌─────────────────────────────────┐│
│  │ ⠿ 📋 Q4 Planning Project       ││
│  │ ⠿ 📝 Daily Standup Notes       ││
│  │ ⠿ ✅ Ship v2.0 Release         ││
│  └─────────────────────────────────┘│
│  ─────────────────────────────────  │
│  📥 Inbox                     (3)   │
│  ─────────────────────────────────  │
│  📅 Today                           │
│  📆 Daily Notes                     │
│  ─────────────────────────────────  │
│  ▼ Tasks                            │
│    This Week                        │
│    Overdue                          │
│    ...                              │
└─────────────────────────────────────┘

Legend:
⠿ = Drag handle (grip dots)
▼ = Expanded section indicator
```

### Pin/Unpin Interaction

**Context menu approach:**
1. Right-click any object (in sidebar, list view, or object header)
2. Context menu shows "Pin to Sidebar" or "Unpin from Sidebar"
3. Action executes immediately with subtle animation

**Visual feedback:**
- Pin adds item to bottom of Pinned section with fade-in
- Unpin removes item with fade-out
- Toast notification: "Pinned to sidebar" / "Removed from pins"

### Drag-to-Reorder Interaction

**Drag initiation:**
- Click and hold on drag handle (⠿) for 150ms
- Or click and drag immediately on drag handle
- Cursor changes to `grabbing`

**During drag:**
- Dragged item shows reduced opacity (0.5)
- Drop indicator line appears between items
- Auto-scroll when dragging near section edges

**Drop completion:**
- Item animates to new position (150ms ease-out)
- Order persists immediately to Loro

```
Before drag:          During drag:         After drop:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Item A      │      │ Item A      │      │ Item A      │
│ Item B      │  →   │ ─────────── │  →   │ Item C      │
│ Item C      │      │ Item C      │      │ Item B      │
└─────────────┘      │ [Item B]    │      └─────────────┘
                     └─────────────┘
                     (B being dragged)
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+P` | Toggle pin state for selected/focused object |

### Accessibility Requirements

- **Drag handle**: Must be focusable with visible focus ring
- **Screen reader**: Announce "Pinned section, X items" when section receives focus
- **Drag operation**: Announce "Grabbed [item name], position X of Y"
- **Drop completion**: Announce "Dropped [item name] at position X"
- **Pin/unpin action**: Announce "Pinned [item name] to sidebar" / "Unpinned [item name]"
- **Keyboard reordering** (future): Arrow keys to move within pinned section when focused
- **ARIA attributes**:
  - `aria-grabbed` on dragged items
  - `aria-dropeffect="move"` on drop zones
  - `role="listbox"` on pinned container
  - `role="option"` on pinned items

---

## 7. Testing Checklist

### Unit Tests
- [ ] `pin()` sets object.pinned to true
- [ ] `pin()` adds object ID to pinnedOrder list
- [ ] `unpin()` sets object.pinned to false
- [ ] `unpin()` removes object ID from pinnedOrder list
- [ ] `reorderPinned()` updates order correctly
- [ ] `getPinnedObjects()` returns objects in correct order
- [ ] `getPinnedObjects()` excludes deleted objects
- [ ] Default object creation has `pinned: false`
- [ ] usePinnedObjects hook updates on Loro changes

### Integration Tests
- [ ] Pin object via context menu updates sidebar
- [ ] Unpin object via context menu removes from sidebar
- [ ] Drag reorder persists after refresh
- [ ] Pin state syncs between browser tabs
- [ ] Pinned section collapse state persists
- [ ] Clicking pinned item navigates to object
- [ ] Right-clicking pinned item shows context menu

### Manual QA Checklist
- [ ] Pin object from object view context menu
- [ ] Pin object from sidebar context menu
- [ ] Pin object from list view context menu
- [ ] Unpin via context menu
- [ ] Drag item up in pinned list
- [ ] Drag item down in pinned list
- [ ] Drag item to top of list
- [ ] Drag item to bottom of list
- [ ] Collapse and expand Pinned section
- [ ] Pinned section hidden when empty
- [ ] Keyboard shortcut pins/unpins object
- [ ] Pin state preserved after app restart

### Edge Cases
- [ ] Pin already-pinned object (no-op, no error)
- [ ] Unpin already-unpinned object (no-op, no error)
- [ ] Delete a pinned object (auto-removes from pins)
- [ ] Pin 20+ objects (shows warning, still allows)
- [ ] Drag to same position (no-op, no reorder event)
- [ ] Rapid pin/unpin toggling
- [ ] Drag during sync operation
- [ ] Concurrent pin operations from multiple devices
- [ ] Pin object with very long title (truncation)
- [ ] Pin object then change its type (icon updates)

---

## 8. Future Considerations

### Potential Enhancements
- **Keyboard reordering**: Arrow keys + modifier to move pinned items
- **Pin groups/folders**: Organize pins into collapsible sub-groups
- **Pin limit configuration**: User-adjustable maximum pin count
- **Pin from search**: Pin action in command palette search results
- **Pin indicators**: Show pin icon on objects in other views
- **Quick pin gesture**: Double-click header area to toggle pin
- **Pin order sync conflict resolution**: Last-write-wins vs. merge strategies

### Integration Opportunities
- **Quick Capture**: Option to auto-pin captured items
- **Daily Notes**: Auto-pin current day's note
- **Templates**: Pin templates for quick access
- **API**: Expose pin operations via REST API
- **Keyboard navigation**: Full keyboard-only pin management
