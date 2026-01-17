# AGENTS.md

> **For AI Coding Assistants** — This file provides context and guidance for AI tools working with this repository.

## Important: GitHub Organization

The GitHub organization is **skeletor-js**. All GitHub URLs should use:

- `https://github.com/skeletor-js/skelenote`

## Build & Development Commands

```bash
pnpm install             # Install dependencies
pnpm tauri dev           # Start dev server with Tauri app (hot reload)
pnpm tauri build         # Build production binaries
pnpm test                # Run tests in watch mode
pnpm test:run            # Run tests once (CI mode)
pnpm lint                # Run ESLint
```

## Git Workflow

**When starting work on main, always create a feature branch first:**

```bash
git checkout -b feature/descriptive-name
```

**Make regular commits as you work.** This maintains cleanliness and provides fallback points if things break. Don't wait until the end to commit everything.

**Branch naming conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation updates

## Project Management (Linear)

Skelenote uses **Linear** for issue tracking and project management.

### Structure

- **Projects**: Maps to releases (e.g., `v0.2 - Exodus`, `v0.35 - Architect`).
- **Epics**: Modeled as **Parent Issues** containing sub-issues.
- **Cycles**: 2-week sprints (enable in Linear team settings if using).

### Key Labels

| Label | Usage |
|-------|-------|
| `Feature` | New functionality (enhancements) |
| `Bug` | Defect fixes |
| `Improvement` | Technical debt, refactoring |
| `competitive-gap` | Features present in competitor apps |
| `package` | Candidates for extraction to OSS packages |

### Workflow

1. **Pick an issue**: Assign yourself to an issue in the current Cycle or Project.
2. **Create a branch**: Use Linear's "Copy git branch name" (Cmd+Shift+.) or format `name/linear-id-title`.
   - Example: `jordan/NOTE-123-add-pdf-export`
3. **Link PR**: Add `Fixes NOTE-123` or `Closes NOTE-123` in PR description to auto-close.

### Skills Available

- `/linear` - Create or update Linear issues
- `/issue` - Context-aware issue search

## CI/CD Pipeline

Skelenote uses GitHub Actions for continuous integration and cross-platform builds. See `docs/developer/ci-cd.md` for complete details.

**Local-First Development:** CI does NOT run on feature branches or PRs. You must validate locally before merging. This reduces GitHub Actions usage significantly.

### Workflows

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `test.yml` | Push to main | Lint (`pnpm lint`), frontend tests (`pnpm test:run`), Rust tests (`cargo test`) on Ubuntu |
| `build.yml` | Push to main | Build for macOS (ARM + Intel), Windows, Linux; upload artifacts |
| `release.yml` | Version tags (`v*`) | Create draft GitHub release with all platform binaries |

### Platform Support

All platforms are fully tested and built in CI:

- **macOS**: ARM64 (Apple Silicon) and x86_64 (Intel) - `.dmg` and `.app`
- **Windows**: x86_64 - `.exe` NSIS installer
- **Linux**: `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), `.AppImage` (universal)

### Before Merging (REQUIRED)

Since CI doesn't run on PRs, you MUST validate locally before merging:

```bash
pnpm lint                  # ESLint
pnpm exec tsc --noEmit     # TypeScript
pnpm test:run              # Frontend tests
cd src-tauri && cargo test # Rust tests
```

Or use the `/check` skill to run all validations at once.

### Creating a Release

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit: `git commit -m "chore: bump version to 0.1.0-alpha.2"`
3. Tag: `git tag v0.1.0-alpha.2`
4. Push: `git push origin main --tags`
5. GitHub Actions creates a draft release automatically
6. Edit and publish the draft release on GitHub

**Note:** Binaries are currently unsigned (alpha). macOS/Windows will show security warnings.

## Important: Frontend & UI Work

**ALWAYS review `docs/design/style-guide.md` before making any UI or frontend changes.** This comprehensive design system defines colors, typography, spacing, component patterns, and interaction behaviors for the Linear-inspired minimal aesthetic.

## Architecture Overview

Skelenote is a local-first, zero-knowledge note-taking app built with **Tauri 2.0** (Rust backend) and **React/TypeScript** frontend.

### Tech Stack

- **Desktop Shell**: Tauri 2.0 (Rust) - handles crypto, P2P networking, file system
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Mantine 8 with custom theme (`src/theme/mantine.ts`)
- **Editor**: BlockNote (rich text with @mentions)
- **Data Layer**: Loro CRDT for conflict-free sync
- **Encryption**: XChaCha20-Poly1305, BIP39 mnemonic ("Skeleton Key")

### Repository Structure

```
skelenote/
├── .github/workflows/      # CI/CD (test, build, release)
├── src/                    # Frontend (React/TypeScript)
│   ├── components/         # React components by feature
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core business logic
│   │   ├── loro/           # CRDT store, object queries, relations
│   │   ├── sync/           # P2P sync client/protocol
│   │   ├── crypto/         # Encryption wrapper (calls Tauri)
│   │   ├── types/          # Type definitions, built-in types
│   │   ├── search/         # Fuzzy + semantic search
│   │   ├── templates/      # Template management
│   │   └── import/         # Notion, Obsidian, Markdown importers
│   ├── theme/              # Mantine theme config
│   └── styles/             # Global CSS, design tokens
│
├── src-tauri/              # Backend (Rust/Tauri)
│   ├── src/
│   │   ├── crypto/         # BIP39, HKDF, XChaCha20, Stronghold
│   │   ├── network/        # mDNS discovery, TCP server/client
│   │   └── lib.rs          # Tauri command handlers
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri config (window, permissions, bundling)
│
├── docs/                   # Documentation
│   ├── design/             # Brand bible, style guide, feature list
│   ├── developer/          # Architecture, API reference
│   └── user/               # User guides, getting started
│
├── vite.config.ts          # Vite build config
├── tsconfig.json           # TypeScript config
├── eslint.config.js        # ESLint rules
└── package.json            # Node dependencies, scripts
```

### Path Aliases

Use `@/` for imports from `src/`:

```typescript
import { useObjects } from '@/contexts';
import { ObjectStore } from '@/lib/loro';
```

### Core Data Model

Everything is a **SkelenoteObject** with a typed schema:

```typescript
interface SkelenoteObject {
  id: string;           // UUID
  typeId: string;       // References TypeDefinition
  properties: Record<string, PropertyValue>;
  hasContent: boolean;  // Has rich text body
  inboxed: boolean;     // In inbox until triaged
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}
```

**Built-in types** (`src/lib/types/built-in-types.ts`): Task, Note, Project, Area, Link, Meeting, Tag, Person, Template. Type IDs are in `BuiltInTypeIds` enum.

### Key Contexts

- **ObjectContext** - CRUD operations via `useObjects()`, provides `store: ObjectStore`
- **NavigationContext** - App navigation, split pane, view state via `useNavigation()`
- **SkeletonKeyContext** - Encryption key state via `useSkeletonKey()`
- **SyncContext** / **LocalSyncContext** - Cloud and P2P sync
- **KeyboardShortcutsContext** - Global hotkey registration

### Data Flow

1. **ObjectContext** creates `LoroDocStore` which manages Loro CRDT documents
2. `ObjectStore` wraps the Loro doc with typed CRUD operations
3. Changes trigger `refreshData()` which increments `dataVersion` and debounces save
4. `docStore.sync()` broadcasts changes to connected peers
5. Data persists to `~/.local/share/skelenote/data/store.loro` (or macOS equivalent)

### UI Conventions

- **Mantine components** - Use Mantine for all UI (Button, Modal, Menu, etc.)
- **Lucide icons** - All icons via lucide-react, mapped in `src/lib/icons.ts`
- **No emojis** - Clean, minimal aesthetic

### Sync Architecture

Two sync modes:

1. **Cloud Relay** - WebSocket to relay server (optional)
2. **Local P2P** - mDNS discovery + direct TCP on local network

Both use the same CRDT merge - Loro handles conflict resolution automatically.

### Rust/Tauri Commands

Frontend calls Rust via `invoke()`. Key command prefixes:

- `crypto_*` - Encryption, key management
- `network_*` - P2P server, discovery, connections
- `device_*` - Device management, revocation

## Development Notes

- Run `pnpm tauri dev` for full app development with hot reload
- TypeScript strict mode enabled with `noUnusedLocals`/`noUnusedParameters`
- BlockNote editor content stored as Loro Text at key `content:<objectId>`

### Testing

Tests use Vitest. Run tests with:

```bash
pnpm test                   # Run all tests in watch mode
pnpm test:run               # Run all tests once (CI mode)
pnpm test -- path/to/test   # Run specific test file
pnpm test:ui                # Run tests with Vitest UI
```

Test files are co-located with source files using `.test.ts` or `.spec.ts` suffix.

**Rust tests:**

```bash
cd src-tauri
cargo test                  # Run all Rust tests
cargo test -- --nocapture   # Show println! output
```

### Debugging

- **Frontend**: Use browser DevTools (Cmd+Option+I in Tauri window)
- **Rust/Tauri**: Add `println!` or use `dbg!` macro, output appears in terminal
- **Loro data**: Inspect at `~/Library/Application Support/com.skelenote.app/data/`
- **Network**: Check mDNS discovery with `dns-sd -B _skelenote._tcp`

## Skelenote Object Lifecycle

### Inbox Workflow

- **New objects enter with `inboxed: true`** - they appear in Inbox until triaged
- **Process an item**: `store.markProcessed(id)` → sets `inboxed: false`
- **Archive an item**: Sets BOTH `archived: true` AND `inboxed: false`
- **Excluded from Inbox**: Tags, Projects, and Areas never appear in Inbox (defined in `EXCLUDED_INBOX_TYPES` in `useInbox.ts`)
- **Daily Notes skip Inbox**: Created with `inboxed: false` since they're auto-generated

### Content vs Properties

- **Properties**: Stored in `object.properties` map (title, status, dueDate, etc.)
- **Content**: Rich text stored separately as Loro Text at `content:<objectId>`
- **Why separate?**: BlockNote content is collaborative text that syncs character-by-character via CRDT
- **Check `hasContent`**: Only objects with `hasContent: true` have content storage initialized

### The `refreshData()` Pattern

After any store mutation, call `refreshData()` to:

1. Increment `dataVersion` counter (triggers React re-renders via dependency)
2. Broadcast CRDT update to connected peers
3. Schedule debounced save to disk (300ms)

## Relation System & @Mentions

### How @Mentions Create Relations

1. User types `@` in BlockNote editor → `MentionSuggestion` shows matching objects
2. Selecting an object inserts a mention block into content:

   ```json
   { "type": "mention", "props": { "objectId": "...", "objectName": "...", "objectTypeId": "..." } }
   ```

3. These mentions are NOT automatically converted to relation properties
4. `extractMentionsFromContent()` recursively scans BlockNote JSON to find all mentions

### Backlinks Are Computed, Not Stored

- `findBacklinks(targetId)` scans ALL objects looking for references
- Checks TWO sources:
  1. Relation properties (explicit links like `project`, `tags`, `area`)
  2. @mentions in content (implicit links)
- Returns array of `{ sourceId, propertyId, propertyName }`

### Linking to Daily Notes

When linking an object to today's daily note (`linkObjectToDaily()`):

1. Sets `dailyNote` relation property on the object
2. Appends a mention block to the daily note's content
3. Creates bidirectional relationship (relation property + content mention)

## Daily Notes System

### Deterministic Daily Note IDs

- Format: `note-{YYYY-MM-DD}` (e.g., `note-2024-12-25`)
- Same date always produces same ID across all devices
- Enables sync without conflicts

### Daily Note Properties

- `typeId`: `built-in:note`
- `isDailyNote`: `true` (distinguishes from regular notes)
- `inboxed`: `false` (skip inbox)
- `date`: Timestamp at midnight (start of day)
- `title`: "Thursday, December 25" (formatted long date)

### Daily Note Template

- Stored in localStorage: `skelenote:dailyNoteTemplateId`
- Applied automatically when daily note is created
- Placeholders: `{{date}}`, `{{date_short}}`, `{{time}}`, `{{tomorrow}}`, `{{yesterday}}`, `{{week}}`, `{{month}}`, `{{year}}`

## Task System

### Task Status Flow

- `todo` → `in-progress` → `done`
- `waiting` (special status for blocked tasks)
- Toggling complete: `todo` ↔ `done`

### Task Filters (in TasksView)

| Filter | Shows |
|--------|-------|
| Today | Due today, not done |
| This Week | Due this week, not done |
| Overdue | Due before today, not done |
| Waiting | Status = waiting |
| Eventually | Due after this week, not done |
| Completed | Status = done |

### Priority Sorting

`urgent (4) > high (3) > medium (2) > low (1) > none (0)`

### Recurrence System

When a recurring task is marked done:

1. Original task gets `status: 'done'`
2. New task is created with:
   - Same: title, priority, project, area, tags, recurrence pattern
   - Reset: `status: 'todo'`, new id, new timestamps
   - Calculated: `dueDate` based on recurrence rule

### Recurrence Patterns

```typescript
{
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  interval?: number,           // Every N periods
  daysOfWeek?: number[],       // 0=Sun..6=Sat (for weekly)
  dayOfMonth?: number,         // 1-31 (for monthly)
  weekOfMonth?: number,        // 1-4 or 5=last (for "first Monday")
  dayOfWeek?: number,          // 0-6 (for "first Monday")
  month?: number               // 1-12 (for yearly)
}
```

## Template System

### Template Structure

Templates are SkelenoteObjects with:

- `typeId`: `built-in:template`
- `targetTypeId`: The type this template creates
- `templateProperties`: JSON-encoded default property values
- `isDailyNoteTemplate`: If true, auto-applies to daily notes

### What Gets Copied

1. **Properties**: `templateProperties` merged with user overrides
2. **Content**: If template has content, copied with placeholders expanded
3. **Generated**: New ID, timestamps, `inboxed: true`
4. **NOT copied**: Template's own metadata (id, createdAt, etc.)

### Template ≠ Inheritance

Objects created from templates have no ongoing link. Updating the template doesn't affect previously created objects.

## Skeleton Key & Encryption

### Key Hierarchy

```
24-word Mnemonic (user backs up)
    ↓ BIP39 seed derivation (empty passphrase)
Master Key (32 bytes, stored encrypted on device)
    ↓ HKDF-SHA256
    ├─→ Sync Key ("skelenote-sync-v1") - encrypts CRDT updates
    ├─→ User ID ("skelenote-userid-v1") - deterministic, same on all devices
    └─→ Signing Key ("skelenote-signing-v1") - Ed25519 for device revocation
```

### Master Key Storage

- Encrypted with device key from OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Stored at `{APP_DATA}/skeleton_key.enc`
- Sync key cached in Tauri state after unlock

### Device Fingerprint

First 8 hex chars of SHA256(User ID) - used for visual verification during P2P pairing

## Sync Protocol

### What Gets Encrypted

- Loro CRDT updates (note content, object properties)
- Loro snapshots (full state)

### What's NOT Encrypted

- Device IDs and names
- Revocation messages and signatures
- Protocol metadata (sequence numbers, timestamps)

### Encryption Details

- Algorithm: XChaCha20-Poly1305
- Why XChaCha20: 192-bit nonce is safe for random generation in distributed P2P
- Format: `[nonce: 24 bytes][ciphertext + auth tag]`

### P2P vs Cloud

| | Cloud Relay | Local P2P |
|---|---|---|
| Transport | WebSocket | TCP |
| Discovery | N/A (configured URL) | mDNS `_skelenote._tcp` |
| Latency | Internet RTT | LAN speed |
| History | Server stores updates | In-memory only |
| Works | Anywhere | Same subnet |

Both use identical CRDT merge - Loro handles conflicts automatically.

## Gotchas & Non-Obvious Behaviors

1. **`getAll()` excludes archived objects** - Use `{ includeArchived: true }` to include them

2. **Sync skips during import** - `isImporting` flag prevents feedback loops; `sync()` calls silently no-op

3. **Type registry is immutable after registration** - Duplicate type IDs throw errors

4. **Content cleanup on delete** - Deleting an object removes @mentions of it from ALL other objects' content

5. **JSON wrapping detection** - Import checks first byte (`0x7b` = `{`) to distinguish JSON snapshots from raw Loro binary

6. **Daily note IDs are deterministic** - Same date = same ID across all devices, enabling conflict-free sync

7. **Backlinks are computed, not stored** - Every `findBacklinks()` call scans all objects

8. **Template properties are JSON-stringified** - Stored in `templateProperties` as a string, parsed on use

9. **Device blocklist is local** - Revoked devices blocked immediately via local blocklist, then synced via CRDT

10. **Recurrence creates NEW tasks** - Completing a recurring task doesn't modify it; creates a separate new task

## Common Development Recipes

### Adding a New Built-in Type

1. Add to `BuiltInTypeIds` enum in `src/lib/types/built-in-types.ts`
2. Create `TypeDefinition` with property schemas
3. Add to `registerBuiltInTypes()` function
4. Add icon mapping in `src/lib/icons.ts`
5. If it should appear in sidebar, update sidebar component
6. If excluded from inbox, add to `EXCLUDED_INBOX_TYPES` in `useInbox.ts`

### Adding a New Object Property

1. Add to type's `properties` array in `src/lib/types/built-in-types.ts`
2. Update any views/filters that should include it
3. If it's a relation, the relation helper will automatically include it in backlink calculations
4. Update UI components that render the object

### Working with Daily Notes

```typescript
// Get or create today's note
const note = await getOrCreateDailyNote(store, new Date());

// Link an object to today
await linkObjectToDaily(store, object);

// Check if object is linked to today
const isLinked = isLinkedToToday(object, todayNoteId);
```

### Creating a Task with Recurrence

```typescript
store.create({
  typeId: BuiltInTypeIds.TASK,
  properties: {
    title: 'Weekly review',
    status: 'todo',
    dueDate: nextMonday.getTime(),
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1], // Monday
    },
  },
});
```

### Triggering a Sync

```typescript
// After mutations, always call:
refreshData(); // Handles dataVersion, sync broadcast, and debounced save

// For immediate save (e.g., before app close):
await docStore.saveNow();
```

## Anti-Patterns

### Data Layer

- Storing editor content in object properties (use content Text structure)
- Calling `sync()` during imports (causes feedback loops)
- Assuming `getAll()` includes archived objects
- Expecting template changes to affect existing objects
- Storing backlinks (they're computed on demand)

### Task System

- Modifying a recurring task when completing (creates new task instead)
- Assuming task filters include completed tasks (they don't, except "Completed")

### Sync

- Expecting P2P to work across subnets (mDNS is local only)
- Assuming server can read sync data (it's E2E encrypted)
- Manually resolving CRDT conflicts (Loro handles this)

### Templates

- Expecting `{{title}}` to work without passing context
- Storing template ID on created objects (no link is maintained)

## Brand Voice & Design System

### The Aesthetic: "Cozy Rationalism"

Skelenote combines the high-density efficiency of a code editor with the warmth of a physical notebook. We are a response to the "Cold Blue" aesthetic of Silicon Valley SaaS.

### Core Design Principles

| Principle | Description |
|-----------|-------------|
| **High Density** | Pack information efficiently with tight gaps and minimal padding |
| **Borders Over Shadows** | Use 1px borders for separation instead of heavy shadows |
| **Hover-Reveal** | Hide secondary actions until hover to reduce visual noise |
| **Keyboard-First** | Full keyboard navigation with arrow keys, Enter, Escape |
| **Warm Palette** | Terracotta (Ember), sage, and clay tones instead of cold blues |

### Key Colors

- **Ember** (`#B85C50`) - Primary actions, CTAs, focus rings
- **Sage** (`#5E8C61`) - Success, completed, positive actions
- **Brick** (`#9B3D3D`) - Error, danger, destructive actions
- **Canvas** (`#FAFAFA`) - App background (soft off-white)

### What We Avoid

- Heavy drop shadows, rounded pill buttons, bright saturated colors
- Excessive whitespace, animations longer than 300ms
- Pure black text (use Carbon `#18181B` instead)

### Brand Lexicon

| Use | Avoid |
|-----|-------|
| The Study | Platform, OS |
| Vault | Account, Cloud |
| Object | Page, Note, Task |
| Campfire | Collaboration, Multiplayer |
| Relay | Cloud Storage |

For complete design specs, see `docs/design/style-guide.md`.

## Documentation Map

### Design & Brand

- `docs/design/style-guide.md` - **Complete UI component specs**, colors, typography, spacing, Mantine config
- `docs/design/skelenote-brand-bible.md` - Brand positioning, voice, strategic narrative
- `docs/design/skelenote-feature-list.md` - Feature inventory and status

### Developer Reference

- `docs/developer/architecture.md` - System architecture and data flow
- `docs/developer/tauri-api.md` - Rust/Tauri command reference
- `docs/developer/ci-cd.md` - CI/CD workflows, cross-platform builds, release process
- `CONTRIBUTING.md` - Setup instructions, code style, PR process

### User Documentation

- `docs/user/getting-started.md` - Onboarding guide
- `docs/user/guides/` - Feature guides (sync, export, shortcuts, settings)
- `docs/user/about/` - Philosophy, security model, pricing

## Documentation Maintenance

### When to Update Docs

| Change Type | Update Required |
|-------------|-----------------|
| New feature | User guide + architecture if significant |
| New built-in type | Update feature list, add to AGENTS.md |
| UI component changes | Update style-guide.md if pattern changes |
| API/command changes | Update tauri-api.md |
| New Tauri command | Update AGENTS.md Rust/Tauri section |

### Documentation Standards

- Keep AGENTS.md as the **single source of truth** for development patterns
- User docs should be **task-oriented** (how to accomplish X)
- Developer docs should be **reference-oriented** (what X does)
- Update docs in the **same PR** as the code change

### What Lives Where

- **AGENTS.md**: Development patterns, gotchas, recipes, anti-patterns
- **style-guide.md**: Visual specs, component examples, Mantine config
- **architecture.md**: System design, data flow, module responsibilities
- **User guides**: End-user how-tos, no implementation details
