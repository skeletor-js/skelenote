# Top Navigation Redesign - Implementation Plan

## Overview

Redesign the top safe area into a functional navigation bar with omnibar, and streamline the sidebar by removing elements that move to the top nav.

## User Decisions
- **Omnibar UX**: Dropdown below input (Spotlight/Raycast style)
- **Sidebar collapse**: Remove collapse functionality entirely
- **Command palette**: Fully replace centered modal with omnibar

---

## Phase 1: Foundation (Non-Breaking)

### 1.1 Create feature branch
```bash
git checkout -b feature/top-nav-redesign
```

### 1.2 Save implementation plan to docs
Create `docs/top-nav-redesign-plan.md` with this implementation plan for future reference.

### 1.3 Add forward navigation to NavigationContext
**File**: `src/contexts/NavigationContext.tsx`

Add forward navigation support:
- Add `forwardHistory: NavigationState[]` state
- Add `canGoForward: boolean` to context value
- Add `navigateForward()` function
- Modify `navigateBack()` to push current state to forward history
- Modify all `navigate*` functions to clear forward history on new navigation

### 1.4 Create NavigationButtons component
**New file**: `src/components/layout/NavigationButtons.tsx`

```typescript
interface NavigationButtonsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}
```

- Two ActionIcon buttons: ChevronLeft (back), ChevronRight (forward)
- Disabled state when can't navigate (opacity: 0.3)
- Size: `sm` with 14px icons per style guide

### 1.5 Create TopNavRightControls component
**New file**: `src/components/layout/TopNavRightControls.tsx`

Contains (left to right):
1. Time Machine button (`History` icon, 14px)
2. Add New button (`Plus` icon, 14px) - opens same menu as sidebar add
3. SyncIndicator (move from sidebar)
4. Theme toggle (Moon/Sun, 14px)
5. Settings button (Settings icon, 14px)

---

## Phase 2: Omnibar Implementation

### 2.1 Create OmnibarDropdown component
**New file**: `src/components/layout/OmnibarDropdown.tsx`

Displays search results in a dropdown panel:
- Actions section (filtered static actions)
- Objects section (search results)
- Keyboard navigation support (arrow keys)
- Selected state highlighting
- Category headers ("Actions", "Objects")
- Empty state when no results

### 2.2 Create Omnibar component
**New file**: `src/components/layout/Omnibar.tsx`
**New file**: `src/components/layout/Omnibar.module.css`

Structure:
- TextInput with search icon (left) and "Cmd K" kbd hint (right)
- Mantine Popover for dropdown (position: bottom-start, width: target)
- Reuses `useSearch()` hook for object search
- Reuses action filtering from `src/lib/palette/actions.ts`

State management:
- `isFocused` - whether input is focused
- `query` - current search text
- `selectedIndex` - keyboard navigation index

Keyboard handling:
- `ArrowUp/Down` - navigate results
- `Enter` - execute selected action/navigate to object
- `Escape` - clear query and blur input

Cmd+K handling:
- Register shortcut to focus input and select all text

### 2.3 Create CSS module for Omnibar
**New file**: `src/components/layout/Omnibar.module.css`

Key styles:
- `.omnibarWrapper` - flex: 1, max-width: 600px, centered
- `.dropdown` - max-height: 400px, overflow-y: auto
- `.resultItem` - hover/selected states with gray-0 background
- `.categoryHeader` - uppercase, xs size, dimmed color
- Focus ring using ember color

---

## Phase 3: TopNavBar Integration

### 3.1 Create TopNavBar component
**New file**: `src/components/layout/TopNavBar.tsx`
**New file**: `src/components/layout/TopNavBar.module.css`

Layout (left to right):
```
[Back][Forward] | [Omnibar.....................] | [TimeMachine][+][Sync][Theme][Settings]
```

Props:
```typescript
interface TopNavBarProps {
  onOpenQuickCapture: () => void;
  onCreateFromTemplate?: () => void;
}
```

Styling:
- Height: 48px (includes window controls safe area)
- `data-tauri-drag-region` for window dragging
- `paddingLeft` accounts for macOS traffic lights via `usePlatform()`
- Border bottom: 1px solid var(--border-default)
- Background: var(--surface-paper)

### 3.2 Update Layout.tsx to use TopNavBar
**File**: `src/components/layout/Layout.tsx`

Changes:
- Add `AppShell.Header` section with TopNavBar
- Remove `TitleBarSpacer variant="main"` (TopNavBar handles this)
- Update AppShell config with `header: { height: 48 }`
- Remove mobile overlay (no longer needed without collapse)

---

## Phase 4: Sidebar Cleanup

### 4.1 Update Sidebar.tsx
**File**: `src/components/layout/Sidebar.tsx`

Remove from primary navigation:
- Search item (line ~270-275)
- Time Machine item (line ~282-287)

Remove entirely:
- Footer section with controls (lines ~480-514)
- Collapse/expand functionality and related state

Keep:
- TitleBarSpacer at top of sidebar
- Primary nav: Inbox, Daily Notes, Archive
- All middle sections (Pinned, Objects, Tasks, Areas, Projects, Tags, Saved Views)

### 4.2 Update SidebarContext
**File**: `src/contexts/SidebarContext.tsx`

Remove:
- `isCollapsed` state
- `toggleCollapsed()` function
- `setCollapsed()` function
- localStorage persistence for collapsed state

Keep sidebar context for other state if needed, or remove entirely if unused.

### 4.3 Update Layout.tsx sidebar width
**File**: `src/components/layout/Layout.tsx`

- Remove conditional width based on collapsed state
- Set fixed width: 240px (SIDEBAR_WIDTH constant)
- Remove responsive collapse useEffect

---

## Phase 5: Keyboard Shortcuts Update

### 5.1 Update App.tsx shortcuts
**File**: `src/App.tsx`

Modify:
- `Cmd+K` - Focus omnibar (instead of opening modal)

Add:
- `Cmd+[` - Navigate back
- `Cmd+]` - Navigate forward

Keep:
- `Cmd+Shift+H` - Time Machine (now also accessible from top nav)
- `Cmd+Shift+F` - Focus omnibar in search mode
- All other existing shortcuts

### 5.2 Remove CommandPalette modal usage
**File**: `src/App.tsx`

- Remove `paletteOpen` state
- Remove `togglePalette` function
- Remove `<CommandPalette>` component render
- Keep the component file for potential future use or delete entirely

---

## Phase 6: Cleanup & Polish

### 6.1 Delete or archive unused components
Consider removing:
- `src/components/palette/CommandPalette.tsx` (or keep for reference)
- Sidebar collapse-related code

### 6.2 Update keyboard shortcuts display
If there's a shortcuts help modal, update it to reflect new shortcuts.

### 6.3 Testing checklist
- [ ] Back/forward navigation works correctly
- [ ] Forward history clears on new navigation
- [ ] Omnibar focuses on Cmd+K
- [ ] Dropdown appears with results while typing
- [ ] Keyboard navigation in dropdown works
- [ ] Actions execute correctly from omnibar
- [ ] Object selection navigates correctly
- [ ] Time Machine button navigates to time-machine view
- [ ] Add button opens create menu
- [ ] Sync indicator displays correctly
- [ ] Theme toggle works
- [ ] Settings button navigates to settings
- [ ] Sidebar no longer has Search, Time Machine, or footer controls
- [ ] macOS traffic lights don't overlap with content
- [ ] Windows/Linux window controls work correctly

---

## Critical Files Summary

### New Files to Create
- `docs/top-nav-redesign-plan.md`
- `src/components/layout/TopNavBar.tsx`
- `src/components/layout/TopNavBar.module.css`
- `src/components/layout/NavigationButtons.tsx`
- `src/components/layout/TopNavRightControls.tsx`
- `src/components/layout/Omnibar.tsx`
- `src/components/layout/Omnibar.module.css`
- `src/components/layout/OmnibarDropdown.tsx`

### Files to Modify
- `src/contexts/NavigationContext.tsx` - Add forward navigation
- `src/contexts/SidebarContext.tsx` - Remove collapse functionality
- `src/components/layout/Layout.tsx` - Add header, simplify sidebar
- `src/components/layout/Sidebar.tsx` - Remove items and footer
- `src/App.tsx` - Update shortcuts, remove modal

### Files to Potentially Remove
- `src/components/palette/CommandPalette.tsx` (or archive)

---

## Commit Strategy

1. `feat: add forward navigation to NavigationContext`
2. `feat: create NavigationButtons component`
3. `feat: create Omnibar component with dropdown`
4. `feat: create TopNavRightControls component`
5. `feat: create TopNavBar and integrate into Layout`
6. `refactor: remove Search and Time Machine from sidebar`
7. `refactor: remove sidebar footer controls`
8. `refactor: remove sidebar collapse functionality`
9. `refactor: update keyboard shortcuts for new top nav`
10. `chore: cleanup unused command palette code`
