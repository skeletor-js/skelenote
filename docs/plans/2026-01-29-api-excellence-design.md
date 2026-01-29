# API Excellence Design (v0.6)

> Design document for making Skelenote's API top-notch for headless productivity.

**Date:** 2026-01-29
**Status:** Approved

---

## Goals

1. **REST API Completeness** - Full CRUD with proper HTTP semantics
2. **MCP Protocol Compliance** - Full MCP 1.0 spec support
3. **Batch Operations** - Bulk create/update/delete, import/export
4. **Discovery & Intelligence** - Orphans, unlinked mentions, random note

---

## Phase 1: REST API Completeness

### Route Structure

All REST endpoints under `/api/v1` prefix for versioning:

```
Notes
  GET    /api/v1/notes              List notes (paginated)
  POST   /api/v1/notes              Create note
  GET    /api/v1/notes/:id          Get note by UUID
  PUT    /api/v1/notes/:id          Update note
  DELETE /api/v1/notes/:id          Delete note
  GET    /api/v1/notes/:id/backlinks   Get backlinks
  GET    /api/v1/notes/:id/related     Get related notes

Search
  GET    /api/v1/search             Search with query params
  POST   /api/v1/search/advanced    Advanced filtered search

Tasks
  GET    /api/v1/tasks              List tasks (filterable)
  PATCH  /api/v1/tasks/:note_id/:line  Toggle task

Daily
  GET    /api/v1/daily              Today's daily note
  GET    /api/v1/daily/:date        Daily by date

Files
  GET    /api/v1/files/*path        Read file
  PUT    /api/v1/files/*path        Write file
  DELETE /api/v1/files/*path        Delete file
  GET    /api/v1/dirs/*path         List directory

Meta
  GET    /api/v1/tags               All tags with counts
  GET    /api/v1/graph              Note graph
  GET    /api/v1/stats              Vault statistics
```

### Response Formats

**Single Resource:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "inbox/my-note.md",
  "title": "My Note",
  "content": "# My Note\n\nContent here...",
  "tags": ["work", "important"],
  "created": "2026-01-29T10:00:00Z",
  "updated": "2026-01-29T14:30:00Z"
}
```

**Collection (Paginated):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Note with ID '...' not found"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

### Headers

- `X-Total-Count` - Total items in collection
- `Link` - Pagination (RFC 5988)
- `Content-Type: application/json`

### OpenAPI Integration

Using `utoipa` crate for auto-generated OpenAPI spec:

- Swagger UI at `/docs`
- OpenAPI JSON at `/api/v1/openapi.json`
- All types annotated with `#[derive(ToSchema)]`
- All handlers annotated with `#[utoipa::path(...)]`

---

## Phase 2: MCP Protocol Compliance

### JSON-RPC 2.0 Transport

Full MCP 1.0 compliance at `/mcp`:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_notes",
    "arguments": { "query": "meeting" }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "..." }]
  }
}
```

### Resources

Expose vault as browsable resources:

- `skelenote://notes/` - All notes
- `skelenote://notes/{id}` - Single note
- `skelenote://files/{path}` - File content
- `skelenote://tags/` - Tag list

### Prompts

Pre-built prompt templates:

- `summarize_note` - Summarize a note's content
- `find_related` - Find related notes and explain connections
- `daily_review` - Review today's tasks and notes
- `weekly_summary` - Summarize week's activity

### Enhanced Tool Descriptions

Each tool includes:
- Detailed description
- Input schema with field descriptions
- Examples of usage
- Category grouping

---

## Phase 3: Batch Operations

### Bulk CRUD

```
POST /api/v1/batch
```

Body:
```json
{
  "operations": [
    { "op": "create", "data": { "title": "Note 1", "content": "..." } },
    { "op": "update", "id": "...", "data": { "tags": ["new"] } },
    { "op": "delete", "id": "..." }
  ]
}
```

Response:
```json
{
  "results": [
    { "success": true, "id": "...", "path": "..." },
    { "success": true, "id": "..." },
    { "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
  ]
}
```

### Import/Export

**Export:**
```
POST /api/v1/export
{ "format": "json" | "zip", "paths": ["optional/filter"] }
```

**Import:**
```
POST /api/v1/import
Content-Type: multipart/form-data
```

### Tag Operations

- `PUT /api/v1/tags/:tag` - Rename tag vault-wide
- `POST /api/v1/tags/merge` - Merge source into target
- `DELETE /api/v1/tags/:tag` - Remove from all notes

---

## Phase 4: Discovery & Intelligence

### New Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/notes/orphans` | Notes with no links in or out |
| `GET /api/v1/notes/:id/unlinked` | Text matching note titles (potential links) |
| `GET /api/v1/notes/recent` | Recently modified notes |
| `GET /api/v1/notes/random` | Random note for serendipity |

### Enhanced Statistics

Extend `/api/v1/stats`:

```json
{
  "total_notes": 156,
  "total_tasks": 42,
  "total_backlinks": 234,
  "indexed_embeddings": 150,
  "total_words": 45000,
  "avg_note_length": 288,
  "avg_links_per_note": 1.5,
  "tags_distribution": { "work": 45, "personal": 30, ... },
  "notes_by_month": { "2026-01": 12, "2025-12": 8, ... }
}
```

---

## File Structure

New files to create:

```
src/
  api/
    mod.rs          # Router, OpenAPI setup
    types.rs        # Response types, error handling
    notes.rs        # Notes CRUD handlers
    search.rs       # Search handlers
    tasks.rs        # Tasks handlers
    daily.rs        # Daily note handlers
    files.rs        # File operations
    meta.rs         # Tags, graph, stats
    batch.rs        # Bulk operations
    transfer.rs     # Import/export
    tags.rs         # Tag management
    discovery.rs    # Orphans, recent, random
    pagination.rs   # Pagination helpers
  mcp/
    mod.rs          # MCP router
    jsonrpc.rs      # JSON-RPC 2.0 transport
    tools.rs        # Tool definitions (refactored)
    resources.rs    # MCP resources
    prompts.rs      # MCP prompts
```

---

## Dependencies

Add to `Cargo.toml`:

```toml
utoipa = { version = "5", features = ["axum_extras"] }
utoipa-swagger-ui = { version = "8", features = ["axum"] }
```

---

## Implementation Order

1. Phase 1: REST API (foundation for everything else)
2. Phase 2: MCP Compliance (AI integration focus)
3. Phase 3: Batch Operations (power user features)
4. Phase 4: Discovery (intelligence layer)
