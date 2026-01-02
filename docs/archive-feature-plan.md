# Archive Feature Implementation Plan

## Overview

Add an Archive feature to Skelenote that allows users to hide objects from normal views without permanently deleting them. Archive becomes the primary "hide" action, with Delete moved to secondary/overflow.

## Requirements

1. **Hide archived by default**: `getAll()` and `getByType()` exclude archived items unless explicitly requested
2. **Sidebar placement**: Archive view between Search and Time Machine
3. **Action hierarchy**: Archive is primary action; Delete is secondary (in overflow menu)

---

## Implementation Steps

### Step 1: Data Model (`src/lib/types/object.ts`)

- Add `archived: boolean` field to `SkelenoteObject` interface (line 22, after `pinned`)
- Update `createObject()` to default `archived: false` (line 74, after `pinned: false`)
- Update `isSkelenoteObject()` type guard to handle `archived` (line 95)

### Step 2: Serialization (`src/lib/loro/schema.ts`)

- Update `deserializeObject()` for backward compatibility: default `archived: false` for existing objects

### Step 3: ObjectStore Operations (`src/lib/loro/objects.ts`)

Add methods following the pin/unpin pattern:

- `archive(objectId)`: Set `archived: true`, also set `inboxed: false`
- `unarchive(objectId)`: Set `archived: false`
- `archiveMany(ids)`: Batch archive
- `unarchiveMany(ids)`: Batch unarchive
- `getArchived()`: Return all archived objects

Modify query methods:

- `getAll(options?: { includeArchived?: boolean })`: Exclude archived by default
- `getByType(typeId, options?)`: Same pattern
- `getInboxed()`: Ensure it never includes archived items

### Step 4: Query System (`src/lib/loro/queries.ts`)

- Add `archived` to built-in fields in `getFieldValue()` switch statement
- Enables saved views to filter by archived status

### Step 5: Navigation Types (`src/contexts/NavigationContext.tsx`)

- Add `'archive'` to `ViewType` union type

### Step 6: Icons (`src/lib/icons.ts`)

- Add `'archive'` to `IconName` type and `VALID_ICON_NAMES` set

### Step 7: Create useArchive Hook

**New file**: `src/hooks/useArchive.ts`

- Follow `useInbox.ts` pattern
- Exports: `items`, `count`, `unarchiveItem`, `deleteItem`
- Sort by `updatedAt` descending (most recently archived first)

### Step 8: Create ArchiveView Component

**New file**: `src/components/views/ArchiveView.tsx`

- Follow `InboxView.tsx` pattern with date grouping
- Empty state: "No archived items"
- Actions: Unarchive (restore), Delete permanently

**New file**: `src/components/views/ArchiveRow.tsx`

- Follow `InboxRow.tsx` pattern
- Hover actions: Unarchive, Split pane, Delete

### Step 9: Sidebar Updates (`src/components/layout/Sidebar.tsx`)

Add Archive item between Search and Time Machine:

- **Expanded sidebar** (lines 237-238): Insert new `SidebarItem` for archive
- **Collapsed sidebar** (lines 170-181): Insert Archive `ActionIcon` between Search and Time Machine

### Step 10: App Router (`src/App.tsx`)

- Import `ArchiveView`
- Add `archive: 'Archive'` to `viewLabels`
- Add case for `archive` view in `PrimaryContent()`

### Step 11: Update ALL Components with Delete Actions

**Every component with Delete must also have Archive. Archive is primary, Delete is secondary.**

#### Row Components (hover actions + context menus)

| Component | Location | Changes |
|-----------|----------|---------|
| `TaskRow.tsx` | `src/components/views/` | Add `onArchive` prop, archive hover action, archive in context menu |
| `InboxRow.tsx` | `src/components/views/` | Add `onArchive` prop, archive hover action, archive in context menu |
| `ObjectRow.tsx` | `src/components/object/` | Add `onArchive` prop, archive hover action |
| `SearchResultCard.tsx` | `src/components/search/` | Add `onArchive` prop, archive hover action, archive in context menu |
| `SavedViewRow` (in `SavedViewContent.tsx`) | `src/components/views/` | Add `onArchive` prop, archive hover action |

#### Parent Components (pass archive handlers down)

| Component | Location | Changes |
|-----------|----------|---------|
| `TaskView.tsx` | `src/components/views/` | Add `archiveTask` handler, pass to TaskList |
| `TaskList.tsx` | `src/components/views/` | Add `onArchiveTask` prop, pass to TaskRow |
| `InboxView.tsx` | `src/components/views/` | Add `archiveItem` to useInbox, pass to InboxRow |
| `SavedViewContent.tsx` | `src/components/views/` | Add archive handler, pass to SavedViewRow |
| `DayTasksSection.tsx` | `src/components/daily/` | Add `onArchiveTask` prop, pass to TaskRow |
| `RelatedTypeSection.tsx` | `src/components/object/` | Add archive handler, pass to ObjectRow/TaskRow |
| `DailyNotesView.tsx` | `src/components/views/` | Add archive action to header |

#### Object Detail Components

| Component | Location | Changes |
|-----------|----------|---------|
| `ObjectHeader.tsx` | `src/components/object/` | Add `onArchive` prop, `isArchived` prop. Show Archive button prominently, move Delete to overflow menu |
| `ObjectDetailView.tsx` | `src/components/object/` | Add `handleArchive` handler, pass to ObjectHeader |

#### Bulk Actions (`src/components/actions/BulkActions.tsx`)

- Add `handleArchive` and `handleUnarchive` handlers
- Add `viewType` prop to distinguish archive view
- Show "Archive" in normal views, "Restore" in archive view
- Keep "Delete" but make it secondary (after Archive in the action bar)

### Step 12: Hook Exports (`src/hooks/index.ts`)

- Export `useArchive`

### Step 13: Component Exports (`src/components/views/index.ts`)

- Export `ArchiveView` and `ArchiveRow`

---

## Critical Files

### Core Data Layer

| File | Change |
|------|--------|
| `src/lib/types/object.ts` | Add `archived` boolean field |
| `src/lib/loro/schema.ts` | Backward compatibility for deserialization |
| `src/lib/loro/objects.ts` | Archive/unarchive methods, modify queries |
| `src/lib/loro/queries.ts` | Add `archived` to built-in fields |

### Navigation & UI

| File | Change |
|------|--------|
| `src/contexts/NavigationContext.tsx` | Add `archive` view type |
| `src/lib/icons.ts` | Add `archive` icon |
| `src/components/layout/Sidebar.tsx` | Add Archive navigation item |
| `src/App.tsx` | Route to ArchiveView |

### New Files

| File | Change |
|------|--------|
| `src/hooks/useArchive.ts` | **New**: Archive query hook |
| `src/components/views/ArchiveView.tsx` | **New**: Archive view component |
| `src/components/views/ArchiveRow.tsx` | **New**: Archive row component |

### Components with Delete → Add Archive

| File | Change |
|------|--------|
| `src/components/views/TaskRow.tsx` | Add `onArchive` prop, archive in hover/context menu |
| `src/components/views/InboxRow.tsx` | Add `onArchive` prop, archive in hover/context menu |
| `src/components/object/ObjectRow.tsx` | Add `onArchive` prop, archive in hover actions |
| `src/components/search/SearchResultCard.tsx` | Add `onArchive` prop, archive in hover/context menu |
| `src/components/views/SavedViewContent.tsx` | Add archive to SavedViewRow |
| `src/components/object/ObjectHeader.tsx` | Add `onArchive`, `isArchived` props, move Delete to overflow |
| `src/components/object/ObjectDetailView.tsx` | Add `handleArchive`, pass to ObjectHeader |
| `src/components/actions/BulkActions.tsx` | Add archive/unarchive bulk actions |

### Parent Components (pass handlers)

| File | Change |
|------|--------|
| `src/components/views/TaskView.tsx` | Add `archiveTask`, pass to TaskList |
| `src/components/views/TaskList.tsx` | Add `onArchiveTask`, pass to TaskRow |
| `src/components/views/InboxView.tsx` | Add `archiveItem` handler |
| `src/components/daily/DayTasksSection.tsx` | Add `onArchiveTask`, pass to TaskRow |
| `src/components/object/RelatedTypeSection.tsx` | Add archive handler |
| `src/components/views/DailyNotesView.tsx` | Add archive to header actions |
| `src/hooks/index.ts` | Export useArchive |
| `src/components/views/index.ts` | Export ArchiveView, ArchiveRow |

---

## Design Decisions

1. **Archiving removes from inbox**: Sets `inboxed: false` to prevent logical inconsistency
2. **Delete in overflow**: Archive is prominent, Delete requires clicking "..." menu
3. **Search excludes archived**: Default behavior (can be changed later if needed)
4. **No unpin on archive**: Archived items can remain pinned (visible reminder)
