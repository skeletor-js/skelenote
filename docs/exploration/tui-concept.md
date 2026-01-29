# Skelenote v2: Headless Productivity Backend

> **Status**: Exploratory concept — awaiting feedback  
> **Branch**: `explore/tui-markdown-notes`  
> **Date**: 2026-01-28

## The Vision

**A headless productivity backend for the AI era.** We provide the core engine; users bring their own frontend.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SKELENOTE CORE (Rust)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Markdown │ │ Backlink │ │  Task    │ │ Vector Embeddings│   │
│  │  Parser  │ │  Index   │ │ Manager  │ │  (Local ML)      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  E2E     │ │  Sync    │ │  Daily   │ │    Templates     │   │
│  │ Crypto   │ │  Relay   │ │  Notes   │ │                  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                         MCP SERVER                              │
│        (Universal interface for any AI agent or frontend)       │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │   TUI    │  │  Custom  │  │  Claude  │  │    Mobile    │
    │(Default) │  │   GUI    │  │  Agent   │  │   Capture    │
    └──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

**The differentiator**: No other notes app exposes an MCP server as the primary interface. Users can ask Claude to build them a custom React UI that talks to their notes via MCP. The TUI is just the default.

---

## What We Keep (Salvageable)

### From Rust Backend (~80% reusable)

| Module | Current | Action |
|--------|---------|--------|
| **Crypto** | BIP39, XChaCha20, Stronghold | ✅ Port directly |
| **Network** | mDNS, TCP server, pairing | ✅ Keep for local sync |
| **Relay** | WebSocket sync relay | ✅ Keep for mobile capture |

### From TypeScript (~40% logic reusable)

| Module | Current | Action |
|--------|---------|--------|
| **Semantic Search** | Embeddings, vector index, chunker | 🔄 Port to Rust |
| **Backlink Index** | O(1) backlink lookups | 🔄 Port to Rust |
| **Task Recurrence** | Clone-forward logic | 🔄 Port to Rust |
| **Daily Notes** | Deterministic IDs, templates | 🔄 Port to Rust |
| **Templates** | Placeholder expansion | 🔄 Port to Rust |
| **Import/Export** | Markdown parsers | 🔄 Already markdown-native |

### What We Drop

| Module | Reason |
|--------|--------|
| React/Mantine UI | Replaced by TUI default + user-built frontends |
| BlockNote editor | Markdown is the format |
| Loro CRDT | Plain files + git = simpler conflict model |
| 12 React Contexts | No React |
| Complex mobile build | Capture via relay instead |

---

## Architecture Deep Dive

### Data Format: Markdown + YAML Frontmatter

```markdown
---
id: note-2026-01-28-skelenote-pivot
title: Skelenote v2 Vision
type: note
tags: [skelenote, architecture]
created: 2026-01-28T17:55:00-07:00
updated: 2026-01-28T18:30:00-07:00
backlinks: []          # Auto-populated by index
---

# Skelenote v2 Vision

This is the main content as standard markdown.

## Tasks within notes

- [ ] Build prototype  @due(2026-02-01)  @project(skelenote)
- [x] Research TUI frameworks
- [ ] Test MCP integration  @priority(high)

## Wikilinks

See [[daily/2026-01-28]] for today's notes.
Related: [[projects/skelenote]]
```

### Task Detection Pattern

Global task manager scans all markdown files for:

```
- [ ] uncompleted task
- [x] completed task
- [/] in-progress task (custom)

# Optional inline metadata:
@due(YYYY-MM-DD)
@priority(high|medium|low)
@project(name)
@area(name)
@recurrence(daily|weekly|monthly)
```

**No separate task type**—tasks live inside notes. This is how developers actually work.

### Backlink System

1. **Wikilinks**: `[[path/to/note]]` creates bidirectional link
2. **Index**: SQLite table maps target → sources
3. **Auto-update**: File watcher triggers re-index on save
4. **Frontmatter sync**: Optional `backlinks: []` field populated by index

### Directory Structure

```
~/notes/                      # Or custom vault path
├── .skelenote/               # Hidden config + cache
│   ├── config.toml           # User settings
│   ├── index.db              # SQLite: FTS5 + embeddings + backlinks
│   ├── keys/                 # Encrypted Skeleton Key (Stronghold)
│   └── templates/            # Template files
├── daily/                    # Daily notes
│   └── 2026-01-28.md
├── inbox/                    # Quick captures
│   └── untriaged.md
├── projects/                 # Project notes
│   └── skelenote.md
├── areas/                    # Areas of responsibility
└── archive/                  # Soft-deleted notes
```

---

## Mobile Quick Capture

Since we're not building native mobile apps:

### Option A: Encrypted Relay (Preferred)

```
┌────────────┐     HTTPS     ┌────────────┐    WebSocket   ┌────────────┐
│   Mobile   │ ────────────▶ │   Relay    │ ◀────────────▶ │  Desktop   │
│   PWA      │               │  Server    │                │   Client   │
└────────────┘               └────────────┘                └────────────┘
                                   │
                            E2E encrypted
                            (Skeleton Key)
```

1. User opens `https://capture.skelenote.com` (PWA)
2. Authenticates with Skeleton Key fingerprint + device pairing
3. Types quick capture note
4. Encrypted, sent to relay
5. Desktop client pulls on reconnect
6. Also: LLMs can access via relay (authenticated)

### Option B: Email/Telegram Capture

- Send email to `yourkey@capture.skelenote.com`
- Or message a Telegram bot
- Decrypted on server, forwarded to relay

### Option C: Local Network Only

- Scan QR on mobile to connect when on same WiFi
- Use existing P2P sync code
- No cloud dependency

---

## MCP Server Interface

The core differentiator. Every feature accessible via MCP.

```json
{
  "tools": [
    {
      "name": "search_notes",
      "description": "Semantic or keyword search across all notes",
      "parameters": {
        "query": "string",
        "semantic": "boolean (default: true)",
        "limit": "number (default: 10)",
        "type": "string (note|task|daily)",
        "tag": "string"
      }
    },
    {
      "name": "read_note",
      "description": "Read a note by path or ID",
      "parameters": {
        "path": "string"
      }
    },
    {
      "name": "create_note",
      "description": "Create a new note",
      "parameters": {
        "title": "string",
        "content": "string",
        "folder": "string (default: inbox)",
        "tags": "string[]",
        "template": "string"
      }
    },
    {
      "name": "edit_note",
      "description": "Edit an existing note",
      "parameters": {
        "path": "string",
        "content": "string",
        "append": "boolean"
      }
    },
    {
      "name": "list_tasks",
      "description": "List tasks across all notes",
      "parameters": {
        "status": "string (todo|done|all)",
        "due": "string (today|week|overdue)",
        "project": "string",
        "priority": "string"
      }
    },
    {
      "name": "toggle_task",
      "description": "Toggle a task's completion status",
      "parameters": {
        "note_path": "string",
        "task_line": "number"
      }
    },
    {
      "name": "get_backlinks",
      "description": "Get all notes linking to a target",
      "parameters": {
        "path": "string"
      }
    },
    {
      "name": "get_daily_note",
      "description": "Get or create today's daily note",
      "parameters": {
        "date": "string (YYYY-MM-DD, default: today)"
      }
    },
    {
      "name": "quick_capture",
      "description": "Append to inbox or daily note",
      "parameters": {
        "content": "string",
        "target": "string (inbox|daily)"
      }
    }
  ],
  "resources": [
    {
      "name": "vault",
      "description": "The notes vault directory",
      "uri": "skelenote://vault"
    },
    {
      "name": "config",
      "description": "Skelenote configuration",
      "uri": "skelenote://config"
    }
  ]
}
```

### AI Agent Use Cases

1. **Research assistant**: "Search my notes for everything related to CRDT sync"
2. **Meeting prep**: "Create a note for my 1:1 with Jordan, pull in related tasks"
3. **Weekly review**: "List all tasks due this week, grouped by project"
4. **Journaling**: "Append today's highlights to my daily note"
5. **Custom UI**: "Build me a React dashboard that shows my tasks and recent notes"

---

## TUI Design (Default Frontend)

Built with Ratatui (Rust):

```
┌─ Skelenote ──────────────────────────────────────────────────────┐
│ ┌─ Sidebar ────────┐ ┌─ Content ───────────────────────────────┐ │
│ │ 📅 Daily         │ │ # Skelenote v2 Vision                   │ │
│ │ 📥 Inbox (3)     │ │                                         │ │
│ │ ✅ Tasks         │ │ ## The Core Idea                        │ │
│ │ ─────────────────│ │                                         │ │
│ │ 📁 Projects      │ │ A headless productivity backend...      │ │
│ │   └─ skelenote   │ │                                         │ │
│ │   └─ freelance   │ │ ## Tasks                                │ │
│ │ 📁 Areas         │ │ - [ ] Build prototype  @due(02-01)      │ │
│ │   └─ health      │ │ - [x] Research TUI frameworks           │ │
│ │ 📁 Archive       │ │ - [ ] Test MCP integration              │ │
│ │                  │ │                                         │ │
│ │ ─────────────────│ │ ## Backlinks                            │ │
│ │ 🔍 Search...     │ │ ← [[daily/2026-01-28]]                  │ │
│ └──────────────────┘ └─────────────────────────────────────────┘ │
│ [j/k] navigate  [enter] open  [n] new  [/] search  [?] help     │
└──────────────────────────────────────────────────────────────────┘
```

### Key Bindings

| Key | Action |
|-----|--------|
| `j/k` | Navigate up/down |
| `h/l` | Collapse/expand, back/forward |
| `enter` | Open note in editor (`$EDITOR`) |
| `n` | New note |
| `t` | New task |
| `/` | Search (fuzzy → semantic) |
| `g d` | Go to daily note |
| `g t` | Go to tasks view |
| `g i` | Go to inbox |
| `?` | Help |
| `q` | Quit |

---

## Encryption Model

Same as current Skelenote, simplified:

```
24-word Mnemonic ("Skeleton Key")
    │
    ▼ BIP39
Master Key (Stronghold)
    │
    ├──▶ Sync Key (HKDF) ──▶ Encrypts relay data
    ├──▶ User ID (HKDF)  ──▶ Deterministic across devices
    └──▶ Sign Key (HKDF) ──▶ Device authentication
```

**Encrypted at rest**: Optional per-note encryption via `.gpg` wrapper  
**Encrypted in transit**: Always, via Skeleton Key derived sync key

---

## Tech Stack

```
Rust:
├── ratatui          # TUI framework
├── crossterm        # Terminal abstraction
├── rmcp             # MCP server
├── rusqlite         # FTS5 + vector storage
├── candle / ort     # Local embeddings
├── pulldown-cmark   # Markdown parsing
├── serde_yaml       # YAML frontmatter
├── chacha20poly1305 # Encryption
├── bip39            # Mnemonic generation
├── iota-stronghold  # Secure key storage
├── tokio            # Async runtime
├── axum             # HTTP for relay/API
└── notify           # File watcher for index updates
```

---

## Migration from Skelenote v1

```bash
skelenote migrate --from ~/Library/Application\ Support/skelenote --to ~/notes
```

1. Export all objects as markdown with YAML frontmatter
2. Convert BlockNote JSON → Markdown
3. Map type → folder (tasks stay inline)
4. Rebuild indexes
5. Optional: delete v1 data

---

## Phases

### Phase 1: Core Engine (2-3 weeks)

- [ ] Markdown parser with YAML frontmatter
- [ ] File-based storage with watcher
- [ ] SQLite index (FTS5 + backlinks)
- [ ] Basic MCP server

### Phase 2: TUI + Tasks (2 weeks)

- [ ] Ratatui TUI shell
- [ ] Inline task detection
- [ ] Task views (today, week, overdue)
- [ ] Daily notes

### Phase 3: AI Features (2 weeks)

- [ ] Local embeddings (Nomic or similar)
- [ ] Semantic search
- [ ] Full MCP tool suite

### Phase 4: Sync + Mobile (2 weeks)

- [ ] Port encryption from v1
- [ ] Encrypted relay server
- [ ] Mobile PWA capture

### Phase 5: Polish

- [ ] Migration tool
- [ ] Templates
- [ ] Recurrence
- [ ] Git integration

---

## Open Questions

1. **Sync granularity**: File-level (simple) or chunk-level (complex)?
2. **Conflict resolution**: Last-write-wins or manual merge?
3. **Embedding model**: Nomic? all-MiniLM? Ollama requirement?
4. **Relay hosting**: Self-hosted required, or offer managed?
5. **License**: MIT? AGPL? Proprietary core?

---

## Next Steps

If approved:

1. [ ] Set up new Rust project in this branch
2. [ ] Port crypto module from `src-tauri/src/crypto`
3. [ ] Build markdown parser with frontmatter
4. [ ] Implement basic MCP server
5. [ ] Create minimal TUI shell
