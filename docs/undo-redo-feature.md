# Global Undo/Redo System

## Overview

Skelenote implements a unified undo/redo system using CMD+Z (undo) and CMD+Y/CMD+Shift+Z (redo) that works across the entire application. The system intelligently routes undo/redo operations based on context: BlockNote editor handles text editing undo, while Loro's UndoManager handles object-level operations.

## Problem Statement

Users need the ability to:
- Undo accidental object deletions
- Revert property changes (title, status, dates)
- Undo bulk operations (multi-delete, bulk archive)
- Use familiar CMD+Z/CMD+Y shortcuts consistently across the app

The BlockNote editor has its own internal undo/redo for text editing, but this is isolated and doesn't integrate with object-level operations.

## Solution Architecture

### Dual-Layer Undo System

1. **Loro UndoManager** - Handles all object-level operations:
   - Create/delete objects
   - Property changes (title, status, dates, etc.)
   - Content saves from the editor
   - Relations and mentions
   - Bulk operations

2. **BlockNote Native Undo** - Handles in-editor text manipulation:
   - Character-level typing
   - Text formatting
   - Block manipulation while editing

### Focus-Aware Routing

```
┌─────────────────────────────────────────────────────────────┐
│                     CMD+Z / CMD+Y                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Is BlockNote editor focused? │
              └───────────────────────────────┘
                    │                    │
                   Yes                   No
                    ▼                    ▼
        ┌──────────────────┐   ┌──────────────────┐
        │ BlockNote native │   │ Loro UndoManager │
        │ undo/redo        │   │ undo/redo        │
        └──────────────────┘   └──────────────────┘
```

## User Experience

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| CMD+Z | Undo last operation |
| CMD+Y | Redo last undone operation |
| CMD+Shift+Z | Redo last undone operation (alternative) |

### Behavior Examples

**Editing text in the editor:**
```
User types "Hello World" → CMD+Z → "Hello Worl" → CMD+Z → "Hello Wor" ...
(BlockNote handles character-level undo while editing)
```

**Object operations (outside editor):**
```
User edits object title → navigates away → CMD+Z → title reverts
User deletes an object → CMD+Z → object restored
User bulk-deletes 5 items → CMD+Z → all 5 items restored (single undo step)
```

**Toast Notifications:**
- After undo: "Undid: Modified object"
- After redo: "Redid: Modified object"

## Technical Implementation

### Loro UndoManager

Loro CRDT includes a built-in `UndoManager` class that tracks all local changes to the document:

```typescript
import { UndoManager } from 'loro-crdt';

const undoManager = new UndoManager(doc, {
  mergeInterval: 1000,    // Group changes within 1 second
  maxUndoSteps: 100,      // Keep last 100 undo steps
  onPush: (isUndo, counterRange, event) => {
    // Called when a step is pushed to the stack
    return { value: 'description', cursors: [] };
  },
  onPop: (isUndo, value, counterRange) => {
    // Called when undo/redo is performed
    showToast(`${isUndo ? 'Undid' : 'Redid'}: Operation`);
  },
});

// Core methods
undoManager.undo();      // Returns true if successful
undoManager.redo();      // Returns true if successful
undoManager.canUndo();   // Check if undo is available
undoManager.canRedo();   // Check if redo is available

// Grouping for batch operations
undoManager.groupStart();
// ... multiple operations ...
undoManager.groupEnd();  // All operations become a single undo step
```

### UndoContext

The `UndoContext` React context wraps the Loro UndoManager and provides:

```typescript
interface UndoContextValue {
  canUndo: boolean;       // Whether undo is available
  canRedo: boolean;       // Whether redo is available
  undo: () => void;       // Perform undo
  redo: () => void;       // Perform redo
  groupStart: () => void; // Start grouping operations
  groupEnd: () => void;   // End grouping operations
}
```

### Focus Detection

The `NavigationContext` tracks whether the BlockNote editor is currently focused:

```typescript
interface NavigationContextValue {
  // ... existing fields ...
  isEditorFocused: boolean;
  setEditorFocused: (focused: boolean) => void;
}
```

The Editor component reports its focus state:

```typescript
<div
  onFocus={() => setEditorFocused(true)}
  onBlur={() => setEditorFocused(false)}
>
  <BlockNoteView ... />
</div>
```

### Shortcut Registration

Global shortcuts are registered in App.tsx with focus-aware routing:

```typescript
registerShortcut('global-undo', {
  key: 'z',
  metaKey: true,
  action: () => {
    if (isEditorFocused) return; // Let BlockNote handle it
    undo(); // Toast shown via onPop callback
  },
  description: 'Undo',
});
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Action                                    │
│                         (CMD+Z pressed)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   KeyboardShortcutsContext                               │
│                   Intercepts global keydown                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Check isEditorFocused       │
                    │   (from NavigationContext)    │
                    └───────────────────────────────┘
                           │                │
                          Yes               No
                           ▼                ▼
             ┌────────────────────┐  ┌────────────────────┐
             │   Do nothing       │  │  UndoContext.undo()│
             │   (BlockNote's     │  │                    │
             │   ProseMirror      │  │  - Calls Loro      │
             │   handles it)      │  │    UndoManager     │
             └────────────────────┘  │  - Shows toast     │
                                     │  - Refreshes data  │
                                     └────────────────────┘
                                              │
                                              ▼
                    ┌───────────────────────────────┐
                    │   ObjectContext.refreshData() │
                    │   Re-renders affected views    │
                    └───────────────────────────────┘
```

## Component Hierarchy

```
<App>
  <ObjectProvider>           ← Creates LoroDoc
    <UndoProvider>           ← Creates UndoManager (needs LoroDoc)
      <NavigationProvider>   ← Tracks isEditorFocused
        <ToastProvider>      ← Shows undo/redo notifications
          <KeyboardShortcutsProvider>
            <MainContent>
              <ObjectDetailView>
                <Editor
                  onFocus={() => setEditorFocused(true)}
                  onBlur={() => setEditorFocused(false)}
                />
              </ObjectDetailView>
            </MainContent>
          </KeyboardShortcutsProvider>
        </ToastProvider>
      </NavigationProvider>
    </UndoProvider>
  </ObjectProvider>
</App>
```

## Operations Tracked by Undo

| Operation | Undo Behavior |
|-----------|---------------|
| Create object | Deletes the created object |
| Delete object | Restores the deleted object |
| Update property (title, status, etc.) | Reverts to previous value |
| Set content (editor save) | Reverts to previous content |
| Toggle pin | Reverts pin state |
| Toggle inbox | Reverts inbox state |
| Add/remove relation | Reverts the relation |
| Bulk delete | Restores all deleted objects (single undo) |
| Bulk archive | Unarchives all objects (single undo) |

## Configuration

### Merge Interval

Changes made within 1 second (1000ms) are automatically grouped into a single undo step. This provides a natural typing experience where rapid keystrokes become one undo operation.

### Maximum History

The system retains the last 100 undo steps to limit memory usage. Older steps are automatically discarded.

## Limitations

1. **Peer-local undo**: The UndoManager only tracks changes from the current device. Changes synced from other devices cannot be undone via CMD+Z. Use the Time Machine feature to view and restore historical versions from any device.

2. **Remote import during group**: If a sync import arrives during a `groupStart()`/`groupEnd()` block, Loro may automatically split the undo group.

3. **Maximum history depth**: Only the last 100 undo steps are retained.

## Related Features

- **Time Machine**: For viewing and restoring historical versions (including remote changes)
- **Version Comparison**: Side-by-side view of current vs historical state
- **Bulk Operations**: Integrated with undo grouping for atomic undo

## Key Files

| File | Purpose |
|------|---------|
| `src/contexts/UndoContext.tsx` | UndoManager wrapper with React state |
| `src/contexts/NavigationContext.tsx` | Tracks editor focus state |
| `src/components/editor/Editor.tsx` | Reports focus/blur to NavigationContext |
| `src/contexts/KeyboardShortcutsContext.tsx` | Global keyboard shortcut handling |
| `src/App.tsx` | Registers global undo/redo shortcuts |
| `src/components/actions/BulkActions.tsx` | Uses grouping for bulk operations |

## References

- [Loro CRDT Documentation](https://loro.dev/docs)
- [Loro UndoManager API](https://loro.dev/docs/api/js)
- [BlockNote Editor](https://www.blocknotejs.org/docs)
- [ProseMirror History](https://prosemirror.net/docs/ref/#history)
