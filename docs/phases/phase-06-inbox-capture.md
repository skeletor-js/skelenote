# Phase 6: Inbox & Quick Capture

## Objective
Build the universal Inbox view for triaging all object types, the Quick Capture modal with global hotkey support, and the Command Palette for in-app navigation and actions.

## Dependencies
- Phase 2: Object model with `inboxed` flag
- Phase 3: Design system (modal styling)
- Phase 4: Object detail view (for processing items)
- Phase 7: Daily Notes (Quick Capture links to daily note) - partial dependency

## Key Deliverables
- [ ] Inbox view showing all unprocessed objects
- [ ] Process button to clear `inboxed` flag
- [ ] Quick Capture modal (`Cmd+Shift+Space`)
- [ ] Global hotkey registration (works when app unfocused)
- [ ] Type selector in Quick Capture
- [ ] Dynamic form based on selected type
- [ ] Command Palette (`Cmd+K`)
- [ ] Navigation actions in palette
- [ ] Object search in palette

## Technical Notes

### Inbox View
- Filter: `inboxed = true` (all types)
- Columns: Type icon, Name, Created, Preview (first tag or relation)
- Sort: createdAt desc (newest first)
- Click row to open object detail view
- "Process" button marks item as `inboxed: false`
- No auto-clearing—explicit action only

### Quick Capture Modal
Global hotkey `Cmd+Shift+Space`:
1. Modal appears (centered, elevated, command palette style)
2. Type selector at top (Task, Note, Project, Link, custom types)
3. Form shows required fields for selected type
4. Submit creates object with `inboxed: true`
5. Relation added to today's daily note (creates if needed)

Use Tauri's global shortcut API for hotkey registration:
```rust
// In Tauri backend
app.global_shortcut_manager()
    .register("CmdOrCtrl+Shift+Space", handler)
```

### Type Selector
- Show icons + names for all types
- Built-in types: Task, Note, Project, Link
- Custom types (from Phase 2 type definitions)
- Recently used types weighted first

### Dynamic Form
Based on TypeDefinition.schema:
- Render required fields
- Use property editors from Phase 4
- Optional: show optional fields behind "More" toggle

### Command Palette (`Cmd+K`)
Actions:
| Action | Description |
|--------|-------------|
| Quick capture | Opens capture modal |
| Navigate to [object] | Search objects, jump to selection |
| Jump to [view] | Inbox, Today, This Week, etc. |
| Create new [type] | Shortcut to create specific type |
| Toggle sidebar | Show/hide navigation |
| Search | Full-text search |

Behavior:
- Fuzzy matching on action names and object titles
- Recent actions/objects weighted higher
- Arrow key navigation + Enter to select
- Escape to close

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+Space` | Quick Capture (global) |
| `Cmd+K` | Command Palette |
| `Escape` | Close modal |
| `↑` / `↓` | Navigate items |
| `Enter` | Select item |

## Files to Create/Modify
- `src/components/views/InboxView.tsx` - Inbox list view
- `src/components/views/InboxRow.tsx` - Inbox item row
- `src/components/capture/QuickCapture.tsx` - Capture modal
- `src/components/capture/TypeSelector.tsx` - Type picker
- `src/components/capture/CaptureForm.tsx` - Dynamic form
- `src/components/palette/CommandPalette.tsx` - Command palette
- `src/components/palette/PaletteItem.tsx` - Palette result item
- `src/components/palette/PaletteInput.tsx` - Search input
- `src/lib/palette/actions.ts` - Available palette actions
- `src/lib/palette/search.ts` - Fuzzy search for objects
- `src/hooks/useGlobalHotkey.ts` - Tauri global shortcut hook
- `src/hooks/useCommandPalette.ts` - Palette state management
- `src-tauri/src/shortcuts.rs` - Global shortcut registration

## Acceptance Criteria
- [ ] Inbox shows all objects with `inboxed: true`
- [ ] Inbox displays type icon, name, created date
- [ ] Click inbox item opens detail view
- [ ] "Process" button sets `inboxed: false`
- [ ] `Cmd+Shift+Space` opens Quick Capture even when app unfocused
- [ ] Quick Capture shows type selector
- [ ] Selecting type shows appropriate form fields
- [ ] Submitting creates object with `inboxed: true`
- [ ] `Cmd+K` opens Command Palette
- [ ] Palette supports fuzzy search
- [ ] Can navigate to any view from palette
- [ ] Can search and open any object from palette
- [ ] Arrow keys navigate palette items
- [ ] Escape closes modals
