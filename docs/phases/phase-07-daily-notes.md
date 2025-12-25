# Phase 7: Daily Notes

## Objective
Implement the Daily Notes system with automatic creation, calendar view for browsing, previous/next navigation, and automatic linking of objects created on that day.

## Dependencies
- Phase 2: Note type with `isDailyNote` and `date` properties
- Phase 3: Design system and layout
- Phase 4: Object detail view for note editing
- Phase 6: Quick Capture (links to daily note)

## Key Deliverables
- [ ] Daily note auto-creation on app launch (for today)
- [ ] Daily note auto-creation on Quick Capture (if needed)
- [ ] Calendar view for browsing all daily notes
- [ ] Previous/Next day navigation within daily note
- [ ] Objects created link to that day's daily note
- [ ] Daily note naming convention (e.g., "December 25, 2024")
- [ ] Click any date to open/create that note

## Technical Notes

### Daily Note Properties (from PRD)
```typescript
{
  id: "note-2024-12-25",           // or UUID
  typeId: "note",
  properties: {
    title: "December 25, 2024",    // human-readable date
    date: "2024-12-25",            // ISO date for queries
    isDailyNote: true
  },
  content: /* LoroDoc */,
  inboxed: false                   // daily notes skip inbox
}
```

### Auto-Creation Triggers
1. **App launch**: Create today's daily note if it doesn't exist
2. **Quick Capture**: Ensure today's daily note exists, link new object to it

### Daily Note ID Convention
Option A: Date-based ID like `note-2024-12-25`
Option B: UUID with `date` property for lookup

Recommend Option A for simplicity in lookups.

### Calendar View
- Month grid showing all days
- Days with notes highlighted/marked
- Click any day to navigate to that note (creates if needed)
- Previous/Next month navigation
- Today button to jump to current day

### Daily Note View
- Standard object detail view
- Previous Day / Next Day buttons in header
- Shows content (BlockNote editor)
- Could show summary of objects created that day (via backlinks)

### Linking Objects to Daily Note
When creating any object via Quick Capture:
1. Get or create today's daily note
2. Add daily note ID to object's relations (e.g., `dailyNote` property)
3. Daily note shows these objects in backlinks

Alternative: Query objects by `createdAt` date matching daily note date.

### Date Utilities
- `formatDateTitle(date)` → "December 25, 2024"
- `formatDateId(date)` → "2024-12-25"
- `parseDate(id)` → Date object
- `getAdjacentDate(date, offset)` → previous/next day

## Files to Create/Modify
- `src/components/views/DailyNotesView.tsx` - Calendar view
- `src/components/views/Calendar.tsx` - Month calendar grid
- `src/components/views/CalendarDay.tsx` - Individual day cell
- `src/components/daily/DailyNoteHeader.tsx` - Prev/Next navigation
- `src/lib/daily/daily-notes.ts` - Daily note creation/lookup
- `src/lib/daily/date-utils.ts` - Date formatting utilities
- `src/hooks/useDailyNote.ts` - Hook for today's daily note
- `src/hooks/useCalendar.ts` - Calendar state (current month)
- Update `src/components/capture/QuickCapture.tsx` - Link to daily note
- Update `src/App.tsx` - Auto-create today's note on launch

## Acceptance Criteria
- [ ] Today's daily note created on app launch
- [ ] Daily note uses correct title format ("Month Day, Year")
- [ ] Daily note has `isDailyNote: true` and `date` property
- [ ] Daily notes have `inboxed: false` by default
- [ ] Calendar view shows month grid
- [ ] Days with existing notes visually indicated
- [ ] Clicking day opens/creates that day's note
- [ ] Previous/Next navigation works in daily note view
- [ ] Objects created via Quick Capture link to today's daily note
- [ ] Daily note backlinks show objects created that day
- [ ] Today button returns to current day
