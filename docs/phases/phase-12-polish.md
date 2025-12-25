# Phase 12: Polish & First Run

## Objective
Implement the first-run experience with seed data, welcome content, empty states, edge case handling, and performance optimization for a polished v1 release.

## Dependencies
- All previous phases (this is the final polish pass)

## Key Deliverables
- [ ] First-run detection
- [ ] Seed data creation (today's daily note, welcome note)
- [ ] Welcome note content explaining core concepts
- [ ] Empty states for all views
- [ ] Edge case handling (deleted relations, etc.)
- [ ] Performance optimization
- [ ] Error handling and recovery
- [ ] Final UI polish

## Technical Notes

### First Run Detection
```typescript
// Check if this is first launch
const isFirstRun = !localStorage.getItem('hasLaunched');
if (isFirstRun) {
  await createSeedData();
  localStorage.setItem('hasLaunched', 'true');
}
```

### Seed Data (from PRD)

**1. Today's Daily Note**
```typescript
{
  id: generateId(),
  typeId: "note",
  properties: {
    title: formatDateTitle(new Date()),
    date: formatDateId(new Date()),
    isDailyNote: true
  },
  content: emptyLoroDoc(),
  inboxed: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

**2. Welcome Note**
```typescript
{
  id: generateId(),
  typeId: "note",
  properties: {
    title: "Welcome to Ephemera",
    isDailyNote: false,
    dailyNote: [todaysDailyNoteId]  // linked
  },
  content: welcomeContent,  // BlockNote content
  inboxed: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

### Welcome Note Content
Explain core concepts (adapted from PRD):
- Everything is an object
- Quick Capture with `Cmd+Shift+Space`
- Command Palette with `Cmd+K`
- Inbox workflow for processing
- Object relations and backlinks
- Daily notes as connection hub

Keep it concise—this is a welcome, not documentation.

### Empty States (from PRD)

| View | Empty State Message |
|------|---------------------|
| Inbox | "All clear! Nothing to process." |
| Today | "No tasks due today." |
| This Week | "No tasks due this week." |
| Overdue | "Nothing overdue. Nice!" |
| Blocked | "No blocked tasks." |
| Eventually | "No future tasks scheduled." |
| Completed | "No completed tasks yet." |
| Search (no results) | "No results found." |
| Projects | "No projects yet. Create one to get started." |
| Tags | "No tags yet." |

Design: Centered text, subtle color, optional illustration or icon.

### Edge Cases (from PRD)

**Deleted Object Relations**
- When an object is deleted, relations pointing to it become `null`
- UI should handle missing relations gracefully (show "Deleted" or omit)
- Backlink queries won't find deleted objects

**Deletion Behavior**
- Permanent only (no trash)
- Confirm dialog before deletion
- Suggest "Archive" tag for soft delete

**Empty Content**
- Handle objects with no content gracefully
- Show placeholder in editor

### Error Handling

**Sync Errors**
- Show toast notification on sync failure
- Retry with exponential backoff
- Don't lose local changes

**Data Corruption**
- Loro provides built-in consistency
- Log errors for debugging
- Graceful degradation

**API Errors (Calendar)**
- Handle expired tokens (re-auth)
- Handle rate limits (backoff)
- Show user-friendly messages

### Performance Optimization

**Initial Load**
- Lazy load non-critical components
- Code splitting for routes/views
- Optimize Loro document loading

**Rendering**
- Virtualize long lists (react-window or similar)
- Memoize expensive computations
- Debounce rapid updates

**Search**
- Index incrementally on changes
- Debounce search input
- Limit result count

**Sync**
- Batch updates when possible
- Compress Loro updates
- Efficient delta sync

### Final UI Polish

- Consistent focus states
- Smooth transitions/animations (subtle)
- Loading states for async operations
- Responsive behavior at all breakpoints
- Accessibility audit (keyboard nav, screen readers)
- Cross-browser testing

### Pre-Launch Checklist
- [ ] All views render correctly
- [ ] All CRUD operations work
- [ ] Sync works across devices
- [ ] Calendar integration works
- [ ] No console errors in production build
- [ ] Performance acceptable (< 3s initial load)
- [ ] Accessibility basics met
- [ ] App icon and metadata set
- [ ] Build works for all target platforms

## Files to Create/Modify
- `src/lib/first-run/detect.ts` - First run detection
- `src/lib/first-run/seed.ts` - Create seed data
- `src/lib/first-run/welcome-content.ts` - Welcome note content
- `src/components/ui/EmptyState.tsx` - Reusable empty state
- `src/components/ui/Toast.tsx` - Toast notifications
- `src/components/ui/ConfirmDialog.tsx` - Deletion confirmation
- `src/components/ui/LoadingSpinner.tsx` - Loading indicator
- `src/lib/error/handler.ts` - Centralized error handling
- `src/lib/performance/virtualize.ts` - List virtualization
- Update all view components with empty states
- Update `src/App.tsx` - First run logic

## Acceptance Criteria
- [ ] First launch creates today's daily note and welcome note
- [ ] Welcome note explains core concepts clearly
- [ ] All empty states display appropriate messages
- [ ] Deleted relations handled gracefully (no crashes)
- [ ] Confirm dialog appears before deletion
- [ ] Sync errors show user-friendly toast
- [ ] Long lists scroll smoothly (virtualization)
- [ ] Initial load under 3 seconds
- [ ] No accessibility errors in audit
- [ ] Production builds work on all platforms
- [ ] App ready for v1 release
