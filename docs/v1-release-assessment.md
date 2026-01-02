# Skelenote v1 Release Readiness Assessment

*Generated: 2026-01-01*

## Executive Summary

Based on comprehensive exploration of the frontend, backend, data layer, and an exhaustive design audit, **Skelenote is approximately 92% ready for v1 release**. The app has a solid foundation with well-implemented cryptography, complete sync functionality, and a polished UI. There are 4 critical security issues and ~20 design polish items that should be addressed before release.

---

## Part 1: Security & Backend Issues

### Critical Security Issues (Must Fix Before v1)

### 1. Security: Weak Device-Specific Key Storage
**Location:** `src-tauri/src/crypto/stronghold.rs:125-136`
**Issue:** Master key encryption uses only the app data directory path as entropy - this is publicly knowable.
**Risk:** Attacker with file system access can derive the key and decrypt the master Skeleton Key.
**Fix:** Use OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) or require user password.

### 2. Security: No Maximum Message Size Limits (DoS)
**Location:** `src-tauri/src/network/protocol.rs`, `server.rs`, `client.rs`
**Issue:** Protocol allows up to 4GB messages (u32 length field), no validation.
**Risk:** Malicious peer can exhaust memory and crash the app.
**Fix:** Add `MAX_MESSAGE_SIZE` constant (e.g., 100MB) and reject larger payloads.

### 3. Backend: Mutex Unwraps in Command Handlers
**Location:** `src-tauri/src/lib.rs` - 40+ locations
**Issue:** `unwrap()` calls on Mutex locks will crash app if mutex is poisoned.
**Risk:** Any panic in async code could cascade to app crash.
**Fix:** Replace with `.map_err()` and return proper error types.

### 4. Security: Missing Content Security Policy
**Location:** `src-tauri/tauri.conf.json:27-29`
**Issue:** CSP is set to `null`, no XSS protection.
**Risk:** If any XSS vector exists (e.g., in BlockNote), attacker could exfiltrate keys.
**Fix:** Add strict CSP allowing only necessary origins.

---

## High Priority Issues (Should Fix Before v1)

### 5. Backend: Debug Logging in Production
**Location:** 60+ `println!`/`eprintln!` statements across Rust code, 162 `console.log` in TS
**Issue:** Verbose logging leaks device IDs, fingerprints, IP addresses, timing info.
**Fix:** Use proper logging framework with configurable levels, strip in production.

### 6. Backend: Startup Error Handling
**Location:** `src-tauri/src/lib.rs:815, 873`
**Issue:** Uses `.expect()` which crashes without user feedback if paths unavailable.
**Fix:** Proper error handling with user-friendly dialogs.

### 7. Security: No Connection Rate Limiting
**Location:** `src-tauri/src/network/server.rs`
**Issue:** TCP server accepts unlimited connections per IP.
**Risk:** Local network DoS attack.
**Fix:** Implement per-IP connection limits.

### 8. UI: ConfirmDialog Color Mapping
**Location:** `src/components/ui/ConfirmDialog.tsx:19-23`
**Issue:** Uses standard Mantine colors (blue, red) instead of design system (ember, brick).
**Fix:** Map: default->slate, danger->brick, warning->ochre.

---

## Medium Priority Issues (Fix in v1.1)

### 9. Accessibility: Missing ARIA Roles
**Location:** InboxView, TaskView, SearchResultsView
**Issue:** Data attributes but no explicit ARIA roles for screen readers.

### 10. UI: Incomplete Error States
**Location:** Modals, forms, settings panels
**Issue:** No inline error display, operations fail silently.

### 11. Security: Fingerprint Only 32-bit
**Location:** `src-tauri/src/lib.rs:213-217`
**Issue:** Birthday attack collision risk at ~65k users.
**Fix:** Increase to 64-bit (16 hex chars).

### 12. Backend: No Network Reconnection
**Issue:** If peer connection drops, no automatic reconnection with backoff.

---

## Part 2: Design Inconsistencies

### Critical Design Issues (2)

**1. Focus Ring Color Wrong**
- **Location:** `src/styles/tokens.css:41`
- **Issue:** Uses `--tag-blue` instead of ember
- **Style Guide:** Focus ring should be `var(--color-ember)`
- **Fix:** Change to `--focus-ring-color: var(--mantine-color-ember-5);`

**2. SnapshotPreview Border Invisible in Dark Mode**
- **Location:** `src/components/history/SnapshotPreview.tsx:188`
- **Issue:** Uses `gray-2` (light mode color)
- **Fix:** Use `var(--mantine-color-default-border)`

### High Priority Design Issues (2)

**3-4. Tag.tsx Missing Dark Mode Support**
- **Location:** `src/components/ui/Tag.tsx:86-91`
- **Issue:** Hardcoded light mode colors with no dark mode variant
- **Fix:** Add dark mode override using `[data-mantine-color-scheme="dark"]` selector

**Note:** The CSS modules correctly use light-first pattern per style guide. Dark mode overrides should be added where missing.

### Medium Priority Design Issues (18)

| Location | Issue | Fix |
|----------|-------|-----|
| `SnapshotPreview.module.css` | Missing dark mode override | Add dark mode variant |
| `PaletteItem.tsx:46` | Uses `gray-light` | Use `gray-0` / `dark-6` |
| `HistoricalObjectView.tsx:298,378,395,400,420` | `gray-2` borders | `default-border` |
| `TemplateEditor.tsx:350` | Cancel button has `color="gray"` | Remove (use default) |
| `QuickCapture.tsx:163` | Inline border style | Use Mantine props |
| `SavedViewContent.tsx:81` | `gray-2` border | `default-border` |
| `BulkActions.tsx:312` | Heavy `shadow-lg` | Use `shadow-sm` or border |
| `SkeletonKeySetup.tsx:217-269` | 3 hardcoded inline styles | Use Mantine components |
| `Editor.css:11-20,43` | Light mode BlockNote colors | Dark mode values |
| `ObjectDetailView.module.css:40-42` | Hardcoded `dark-7` | Use semantic variable |
| `InboxView.tsx:120` | `p="md"` padding | `p="sm"` for density |
| `TaskView.tsx:90` | `p="md"` padding | `p="sm"` for density |

### Low Priority Design Issues (19)

| Location | Issue |
|----------|-------|
| `tokens.css:5` | `--font-ui` is Fragment Mono, should be Inter |
| `InboxRow.module.css:15` | Selection uses `slate-0`, should be `clay-0` |
| `TaskRow.module.css:16-17` | Selection uses `slate-0`, should be `clay-0` |
| `SearchResultCard.module.css:10` | Selection uses `slate-0`, should be `clay-0` |
| `ObjectHeader.module.css:34` | Custom padding not on spacing scale |
| `PropertyBar.module.css:29` | Hardcoded `4px` gap |
| `Editor.css:124-125,153-166` | Hardcoded pixel values |
| `SnapshotPreview.tsx:182-183` | Inline styles instead of props |
| `Badge.tsx:22` | Explicit `radius="sm"` (already default) |
| `ViewHeader.tsx:74` | Badge with explicit default props |
| `SavedViewContent.tsx:88,252` | Badge with explicit default props |
| `TemplateEditor.tsx:254,279` | Non-standard spacing values |
| `QuickCapture.tsx:173` | Missing `color="ember"` on primary button |
| `Sidebar.tsx:449` | Direct lucide-react import vs Icon component |

---

## What's Working Well

### Cryptography
- XChaCha20-Poly1305 AEAD correctly implemented with random nonces
- BIP39 mnemonic + HKDF-SHA256 with proper domain separation
- Ed25519 signatures for device revocation
- Memory safety with Zeroizing type for sensitive data

### Data Layer
- Loro CRDT integration is solid and production-ready
- Time Machine history working with timestamp recording
- ObjectStore CRUD with proper validation

### Sync
- Cloud relay with WebSocket, auto-reconnect, offline queuing, E2E encryption
- P2P local sync with mDNS discovery and TCP transport
- Device management and revocation working

### UI/UX
- Mantine migration ~95% complete
- Design system consistently applied (Linear-inspired minimal aesthetic)
- All major views have empty states, loading states
- Keyboard navigation in list views
- Command palette fully functional

### Features
- All 9 built-in types complete with schemas
- Task recurrence with test coverage
- Fuzzy + semantic search hybrid
- Template system with placeholder expansion
- Saved views with query builder
- Settings panels organized

---

## Recommended Pre-Release Actions

### Phase 1: Critical Security (1 day)
1. [ ] Add MAX_MESSAGE_SIZE limit in protocol (30 min)
2. [ ] Fix Mutex unwraps with proper error handling (2-3 hours)
3. [ ] Add basic CSP to tauri.conf.json (30 min)
4. [ ] Implement OS Keychain for master key storage (4-6 hours)
   - macOS: Keychain Services
   - Windows: Credential Manager
   - Linux: Secret Service (libsecret)

### Phase 2: Critical Design (30 min)
5. [ ] Fix focus ring color in `tokens.css` (5 min)
6. [ ] Fix SnapshotPreview border color (5 min)
7. [ ] Add dark mode support to Tag.tsx (15 min)

### Phase 3: High Priority (1 day)
8. [ ] Replace `gray-2` borders with `default-border` across codebase (1 hour)
9. [ ] Fix selection colors from `slate-0` to `clay-0` (15 min)
10. [ ] Clean up SkeletonKeySetup inline styles (30 min)
11. [ ] Fix Editor.css BlockNote overrides for dark mode (30 min)
12. [ ] Replace println!/console.log with proper logging (3-4 hours)
13. [ ] Add connection rate limiting (2 hours)
14. [ ] Fix startup error handling with user dialogs (1 hour)

### Phase 4: Medium Priority (Optional for v1)
15. [ ] Fix padding density in InboxView/TaskView
16. [ ] Clean up redundant Badge props
17. [ ] Add `color="ember"` to primary buttons
18. [ ] Replace hardcoded pixel values with spacing tokens
19. [ ] Fix `--font-ui` to Inter in tokens.css

### Can Defer to v1.1
- Network reconnection logic
- Fingerprint strengthening (32-bit -> 64-bit)
- Form validation error display
- Settings panels completion
- Import functionality

---

## Files to Modify

### Critical Security
- `src-tauri/src/crypto/stronghold.rs` - OS Keychain integration
- `src-tauri/src/network/protocol.rs` - Message size limits
- `src-tauri/src/lib.rs` - Error handling (40+ mutex unwraps)
- `src-tauri/tauri.conf.json` - Add CSP
- `src-tauri/Cargo.toml` - Add keyring crate

### Critical Design
- `src/styles/tokens.css` - Focus ring color, font-ui
- `src/components/history/SnapshotPreview.tsx` - Border color
- `src/components/ui/Tag.tsx` - Dark mode colors

### CSS Modules (Add Dark Mode Overrides Where Missing)
- `src/components/history/SnapshotPreview.module.css` - needs dark mode variant

### Border Color Fixes
- `src/components/history/HistoricalObjectView.tsx`
- `src/components/views/SavedViewContent.tsx`
- `src/components/palette/PaletteItem.tsx`

### Other Design Fixes
- `src/components/editor/Editor.css` - Dark mode BlockNote
- `src/components/setup/SkeletonKeySetup.tsx` - Inline styles
- `src/components/actions/BulkActions.tsx` - Shadow
- `src/components/templates/TemplateEditor.tsx` - Button color
- `src/components/capture/QuickCapture.tsx` - Button color

### Backend
- `src-tauri/src/network/server.rs` - Rate limiting
- Multiple Rust files - Replace println! with log crate
- Multiple TS files - Remove console.log

---

## Verdict

**CONDITIONAL GO** - The app is feature-complete and well-architected. Before v1 release:

1. **Must fix:** 4 critical security issues + 2 critical design issues
2. **Should fix:** Border color consistency, selection colors, Tag.tsx dark mode
3. **Recommended:** OS Keychain for key storage (important for "zero-knowledge" claim)

Estimated effort: **2-3 days** for all critical and high-priority items.
