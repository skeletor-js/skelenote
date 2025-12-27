# Phase 10: Google Calendar Integration

## Objective
Implement read-only sync with Google Calendar to automatically create and update Meeting objects from calendar events, with user-editable notes and tags.

## Dependencies
- Phase 2: Meeting type definition
- Phase 4: Object detail view for meeting notes
- Phase 7: Daily Notes (meetings appear in daily note view)

## Key Deliverables
- [ ] OAuth 2.0 authentication with Google
- [ ] Calendar event fetching
- [ ] Meeting object creation from events
- [ ] Meeting object updates when events change
- [ ] Sync triggers (launch, periodic, manual)
- [ ] Calendar selection settings (if multiple calendars)
- [ ] User-editable fields preserved during sync

## Technical Notes

### Authentication (from PRD)
- OAuth 2.0 flow via Google API
- Scope: `calendar.readonly` (view only)
- Token stored locally (Tauri secure storage)
- Token refresh handled automatically

### OAuth Flow in Tauri
1. Open Google OAuth URL in system browser
2. User authorizes app
3. Redirect to custom URL scheme (e.g., `skelenote://oauth`)
4. Tauri captures redirect, extracts auth code
5. Exchange code for access/refresh tokens
6. Store tokens securely

### Sync Triggers (from PRD)
| Trigger | Action |
|---------|--------|
| App launch | Fetch events for today + next 7 days |
| Periodic (every 15 min) | Refresh upcoming events |
| Manual refresh | User-triggered full sync |

### Event → Meeting Mapping (from PRD)
| Google Calendar Field | Meeting Property |
|-----------------------|------------------|
| `summary` | title |
| `start.dateTime` | startTime |
| `end.dateTime` | endTime |
| `location` | location |
| `hangoutLink` / `conferenceData` | location (if no physical) |
| `attendees[].email` | attendees |
| `id` | calendarEventId |

### Sync Rules
- **New event**: Create Meeting object, `inboxed: false`
- **Updated event**: Update Meeting properties, preserve user fields (content, tags, project)
- **Deleted event**: Mark `calendarDeleted: true`, don't delete Meeting
- **Conflict**: Google Calendar is source of truth for synced fields

### User-Editable Fields (preserved during sync)
- `content` - Meeting notes (BlockNote)
- `tags` - User-applied tags
- `project` - User-linked project

### Meeting Object Structure
```typescript
{
  id: "meeting-uuid",
  typeId: "meeting",
  properties: {
    title: "Weekly Standup",
    startTime: "2024-12-25T09:00:00Z",
    endTime: "2024-12-25T09:30:00Z",
    location: "https://meet.google.com/xxx",
    attendees: ["alice@example.com", "bob@example.com"],
    calendarEventId: "google-event-id",
    calendarDeleted: false,
    project: ["proj-uuid"],  // user-added
    tags: ["tag-uuid"]       // user-added
  },
  content: /* LoroDoc - user notes */,
  inboxed: false
}
```

### Google Calendar API
```typescript
// Fetch events
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
  `timeMin=${encodeURIComponent(now.toISOString())}&` +
  `timeMax=${encodeURIComponent(weekLater.toISOString())}&` +
  `singleEvents=true&orderBy=startTime`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

### Settings
- Connect/disconnect Google account
- Select calendars to sync (if multiple)
- Sync window: how far ahead (default 7 days)

## Files to Create/Modify
- `src/lib/calendar/oauth.ts` - OAuth flow management
- `src/lib/calendar/api.ts` - Google Calendar API client
- `src/lib/calendar/sync.ts` - Sync logic (fetch, diff, update)
- `src/lib/calendar/mapper.ts` - Event → Meeting mapping
- `src/lib/calendar/storage.ts` - Token storage (secure)
- `src/hooks/useCalendarSync.ts` - Sync state and triggers
- `src/components/settings/CalendarSettings.tsx` - Connect/settings UI
- `src/components/settings/CalendarSelector.tsx` - Calendar picker
- `src-tauri/src/oauth.rs` - Deep link handling for OAuth
- Update `src/App.tsx` - Trigger sync on launch

## Acceptance Criteria
- [ ] Can connect Google account via OAuth
- [ ] Tokens stored securely and refresh automatically
- [ ] Events fetched for next 7 days on app launch
- [ ] Meeting objects created from calendar events
- [ ] Existing Meetings updated when events change
- [ ] User notes and tags preserved during sync
- [ ] Deleted events marked but not removed
- [ ] Periodic sync runs every 15 minutes
- [ ] Manual refresh button works
- [ ] Can select which calendars to sync
- [ ] Can disconnect Google account
- [ ] Meetings appear in daily note view for that day
