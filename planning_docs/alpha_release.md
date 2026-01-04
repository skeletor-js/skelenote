# Skelenote Alpha/Beta Release Preparation Plan

## Current State Assessment

**Overall Verdict: RELEASED** - v0.1.0-alpha.1 tagged and pushed. CI/CD building release artifacts.

| Area | Status | Action Required |
|------|--------|-----------------|
| Features | ✅ Complete | All v1 features implemented |
| Build Config | ✅ Complete | `devtools: false` set |
| Test Coverage | ✅ Complete | 223 tests passing (112 new) |
| CI/CD | ✅ Complete | GitHub Actions created |
| Console Logs | ✅ Complete | High-priority logs cleaned |
| Security | ✅ Solid | Minor improvements only |

---

## Phase 1: Critical Configuration ✅ COMPLETE

### 1.1 Disable DevTools for Release ✅
**File:** [tauri.conf.json](src-tauri/tauri.conf.json)

~~Change line 24 from `"devtools": true` to `"devtools": false`~~

Done - DevTools disabled in production builds.

### 1.2 Verify Dev-Test Exclusion
**File:** [dev-test.ts](src/lib/semantic/dev-test.ts)

Verify Vite strips `window.semanticTest` from production builds, or wrap in explicit dev check.

---

## Phase 2: CI/CD Setup

Create `.github/workflows/` directory with three workflows:

### 2.1 Test Workflow (`.github/workflows/test.yml`)
- Runs on push/PR
- Frontend tests: `pnpm test:run`
- Rust tests: `cargo test`

### 2.2 Build Workflow (`.github/workflows/build.yml`)
- Matrix build: macOS, Windows, Ubuntu
- Install platform dependencies
- Run `pnpm tauri build`
- Upload artifacts

### 2.3 Release Workflow (`.github/workflows/release.yml`)
- Triggers on `v*` tags
- Uses `tauri-apps/tauri-action`
- Creates draft GitHub release with binaries

---

## Phase 3: Critical Tests ✅ COMPLETE

### 3.1 ObjectStore Tests ✅
**Created:** [src/lib/loro/__tests__/objects.test.ts](src/lib/loro/__tests__/objects.test.ts)

61 tests covering:
- CRUD operations (create, get, getOrThrow, update, setProperty, delete, exists)
- Retrieval (getAll excludes archived, getByType, getInboxed, getArchived)
- Content operations (getContent, setContent, hasContent validation)
- Inbox workflow (markProcessed)
- Pinning (pin, unpin, reorderPinned, getPinnedObjects)
- Archive (archive sets inboxed=false, unarchive)
- Duplication and batch operations
- Edge cases (ValidationError for unknown type, ObjectNotFoundError)

### 3.2 Query Tests ✅
**Created:** [src/lib/loro/__tests__/queries.test.ts](src/lib/loro/__tests__/queries.test.ts)

51 tests covering:
- All filter operators (eq, neq, gt, gte, lt, lte, contains, startsWith, endsWith, in, notIn, isNull, isNotNull)
- Built-in field access (id, typeId, inboxed, pinned, archived, createdAt, updatedAt)
- Sorting (ascending/descending, null handling)
- Pagination (limit, offset, combined)
- QueryBuilder fluent API (where, whereEquals, ofType, inboxed, archived, sortBy, sortByCreated, sortByUpdated, limit, offset, execute, first, count)

### 3.3 Coverage Config ✅
**File:** [vite.config.ts](vite.config.ts)

Added coverage configuration:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/lib/**/*.ts'],
  exclude: ['src/lib/**/*.test.ts', 'src/lib/**/__tests__/**'],
}
```

Run `pnpm test -- --coverage` to generate coverage report.

---

## Phase 4: Console Log Cleanup ✅ COMPLETE

### High Priority ✅
| File | Removed | Kept |
|------|---------|------|
| [client.ts](src/lib/sync/client.ts) | 22 info logs | 16 error logs |
| [devices/store.ts](src/lib/devices/store.ts) | 12 info logs | 5 error logs |
| [crypto/index.ts](src/lib/crypto/index.ts) | 6 info logs | 12 error logs |

**Total:** 40 informational logs removed, all `console.error` retained for debugging.

### Medium Priority (Can defer to post-alpha)
- [loro/store.ts](src/lib/loro/store.ts) - 13 logs
- [LocalSyncContext.tsx](src/contexts/LocalSyncContext.tsx) - 12 logs
- [DeviceRegistryContext.tsx](src/contexts/DeviceRegistryContext.tsx) - 12 logs

### Low Priority (Rust println!)
- Keep for alpha - only visible in terminal during development

---

## Phase 5: Release Process

### Pre-Release Checklist
- [x] `devtools: false` in tauri.conf.json
- [x] All tests passing (223 tests)
- [x] CI/CD workflows created
- [x] Version numbers synced across all config files
- [x] Manual testing of core flows (macOS, Linux verified)
- [ ] Successful builds on all platforms (CI in progress)

### Version Update
Set version to `0.1.0-alpha.1` in:
- [package.json](package.json)
- [src-tauri/Cargo.toml](src-tauri/Cargo.toml)
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)

### Release Steps
```bash
git add -A
git commit -m "chore: prepare v0.1.0-alpha.1 release"
git tag v0.1.0-alpha.1
git push origin main --tags
```

---

## Implementation Order

| Step | Task | Status |
|------|------|--------|
| 1 | Set `devtools: false` | ✅ Complete |
| 2 | Create CI/CD workflows | ✅ Complete |
| 3 | Add ObjectStore tests | ✅ Complete (61 tests) |
| 4 | Add Query tests | ✅ Complete (51 tests) |
| 5 | Clean up high-priority console logs | ✅ Complete (40 removed) |
| 6 | Manual testing | ✅ Complete (macOS, Linux) |
| 7 | Update versions and tag release | ✅ Complete |

**Status: v0.1.0-alpha.1 released** - Tag pushed, awaiting CI builds

---

## Post-Alpha Improvements (Not Blocking)

- Implement proper logging framework
- Add integration tests for sync protocol
- Code signing for macOS/Windows
- Auto-update support via Tauri updater
- Clean up remaining console logs and Rust println!
- Resolve minor TODOs in versions.ts and DeviceRegistryContext.tsx
