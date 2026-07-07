# Claude Code Config Guide

> Since JSON doesn't support comments, this file documents all Claude Code config files.

## Config File Hierarchy

Settings are merged from most specific to least specific. Project settings override global settings.

| File | Scope | Committed? | Purpose |
|------|-------|------------|---------|
| `.claude/settings.local.json` | Project | No (gitignored) | Your personal project permissions & MCP |
| `.claude/settings.json` | Project | Yes | Shared hooks & settings for all contributors |
| `~/.claude/settings.local.json` | Global | N/A | Your default permissions & MCP for all projects |
| `~/.claude/settings.json` | Global | N/A | Your global permissions & enabled plugins |
| `~/.claude/config.json` | Global | N/A | API key approvals |
| `.mcp.json` | Project | Optional | MCP server definitions for this project |
| `~/.mcp.json` | Global | N/A | MCP server definitions for all projects |

---

## Project Config: `.claude/settings.json`

This file is **committed to git** and shared with all contributors.

```jsonc
{
  // Hooks run shell commands at specific lifecycle events
  "hooks": {
    // Run BEFORE Edit or Write tools execute
    "PreToolUse": [
      {
        "matcher": "Edit|Write",  // Regex pattern for which tools trigger this
        "hooks": [
          {
            "type": "command",
            "command": "pnpm lint --quiet 2>/dev/null || true"
          }
        ]
      }
    ],

    // Run AFTER Edit or Write tools execute
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            // Only typecheck .ts/.tsx files, show first 20 errors
            "command": "if [[ \"$CLAUDE_FILE\" == *.ts || \"$CLAUDE_FILE\" == *.tsx ]]; then pnpm exec tsc --noEmit 2>&1 | head -20 || true; fi"
          }
        ]
      }
    ],

    // Run when Claude session ends (user types /stop or exits)
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pnpm format 2>/dev/null || true"
          }
        ]
      }
    ],

    // Run when a new Claude session starts
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            // Show git context at session start
            "command": "echo '=== Git Status ===' && git status --short && echo '' && echo '=== Recent Commits ===' && git log --oneline -3"
          }
        ]
      }
    ]
  }
}
```

### Available Hook Events

| Event | When it runs |
|-------|--------------|
| `PreToolUse` | Before a tool executes (can block execution) |
| `PostToolUse` | After a tool completes |
| `SessionStart` | When a new session begins |
| `Stop` | When session ends |
| `Notification` | When Claude sends a notification |

### Hook Environment Variables

- `$CLAUDE_FILE` - The file being edited (for Edit/Write hooks)
- `$CLAUDE_TOOL` - The tool being used

---

## Project Config: `.claude/settings.local.json`

This file is **gitignored** and contains your personal settings for this project.

```jsonc
{
  "permissions": {
    // Commands that run without asking for confirmation
    "allow": [
      "Bash(git add:*)",      // Allow any git add command
      "Bash(git commit:*)",   // Allow any git commit command
      "Bash(pnpm lint:*)",    // Allow any pnpm lint command
      "Skill(commit)",        // Allow the /commit skill
      "Skill(commit:*)"       // Allow /commit with any args
    ]
  },

  // Auto-enable all MCP servers defined in project .mcp.json
  "enableAllProjectMcpServers": true,

  // Explicitly enable these MCP servers from ~/.mcp.json
  "enabledMcpjsonServers": [
    "cloudflare-workers-bindings",
    "cloudflare-workers-builds"
  ]
}
```

### Permission Pattern Format

```
Tool(command:args)
```

Examples:
- `Bash(git add:*)` - Any `git add` command
- `Bash(npm install)` - Exactly `npm install` (no args)
- `Skill(commit)` - The /commit skill with no args
- `Skill(commit:*)` - The /commit skill with any args

---

## Global Config: `~/.claude/settings.json`

Your personal settings that apply to ALL projects (unless overridden).

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(open:*)"  // Allow opening files/URLs on macOS
    ]
  },

  // Plugins you've enabled globally
  "enabledPlugins": {
    "frontend-design@claude-code-plugins": true,
    "security-guidance@claude-plugins-official": true,
    "skill-creator@daymade-skills": true
  }
}
```

---

## Global Config: `~/.claude/settings.local.json`

Your personal defaults for MCP servers and permissions.

```jsonc
{
  "permissions": {
    "allow": [],   // Auto-approved commands
    "deny": [],    // Always-blocked commands
    "ask": []      // Always-prompt commands (overrides allow)
  },

  // Auto-enable project MCP servers
  "enableAllProjectMcpServers": true,

  // MCP servers to enable by default (from ~/.mcp.json)
  "enabledMcpjsonServers": [
    "mantine",
    "cloudflare-workers-bindings",
    "cloudflare-workers-builds",
    "context7"
  ]
}
```

---

## MCP Config: `~/.mcp.json`

MCP (Model Context Protocol) servers provide Claude with external tools.

```jsonc
{
  "mcpServers": {
    // Mantine UI component documentation
    "mantine": {
      "command": "npx",
      "args": ["@hakxel/mantine-ui-server"],
      "env": {
        "MANTINE_VERSION": "8.3.10"
      }
    },

    // Cloudflare Workers bindings (KV, R2, D1, etc.)
    "cloudflare-workers-bindings": {
      "command": "npx",
      "args": ["mcp-remote", "https://bindings.mcp.cloudflare.com/sse"]
    },

    // Cloudflare Workers build logs
    "cloudflare-workers-builds": {
      "command": "npx",
      "args": ["mcp-remote", "https://builds.mcp.cloudflare.com/sse"]
    },

    // Context7 - up-to-date library documentation
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

### MCP Server Activation

MCP servers defined in `.mcp.json` files are NOT automatically active. You must enable them via:

1. `enableAllProjectMcpServers: true` in settings - enables all servers in project `.mcp.json`
2. `enabledMcpjsonServers: ["server-name"]` - explicitly enable specific servers

---

## Global Config: `~/.claude/config.json`

Internal config for API key approvals. Generally don't edit manually.

```jsonc
{
  "customApiKeyResponses": {
    "approved": [
      "session-id-1",
      "session-id-2"
    ]
  }
}
```

---

## Quick Reference

### Add a new auto-approved command

Edit `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(your-command:*)"
    ]
  }
}
```

### Add a new MCP server

1. Define it in `~/.mcp.json` (global) or `.mcp.json` (project)
2. Enable it in `settings.local.json` via `enabledMcpjsonServers`

### Add a hook for all contributors

Edit `.claude/settings.json` (committed to git):
```json
{
  "hooks": {
    "PostToolUse": [...]
  }
}
```

### Debug config issues

1. Check JSON syntax: `node -e "JSON.parse(require('fs').readFileSync('file.json'))"`
2. Start fresh session to reload configs
3. Check MCP server is both defined AND enabled

---

## Directory Structure

The `.claude/` directory contains:

```
.claude/
├── settings.json          # Shared hooks (committed)
├── settings.local.json    # Personal permissions (gitignored)
├── CONFIG-GUIDE.md        # This documentation
├── rules/                 # Persistent rules (auto-loaded)
│   ├── git-workflow.md
│   ├── code-quality.md
│   ├── testing-standards.md
│   └── design-system.md
├── skills/                # Invocable skills (/skill-name)
│   ├── commit/SKILL.md
│   ├── security/SKILL.md
│   └── ...
└── agents/                # Specialized agents (via Task tool)
    ├── security-auditor.md
    ├── docs-maintainer.md
    └── ...
```

---

## Rules

Rules in `.claude/rules/` are persistent instructions that apply to all conversations. They're automatically loaded when Claude starts.

| Rule | Purpose |
|------|---------|
| `git-workflow.md` | Branch naming, commit format, PR workflow |
| `code-quality.md` | TypeScript standards, imports, anti-patterns |
| `testing-standards.md` | Vitest conventions, mock patterns |
| `design-system.md` | Mantine, colors, "cozy rationalism" aesthetic |

---

## Skills

Skills in `.claude/skills/*/SKILL.md` are invoked with `/skill-name` or via the Skill tool.

### Categories

**Git & Version Control:** commit, branch, pr, sync, merge-main, cleanup, commit-skip

**Development:** dev, check, lint, test, build

**Code Generation:** component, hook, context, type, tauri-command, mobile, test-file

**Agent Wrappers:** security, docs, architecture, ux, tests

**Release:** release, ship, squash, changelog

---

## Agents

Agents in `.claude/agents/*.md` are specialized assistants invoked via the Task tool.

| Agent | Model | Purpose |
|-------|-------|---------|
| `security-auditor` | Opus | Security reviews, OWASP compliance |
| `docs-maintainer` | Opus | Documentation updates |
| `architect-reviewer` | Opus | Architecture and design patterns |
| `test-generator` | Opus | Comprehensive test generation |
| `frontend-design-expert` | Opus | UI/UX with Mantine |
| `ux-design-specialist` | Opus | User research, accessibility |
| `tauri-engineer` | Opus | Rust backend, IPC, native |

---

## MCP Servers

Available MCP servers for this project:

| Server | Purpose |
|--------|---------|
| **Mantine** | UI component docs via `mcp__mantine__*` tools |
| **Context7** | Library docs via `mcp__context7__*` tools |
| **Playwright** | Browser automation via `mcp__playwright__*` tools |
