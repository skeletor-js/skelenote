# Skelenote Tasks

> **This file is the single source of truth for all work.**
> Nothing gets implemented without being documented here first.

## Rules

1. **Every task goes here BEFORE execution**
2. **No work happens unless it's in this file**
3. **New ideas/suggestions must be added here before implementation**
4. **Update status as work progresses**
5. **Move completed tasks to `COMPLETED_TASKS.md`** after finishing a feature/section

## Task Format

Write tasks like you're explaining to a junior dev:

```text
BAD: "add authentication"

GOOD:
- [ ] Create /api/auth/login endpoint
  - Accepts POST with {email, password}
  - Returns JWT token on success
  - Returns 401 with error message on fail
  - Add tests in /api/auth/login.test.ts
```

## Status Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Completed
- `[!]` - Blocked (add reason)

---

## Active Tasks

None.

---

## Backlog

### v0.5 — Production Readiness

> Future work to make Skelenote production-ready.

- [ ] Add integration tests for sync workflow
  - Test two clients syncing via relay
  - Test disconnect/reconnect with history replay
  - Test concurrent edit merging

- [ ] Add sync UI indicators in note list
  - Show sync status icon per note (✓/↑/⟳)
  - Update status in real-time during sync

- [ ] Connect TUI to sync transport
  - Start sync connection on vault unlock
  - Send local edits to relay/peers
  - Apply remote updates and refresh UI

- [ ] Add sync settings to config
  - Enable/disable sync
  - Relay server URL
  - P2P discovery toggle

### v0.6 — API Excellence

> Top-notch headless API for maximum interoperability.

#### Phase 1: REST API Completeness

- [ ] Add `utoipa` and `utoipa-swagger-ui` dependencies
  - File: `Cargo.toml`
  - Add `utoipa = { version = "5", features = ["axum_extras"] }`
  - Add `utoipa-swagger-ui = { version = "8", features = ["axum"] }`

- [ ] Create API response types with OpenAPI annotations
  - File: `src/api/types.rs` (new)
  - `NoteResponse` struct with `#[derive(ToSchema)]`
  - `PaginatedResponse<T>` with page, per_page, total, total_pages
  - `ErrorResponse` with code and message fields
  - `ApiError` enum: NotFound, ValidationError, Conflict, InternalError

- [ ] Add notes CRUD endpoints
  - File: `src/api/notes.rs` (new)
  - `GET /api/v1/notes` - list notes, params: page, per_page, tag, sort
  - `POST /api/v1/notes` - create note, body: title, content, tags, folder
  - `GET /api/v1/notes/:id` - get by UUID
  - `PUT /api/v1/notes/:id` - update note
  - `DELETE /api/v1/notes/:id` - delete note
  - `GET /api/v1/notes/:id/backlinks` - get backlinks
  - `GET /api/v1/notes/:id/related` - get semantically related

- [ ] Add search endpoints
  - File: `src/api/search.rs` (new)
  - `GET /api/v1/search` - query params: q, semantic, limit
  - `POST /api/v1/search/advanced` - body: query, tags[], after, before, links_to

- [ ] Add tasks endpoints
  - File: `src/api/tasks.rs` (new)
  - `GET /api/v1/tasks` - list tasks, params: filter (today/week/overdue/all)
  - `PATCH /api/v1/tasks/:note_id/:line` - toggle task status

- [ ] Add daily note endpoints
  - File: `src/api/daily.rs` (new)
  - `GET /api/v1/daily` - get today's daily note (create if missing)
  - `GET /api/v1/daily/:date` - get daily by date (YYYY-MM-DD)

- [ ] Add files endpoints
  - File: `src/api/files.rs` (new)
  - `GET /api/v1/files/*path` - read file content
  - `PUT /api/v1/files/*path` - write file content
  - `DELETE /api/v1/files/*path` - delete file
  - `GET /api/v1/dirs/*path` - list directory

- [ ] Add meta endpoints
  - File: `src/api/meta.rs` (new)
  - `GET /api/v1/tags` - list all tags with counts
  - `GET /api/v1/graph` - get note graph (nodes + edges)
  - `GET /api/v1/stats` - vault statistics

- [ ] Wire up OpenAPI and Swagger UI
  - File: `src/api/mod.rs` (new)
  - Create `ApiDoc` struct with `#[derive(OpenApi)]`
  - Register all paths and schemas
  - Mount Swagger UI at `/docs`
  - Mount OpenAPI JSON at `/api/v1/openapi.json`

- [ ] Add pagination helpers
  - File: `src/api/pagination.rs` (new)
  - `Pagination` extractor from query params
  - `Link` header builder (RFC 5988)
  - `X-Total-Count` header injection

- [ ] Refactor mcp.rs to use new API module
  - Keep MCP endpoints at `/mcp/*`
  - REST API at `/api/v1/*`
  - Share handler logic via Vault methods

#### Phase 2: MCP Protocol Compliance

- [ ] Implement MCP 1.0 JSON-RPC transport
  - File: `src/mcp/jsonrpc.rs` (new)
  - Parse JSON-RPC 2.0 requests (id, method, params)
  - Return JSON-RPC responses with result or error
  - Support batch requests

- [ ] Add MCP resources support
  - File: `src/mcp/resources.rs` (new)
  - `resources/list` - list vault folders as resources
  - `resources/read` - read resource content
  - Resource URIs: `skelenote://notes/`, `skelenote://files/`

- [ ] Add MCP prompts support
  - File: `src/mcp/prompts.rs` (new)
  - `prompts/list` - list available prompts
  - `prompts/get` - get prompt with arguments
  - Built-in: "summarize_note", "find_related", "daily_review"

- [ ] Improve tool descriptions for AI
  - File: `src/mcp/tools.rs` (refactor from mcp.rs)
  - Add `examples` field to each tool
  - Add `inputSchema` with detailed descriptions
  - Group tools by category

#### Phase 3: Batch Operations

- [ ] Add batch CRUD endpoint
  - File: `src/api/batch.rs` (new)
  - `POST /api/v1/batch` - body: operations[]
  - Each operation: { op: "create"|"update"|"delete", data: {...} }
  - Returns: results[] with success/error per operation
  - Transaction-like: continue on error, report all results

- [ ] Add import/export endpoints
  - File: `src/api/transfer.rs` (new)
  - `POST /api/v1/export` - body: { format: "json"|"zip", paths?: [] }
  - `POST /api/v1/import` - multipart upload of archive
  - JSON format: { notes: [...], files: [...] }

- [ ] Add tag management endpoints
  - File: `src/api/tags.rs` (new)
  - `PUT /api/v1/tags/:tag` - rename tag (body: { new_name })
  - `POST /api/v1/tags/merge` - body: { source: "old", target: "new" }
  - `DELETE /api/v1/tags/:tag` - remove tag from all notes

#### Phase 4: Discovery & Intelligence

- [ ] Add orphan notes endpoint
  - File: `src/api/discovery.rs` (new)
  - `GET /api/v1/notes/orphans` - notes with no inbound or outbound links
  - Add `get_orphan_notes()` to Index

- [ ] Add unlinked mentions endpoint
  - `GET /api/v1/notes/:id/unlinked` - text matching other note titles
  - Scan content for potential wikilinks
  - Return: [{ text, potential_target, line }]

- [ ] Add recent notes endpoint
  - `GET /api/v1/notes/recent` - sorted by updated desc
  - Params: limit, since (datetime)

- [ ] Add random note endpoint
  - `GET /api/v1/notes/random` - serendipity discovery
  - Optional: exclude recently viewed

- [ ] Add vault statistics endpoint enhancements
  - Extend `GET /api/v1/stats` with:
  - Total word count, average note length
  - Link density (links per note)
  - Tag distribution histogram
  - Notes created per day/week/month
