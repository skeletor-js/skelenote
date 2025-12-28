# Keyboard Shortcuts Help

> Discoverable shortcut overlay modal triggered by Cmd+? that displays all keyboard shortcuts in an organized, scannable format.

---

## 1. Overview

A keyboard shortcuts help modal that provides instant access to all available shortcuts in Skelenote. Users can invoke the modal at any time with `Cmd+?` to discover or remind themselves of shortcuts, improving productivity and reducing the learning curve.

**User Value:**
- Discover shortcuts without leaving the app or consulting documentation
- Learn the app faster through contextual shortcut reference
- Reduce friction for power users who prefer keyboard-driven workflows
- Reinforce muscle memory by providing organized, categorized shortcuts

---

## 2. Goals

### Primary Goals
- Provide instant, in-app access to all keyboard shortcuts via `Cmd+?`
- Organize shortcuts into logical, scannable categories
- Ensure the modal is accessible and keyboard-navigable
- Display shortcuts in a format that distinguishes keys clearly (e.g., styled key caps)

### Success Criteria
- Modal opens within 100ms of `Cmd+?` press
- All documented shortcuts are displayed and accurate
- Users can close the modal via Escape, click outside, or `Cmd+?` toggle
- Modal is fully accessible to screen readers

### Non-Goals
- Customizable/remappable shortcuts (deferred to future version)
- Context-sensitive shortcuts (showing only relevant shortcuts for current view)
- Search/filter within the shortcuts modal
- Printing or exporting shortcuts

---

## 3. User Stories

**As a new user**, I want to see all available shortcuts so that I can learn the app's keyboard-driven workflow quickly.

**As a power user**, I want to quickly reference a shortcut I forgot so that I can maintain my flow without reaching for the mouse.

**As an accessibility-focused user**, I want the shortcuts modal to be screen-reader compatible so that I can understand the available keyboard navigation options.

**As a user learning the app**, I want shortcuts organized by category so that I can find the relevant ones for my current task.

---

## 4. Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Global Keyboard Listener (Cmd+?)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  KeyboardShortcutsModal (src/components/help/)              │
│  ├── ShortcutCategory                                       │
│  │   └── ShortcutRow (key combo + description)              │
│  └── Modal backdrop + close handlers                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  shortcuts.ts (static shortcut definitions)                 │
│  Categorized arrays of { keys: string[], description }      │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

| Component | Purpose |
|-----------|---------|
| `KeyboardShortcutsModal` | Main modal container with backdrop, close logic, and layout |
| `ShortcutCategory` | Section header + list of shortcuts for a category |
| `ShortcutRow` | Single shortcut display: key caps + description |
| `KeyCap` | Styled individual key representation (e.g., `Cmd`, `Shift`, `K`) |

### Shortcut Categories

| Category | Description |
|----------|-------------|
| **Global** | App-wide shortcuts that work everywhere |
| **Navigation** | Moving between views, lists, and focusable elements |
| **Editing** | Shortcuts within the editor (BlockNote defaults) |
| **Objects** | Creating, opening, and managing objects |
| **Views** | Switching between task views, inbox, daily notes |

### Shortcut Data Storage

Shortcuts are stored as a **static TypeScript constant** in `src/lib/shortcuts.ts`. This approach:
- Keeps shortcuts co-located and easy to update
- Enables type-safe shortcut definitions
- Allows future extension (e.g., adding shortcut IDs for customization)

```typescript
interface Shortcut {
  keys: string[];           // e.g., ['Cmd', 'Shift', 'Space']
  description: string;      // e.g., 'Quick Capture'
  category: ShortcutCategory;
}

type ShortcutCategory =
  | 'global'
  | 'navigation'
  | 'editing'
  | 'objects'
  | 'views';

const SHORTCUTS: Shortcut[] = [
  { keys: ['Cmd', 'Shift', 'Space'], description: 'Quick Capture', category: 'global' },
  { keys: ['Cmd', 'K'], description: 'Command Palette', category: 'global' },
  { keys: ['Cmd', '?'], description: 'Keyboard Shortcuts', category: 'global' },
  // ... etc
];
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/help/KeyboardShortcutsModal.tsx` | Main modal component |
| `src/components/help/ShortcutCategory.tsx` | Category section component |
| `src/components/help/ShortcutRow.tsx` | Individual shortcut row |
| `src/components/help/KeyCap.tsx` | Styled key representation |
| `src/lib/shortcuts.ts` | Static shortcut definitions |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/Layout.tsx` | Add global `Cmd+?` listener and modal state |
| `src/components/palette/CommandPalette.tsx` | Add "Keyboard Shortcuts" action |

---

## 5. Implementation Steps

1. **Create shortcut definitions** (`src/lib/shortcuts.ts`)
   - Define `Shortcut` interface and `ShortcutCategory` type
   - Create `SHORTCUTS` array with all app shortcuts
   - Export helper to group shortcuts by category

2. **Build KeyCap component** (`src/components/help/KeyCap.tsx`)
   - Styled span representing a single keyboard key
   - Handle special keys (Cmd/Ctrl symbol, arrow symbols)
   - Platform-aware display (Cmd on Mac, Ctrl on Windows/Linux)

3. **Build ShortcutRow component** (`src/components/help/ShortcutRow.tsx`)
   - Render array of KeyCap components with `+` separators
   - Display description text
   - Proper spacing and alignment

4. **Build ShortcutCategory component** (`src/components/help/ShortcutCategory.tsx`)
   - Category header with styled title
   - Map over shortcuts in category to render ShortcutRows

5. **Build KeyboardShortcutsModal component** (`src/components/help/KeyboardShortcutsModal.tsx`)
   - Modal backdrop with click-outside-to-close
   - Modal container with header and close button
   - Render all categories in organized layout
   - Handle Escape key to close

6. **Add global keyboard listener** (`src/components/layout/Layout.tsx`)
   - Listen for `Cmd+?` (actually `Cmd+Shift+/`)
   - Toggle modal visibility state
   - Prevent default browser behavior

7. **Add Command Palette action** (`src/components/palette/CommandPalette.tsx`)
   - Add "Keyboard Shortcuts" to available actions
   - Opens the shortcuts modal when selected

8. **Add unit tests** (`src/components/help/__tests__/`)
   - Test modal open/close behavior
   - Test all shortcuts are rendered
   - Test category grouping
   - Test keyboard navigation

---

## 6. UI/UX Considerations

### Modal Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                              [×]    │
│                       Keyboard Shortcuts                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  GLOBAL                                                             │
│  ───────────────────────────────────────────────────────────────    │
│  [⌘] [Shift] [Space]                           Quick Capture        │
│  [⌘] [K]                                       Command Palette      │
│  [⌘] [?]                                       Keyboard Shortcuts   │
│                                                                     │
│  NAVIGATION                                                         │
│  ───────────────────────────────────────────────────────────────    │
│  [↑] [↓]                                       Move selection       │
│  [Tab]                                         Next focusable       │
│  [Shift] [Tab]                                 Previous focusable   │
│  [Enter]                                       Open / Confirm       │
│  [Esc]                                         Close / Cancel       │
│                                                                     │
│  OBJECTS                                                            │
│  ───────────────────────────────────────────────────────────────    │
│  [⌘] [N]                                       New object           │
│  [⌘] [Backspace]                               Delete object        │
│                                                                     │
│  VIEWS                                                              │
│  ───────────────────────────────────────────────────────────────    │
│  [⌘] [1]                                       Go to Inbox          │
│  [⌘] [2]                                       Go to Today          │
│  [⌘] [\]                                       Toggle Sidebar       │
│                                                                     │
│  EDITING                                                            │
│  ───────────────────────────────────────────────────────────────    │
│  [@]                                           Mention object       │
│  [⌘] [B]                                       Bold                 │
│  [⌘] [I]                                       Italic               │
│  [⌘] [Z]                                       Undo                 │
│  [⌘] [Shift] [Z]                               Redo                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Shortcut Categories

| Category | Shortcuts Included |
|----------|-------------------|
| **Global** | Quick Capture, Command Palette, Keyboard Shortcuts Help |
| **Navigation** | Arrow keys, Tab, Enter, Escape |
| **Objects** | New object, Delete, Process (from Inbox) |
| **Views** | Jump to Inbox/Today/Daily Notes, Toggle Sidebar |
| **Editing** | Mention (@), Bold, Italic, Undo/Redo, Headings |

### Trigger Shortcut

- **Mac**: `Cmd+?` (implemented as `Cmd+Shift+/`)
- **Windows/Linux**: `Ctrl+?` (implemented as `Ctrl+Shift+/`)

### Close Mechanisms

1. Press `Escape` key
2. Click outside the modal (on backdrop)
3. Press `Cmd+?` again (toggle behavior)
4. Click the close button (X) in modal header

### Visual Design

- Modal follows existing app design language (monochromatic, Fragment Mono)
- Key caps styled as raised buttons with subtle border and shadow
- Categories separated by horizontal rules or spacing
- Consistent alignment: keys left, descriptions right
- Modal width: ~500px, centered
- Max height with scroll for smaller viewports

### Accessibility Requirements

- Modal traps focus when open
- First focusable element (close button) receives focus on open
- `role="dialog"` and `aria-modal="true"` on modal container
- `aria-labelledby` pointing to modal title
- Escape key closes modal
- All key combinations announced by screen readers
- Sufficient color contrast for key cap text
- Focus returns to trigger element when modal closes

---

## 7. Testing Checklist

### Unit Tests
- [ ] `KeyCap` renders correct symbol for special keys (Cmd, Shift, arrows)
- [ ] `KeyCap` displays platform-appropriate symbol (Cmd on Mac, Ctrl otherwise)
- [ ] `ShortcutRow` renders all keys with proper separators
- [ ] `ShortcutCategory` renders header and all shortcuts in category
- [ ] `KeyboardShortcutsModal` renders all categories
- [ ] Shortcuts are correctly grouped by category
- [ ] No duplicate shortcuts in data

### Integration Tests
- [ ] `Cmd+?` opens the modal
- [ ] `Cmd+?` when open closes the modal (toggle)
- [ ] `Escape` closes the modal
- [ ] Click outside modal closes it
- [ ] Click on close button closes modal
- [ ] Modal does not close when clicking inside content
- [ ] Focus is trapped within modal when open
- [ ] Focus returns to previous element after close
- [ ] Command Palette action opens shortcuts modal

### Manual QA Checklist
- [ ] Modal appears centered on screen
- [ ] All documented shortcuts are present and accurate
- [ ] Key caps are visually distinct and readable
- [ ] Categories are clearly labeled
- [ ] Scrolling works if content exceeds viewport
- [ ] Modal respects light/dark mode
- [ ] Animations (if any) are smooth
- [ ] VoiceOver/screen reader announces modal content correctly
- [ ] Works on both Mac and Windows key representations

### Edge Cases
- [ ] Very long shortcut descriptions wrap correctly
- [ ] Modal displays correctly on small screens (min-width handling)
- [ ] Opening modal while another modal is open (e.g., Command Palette)
- [ ] Rapid toggle (Cmd+? spam) does not break state
- [ ] Modal displays correctly when sidebar is collapsed/expanded
- [ ] Shortcuts with 4+ keys display properly
- [ ] Platform detection works in Tauri on all OS

---

## 8. Future Considerations

### Potential Enhancements

- **Customizable shortcuts**: Allow users to remap shortcuts to their preference
- **Context-sensitive display**: Show only shortcuts relevant to current view/context
- **Search/filter**: Add search bar to quickly find specific shortcuts
- **Shortcut conflicts detection**: Warn users if custom shortcut conflicts with system
- **Cheat sheet export**: Generate printable PDF of all shortcuts
- **Interactive tutorial**: Highlight shortcuts as user discovers them
- **Shortcut analytics**: Track which shortcuts are used most to inform UI decisions

### Technical Debt Prevention

- Keep shortcut definitions in sync with actual implementations
- Consider generating shortcuts list from actual keyboard listeners
- Add CI check to ensure all keyboard listeners have corresponding help entries

