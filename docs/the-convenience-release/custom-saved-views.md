# Custom Saved Views

> Persist filter/sort configurations as named views for quick access to frequently-used object queries.

---

## 1. Overview

Enable users to save their current filter and sort configurations as named views that persist across sessions. Saved views appear in the sidebar for one-click navigation and can be edited or deleted as needed.

**User Value:**
- Instantly access frequently-used filter combinations without manual reconfiguration
- Create personalized workflows (e.g., "High Priority Tasks", "Recent Notes", "Blocked by Me")
- Reduce cognitive overhead by naming complex query configurations
- Share view definitions across devices via Loro sync

---

## 2. Goals

### Primary Goals
- Allow users to save the current view state (filters, sort, type filter) with a custom name
- Store saved views in the Loro document for cross-device sync
- Display saved views in the sidebar for quick navigation
- Support editing and deleting saved views

### Success Criteria
- Users can save a view with one click from the view header
- Saved views persist across app restarts
- Navigating to a saved view correctly applies all stored filters and sort
- Views sync seamlessly between devices

### Non-Goals
- Sharing views with other users (no multi-user support)
- Scheduled/automated views (e.g., "show this view at 9am")
- View templates or marketplace
- Nested view folders or categories (v1 uses flat list)

---

## 3. User Stories

**As a task manager**, I want to save my "Overdue High Priority" filter so I can check critical tasks with one click.

**As a researcher**, I want to create a "Recent Notes" view sorted by update date so I can quickly find what I was working on.

**As a project lead**, I want to save views for each project's tasks so I can context-switch efficiently between projects.

**As a power user**, I want to edit my saved views when my workflow changes so I don't have to recreate them from scratch.

**As a multi-device user**, I want my saved views to sync between my laptop and desktop so I have the same navigation experience everywhere.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar                                                         │
│  ├── [Saved Views Section]                                       │
│  │   ├── View: "High Priority Tasks"                            │
│  │   ├── View: "Recent Notes"                                   │
│  │   └── View: "Project Alpha Tasks"                            │
│  └── ...existing sections...                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │ onClick
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  NavigationContext                                               │
│  └── applySavedView(viewId) → sets filters, sort, typeFilter    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ reads from
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Loro Document                                                   │
│  └── _views: LoroMap<viewId, SavedView>                         │
│      ├── view_abc123: { name, filters, sort, typeFilter, ... }  │
│      ├── view_def456: { ... }                                   │
│      └── ...                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/types/saved-view.ts` | SavedView type definition and utilities |
| `src/components/views/SavedViewEditor.tsx` | Modal for creating/editing views with filter builder UI |
| `src/lib/loro/views.ts` | CRUD operations for saved views in Loro document |
| `src/hooks/useSavedViews.ts` | React hook for accessing and managing saved views |
| `src/components/layout/SavedViewsSection.tsx` | Sidebar section component for saved views |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/loro/schema.ts` | Add `VIEWS_MAP_KEY` constant and `getViewsMap()` helper |
| `src/components/layout/Sidebar.tsx` | Add SavedViewsSection component |
| `src/contexts/NavigationContext.tsx` | Add `applySavedView()` method |
| `src/contexts/index.ts` | Export saved views hook if using context |

### Data Model

```typescript
// src/lib/types/saved-view.ts

import type { FilterCondition, SortConfig } from '../loro/queries';

/**
 * A saved view persists filter/sort configuration for quick access
 */
export interface SavedView {
  /** Unique identifier (UUID) */
  id: string;

  /** User-defined name for the view */
  name: string;

  /** Filter conditions to apply (from queries.ts) */
  filters: FilterCondition[];

  /** Sort configuration (optional - uses default if not set) */
  sort?: SortConfig;

  /** Type ID filter (optional - null means all types) */
  typeFilter?: string | null;

  /** Icon identifier or emoji (optional) */
  icon?: string;

  /** Unix timestamp when created */
  createdAt: number;

  /** Unix timestamp when last updated */
  updatedAt: number;
}

/**
 * Input for creating a new saved view
 */
export interface CreateSavedViewInput {
  name: string;
  filters: FilterCondition[];
  sort?: SortConfig;
  typeFilter?: string | null;
  icon?: string;
}

/**
 * Input for updating an existing saved view
 */
export interface UpdateSavedViewInput {
  name?: string;
  filters?: FilterCondition[];
  sort?: SortConfig;
  typeFilter?: string | null;
  icon?: string;
}
```

### Filter/Sort Configuration

Saved views leverage the existing query system from `src/lib/loro/queries.ts`:

```typescript
// Existing types from queries.ts (already implemented)

export type FilterOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'in' | 'notIn' | 'isNull' | 'isNotNull';

export interface FilterCondition {
  field: string;           // Property ID or built-in field
  operator: FilterOperator;
  value?: PropertyValue | PropertyValue[];
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}
```

### Loro Storage Schema

```typescript
// Addition to src/lib/loro/schema.ts

/** Key for the saved views map in the root document */
export const VIEWS_MAP_KEY = '_views';

/**
 * Gets the saved views map from a Loro document
 */
export function getViewsMap(doc: LoroDoc): LoroMap {
  return doc.getMap(VIEWS_MAP_KEY);
}

/**
 * Serializes a SavedView to JSON string for storage
 */
export function serializeSavedView(view: SavedView): string {
  return JSON.stringify(view);
}

/**
 * Deserializes a JSON string back to a SavedView
 */
export function deserializeSavedView(data: string): SavedView {
  return JSON.parse(data) as SavedView;
}
```

---

## 5. Implementation Steps

1. **Define SavedView types** (`src/lib/types/saved-view.ts`)
   - Create SavedView interface
   - Create CreateSavedViewInput and UpdateSavedViewInput types
   - Add utility functions (generateViewId, createSavedView)
   - Export from `src/lib/types/index.ts`

2. **Add Loro schema support** (`src/lib/loro/schema.ts`)
   - Add `VIEWS_MAP_KEY` constant
   - Add `getViewsMap()` function
   - Add serialization/deserialization helpers

3. **Create saved views store** (`src/lib/loro/views.ts`)
   - Implement `createView()` - save new view to Loro
   - Implement `getView(id)` - retrieve single view
   - Implement `getAllViews()` - list all saved views
   - Implement `updateView(id, changes)` - modify existing view
   - Implement `deleteView(id)` - remove a view
   - Hook into document change events for reactivity

4. **Create useSavedViews hook** (`src/hooks/useSavedViews.ts`)
   - Provide reactive list of saved views
   - Expose CRUD methods
   - Handle loading and error states

5. **Build SavedViewEditor component** (`src/components/views/SavedViewEditor.tsx`)
   - Modal dialog for create/edit mode
   - Name input field
   - Icon selector (optional)
   - Filter builder UI with:
     - Field selector (dropdown of properties + built-in fields)
     - Operator selector (based on field type)
     - Value input (varies by operator)
     - Add/remove filter buttons
   - Sort configuration:
     - Field selector
     - Direction toggle (asc/desc)
   - Type filter selector (optional)
   - Save and Cancel buttons

6. **Create SavedViewsSection component** (`src/components/layout/SavedViewsSection.tsx`)
   - Collapsible sidebar section
   - List of saved views with icon + name
   - Context menu with Edit/Delete options
   - Empty state when no views saved

7. **Integrate with Sidebar** (`src/components/layout/Sidebar.tsx`)
   - Import and render SavedViewsSection
   - Position after Quick access, before Tasks section

8. **Add navigation support** (`src/contexts/NavigationContext.tsx`)
   - Add `applySavedView(viewId)` method
   - Load view from store, apply filters/sort/typeFilter to current view
   - Track active saved view ID for highlighting in sidebar

9. **Add "Save current view" action**
   - Add save button/menu item to view header
   - Open SavedViewEditor in create mode with current filters pre-filled
   - Show success toast on save

10. **Add keyboard shortcuts**
    - `Cmd+Shift+S` to save current view
    - Number keys `1-9` to quick-switch to saved views (optional)

---

## 6. UI/UX Considerations

### Saved Views Section in Sidebar

```
┌──────────────────────────────────────┐
│  Saved Views                    [+]  │
├──────────────────────────────────────┤
│    ⭐ High Priority Tasks            │
│    📝 Recent Notes                   │
│    📁 Project Alpha                  │
│    🔍 Untagged Items                 │
└──────────────────────────────────────┘
```

- Section header with "Saved Views" label and add button [+]
- Each view shows icon (or default) and name
- Hover state shows subtle highlight
- Active view shows selection indicator
- Right-click opens context menu (Edit, Delete)
- Collapse/expand to hide views when not needed

### Save Current View Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Save Current View                                  [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Name                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ High Priority Tasks                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Icon (optional)                                        │
│  ┌──────┐                                              │
│  │  ⭐  │  [Choose...]                                 │
│  └──────┘                                              │
│                                                         │
│  Current Configuration                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Type: Task                                       │   │
│  │ Filters:                                         │   │
│  │   • priority = high OR urgent                    │   │
│  │   • status != done                               │   │
│  │ Sort: Due Date (ascending)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                          [ Cancel ]  [ Save View ]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### View Editor (for Modifying Filters)

```
┌─────────────────────────────────────────────────────────┐
│  Edit View: High Priority Tasks                     [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Name                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ High Priority Tasks                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Type Filter                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Task                                         [▼] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Filters                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [priority] [in    ▼] [high, urgent     ] [🗑️]   │   │
│  │ [status  ] [!= neq▼] [done             ] [🗑️]   │   │
│  │                                                  │   │
│  │               [+ Add Filter]                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Sort By                                                │
│  ┌──────────────────────┐  ┌────────────────────┐      │
│  │ Due Date         [▼] │  │ Ascending      [▼] │      │
│  └──────────────────────┘  └────────────────────┘      │
│                                                         │
│                          [ Cancel ]  [ Save Changes ]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+S` | Save current view (opens dialog) |
| `Cmd+1` through `Cmd+9` | Quick navigate to saved view 1-9 |
| `Escape` | Close save/edit dialog |
| `Enter` | Submit dialog (when name field focused) |

### Accessibility Requirements

- All interactive elements must be keyboard accessible
- Focus trap within modal dialogs
- Dialog announcements via `role="dialog"` and `aria-labelledby`
- Filter list should be navigable with arrow keys
- Screen reader announcements for:
  - "View saved successfully"
  - "View deleted"
  - "Navigated to [view name]"
- Color contrast meets WCAG AA standards
- Icon selector should have text alternatives
- Clear focus indicators on all interactive elements

---

## 7. Testing Checklist

### Unit Tests
- [ ] `createSavedView()` generates valid view with UUID and timestamps
- [ ] `serializeSavedView()` / `deserializeSavedView()` round-trip correctly
- [ ] Filter conditions serialize with all operator types
- [ ] Sort configuration serializes correctly
- [ ] View name validation (non-empty, reasonable length)
- [ ] `updateSavedView()` merges changes correctly
- [ ] `deleteSavedView()` removes view from store

### Integration Tests
- [ ] Create view persists to Loro document
- [ ] Views survive app restart
- [ ] Multiple views can be created and listed
- [ ] Edit view updates Loro document
- [ ] Delete view removes from Loro document
- [ ] Views sync between devices (Loro sync test)
- [ ] Navigating to view applies correct filters
- [ ] Navigating to view applies correct sort
- [ ] Navigating to view applies correct type filter
- [ ] Save current view captures active filter state

### Manual QA Checklist
- [ ] Create a saved view from inbox with filters
- [ ] Saved view appears in sidebar
- [ ] Click saved view navigates and applies filters
- [ ] Edit saved view and verify changes persist
- [ ] Delete saved view with confirmation
- [ ] Create view with no filters (show all objects)
- [ ] Create view with complex multi-filter configuration
- [ ] Verify view icon displays correctly
- [ ] Verify empty state when no saved views
- [ ] Keyboard shortcut Cmd+Shift+S opens save dialog
- [ ] Keyboard navigation in saved views section
- [ ] Screen reader testing with VoiceOver

### Edge Cases
- [ ] Maximum number of saved views (test with 50+ views)
- [ ] Very long view names (should truncate in sidebar)
- [ ] Saved view references deleted type (should handle gracefully)
- [ ] Saved view filter references deleted property (should skip filter)
- [ ] Duplicate view names allowed (differentiated by ID)
- [ ] Rapid create/delete operations
- [ ] Concurrent edits from multiple devices
- [ ] View with no matching results shows empty state
- [ ] Applying view with invalid filter operators
- [ ] Unicode characters in view names and icons

---

## 8. Future Considerations

### Potential Enhancements
- **View folders/categories** - Organize saved views into groups
- **View sharing** - Export/import view definitions as JSON
- **Smart views** - Auto-updating views based on rules (e.g., "Recent from today")
- **View pinning** - Pin important views to top of section
- **View ordering** - Drag to reorder saved views in sidebar
- **View duplication** - Quick duplicate existing view for modification
- **View search** - Filter saved views list when many exist
- **Default views** - Set a view as the default home screen

### Technical Debt to Address
- Consider indexing filters for performance with large object counts
- Evaluate moving view storage to dedicated Loro container for isolation
- Add migration support for schema changes to SavedView interface

### Related Features
- **Bulk Operations** - Apply saved view filters, then bulk act on results
- **Templates** - Create objects pre-configured for a saved view's type
- **API Integrations** - Expose saved views via REST API
