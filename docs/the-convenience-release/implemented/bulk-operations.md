# Bulk Operations

> Multi-select with batch actions (delete, tag, move) for efficient management of multiple objects at once.

---

## Design Decisions

The following decisions were made during planning:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checkbox visibility | Show on hover | Cleaner UI; checkboxes appear on row hover or when any item is selected |
| "Archive" action | Renamed to "Process" | Matches existing `markProcessed` pattern in codebase |
| Partial failures | Continue & notify | Show toast with success/failure count (e.g., "Updated 95 of 100 items") |
| Referenced object deletion | Warn before delete | Show dialog: "3 tasks reference this tag. Delete anyway?" |
| Type change with property loss | Warn and confirm | Show warning about properties that will become invisible |
| Tag picker | Existing tags only | No inline tag creation; simpler UX for bulk operations |
| Action bar position | Bottom center | Fixed to bottom center of viewport, slides up when selection exists |

---

## 1. Overview

Enable users to select multiple objects in list views and perform batch operations on them simultaneously. This feature transforms Skelenote from a one-at-a-time workflow into a power-user tool capable of handling mass organization, cleanup, and tagging tasks efficiently.

**User Value:**
- Clean up inbox quickly by processing multiple items at once
- Bulk-tag related objects after a project or meeting
- Mass-delete outdated tasks or notes
- Reorganize objects by changing types or processing in batches
- Significantly reduce repetitive actions for power users

---

## 2. Goals

### Primary Goals
- Enable checkbox-based multi-selection in all list views (Inbox, Tasks, etc.)
- Support range selection via Shift+click for efficient bulk selection
- Provide a floating action bar with contextual batch operations
- Implement batch operations through existing ObjectStore methods
- Maintain undo capability for destructive batch actions

### Success Criteria
- Users can select 2+ objects and see an action bar appear
- Shift+click selects all items between two clicks
- Cmd/Ctrl+A selects all visible items in the current view
- Batch delete, tag, and type change work correctly
- Performance: Batch operations on 100 items complete in under 500ms
- Selection state persists during view scrolling

### Non-Goals
- Cross-view selection (selection is view-scoped)
- Drag-and-drop multi-select (checkbox-only for v1)
- Batch content editing (properties only)
- Undo history for batch operations (confirm dialog suffices for v1)
- Mobile/touch optimization (desktop-first)

---

## 3. User Stories

**As a GTD practitioner**, I want to select all inbox items and process them at once so that I can complete my weekly review in minutes instead of hours.

**As a project manager**, I want to select multiple tasks and add a project tag to all of them so that I can quickly organize newly captured items after a brainstorming session.

**As a note-taker**, I want to select a range of notes using Shift+click so that I can efficiently bulk-tag an entire series of meeting notes from last week.

**As a power user**, I want to select all visible items with Cmd+A so that I can quickly apply actions to an entire filtered view without clicking each checkbox.

**As a careful user**, I want to see a confirmation dialog before bulk delete so that I don't accidentally lose important objects.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  List View (InboxView, TaskView, etc.)                      │
│  ├── SelectionContext (provides selection state)            │
│  ├── SelectableRow (wraps InboxRow/TaskRow with checkbox)   │
│  └── BulkActions (floating action bar)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  useSelection Hook                                           │
│  ├── selectedIds: Set<string>                               │
│  ├── lastSelectedId: string | null (for Shift+click range) │
│  ├── toggle(id) / selectRange(id) / selectAll() / clear()  │
│  └── isSelected(id): boolean                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Batch Operation Handlers                                    │
│  ├── batchDelete(ids[]) → ObjectStore.delete for each       │
│  ├── batchAddTag(ids[], tagId) → ObjectStore.update each   │
│  ├── batchRemoveTag(ids[], tagId) → ObjectStore.update     │
│  ├── batchChangeType(ids[], typeId) → ObjectStore.update   │
│  └── batchProcess(ids[]) → ObjectStore.markProcessed each  │
└─────────────────────────────────────────────────────────────┘
```

### Selection State Management

Selection state will be managed via a custom hook that can be shared across list components:

```typescript
interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  allItems: string[]; // Current view's item IDs for range selection
}

interface SelectionActions {
  toggle: (id: string) => void;
  selectRange: (id: string) => void; // Shift+click handler
  selectAll: () => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  hasSelection: boolean; // True when any item is selected (for "selecting mode")
}

// Selection validation: prune orphaned IDs when items change
useEffect(() => {
  const currentIds = new Set(allItems);
  const orphaned = [...selectedIds].filter(id => !currentIds.has(id));
  if (orphaned.length > 0) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      orphaned.forEach(id => next.delete(id));
      return next;
    });
  }
}, [allItems]);
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useSelection.ts` | Selection state management hook |
| `src/components/actions/BulkActions.tsx` | Floating action bar component |
| `src/components/actions/BulkActions.css` | Action bar styling |
| `src/components/ui/SelectableRow.tsx` | HOC wrapper adding checkbox to rows |
| `src/lib/batch/operations.ts` | Batch operation functions |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/views/InboxView.tsx` | Integrate selection hook, wrap rows, add BulkActions |
| `src/components/views/TaskView.tsx` | Integrate selection hook and BulkActions |
| `src/components/views/TaskList.tsx` | Accept selection props, render checkboxes |
| `src/components/views/InboxRow.tsx` | Add checkbox column, selection styling |
| `src/components/views/TaskRow.tsx` | Add checkbox column, selection styling |
| `src/components/views/InboxRow.css` | Checkbox and selected state styles |
| `src/components/views/TaskRow.css` | Checkbox and selected state styles |
| `src/lib/loro/objects.ts` | Add batch operation methods to ObjectStore |
| `src/hooks/index.ts` | Export useSelection hook |

### Batch Operation Methods

Add to `ObjectStore` class in `src/lib/loro/objects.ts`:

```typescript
/**
 * Delete multiple objects with cleanup
 * - Removes @mentions from all object content
 * - Removes references from relation properties
 */
deleteMany(ids: string[]): { deleted: number; errors: string[] } {
  const errors: string[] = [];
  const targetIds = new Set(ids);
  const allObjects = this.getAll();

  // 1. Clean up @mentions in content (single pass for all targets)
  for (const obj of allObjects) {
    if (targetIds.has(obj.id)) continue;
    try {
      const content = this.getContent(obj.id);
      let cleaned = content;
      for (const targetId of targetIds) {
        cleaned = removeMentionsFromContent(cleaned, targetId);
      }
      if (cleaned !== content) {
        this.setContent(obj.id, cleaned);
      }
    } catch { /* skip objects without content */ }
  }

  // 2. Clean up relation references
  for (const obj of allObjects) {
    if (targetIds.has(obj.id)) continue;
    // Check all relation properties for references to deleted objects
    for (const [propId, value] of Object.entries(obj.properties)) {
      if (Array.isArray(value)) {
        const filtered = value.filter(v => !targetIds.has(v));
        if (filtered.length !== value.length) {
          this.update(obj.id, { properties: { [propId]: filtered } });
        }
      }
    }
  }

  // 3. Delete all targets
  let deleted = 0;
  for (const id of targetIds) {
    try {
      if (this.delete(id)) deleted++;
    } catch (e) {
      errors.push(id);
    }
  }

  return { deleted, errors };
}

/**
 * Update multiple objects with the same changes
 */
updateMany(ids: string[], input: UpdateObjectInput): { updated: SkelenoteObject[]; errors: string[] } {
  const updated: SkelenoteObject[] = [];
  const errors: string[] = [];

  for (const id of ids) {
    try {
      updated.push(this.update(id, input));
    } catch {
      errors.push(id);
    }
  }

  return { updated, errors };
}

/**
 * Add a tag to multiple objects (skips if already tagged)
 */
addTagToMany(ids: string[], tagId: string): { updated: number; errors: string[] } {
  let updated = 0;
  const errors: string[] = [];

  for (const id of ids) {
    try {
      const obj = this.getOrThrow(id);
      const currentTags = (obj.properties.tags as string[]) ?? [];
      if (!currentTags.includes(tagId)) {
        this.update(id, { properties: { tags: [...currentTags, tagId] } });
        updated++;
      }
    } catch {
      errors.push(id);
    }
  }

  return { updated, errors };
}

/**
 * Remove a tag from multiple objects
 */
removeTagFromMany(ids: string[], tagId: string): { updated: number; errors: string[] } {
  let updated = 0;
  const errors: string[] = [];

  for (const id of ids) {
    try {
      const obj = this.getOrThrow(id);
      const currentTags = (obj.properties.tags as string[]) ?? [];
      if (currentTags.includes(tagId)) {
        this.update(id, { properties: { tags: currentTags.filter(t => t !== tagId) } });
        updated++;
      }
    } catch {
      errors.push(id);
    }
  }

  return { updated, errors };
}

/**
 * Mark multiple objects as processed (removes from inbox)
 */
markProcessedMany(ids: string[]): { processed: number; errors: string[] } {
  let processed = 0;
  const errors: string[] = [];

  for (const id of ids) {
    try {
      this.markProcessed(id);
      processed++;
    } catch {
      errors.push(id);
    }
  }

  return { processed, errors };
}
```

### Data Flow

1. User clicks checkbox on row -> `toggle(id)` updates selection state
2. User Shift+clicks -> `selectRange(id)` calculates range from `lastSelectedId`
3. User presses Cmd+A -> `selectAll()` adds all visible IDs
4. Selection changes -> BulkActions bar appears/updates count
5. User clicks action button -> Handler iterates over `selectedIds`
6. Batch operation completes -> Toast notification, clear selection

---

## 5. Implementation Steps

1. **Create useSelection hook** (`src/hooks/useSelection.ts`)
   - Implement `SelectionState` and `SelectionActions` interface
   - Handle toggle, range select, select all, clear operations
   - Track `lastSelectedId` for Shift+click range calculation
   - Memoize callbacks for performance

2. **Add batch methods to ObjectStore** (`src/lib/loro/objects.ts`)
   - Implement `deleteMany(ids[])`
   - Implement `updateMany(ids[], input)`
   - Implement `addTagToMany(ids[], tagId)`
   - Implement `removeTagFromMany(ids[], tagId)`

3. **Create BulkActions component** (`src/components/actions/BulkActions.tsx`)
   - Fixed position action bar at bottom of viewport
   - Display selection count
   - Action buttons: Delete, Add Tag, Remove Tag, Change Type, Process
   - Clear Selection button
   - Keyboard shortcut hints

4. **Update InboxRow with checkbox** (`src/components/views/InboxRow.tsx`)
   - Add checkbox as first column element
   - Accept `isSelected` and `onSelectionChange` props
   - Apply selected state styling
   - Handle Shift+click via `onShiftClick` callback

5. **Update TaskRow with checkbox** (`src/components/views/TaskRow.tsx`)
   - Add checkbox before existing task checkbox
   - Handle selection vs. completion checkbox distinction
   - Apply selected state styling

6. **Integrate selection in InboxView** (`src/components/views/InboxView.tsx`)
   - Initialize `useSelection` with item IDs
   - Pass selection props to each InboxRow
   - Render BulkActions when selection count > 0
   - Handle keyboard shortcuts (Cmd+A, Escape to clear)

7. **Integrate selection in TaskList** (`src/components/views/TaskList.tsx`)
   - Accept selection props from parent TaskView
   - Pass to each TaskRow
   - Handle Shift+click range calculation

8. **Integrate selection in TaskView** (`src/components/views/TaskView.tsx`)
   - Initialize `useSelection` with task IDs
   - Pass to TaskList
   - Render BulkActions conditionally

9. **Implement batch action handlers** (`src/lib/batch/operations.ts`)
   - `batchDelete` with confirmation dialog (includes mention/relation cleanup)
   - `batchAddTag` with tag picker modal (existing tags only)
   - `batchRemoveTag` with tag picker modal
   - `batchChangeType` with type picker modal (warns about invisible properties)
   - `batchProcess` (mark as processed, removes from inbox)

10. **Add keyboard shortcuts**
    - Cmd/Ctrl+A: Select all in current view
    - Escape: Clear selection
    - Backspace/Delete: Trigger delete action (with confirmation)

11. **Style selected state** (CSS updates)
    - Row highlight color for selected items
    - Checkbox show-on-hover with "selecting mode" visibility
    - Action bar positioning and slide-up animation
    - `prefers-reduced-motion` media query for animations

12. **Add selection validation on item changes**
    - When items change (sync, filter), prune orphaned IDs from selection
    - `useEffect` that validates `selectedIds` against current item list

---

## 6. UI/UX Considerations

### Checkbox Visibility (Show on Hover)

Checkboxes are hidden by default for a cleaner UI, appearing when:
1. User hovers over a row
2. The row is selected
3. Any item in the list is selected (enables "selecting mode")

```css
/* Checkbox hidden by default */
.inbox-row__checkbox,
.task-row__select-checkbox {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

/* Show on row hover */
.inbox-row:hover .inbox-row__checkbox,
.task-row:hover .task-row__select-checkbox {
  opacity: 1;
}

/* Always show when row is selected */
.inbox-row--selected .inbox-row__checkbox,
.task-row--selected .task-row__select-checkbox {
  opacity: 1;
}

/* Always show when ANY item in the list is selected (selecting mode) */
.inbox-view--selecting .inbox-row__checkbox,
.task-list--selecting .task-row__select-checkbox {
  opacity: 1;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .bulk-actions,
  .inbox-row__checkbox,
  .task-row__select-checkbox {
    animation: none;
    transition: none;
  }
}
```

### List View with Checkboxes

```
┌─────────────────────────────────────────────────────────────┐
│  Inbox                                            (12)      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [x] [ ] Meeting notes from standup        Note    2h ago  │
│      └── Checkbox visible (row selected)                    │
│                                                             │
│  [ ] [ ] Call with client                  Task    3h ago  │
│      └── Checkbox visible (selecting mode active)           │
│                                                             │
│  [x] [ ] Project kickoff ideas             Note    1d ago  │
│      └── Checkbox visible (row selected + highlighted)      │
│                                                             │
│  [ ] [x] Review PR #42                     Task    1d ago  │
│      │   └── Task completion checkbox                       │
│      └── Selection checkbox (separate from completion)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Floating Action Bar

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    (list content above)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  3 selected    [Delete] [Tag] [Type] [Process]  [x] │   │
│  │  ───────────   ─────────────────────────────────────│   │
│  │  Count         Action buttons              Clear    │   │
│  └─────────────────────────────────────────────────────┘   │
│   └── Floating bar, appears when selection > 0              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Selection Interactions

**Single Click (on checkbox):**
```
Before:  [ ] Item A    [ ] Item B    [ ] Item C
Click B: [ ] Item A    [x] Item B    [ ] Item C
         lastSelectedId = B
```

**Shift+Click (range selection):**
```
State:   [x] Item A    [ ] Item B    [ ] Item C    [ ] Item D
         lastSelectedId = A

Shift+D: [x] Item A    [x] Item B    [x] Item C    [x] Item D
         Selects A through D (inclusive range)
```

**Cmd/Ctrl+A (select all):**
```
Before:  [ ] Item A    [x] Item B    [ ] Item C
Cmd+A:   [x] Item A    [x] Item B    [x] Item C
         All visible items selected
```

**Escape (clear selection):**
```
Before:  [x] Item A    [x] Item B    [x] Item C
Escape:  [ ] Item A    [ ] Item B    [ ] Item C
         Action bar disappears
```

### Tag Picker Modal

Displays existing tags only (no inline creation). Uses ObjectSearchModal pattern.

```
┌─────────────────────────────────────────────────────────┐
│  Add Tag to 3 items                              [x]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Search tags...                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [ ] Work           [ ] Personal                │   │
│  │  [ ] Urgent         [ ] Research                │   │
│  │  [ ] Meeting        [ ] Follow-up               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Cancel]  [Add Tag]        │
└─────────────────────────────────────────────────────────┘
```

### Delete Warning Dialog (Referenced Objects)

When deleting objects that are referenced by other objects (e.g., a tag used by tasks), show a warning:

```
┌─────────────────────────────────────────────────────────┐
│  Delete 2 items?                                 [x]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️ Some items are referenced by other objects:        │
│                                                         │
│  • "Work" tag is used by 5 tasks                       │
│  • "Project Alpha" is linked from 3 notes              │
│                                                         │
│  References will be removed from those objects.         │
│                                                         │
│                         [Cancel]  [Delete Anyway]       │
└─────────────────────────────────────────────────────────┘
```

### Type Change Warning Dialog

When changing types and properties will become invisible:

```
┌─────────────────────────────────────────────────────────┐
│  Change type to Task?                            [x]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️ The following properties are not part of the       │
│  Task type and will become hidden:                      │
│                                                         │
│  • attendees (from Meeting type)                        │
│  • location (from Meeting type)                         │
│                                                         │
│  Data will be preserved but not visible until you       │
│  change the type back.                                  │
│                                                         │
│                     [Cancel]  [Change Type]             │
└─────────────────────────────────────────────────────────┘
```

### Partial Failure Toast

When some operations fail, continue and show count:

```
┌──────────────────────────────────────┐
│ ⚠️ Updated 95 of 100 items          │
│    5 items could not be updated      │
└──────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+A` | Select all visible items |
| `Escape` | Clear selection |
| `Delete` / `Backspace` | Delete selected (with confirmation) |
| `Shift+Click` | Range select from last selected |
| `Cmd/Ctrl+Click` | Toggle individual selection (alternative to checkbox) |

### Accessibility Requirements

- **Focus management:** Action bar should be focusable when it appears
- **Screen reader announcements:**
  - "3 items selected" when selection changes
  - "Selection cleared" when Escape pressed
  - "5 items deleted" after batch action
- **Keyboard navigation:**
  - Tab through action bar buttons
  - Enter/Space to activate buttons
  - Arrow keys to navigate between rows
- **ARIA attributes:**
  - `aria-selected` on selected rows
  - `aria-label` on checkboxes: "Select [item name]"
  - `role="toolbar"` on action bar
  - `aria-live="polite"` on selection count
- **Visual indicators:**
  - High contrast checkbox states
  - Clear focus rings on all interactive elements
  - Selected row background must meet WCAG contrast requirements

---

## 7. Testing Checklist

### Unit Tests
- [ ] `useSelection` hook initializes with empty selection
- [ ] `toggle(id)` adds/removes single item from selection
- [ ] `selectRange(id)` selects all items between lastSelectedId and id
- [ ] `selectRange(id)` handles reverse order selection (B to A)
- [ ] `selectAll()` adds all provided item IDs
- [ ] `clear()` empties selection and resets lastSelectedId
- [ ] `isSelected(id)` returns correct boolean
- [ ] `ObjectStore.deleteMany` returns `{ deleted, errors }` with correct counts
- [ ] `ObjectStore.deleteMany` removes @mentions from other objects' content
- [ ] `ObjectStore.deleteMany` removes references from relation properties
- [ ] `ObjectStore.updateMany` returns `{ updated, errors }` with correct objects/errors
- [ ] `ObjectStore.addTagToMany` adds tag to objects without duplicating
- [ ] `ObjectStore.addTagToMany` returns `{ updated, errors }` counts
- [ ] `ObjectStore.removeTagFromMany` removes tag from objects
- [ ] `ObjectStore.removeTagFromMany` returns `{ updated, errors }` counts
- [ ] `ObjectStore.markProcessedMany` marks all as processed
- [ ] `ObjectStore.markProcessedMany` returns `{ processed, errors }` counts

### Integration Tests
- [ ] Clicking checkbox toggles selection state
- [ ] Shift+click selects range of items
- [ ] Cmd+A selects all visible items
- [ ] Escape clears all selections
- [ ] BulkActions bar appears when selection count > 0
- [ ] BulkActions bar disappears when selection cleared
- [ ] Delete action removes all selected objects
- [ ] Add Tag action adds tag to all selected objects
- [ ] Remove Tag action removes tag from all selected objects
- [ ] Change Type action updates type on all selected objects
- [ ] Process action marks all selected as processed (removes from inbox)
- [ ] Toast shows correct count after batch operation
- [ ] Toast shows partial failure count when some items fail
- [ ] Selection persists during scroll

### Manual QA Checklist
- [ ] Checkbox click does not trigger row navigation
- [ ] Task completion checkbox still works independently
- [ ] Shift+click works across page scroll
- [ ] Checkboxes hidden by default, appear on hover
- [ ] Checkboxes visible on all rows when any item selected (selecting mode)
- [ ] Action bar is visible above any sticky footer
- [ ] Action bar animates in/out smoothly
- [ ] Action bar respects `prefers-reduced-motion` (no animation)
- [ ] Confirmation dialog appears for delete action
- [ ] Delete warning shows referenced object count when applicable
- [ ] Tag picker modal opens for tag actions (existing tags only)
- [ ] Type picker modal opens for type change
- [ ] Type change warning shows properties that will become invisible
- [ ] Keyboard shortcuts work when focus in list area
- [ ] Screen reader announces selection changes
- [ ] Focus moves to action bar when it appears
- [ ] All actions work on 50+ selected items

### Edge Cases
- [ ] Empty selection shows no action bar
- [ ] Single item selected still shows action bar
- [ ] Selecting item then deleting it clears from selection
- [ ] Navigating away and back clears selection
- [ ] Filter change clears selection
- [ ] Shift+click with no prior selection selects only clicked item
- [ ] Batch delete of items in filtered view updates view correctly
- [ ] Adding tag that some items already have (no duplicates)
- [ ] Removing tag that some items don't have (no errors)
- [ ] Changing type to same type (no-op handled gracefully)
- [ ] Very long selection (100+ items) performs well
- [ ] Rapid click/unclick does not cause race conditions
- [ ] Remote sync deleting selected item removes it from selection
- [ ] Deleting referenced objects cleans up @mentions in content
- [ ] Deleting referenced objects removes from relation properties
- [ ] Cancel on delete warning preserves selection
- [ ] Cancel on type change warning preserves selection

---

## 8. Future Considerations

### Potential Enhancements
- **Drag selection:** Lasso/rubber-band selection for visual multi-select
- **Persistent selections:** Maintain selection across view changes (optional setting)
- **Batch property editing:** Edit any property across selected objects
- **Smart grouping:** Select by type, tag, or date range via action
- **Batch content operations:** Prepend/append text to multiple objects
- **Selection history:** Undo/redo selection changes
- **Custom batch actions:** User-defined batch operations via templates

### Cross-Feature Interactions
- **API Integration:** Batch operations should emit webhook events for each modified object
- **Time Machine:** Batch operations create single version checkpoint for potential group undo
- **Templates:** "Apply template to selected" as future batch action
- **Saved Views:** Consider "select all matching filter" functionality

### Performance Considerations
- For very large selections (500+), consider chunked processing with progress indicator
- Debounce UI updates during rapid selection changes
- Consider virtual scrolling integration for lists with 1000+ items
