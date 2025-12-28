# API & Automations

> Full REST API for programmatic access + pull-based automation sync for external tools.

---

## 1. Overview

Provide complete programmatic access to Skelenote through two complementary features:

1. **Local REST API** - Full CRUD access to all objects when app is running
2. **Automation Sync** - Pull pending items from external queues when app starts

**User Value:**
- Any action possible in the UI is possible via API
- Build custom integrations, scripts, browser extensions, Raycast commands
- Create notes/tasks from Google Calendar, Fireflies, emails, etc.
- Works with any automation tool (n8n, Zapier, Make, custom scripts)
- Data encrypted the moment it enters Skelenote

---

## 2. Goals

### Primary Goals
- Expose all object operations via REST API
- Support automation sync for queued items when app starts
- Secure API access with mandatory API key
- Work with any tool that can make HTTP requests

### Success Criteria
- All CRUD operations available via API when app is running
- Automation items queued externally are synced on app start
- API responses under 100ms for typical operations
- API key can be regenerated without data loss

### Non-Goals (v1)
- Remote API access (localhost only)
- Outgoing webhooks (Skelenote → external) - add in v2
- OAuth or multi-user authentication
- GraphQL support
- Real-time push notifications

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WHEN APP IS OPEN                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  External Tools (curl, scripts, Raycast, browser extensions)            │
│         │                                                                │
│         ▼ HTTP                                                          │
│  localhost:21547/api/v1/* ◄──── Tauri Rust HTTP Server (Axum)          │
│         │                                                                │
│         ▼                                                                │
│  ObjectStore (Loro) ──► Encrypted with Skeleton Key                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         WHEN APP IS CLOSED                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  External Tools (n8n, Zapier, Make)                                     │
│         │                                                                │
│         ▼                                                                │
│  Queue pending actions in automation tool                               │
│         │                                                                │
│         ▼ (on next app start)                                           │
│  Skelenote pulls queue ──► Processes actions ──► Encrypted storage      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. REST API Specification

### Base Configuration

```
Base URL: http://localhost:21547/api/v1
Authentication: Header `X-API-Key: {key}`
Content-Type: application/json
```

### Health Check

```http
GET /health
```
No authentication required. Returns server status.

### Objects (Core CRUD)

```http
# List objects
GET /objects
GET /objects?type=note
GET /objects?type=task&limit=10&offset=0
GET /objects?inboxed=true

# Get single object
GET /objects/:id

# Create object
POST /objects
{
  "type": "note",
  "title": "Meeting Notes",
  "properties": {
    "date": "2024-01-15"
  },
  "content": "## Agenda\n\n- Item 1",
  "inboxed": false
}

# Update object
PATCH /objects/:id
{
  "title": "Updated Title",
  "properties": {
    "priority": "high"
  }
}

# Delete object
DELETE /objects/:id
```

### Content (Rich Text)

```http
# Get content (returns BlockNote JSON)
GET /objects/:id/content

# Replace content (accepts Markdown or BlockNote JSON)
PUT /objects/:id/content
{
  "format": "markdown",
  "content": "## New Content\n\nParagraph here."
}

# Append to content
PATCH /objects/:id/content
{
  "format": "markdown",
  "content": "\n\n## Appended Section"
}
```

### Inbox

```http
# List inbox items
GET /inbox

# Mark object as processed (remove from inbox)
POST /objects/:id/process
```

### Daily Notes

```http
# Get daily note for date (creates if doesn't exist)
GET /daily-notes/:date

# Create daily note with content
POST /daily-notes/:date
{
  "content": "## Today's Goals\n\n- Goal 1"
}

# Append to daily note
PATCH /daily-notes/:date/content
{
  "content": "\n\n## Evening Reflection"
}
```

### Types

```http
# List all type definitions
GET /types

# Get single type
GET /types/:id
```

### Search

```http
# Full-text search
GET /search?q=meeting+notes

# Search within type
GET /search?q=quarterly&type=note
```

### Bulk Operations

```http
# Create multiple objects
POST /bulk/create
{
  "items": [
    { "type": "task", "title": "Task 1" },
    { "type": "task", "title": "Task 2" }
  ]
}

# Update multiple objects
POST /bulk/update
{
  "items": [
    { "id": "abc123", "properties": { "status": "done" } },
    { "id": "def456", "properties": { "status": "done" } }
  ]
}

# Delete multiple objects
POST /bulk/delete
{
  "ids": ["abc123", "def456"]
}
```

---

## 5. Automation Sync

For actions that occur when Skelenote is closed, external tools queue items that Skelenote fetches on demand.

### Endpoint Specification

```http
GET https://your-endpoint.com/skelenote/pending
Authorization: Bearer {api_key}
```

### Response Format

```json
{
  "items": [
    {
      "id": "unique-item-id",
      "action": "create",
      "type": "note",
      "title": "Meeting: Q4 Planning",
      "properties": {
        "date": "2024-01-15"
      },
      "content": "## Agenda\n\n- Review Q3",
      "source": "google-calendar"
    }
  ],
  "callback_url": "https://your-endpoint.com/skelenote/confirm"
}
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `create` | Create new object |
| `update` | Update existing object (requires `target_id`) |
| `delete` | Delete object (requires `target_id`) |
| `append` | Append content to object (requires `target_id`) |

### Confirmation Callback

```http
POST https://your-endpoint.com/skelenote/confirm
{
  "processed": ["item-id-1", "item-id-2"],
  "failed": []
}
```

---

## 6. Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "object_not_found",
    "message": "Object with ID 'abc123' not found",
    "details": {
      "id": "abc123"
    }
  }
}
```

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Missing/invalid API key |
| 404 | Object or type not found |
| 409 | Conflict (duplicate) |
| 500 | Internal error |

### Error Codes

| Code | Description |
|------|-------------|
| `invalid_request` | Malformed request body |
| `validation_error` | Invalid field values |
| `object_not_found` | Object ID doesn't exist |
| `type_not_found` | Object type doesn't exist |
| `unauthorized` | Missing or invalid API key |
| `internal_error` | Server error |

---

## 7. Data Model

### API Settings (localStorage)

```typescript
interface APISettings {
  enabled: boolean;
  port: number;             // Default: 21547
}
```

### API Key (Stronghold vault)

Stored securely in Tauri's Stronghold, same as Skeleton Key.

### Automation Settings (localStorage)

```typescript
interface AutomationSettings {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  autoSyncOnStart: boolean;
  lastSyncAt: string | null;
}
```

---

## 8. Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src-tauri/src/api/mod.rs` | API module entry |
| `src-tauri/src/api/server.rs` | Axum HTTP server (localhost) |
| `src-tauri/src/api/routes.rs` | Route handlers |
| `src-tauri/src/api/auth.rs` | API key auth middleware |
| `src-tauri/src/api/types.rs` | Request/response types |
| `src/lib/automations/sync.ts` | Automation sync logic |
| `src/lib/automations/types.ts` | Automation types |
| `src/lib/automations/processor.ts` | Process automation items |
| `src/components/settings/APISettings.tsx` | API settings UI |
| `src/components/settings/AutomationSettings.tsx` | Automation settings UI |

### Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/src/lib.rs` | Add API server commands |
| `src-tauri/Cargo.toml` | Add axum, tokio, tower dependencies |
| `src/contexts/ObjectContext.tsx` | Add sync method, expose store for API |
| `src/App.tsx` | Add keyboard shortcuts |
| `src/components/CommandPalette.tsx` | Add API/sync commands |

### Phase 1: Local REST API

1. **Set up Axum server** (`src-tauri/src/api/server.rs`)
   - Bind to localhost only
   - Configure port from settings
   - Graceful shutdown

2. **Implement auth middleware** (`src-tauri/src/api/auth.rs`)
   - Generate API key (crypto-random)
   - Store in Stronghold
   - Validate X-API-Key header

3. **Build route handlers** (`src-tauri/src/api/routes.rs`)
   - Objects CRUD
   - Content endpoints
   - Daily notes
   - Search
   - Bulk operations

4. **Add Tauri commands** (`src-tauri/src/lib.rs`)
   ```rust
   #[tauri::command]
   async fn api_start(port: u16) -> Result<(), String>

   #[tauri::command]
   async fn api_stop() -> Result<(), String>

   #[tauri::command]
   fn api_get_key() -> Result<String, String>

   #[tauri::command]
   fn api_regenerate_key() -> Result<String, String>
   ```

### Phase 2: Automation Sync

5. **Create sync types** (`src/lib/automations/types.ts`)
   - AutomationItem interface
   - AutomationSettings interface
   - SyncState interface

6. **Implement sync function** (`src/lib/automations/sync.ts`)
   - Fetch from endpoint
   - Error handling
   - Confirmation callback

7. **Build processor** (`src/lib/automations/processor.ts`)
   - Convert items to ObjectStore operations
   - Markdown to BlockNote conversion
   - Deduplication

### Phase 3: UI

8. **API settings panel** (`src/components/settings/APISettings.tsx`)
   - Enable/disable toggle
   - Port config
   - API key display (masked)
   - Regenerate button

9. **Automation settings panel** (`src/components/settings/AutomationSettings.tsx`)
   - Endpoint URL
   - API key
   - Auto-sync toggle
   - Sync Now button

10. **Keyboard shortcuts**
    - `Cmd+Shift+A` - Sync automations
    - Add to command palette

---

## 9. UI/UX

### Settings Panel

```
┌─────────────────────────────────────────────────────────┐
│  API & Automations                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LOCAL API                                              │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [x] Enable Local API                                   │
│                                                         │
│  Port: [ 21547 ]         Status: ● Running              │
│                                                         │
│  API Key                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••••••••            [Show] [Copy]│   │
│  └─────────────────────────────────────────────────┘   │
│  [ Regenerate Key ]                                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  AUTOMATION SYNC                                        │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [x] Enable Automation Sync                             │
│                                                         │
│  Endpoint URL                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ https://n8n.example.com/webhook/abc123          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  API Key                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••••••••            [Show] [Copy]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [ ] Sync automatically on app start                    │
│                                                         │
│  [ Sync Now ]              Last synced: 5 min ago (3)   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+A` | Sync Automations |

### Toast Notifications

- **API Started:** "API server running on port 21547"
- **Sync Success:** "Synced 3 items from automations"
- **Sync Empty:** "No pending automation items"
- **Error:** "Sync failed: Unable to reach endpoint"

---

## 10. Security Model

### Data Flow

```
External request (plaintext)
       ↓ localhost only
Tauri Rust API server (validates API key)
       ↓
ObjectStore operations
       ↓
Encrypted with Skeleton Key
       ↓
Stored in Loro (encrypted)
       ↓
Synced to other devices (E2E)
```

### What's Protected

| Layer | Protection |
|-------|------------|
| Network | localhost only (no remote access) |
| Authentication | API key required |
| Storage | Skeleton Key encryption |
| Sync | E2E encryption |

### API Key Storage

- Generated using crypto-random
- Stored in Tauri's Stronghold vault (same security as Skeleton Key)
- Never synced across devices
- Can be regenerated (invalidates existing integrations)

### Automation Endpoint Key

- Stored in localStorage (less sensitive)
- Used to authenticate Skelenote to the external endpoint
- User's responsibility to secure their automation platform

---

## 11. Example Use Cases

### Raycast Extension
```bash
curl -X POST http://localhost:21547/api/v1/objects \
  -H "X-API-Key: $SKELENOTE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "task", "title": "Quick capture from Raycast"}'
```

### Daily Note from CLI
```bash
curl -X PATCH http://localhost:21547/api/v1/daily-notes/2024-01-15/content \
  -H "X-API-Key: $SKELENOTE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"format": "markdown", "content": "\n\n## Evening notes\n\nThoughts..."}'
```

### Browser Extension (Save Link)
```javascript
fetch('http://localhost:21547/api/v1/objects', {
  method: 'POST',
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'link',
    title: document.title,
    properties: { url: window.location.href }
  })
});
```

### n8n Automation Sync
1. Google Calendar trigger → queue item
2. Fireflies trigger → queue item
3. Skelenote syncs on app start → creates notes

---

## 12. Testing Checklist

### API Tests
- [ ] Health endpoint returns 200
- [ ] Unauthorized request returns 401
- [ ] Create object returns 201
- [ ] Get object returns correct data
- [ ] Update object modifies properties
- [ ] Delete object removes from store
- [ ] List objects with filters
- [ ] Content endpoints work with Markdown
- [ ] Daily notes created/updated
- [ ] Search returns matching results
- [ ] Bulk operations succeed
- [ ] Port-in-use handled gracefully

### Automation Sync Tests
- [ ] Fetch from endpoint works
- [ ] Network errors handled
- [ ] Invalid JSON handled
- [ ] Items processed correctly
- [ ] Confirmation callback fires
- [ ] Deduplication works
- [ ] Auto-sync on start works

### Manual QA
- [ ] Enable API in settings
- [ ] Copy API key
- [ ] Regenerate key (confirm dialog)
- [ ] Create object via curl
- [ ] Sync automations via button
- [ ] Sync via keyboard shortcut

---

## 13. Future Considerations

### v2 Features
- **Outgoing webhooks:** Notify external services when Skelenote objects change
- **Auto-sync interval:** Periodic sync (every 5 minutes)
- **Multiple automation endpoints:** Different sources for different types
- **Sync history:** Log of past syncs
- **Rate limiting:** Protect against abuse

### Potential Extensions
- Pre-built Raycast extension
- Browser extension for link saving
- CLI tool for scripting
- VS Code extension
- Mobile quick capture
