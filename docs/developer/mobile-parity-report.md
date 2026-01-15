# Mobile Parity Report: Desktop vs Mobile Feature Comparison

This report provides a comprehensive comparison of features available in the Skelenote desktop app versus the mobile app.

---

## Executive Summary

| Metric | Desktop | Mobile |
|--------|---------|--------|
| **Core Views** | 10 | 15 (adapted for mobile) |
| **Feature Coverage** | 100% | ~65% |
| **UI Components** | Full Mantine | Custom mobile primitives |
| **Navigation** | Sidebar + Omnibar | Bottom Tab Bar |
| **Critical Gaps** | - | Time Machine, Import Wizard, Rich Editor |

**Bottom Line:** Mobile has solid foundational architecture with ~65% feature parity. Critical gaps are in content editing (BlockNote editor), Time Machine, import/export wizards, and some property editors.

---

## Feature Parity Matrix

### Legend
- **Full** - Feature fully implemented and functional
- **Partial** - Feature exists but incomplete or limited
- **Stub** - Component exists but shows placeholder content
- **Missing** - Feature not implemented

---

## 1. NAVIGATION & LAYOUT

| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Primary Navigation | Full (Sidebar) | Full (Bottom Tab Bar) | Different paradigms |
| Command Palette (Cmd+K) | Full | Missing | No omnibar on mobile |
| Split Pane View | Full | Missing | Desktop-only by design |
| Keyboard Shortcuts | Full (30+) | Missing | Touch-first design |
| Back/Forward History | Full | Full | NavigationContext shared |
| Breadcrumb Navigation | Full | Partial | Mobile uses header back button |

---

## 2. CORE VIEWS

| View | Desktop | Mobile | Gap Details |
|------|---------|--------|-------------|
| **Inbox** | Full | Full | MobileInboxView with FAB, swipe actions |
| **Tasks** | Full | Full | MobileTasksView with filter tabs |
| **Daily Notes** | Full | Partial | View exists, calendar picker limited |
| **Archive** | Full | Full | MobileArchiveView implemented |
| **Settings** | Full (8 panels) | Partial | Groups exist, sheets are stubs |
| **Search** | Full | Partial | MobileSearchModal exists, filters limited |
| **Object Detail** | Full | Partial | Properties shown, editor limited |
| **Type Browse** | Full | Full | MobileTypeBrowseView implemented |
| **Projects Browse** | Sidebar section | Full | MobileProjectsView standalone |
| **Areas Browse** | Sidebar section | Full | MobileAreasView standalone |
| **Tags Browse** | Sidebar section | Full | MobileTagsView standalone |
| **Saved Views** | Full | Full | MobileSavedViewsView implemented |
| **Templates** | Full | Partial | MobileTemplatesView - view only |
| **Time Machine** | Full | Missing | No mobile equivalent |

---

## 3. OBJECT MANAGEMENT

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Create Object (Quick Add) | Full | Partial | QuickAddTaskSheet, QuickCaptureSheet exist |
| View Object | Full | Full | MobileObjectDetailView |
| Edit Properties | Full | Stub | PropertyEditorSheet shows "coming soon" |
| Rich Text Editor | Full (BlockNote) | Missing | Critical gap - no content editing |
| @Mentions | Full | Missing | Depends on BlockNote |
| Duplicate Object | Full | Missing | No duplication on mobile |
| Pin/Unpin | Full | Partial | Can view pinned, limited pin action |
| Archive Object | Full | Full | Swipe action + detail action |
| Delete Object | Full | Full | Action sheet confirmation |
| Backlinks Display | Full | Full | CollapsibleSection in detail view |

---

## 4. TASK-SPECIFIC FEATURES

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Task Filters (Today/Week/etc) | Full | Full | Horizontal tabs in MobileTasksView |
| Mark Complete | Full | Full | Swipe left action |
| Change Status | Full | Partial | Status badge visible, editing limited |
| Set Priority | Full | Stub | TODO comment in code |
| Set Due Date | Full | Stub | Reschedule TODO in code |
| Recurrence | Full | Missing | No recurrence UI on mobile |
| Move to Project | Full | Stub | TODO comment in code |
| Quick Add Task | Full | Full | QuickAddTaskSheet |

---

## 5. PROPERTY EDITORS

| Editor Type | Desktop | Mobile | Gap Details |
|-------------|---------|--------|-------------|
| Text Input | Full | Stub | In PropertyEditorSheet |
| Number Input | Full | Stub | In PropertyEditorSheet |
| Date Picker | Full | Stub | In PropertyEditorSheet |
| Select/Dropdown | Full | Stub | In PropertyEditorSheet |
| Checkbox | Full | Stub | In PropertyEditorSheet |
| URL Input | Full | Stub | In PropertyEditorSheet |
| Email Input | Full | Stub | In PropertyEditorSheet |
| Phone Input | Full | Stub | In PropertyEditorSheet |
| Duration Select | Full | Stub | In PropertyEditorSheet |
| Relation Picker | Full | Partial | RelationPickerSheet exists |
| Recurrence Editor | Full | Missing | No mobile equivalent |
| Color Picker (Tags) | Full | Missing | No color selection |

---

## 6. SETTINGS PANELS

| Panel | Desktop | Mobile | Gap Details |
|-------|---------|--------|-------------|
| Account | Full | Stub | AccountSettingsSheet placeholder |
| Sync | Full (P2P + Cloud) | Stub | SyncSettingsSheet placeholder |
| Appearance | Full | Partial | Basic theme toggle |
| Templates | Full | View only | Can browse, not edit |
| Search (Semantic) | Full | Missing | No semantic toggle |
| Data (Import/Export) | Full | Stub | DataSettingsSheet placeholder |
| About | Full | Full | Version info displayed |
| Danger Zone | Full | Stub | DangerZoneSheet placeholder |

---

## 7. SYNC FEATURES

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Cloud Relay | Full | Full | SyncContext shared |
| Local P2P Discovery | Full | Full | LocalSyncContext shared |
| Device Pairing (Manual) | Full | Full | IP/port entry |
| Device Pairing (QR) | Missing | Full | useQRScanner hook |
| Paired Devices List | Full | Stub | In SyncSettingsSheet |
| Device Revocation | Full | Stub | In SyncSettingsSheet |
| Sync Status Indicator | Full | Full | MobileSyncIndicator |
| Fingerprint Verification | Full | Missing | No visual verification UI |

---

## 8. SECURITY FEATURES

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Skeleton Key Setup | Full | Full | SkeletonKeySetup shared |
| Key Generation | Full | Full | Rust backend |
| Key Import (Words) | Full | Full | 24-word entry |
| Key Import (QR) | Missing | Full | useQRScanner hook |
| Key Export (Words) | Full | Full | Display mnemonic |
| Key Export (QR) | Partial | Partial | QR generation in Rust |
| Biometric Unlock | Missing | Full | useBiometric hook + LockScreen |
| Device Key Storage | Full | Full | Stronghold backend |

---

## 9. IMPORT/EXPORT

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Import Wizard UI | Full | Missing | No wizard on mobile |
| Obsidian Import | Full | Missing | Desktop-only |
| Notion Import | Full | Missing | Desktop-only (API requires OAuth) |
| Markdown Import | Full | Missing | Desktop-only |
| Export to Markdown | Full | Stub | DataSettingsSheet placeholder |
| Export to PDF | Full | Missing | Desktop-only |
| Bulk Export | Full | Missing | Desktop-only |

---

## 10. SEARCH FEATURES

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Full-Text Search | Full | Full | Shared search lib |
| Semantic Search | Full | Missing | No toggle on mobile |
| Search Filters | Full | Partial | Limited filter UI |
| Type Filter | Full | Partial | In MobileSearchModal |
| Date Range Filter | Full | Missing | No date picker filter |
| Search History | Full | Missing | No recent searches |
| Result Highlighting | Full | Partial | Basic highlighting |
| Result Snippets | Full | Full | Content preview shown |

---

## 11. TEMPLATES

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Browse Templates | Full | Full | MobileTemplatesView |
| Create Template | Full | Missing | No creation UI |
| Edit Template | Full | Missing | No editing UI |
| Apply Template | Full | Missing | Not wired to quick add |
| Daily Note Template | Full | Missing | Setting not accessible |
| Placeholder Expansion | Full | N/A | Backend shared |

---

## 12. TIME MACHINE (VERSION HISTORY)

| Feature | Desktop | Mobile | Gap Details |
|---------|---------|--------|-------------|
| Week Strip Navigator | Full | Missing | No equivalent |
| Timeline View | Full | Missing | No equivalent |
| Object Snapshots | Full | Missing | No equivalent |
| Diff Preview | Full | Missing | No equivalent |
| Restore Single Object | Full | Stub | TimeMachineSheet exists (placeholder) |
| Restore All from Date | Full | Missing | No equivalent |
| Undo/Redo | Full | Partial | UndoContext shared, no UI trigger |

---

## 13. MOBILE-EXCLUSIVE FEATURES

| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Bottom Tab Navigation | N/A | Full | 5 tabs |
| Floating Action Button | N/A | Full | Quick add |
| Swipe Actions | N/A | Full | SwipeableRow component |
| Pull to Refresh | N/A | Full | PullToRefresh component |
| Action Sheets | N/A | Full | iOS-style menus |
| Biometric Unlock | N/A | Full | Face ID, Touch ID, Fingerprint |
| QR Code Scanning | N/A | Full | Device pairing, key import |
| Safe Area Handling | N/A | Full | Notch, home indicator |
| Long Press Menus | N/A | Full | Context actions |

---

## Critical Gaps Requiring Attention

### Priority 1 - Blocking Daily Use
1. **Rich Text Editor (BlockNote)** - Cannot edit note/task content on mobile
2. **Property Editors** - Cannot modify object properties
3. **Settings Sheets** - Account, Sync, Data panels are stubs

### Priority 2 - Important Workflows
4. **Time Machine** - No version history or restore capability
5. **Recurrence Editor** - Cannot set up recurring tasks
6. **Import/Export** - No data portability on mobile

### Priority 3 - Polish & Convenience
7. **Template Management** - View only, cannot create/edit
8. **Semantic Search** - No AI search toggle
9. **Command Palette** - No quick actions menu
10. **Duplicate Object** - Missing convenience feature

---

## Recommended Implementation Order

### Phase 1: Content Editing (Critical)
1. Mobile BlockNote integration or alternative editor
2. Property editor sheets (text, date, select, relation)
3. @Mention support in editor

### Phase 2: Settings & Configuration
4. Sync settings sheet (device management)
5. Account settings sheet (device info)
6. Data settings sheet (basic export)

### Phase 3: Task Workflows
7. Task status/priority editing
8. Due date picker
9. Recurrence editor (simplified)

### Phase 4: Advanced Features
10. Time Machine sheet (basic restore)
11. Template creation
12. Semantic search toggle

---

## Files to Create/Modify

**New Files Needed:**
- `src/components/mobile/editor/MobileEditor.tsx` - Mobile content editor
- `src/components/mobile/sheets/DatePickerSheet.tsx` - Date selection
- `src/components/mobile/sheets/StatusPickerSheet.tsx` - Status selection
- `src/components/mobile/sheets/PriorityPickerSheet.tsx` - Priority selection
- `src/components/mobile/sheets/RecurrenceSheet.tsx` - Recurrence editor

**Files to Update:**
- `src/components/mobile/sheets/PropertyEditorSheet.tsx` - Implement editors
- `src/components/mobile/sheets/SyncSettingsSheet.tsx` - Device management
- `src/components/mobile/sheets/AccountSettingsSheet.tsx` - Device info
- `src/components/mobile/sheets/DataSettingsSheet.tsx` - Export options
- `src/components/mobile/views/MobileObjectDetailView.tsx` - Editor integration

---

## Architecture Notes

**Shared Infrastructure (Ready for Mobile):**
- All React contexts work on both platforms
- Loro CRDT store is platform-agnostic
- Crypto operations work via Tauri backend
- Sync (P2P and Cloud) is fully functional
- All business logic hooks are shared

**Mobile-Specific Patterns Established:**
- Bottom sheet modals for editing
- Swipe gestures for quick actions
- FAB for primary creation
- Safe area handling for iOS
- Biometric authentication flow

The mobile foundation is solid - the main work is building out the editing UI and connecting stubbed sheets to the shared business logic.
