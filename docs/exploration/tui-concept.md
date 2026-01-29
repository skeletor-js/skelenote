# Skelenote TUI: An AI-Native Notes System

> **Status**: Exploratory concept  
> **Branch**: `explore/tui-markdown-notes`  
> **Date**: 2026-01-28

## The Thesis

In an AI-native future, a notes app should be:

1. **Plain files** - Markdown with YAML frontmatter, stored in a directory
2. **Terminal-first** - TUI for speed, keyboard-driven workflows
3. **AI-native** - Local vector embeddings, MCP server, agent-friendly
4. **Minimal** - No complex sync protocols, no proprietary formats

The current Skelenote stack (Tauri + React + Loro CRDT + BlockNote + custom sync) may be **over-engineered** for what people actually need.

---

## Current Architecture (Complex)

```
┌─────────────────────────────────────────────────┐
│ Frontend: React + TypeScript + Mantine + Vite   │
├─────────────────────────────────────────────────┤
│ Editor: BlockNote (Prosemirror-based)           │
├─────────────────────────────────────────────────┤
│ State: 12 React Contexts                        │
├─────────────────────────────────────────────────┤
│ Data: Loro CRDT → Custom Binary Format          │
├─────────────────────────────────────────────────┤
│ Sync: mDNS + TCP + WebSocket + QR Pairing       │
├─────────────────────────────────────────────────┤
│ Crypto: XChaCha20 + BIP39 + Stronghold          │
├─────────────────────────────────────────────────┤
│ Shell: Tauri 2.0 (Rust)                         │
└─────────────────────────────────────────────────┘
```

**Lines of code**: ~50,000+  
**Dependencies**: 200+ npm packages, 100+ Rust crates  
**Build time**: Minutes  
**Complexity**: High

---

## Proposed Architecture (Simple)

```
┌─────────────────────────────────────────────────┐
│ TUI: Ratatui (Rust) or Bubble Tea (Go)          │
├─────────────────────────────────────────────────┤
│ Editor: Built-in markdown with vim keybindings  │
├─────────────────────────────────────────────────┤
│ Data: Plain .md files + YAML frontmatter        │
│       ~/notes/                                  │
│       ├── daily/2026-01-28.md                   │
│       ├── projects/skelenote.md                 │
│       └── inbox/quick-thought.md                │
├─────────────────────────────────────────────────┤
│ Search: Local SQLite FTS5 + Vector embeddings   │
├─────────────────────────────────────────────────┤
│ Sync: Git (optional) or Syncthing               │
├─────────────────────────────────────────────────┤
│ AI: MCP Server + Local embedding model          │
└─────────────────────────────────────────────────┘
```

**Lines of code**: ~5,000-10,000  
**Dependencies**: Minimal  
**Build time**: Seconds  
**Complexity**: Low

---

## Why This Makes Sense Now

### 1. AI Agents Prefer Plain Text

AI coding assistants (Claude, Cursor, Windsurf) work best with:

- Plain text files they can read/write
- Git repositories they can navigate
- Standard formats (Markdown, YAML, JSON)

**BlockNote JSON** and **Loro binary** are opaque to AI agents.

### 2. Terminal Workflows Are Rising

The developer workflow is increasingly terminal-centric:

- `nvim` / `helix` for editing
- `tmux` for session management
- `fzf` / `ripgrep` for search
- `git` for versioning
- MCP servers for AI integration

A TUI notes app slots perfectly into this workflow.

### 3. Sync Is Solved

Why build custom P2P sync when:

- **Git** works for versioned notes
- **Syncthing** works for real-time folder sync
- **iCloud/Dropbox** work for non-technical users

Plain files = use any sync solution.

### 4. Mobile Is Optional

For AI-native power users, mobile might not matter. But if needed:

- **Termux** on Android with the same TUI
- **iSH** on iOS (limited)
- **Web companion** (minimal) for mobile capture

---

## Core Features (MVP)

### Must Have

| Feature | Implementation |
|---------|----------------|
| Create/edit notes | Markdown files with YAML frontmatter |
| Organize notes | Directory structure + tags in frontmatter |
| Search notes | SQLite FTS5 for full-text |
| Semantic search | Local embeddings (Ollama + Nomic) |
| Daily notes | Auto-create `daily/YYYY-MM-DD.md` |
| Quick capture | Append to inbox note |
| Vim keybindings | Native TUI support |
| MCP server | Expose notes to AI agents |

### Nice to Have

| Feature | Implementation |
|---------|----------------|
| Git integration | Auto-commit on save |
| Backlinks | Parse [[wikilinks]] |
| Templates | Template files with placeholder expansion |
| Export | Already markdown—no export needed |
| Encryption | GPG for sensitive notes |

### Explicitly Out of Scope

- Real-time collaboration
- Rich text formatting beyond markdown
- Image embedding (link to files instead)
- Complex property schemas
- Custom type systems

---

## Tech Stack Options

### Option A: Rust (Ratatui)

```
Rust ecosystem:
├── ratatui          # TUI framework
├── crossterm        # Terminal abstraction
├── tree-sitter      # Syntax highlighting
├── rusqlite         # SQLite + FTS5
├── candle / ort     # Local ML inference
└── rmcp             # MCP Rust SDK
```

**Pros**: Fast, single binary, memory safe  
**Cons**: Slower iteration, steeper learning curve

### Option B: Go (Bubble Tea)

```
Go ecosystem:
├── bubbletea        # TUI framework
├── glamour          # Markdown rendering
├── bleve            # Full-text search
├── ggml-go          # Local ML inference
└── mcp-go           # MCP Go SDK
```

**Pros**: Fast compilation, simple concurrency  
**Cons**: Less mature ML ecosystem

### Option C: Python (Textual)

```
Python ecosystem:
├── textual          # TUI framework
├── rich             # Terminal formatting
├── sqlite-utils     # SQLite helper
├── sentence-transformers  # Embeddings
└── mcp              # MCP Python SDK
```

**Pros**: Fastest iteration, best ML ecosystem  
**Cons**: Slower runtime, distribution complexity

**Recommendation**: Start with **Rust (Ratatui)** for the final product, but prototype in **Python (Textual)** for speed.

---

## File Format

### Example Note

```markdown
---
id: note-2026-01-28-skelenote-pivot
title: Skelenote TUI Pivot
type: note
tags:
  - skelenote
  - architecture
  - planning
created: 2026-01-28T17:55:00-07:00
updated: 2026-01-28T18:30:00-07:00
---

# Skelenote TUI Pivot

Exploring a radical simplification...

## Key Insights

- Plain files are AI-native
- TUI fits terminal workflows
- Complexity is the enemy

## Next Steps

- [ ] Prototype in Python
- [ ] Test with real notes
- [ ] Gather feedback
```

### Directory Structure

```
~/notes/
├── .skelenote/           # Config and cache
│   ├── config.toml       # User settings
│   ├── index.db          # SQLite FTS + embeddings
│   └── templates/        # Note templates
├── daily/                # Daily notes
│   ├── 2026-01-28.md
│   └── 2026-01-27.md
├── inbox/                # Quick captures
│   └── untriaged.md
├── projects/             # Project notes
│   └── skelenote.md
├── areas/                # Areas of responsibility
│   └── health.md
└── archive/              # Archived notes
    └── old-project.md
```

---

## MCP Server Integration

The notes system exposes an MCP server so AI agents can:

```typescript
// Available MCP tools
{
  "tools": [
    {
      "name": "search_notes",
      "description": "Search notes by keyword or semantic similarity",
      "parameters": {
        "query": "string",
        "semantic": "boolean",
        "limit": "number"
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
        "type": "string",
        "tags": "string[]"
      }
    },
    {
      "name": "append_to_note",
      "description": "Append content to an existing note",
      "parameters": {
        "path": "string",
        "content": "string"
      }
    },
    {
      "name": "list_notes",
      "description": "List notes by type, tag, or date range",
      "parameters": {
        "type": "string",
        "tag": "string",
        "since": "string"
      }
    }
  ]
}
```

This allows AI assistants to:

- Search your notes for context
- Reference existing notes in responses
- Create notes from conversations
- Build on previous thinking

---

## Migration Path

For existing Skelenote users:

1. **Export to Markdown** - Already supported via export system
2. **Frontmatter mapping** - Convert properties to YAML
3. **Directory mapping** - Type → folder structure
4. **Content conversion** - BlockNote JSON → Markdown

Migration script would be straightforward since we control both formats.

---

## Questions to Explore

1. **Would you use this?** Does a TUI notes app fit your workflow?

2. **What's essential?** Which current Skelenote features are must-haves?

3. **Mobile story?** Is mobile access important, or is this desktop/terminal only?

4. **Branding?** Is this still "Skelenote" or a new project?

5. **Open source?** Full open source, or keep some proprietary?

---

## Next Steps

If this direction feels right:

1. [ ] Build a Python prototype with Textual (1-2 days)
2. [ ] Test with real notes migration
3. [ ] Validate MCP integration with Claude
4. [ ] Decide: pivot Skelenote or new project
5. [ ] If pivot: plan deprecation of GUI version

---

## Appendix: Competitive Landscape

| App | Approach | AI Features |
|-----|----------|-------------|
| Obsidian | GUI + Markdown | Plugins only |
| Logseq | GUI + Markdown | Limited |
| Notable | GUI + Markdown | None |
| nb | CLI + Markdown | None |
| Joplin | GUI + Markdown | None |
| **Proposed** | TUI + Markdown | Native MCP + embeddings |

The gap: No TUI-first, AI-native notes app exists yet.
