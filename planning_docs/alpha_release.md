# Skelenote Alpha/Beta Release Preparation Plan

## Current State Assessment

**Overall Verdict: Nearly Ready** - Core features complete, but needs configuration fixes, critical tests, and CI/CD before release.

| Area | Status | Action Required |
|------|--------|-----------------|
| Features | ✅ Complete | All v1 features implemented |
| Build Config | ⚠️ Issue | Set `devtools: false` |
| Test Coverage | ⚠️ Low | Add critical tests |
| CI/CD | ❌ Missing | Create GitHub Actions |
| Console Logs | ⚠️ Noisy | Clean up sync/crypto logs |
| Security | ✅ Solid | Minor improvements only |

---

## Phase 1: Critical Configuration (Must Do)

### 1.1 Disable DevTools for Release
**File:** [tauri.conf.json](src-tauri/tauri.conf.json)

Change line 24 from `"devtools": true` to `"devtools": false`

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

## Phase 3: Critical Tests

### 3.1 ObjectStore Tests (Priority 1)
**Create:** `src/lib/loro/__tests__/objects.test.ts`

Test coverage:
- CRUD operations (create, get, update, delete)
- `getAll()` excludes archived by default
- Property validation
- Content operations
- Pin/unpin, archive/unarchive

### 3.2 Query Tests (Priority 2)
**Create:** `src/lib/loro/__tests__/queries.test.ts`

Test coverage:
- Filter operators (eq, neq, gt, lt, contains)
- Sort operations
- QueryBuilder fluent API

### 3.3 Add Coverage Config
**File:** [vite.config.ts](vite.config.ts)

Add to test config:
```typescript
coverage: {
  reporter: ['text', 'json', 'html'],
  include: ['src/lib/**/*.ts'],
  exclude: ['**/*.test.ts', '**/dev-test.ts'],
}
```

---

## Phase 4: Console Log Cleanup

### High Priority (User-Visible Operations)
| File | Count | Action |
|------|-------|--------|
| [client.ts](src/lib/sync/client.ts) | 22 | Remove or conditionalize |
| [devices/store.ts](src/lib/devices/store.ts) | 12 | Remove or conditionalize |
| [crypto/index.ts](src/lib/crypto/index.ts) | 6 | Keep errors, remove info |

### Medium Priority (Can defer to post-alpha)
- [loro/store.ts](src/lib/loro/store.ts) - 13 logs
- [LocalSyncContext.tsx](src/contexts/LocalSyncContext.tsx) - 12 logs
- [DeviceRegistryContext.tsx](src/contexts/DeviceRegistryContext.tsx) - 12 logs

### Low Priority (Rust println!)
- Keep for alpha - only visible in terminal during development

---

## Phase 5: Release Process

### Pre-Release Checklist
- [ ] `devtools: false` in tauri.conf.json
- [ ] Version numbers synced across all config files
- [ ] All tests passing
- [ ] Manual testing of core flows
- [ ] Successful builds on all platforms

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

| Step | Task | Effort |
|------|------|--------|
| 1 | Set `devtools: false` | 5 min |
| 2 | Create CI/CD workflows | 2-3 hrs |
| 3 | Add ObjectStore tests | 3-4 hrs |
| 4 | Add Query tests | 1-2 hrs |
| 5 | Clean up high-priority console logs | 1-2 hrs |
| 6 | Manual testing | 1 hr |
| 7 | Update versions and tag release | 30 min |

**Total estimated effort: 1-2 days**

---

## Post-Alpha Improvements (Not Blocking)

- Implement proper logging framework
- Add integration tests for sync protocol
- Code signing for macOS/Windows
- Auto-update support via Tauri updater
- Clean up remaining console logs and Rust println!
- Resolve minor TODOs in versions.ts and DeviceRegistryContext.tsx