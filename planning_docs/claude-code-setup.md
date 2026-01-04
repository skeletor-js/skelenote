# Comprehensive Claude Code Setup for Skelenote

All skills, hooks, and agents will be project-specific in `.claude/` (version controlled, shared with team).

---

## Step 1: Remove Git-Related Plugins

```bash
claude plugin uninstall commit-commands
claude plugin uninstall code-review
claude plugin uninstall feature-dev
```

**Keep installed:** `frontend-design`, `skill-creator`

---

## Git Workflow Skills

### `/branch` - Create Feature Branch
**How to use:** Type `/branch add-task-filters` when starting new work.

**What happens:**
1. Claude asks which prefix: `feature/`, `fix/`, `refactor/`, `docs/`
2. Fetches latest main
3. Creates and checks out the branch

**Benefit:** No more forgetting to fetch, no typos in branch names, consistent naming across team.

---

### `/commit` - Standard Commit
**How to use:** Type `/commit` after making changes.

**What happens:**
1. Claude runs `git status` and `git diff` to understand changes
2. Generates semantic commit message following your conventions
3. Stages and commits

**Benefit:** Consistent commit messages, no more "fix stuff" commits, follows repo conventions automatically.

---

### `/commit-skip` - Commit with [skip ci]
**How to use:** Type `/commit-skip` for docs, typos, or WIP saves.

**What happens:** Same as `/commit` but appends `[skip ci]` to message.

**Benefit:** Saves CI minutes on non-code changes, faster iteration on documentation.

---

### `/merge-main` - Merge Main into Branch
**How to use:** Type `/merge-main` when your branch is behind.

**What happens:**
1. Fetches origin/main
2. Merges into current branch
3. If conflicts: lists files and helps resolve

**Benefit:** Stay up-to-date without leaving conversation, Claude helps with merge conflicts.

---

### `/pr` - Create Pull Request
**How to use:** Type `/pr` when ready for review.

**What happens:**
1. Pushes branch with `-u` flag
2. Analyzes all commits on branch
3. Creates PR with summary and test plan via `gh pr create`
4. Returns PR URL

**Benefit:** Consistent PR format, auto-generated summaries from commits, one command instead of multiple.

---

### `/squash` - Squash Merge PR
**How to use:** Type `/squash` after PR is approved.

**What happens:**
1. Verifies PR exists for current branch
2. Checks that CI has passed (required - will fail if not)
3. Runs `gh pr merge --squash --delete-branch`
4. Checks out main and pulls

**Benefit:** Safe merging (can't merge failing PRs), clean history, auto-cleanup of branch.

---

### `/ship` - Full PR Workflow
**How to use:** Type `/ship` to go from branch to merged in one command.

**What happens:**
1. Pushes branch
2. Creates PR if doesn't exist
3. Waits for CI checks to pass
4. Squash merges
5. Returns to main

**Benefit:** Complete workflow in one command, great for small fixes that don't need manual review.

---

### `/sync` - Sync with Remote
**How to use:** Type `/sync` to sync your branch.

**What happens:**
- On main: pulls latest
- On feature branch: rebases on tracking branch or pushes if ahead

**Benefit:** Simple sync without remembering git commands, handles edge cases.

---

### `/cleanup` - Clean Merged Branches
**How to use:** Type `/cleanup` periodically to tidy up.

**What happens:**
1. Runs `git fetch --prune`
2. Finds branches marked as `[gone]` (merged and deleted on remote)
3. Deletes them locally

**Benefit:** Clean local repo, no stale branches cluttering `git branch` output.

---

## Development Workflow Skills

### `/dev` - Start Development
**How to use:** Type `/dev` to start working.

**What happens:**
1. Checks TypeScript compiles (`tsc --noEmit`)
2. Ensures dependencies are installed
3. Starts `pnpm tauri dev`

**Benefit:** Pre-flight checks catch issues before you start, single command to get running.

---

### `/test` - Run Tests
**How to use:** Type `/test` to run full test suite.

**What happens:**
1. Runs `pnpm test:run` (Vitest frontend tests)
2. Runs `cd src-tauri && cargo test` (Rust backend tests)
3. Reports results

**Benefit:** One command for both test suites, see all results together.

---

### `/check` - Pre-commit Validation
**How to use:** Type `/check` before committing or pushing.

**What happens:**
```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm test:run && cd src-tauri && cargo test
```

**Benefit:** Catches CI failures locally before pushing, saves time and CI minutes.

---

### `/build` - Production Build
**How to use:** Type `/build` to create production binaries.

**What happens:** Runs `pnpm tauri build` for production binaries.

**Benefit:** Simple command for release builds.

---

### `/lint` - Lint and Fix
**How to use:** Type `/lint` to check and fix code style.

**What happens:**
1. Runs `pnpm lint`
2. Shows issues
3. Offers to auto-fix with `pnpm lint --fix`

**Benefit:** Interactive linting with option to auto-fix.

---

## Code Generation Skills

### `/type` - Generate Built-in Type
**How to use:** Type `/type` when adding a new object type (like adding "Event" or "Bookmark").

**What happens:**
1. Claude asks for: name, icon (from Lucide), properties with types
2. Reads existing type patterns from `src/lib/types/built-in-types.ts`
3. Generates:
   - Type definition with property schemas
   - Adds to `BuiltInTypeIds` enum
   - Icon mapping in `src/lib/icons.ts`
   - Registers in `createTypeRegistry()`
   - Adds to `EXCLUDED_INBOX_TYPES` if needed

**Benefit:** What normally takes 5 manual steps across 3 files becomes one conversation. Follows existing patterns perfectly.

---

### `/tauri-command` - Generate Tauri Command
**How to use:** Type `/tauri-command` when adding new Rust backend functionality.

**What happens:**
1. Claude asks for: command name, parameters, return type, which module (crypto/network/lib.rs)
2. Reads existing command patterns (51 examples to learn from)
3. Generates:
   - Rust function with `#[tauri::command]` and proper error handling
   - Adds to `invoke_handler!` macro in lib.rs
   - TypeScript wrapper in `src/lib/` with proper types

**Benefit:** Consistent Rust patterns, never forget to register commands, auto-generated TypeScript bindings.

---

### `/component` - Generate React Component
**How to use:** Type `/component` when creating a new UI component.

**What happens:**
1. Claude asks for: name, location (which directory), props
2. Reads existing component patterns
3. Generates:
   - Component file with Mantine imports and project styling
   - TypeScript interface for props
   - Optional test file

**Benefit:** Components follow project patterns, Mantine integration, proper TypeScript.

---

### `/context` - Generate React Context
**How to use:** Type `/context` when adding new app-level state.

**What happens:**
1. Claude asks for: name, state shape, actions
2. Reads existing context patterns (12 examples)
3. Generates:
   - Context with createContext
   - Provider component with memoized values
   - `useX()` hook with error throwing
   - `useXSafe()` hook returning null
   - Index export

**Benefit:** All contexts follow identical patterns, includes both hook variants, proper memoization.

---

### `/hook` - Generate Custom Hook
**How to use:** Type `/hook` when adding reusable logic.

**What happens:**
1. Claude asks for: name, what it does, dependencies
2. Reads existing hook patterns (23 examples)
3. Generates:
   - Hook with useCallback for actions
   - useMemo for derived data
   - TypeScript return interface
   - Integration with ObjectContext if needed

**Benefit:** Consistent hook patterns, proper memoization, type-safe returns.

---

## Release & Versioning Skills

### `/release` - Create Release
**How to use:** Type `/release` when ready to publish a new version.

**What happens:**
1. Claude asks for version bump type: patch (0.1.0 → 0.1.1), minor (0.1.0 → 0.2.0), major (0.1.0 → 1.0.0)
2. Bumps version in `package.json` AND `src-tauri/tauri.conf.json` (keeps them in sync)
3. Commits: `chore: bump version to X.X.X`
4. Creates git tag `vX.X.X`
5. Pushes with tags
6. GitHub Actions creates draft release automatically
7. Returns link to draft release

**Benefit:** Never forget a file, versions stay in sync, one command for entire release process.

---

### `/changelog` - Generate Changelog
**How to use:** Type `/changelog` before a release to generate notes.

**What happens:**
1. Reads commits since last version tag
2. Groups by type (feat, fix, refactor, docs)
3. Formats as markdown changelog entry

**Benefit:** Auto-generated release notes from commit history.

---

## Hooks (Auto-Run on Events)

### PreToolUse: Lint Check
**When it runs:** Before Claude edits or writes any file.

**What happens:** Runs `pnpm lint --quiet` to check for issues.

**Benefit:** Catches lint errors BEFORE changes are made, Claude sees the issues and can fix them proactively.

---

### PostToolUse: TypeScript Check
**When it runs:** After Claude edits or writes a TypeScript file.

**What happens:** Runs `pnpm exec tsc --noEmit` to check types.

**Benefit:** Immediate feedback on type errors, Claude can fix them in the same turn instead of you discovering later.

---

### Stop: Auto-format
**When it runs:** When Claude finishes a task and stops.

**What happens:** Runs `pnpm format` to format all changed files.

**Benefit:** Code is always formatted, no manual formatting step needed.

---

### SessionStart: Status Check
**When it runs:** When you start a new Claude Code session.

**What happens:** Shows `git status --short` and last 3 commits.

**Benefit:** Immediate context on repo state, reminds you what you were working on.

---

## Custom Agents (Specialized Subagents)

### @security-reviewer
**How to use:** Type `@security-reviewer check the new auth flow` or Claude invokes it automatically after security-sensitive code.

**What it does:**
- Reviews code for OWASP Top 10 vulnerabilities
- Checks input validation and sanitization
- Reviews crypto implementation (XChaCha20-Poly1305 usage)
- Audits Tauri IPC for command injection
- Validates CSP configuration

**Benefit:** Proactive security review, catches vulnerabilities before they ship, specialized knowledge of Skelenote's crypto patterns.

---

### @architecture-analyst
**How to use:** Type `@architecture-analyst review the sync system` when making architectural decisions.

**What it does:**
- Analyzes data flow through the system
- Maps component dependencies
- Reviews CRDT sync patterns for correctness
- Evaluates P2P network design
- Identifies performance bottlenecks

**Benefit:** Architectural guidance from an agent that understands Skelenote's patterns, helps maintain consistency.

---

### @test-generator
**How to use:** Type `@test-generator write tests for useInbox hook` after implementing features.

**What it does:**
- Generates unit tests for functions
- Creates integration tests for flows
- Uses Vitest patterns for frontend
- Uses Cargo test patterns for Rust
- Covers edge cases and error conditions

**Benefit:** Comprehensive test coverage, follows project test patterns, saves time writing boilerplate tests.

---

### @docs-writer
**How to use:** Type `@docs-writer update docs for the new template feature` after implementing features.

**What it does:**
- Updates CLAUDE.md with new patterns and gotchas
- Generates API docs for new Tauri commands
- Updates user guides in docs/user/
- Keeps architecture docs current

**Benefit:** Documentation stays up-to-date, follows project doc conventions, one command to update all relevant docs.

---

## Files to Create

```
.claude/
├── settings.json          # Hooks configuration
├── skills/
│   ├── git/
│   │   ├── branch.md
│   │   ├── commit.md
│   │   ├── commit-skip.md
│   │   ├── merge-main.md
│   │   ├── pr.md
│   │   ├── squash.md
│   │   ├── ship.md
│   │   ├── sync.md
│   │   └── cleanup.md
│   ├── dev/
│   │   ├── dev.md
│   │   ├── test.md
│   │   ├── check.md
│   │   ├── build.md
│   │   └── lint.md
│   ├── generate/
│   │   ├── type.md
│   │   ├── tauri-command.md
│   │   ├── component.md
│   │   ├── context.md
│   │   └── hook.md
│   └── release/
│       ├── release.md
│       └── changelog.md
└── agents/
    ├── security-reviewer.md
    ├── architecture-analyst.md
    ├── test-generator.md
    └── docs-writer.md
```

**Total: 21 skills + 4 hooks + 4 agents = 29 automations**

---

## How This Improves Your Claude Code Experience

### Before (Manual)
```
# Starting new feature
git fetch origin main
git checkout -b feature/add-filters origin/main

# After coding
git add -A
git diff --staged  # review changes
# think of commit message...
git commit -m "feat: add task filters"

# Creating PR
git push -u origin feature/add-filters
gh pr create --title "..." --body "..."

# After approval
gh pr merge --squash --delete-branch
git checkout main
git pull
```

### After (With Skills)
```
/branch add-filters     # Creates branch, prompts for prefix
# ... code ...
/commit                 # Auto-generates message from changes
/pr                     # Pushes and creates PR with summary
/squash                 # Merges (after CI passes) and cleans up
```

### Automatic Benefits from Hooks
- **Lint errors caught immediately** during coding, not at CI
- **Type errors shown right after edits** so Claude can fix them
- **Code auto-formatted** when Claude finishes
- **Git status shown on session start** so you have context

### Specialized Help from Agents
- **Security issues caught proactively** after sensitive code changes
- **Architecture guidance** when making design decisions
- **Tests generated** after implementing features
- **Docs updated** after shipping features

---

## Implementation Order

### Phase 1: Git Workflow (Core)
1. `/commit` - most used, immediate value
2. `/branch` - start of workflow
3. `/commit-skip` - variation for docs
4. `/pr`, `/squash`, `/ship` - complete PR workflow

### Phase 2: Development Workflow
5. `/check` - catches CI failures locally
6. `/test` - unified test runner
7. `/dev`, `/build`, `/lint`

### Phase 3: Hooks
8. Configure `.claude/settings.json` with all 4 hooks

### Phase 4: Code Generation
9. `/type` - most impactful generator
10. `/tauri-command` - backend scaffolding
11. `/component`, `/context`, `/hook`

### Phase 5: Release
12. `/release` - version management
13. `/changelog`

### Phase 6: Remaining Git
14. `/merge-main`, `/sync`, `/cleanup`

### Phase 7: Custom Agents
15. @security-reviewer
16. @architecture-analyst
17. @test-generator
18. @docs-writer

---

## Notes

- All skills project-specific (`.claude/skills/`) - team shares them
- Organized in subdirectories by category for easy navigation
- Skills reference CLAUDE.md patterns - stays consistent with project
- Code generation skills read existing patterns before generating - learns from your code
- Check gates: `/squash` and `/ship` require CI checks to pass - prevents broken merges
- Hooks run automatically on matching events - no manual steps
- Agents can be invoked with `@agent-name` or Claude uses them proactively
