# Skelenote Product Roadmap

> **Living document** — Tracks planned releases, features, and strategic priorities.

> **Live Tracking:** [Linear Team](https://linear.app/skeletorjs/team/skelenote)

---

## Release Overview

| Version | Codename | Theme | Status |
|---------|----------|-------|--------|
| **v0.1** | Foundation | Core productivity system | ✅ Shipped |
| **v0.2** | Exodus | Data freedom & portability | ✅ Shipped |
| **v0.3** | Pocket | Mobile apps & notifications | ✅ Shipped |
| **v0.35** | Architect | Custom object types & extensibility | 📋 Planned |
| **v0.4** | Oracle | Sovereign AI on-device | 📋 Planned |
| **v0.5** | Sentinel | Security hardening | 📋 Planned |
| **v1.0** | Cartographer | Visualization & spatial | 💭 Exploring |

---

## Competitive Analysis

For detailed comparisons with other tools in the privacy-focused note-taking space:

| Document | Description |
|----------|-------------|
| [Notesnook Comparison](./docs/product/competitive/notesnook-comparison.md) | Feature-by-feature analysis vs. our closest encrypted competitor |
| [Competitive Landscape](./docs/product/competitive/competitive-landscape.md) | Comprehensive overview of 20+ tools across privacy, sync, pricing |

**Key Gaps Identified:**

| Gap | Priority | Target Release |
|-----|----------|----------------|
| Mobile apps | Critical | ✅ v0.3 |
| Reminders & notifications | High | ✅ v0.3 |
| Import wizards (Notion, Obsidian) | High | ✅ v0.2 |
| PDF export | Medium | ✅ v0.2 |
| App lock (auto-lock) | Medium | v0.5 |
| Secondary vault | Medium | v0.5 |
| Two-factor auth (2FA) | Medium | v0.5 |
| LaTeX/KaTeX math support | Medium | v1.0 |
| Audio/video embeds | Medium | v1.0 |
| Encrypted file attachments | Medium | v1.0 |
| Callouts/Alert blocks | Low | v1.0 |
| Table of Contents | Low | v1.0 |
| Editor statistics | Low | v1.0 |
| System tray menu | Low | v1.0 |
| Auto-start on startup | Low | v1.0 |

---

## v0.1 — Foundation

*The encrypted productivity system that works offline.*

**Status:** ✅ Shipped  
**Version:** `0.1.0-alpha.1`

This release establishes the core Skelenote experience: a local-first, encrypted productivity system with native task management and P2P sync.

### Core Engine & Security

| Feature | Description | Status |
|---------|-------------|--------|
| **Tauri 2.0 + Rust** | Native desktop app—no Electron, no bloat, ~15MB binary | ✅ |
| **Local-first** | All data stored locally in `~/.local/share/skelenote/` | ✅ |
| **XChaCha20-Poly1305** | Military-grade encryption with 192-bit nonce (safe for random generation) | ✅ |
| **24-word Skeleton Key** | BIP39 mnemonic for human-readable key backup | ✅ |
| **Loro CRDTs** | Time Machine lets you reset any object to any previous state | ✅ |
| **Campfire P2P** | mDNS discovery + direct TCP sync on local network | ✅ |
| **Cloud Relay** | Optional WebSocket relay for remote sync | ✅ |
| **Device Revocation** | Block compromised devices from syncing | ✅ |
| **Device Fingerprint** | Visual verification (first 8 hex chars of user ID hash) | ✅ |

### Structure (PARA + Objects)

| Feature | Description | Status |
|---------|-------------|--------|
| **Projects** | First-class object type for goal-oriented work | ✅ |
| **Areas** | Ongoing responsibilities with no end date | ✅ |
| **Tags** | Colored tags for resources and categorization | ✅ |
| **Archive** | Soft-delete property with dedicated view | ✅ |
| **Daily Notes** | Deterministic IDs (`note-YYYY-MM-DD`), auto-creation | ✅ |
| **Inbox** | Unified processing queue (`inboxed: true` on new objects) | ✅ |
| **Relations** | Typed, bidirectional backlinks computed on demand | ✅ |
| **9 Object Types** | Task, Note, Project, Area, Tag, Person, Meeting, Link, Template | ✅ |

### Workflow Tools

| Feature | Description | Status |
|---------|-------------|--------|
| **Task Management** | Status (todo/in-progress/waiting/done), 4 priority levels, due dates | ✅ |
| **Recurring Tasks** | Daily, weekly, monthly, quarterly, yearly with complex patterns | ✅ |
| **Task Filters** | Today, This Week, Overdue, Waiting, Eventually, Completed | ✅ |
| **Zen Mode** | Distraction-free writing with `Cmd+Shift+Z` | ✅ |
| **Omnibar** | Command palette for keyboard-first navigation (`Cmd+K`) | ✅ |
| **Quick Capture** | Create objects from anywhere in the app | ✅ |
| **Templates** | 9 placeholders: `{{date}}`, `{{time}}`, `{{tomorrow}}`, etc. | ✅ |
| **Daily Note Templates** | Auto-apply template to new daily notes | ✅ |
| **Saved Views** | Custom filtered views based on properties | ✅ |
| **Light/Dark Themes** | Native OS integration with manual override | ✅ |

### Intelligence

| Feature | Description | Status |
|---------|-------------|--------|
| **Semantic Search** | Local vector embeddings via Fuse.js + TensorFlow.js | ✅ |
| **Similarity Threshold** | Adjustable relevance cutoff for semantic matches | ✅ |
| **Zero Cloud** | All embeddings computed locally, nothing sent to servers | ✅ |

### Data Export

| Feature | Description | Status |
|---------|-------------|--------|
| **Vault Export** | Organized ZIP with folders by object type | ✅ |
| **Markdown Export** | Individual notes with YAML frontmatter | ✅ |
| **JSON Export** | Loro format for backup/restore | ✅ |

---

## v0.2 — Exodus

*Your data, your format, your choice.*

**Status:** ✅ Shipped  
**Version:** `0.2.0`

This release delivers complete data portability—import from anywhere, export to any format, leave anytime.

> [!IMPORTANT]
> This release completes data portability. Users should never feel locked into Skelenote—import from anywhere, export to any format, leave anytime.

### Phase 1: Enhanced Export (Weeks 1-2)

Export your work in the format that suits your needs.

| Format | Description | Effort |
|--------|-------------|--------|
| **PDF** | Styled documents with Skelenote typography, light/dark variants | 3-4 days |

**Technical Implementation:**

```typescript
// PDF: Client-side generation with @react-pdf/renderer
const pdf = await generatePDF(object, content, { theme: 'dark' });

// All exports: Lazy-loaded to minimize bundle impact
const { generatePDF } = await import('@/lib/export/pdf');
```

**Image Handling:** Base64 data URIs embedded in all formats for self-contained exports.

**Files:** `src/lib/export/pdf.tsx`, `markdown.ts`

**UI Entry Points:**

- Document menu → "Export as..."
- Right-click context menu
- Keyboard: `Cmd+Shift+E`
- Batch export: Select multiple → export as merged file or ZIP

---

### Phase 2: The Exodus Wizards (Weeks 3-5)

Import tools that preserve structure, not just content.

| Source | What's Preserved | Effort |
|--------|------------------|--------|
| **Notion** | Databases → Object Types, pages → Notes, Status → Task status, Multi-select → Tags | 2-3 days |
| **Obsidian** | YAML frontmatter → Properties, `[[wiki-links]]` → Relations (if target exists), `#tags` → Tags | 2-3 days |
| **Markdown** | YAML frontmatter, folder structure as Projects/Areas | Included |
| **JSON Backup** | Full restore with conflict options (skip/replace/duplicate) | 1 day |
| **Apple Notes** | HTML export parsing (lower priority) | 3-4 days |

**Core Dependency:** Markdown-to-BlockNote converter (3-4 days)

**Design Decisions:**

| Decision | Rationale |
|----------|-----------|
| **No auto-duplicate detection** | Everyone's data structure is different—let users decide |
| **User confirms type mapping** | Preview shows detected types, user can override before import |
| **Unresolved wiki-links → plaintext** | Preserves information without creating orphan objects |
| **Rollback via Time Machine** | Imports are CRDT operations—revert entire import if needed |
| **Import to Inbox** | All imported objects arrive with `inboxed: true` for triage |

**UI Flow:**

1. Settings → Data → Import Data
2. Source selector (icons for Notion, Obsidian, Markdown, JSON, Apple Notes)
3. File/folder picker with source-specific instructions
4. Preview with type inference (editable)
5. Progress bar with document count and ETA
6. Success summary with "View in Inbox" button

**Files:** `src/lib/import/`, `src/components/import/ImportModal.tsx`

---

### Phase 3: Editor & Desktop Polish

| Feature | Description | Status |
|---------|-------------|--------|
| **Markdown pasting** | Paste markdown text → convert to rich text | ✅ |
| **Custom Tag Colors** | Expand from 6 presets to full color picker | ✅ |
| **Improved Tree Sidebar** | Collapsible nested hierarchy for Projects/Areas | ✅ |

**Deferred to v1.0:**

- Callouts/Alert blocks (info, warning, tip, caution styled blocks)
- Editor Statistics (word count, character count, reading time)
- Table of Contents (auto-generated from headings)
- System tray menu
- Auto-start on startup

---

### Phase 4: Documentation & Polish

| Deliverable | Description |
|-------------|-------------|
| **"Sharing Your Vault" Guide** | When to use Skeleton Key vs. Export, secure sharing methods |
| **"Exporting Data" Guide** | Format comparison, best practices, bulk export tips |
| **"Importing Data" Guide** | Step-by-step for each source with screenshots |
| **In-App Skeleton Key Warnings** | Updated reveal flow with export suggestions |

**Files:** `docs/user/guides/sharing-vault.md`, `exporting-data.md`, `importing-data.md`

---

### Bundle Optimization

| Target | Action | Impact |
|--------|--------|--------|
| `@react-pdf/renderer` | Dynamic `import()` | ~500KB removed from initial bundle |
| `TimeMachine` | `React.lazy()` route | Only loads when visiting history |
| `TemplateEditor` | Lazy modal | Only loads when editing templates |
| `SemanticSearch` | Defer TensorFlow | Only loads on first search |

Verify with `vite-plugin-visualizer` before/after.

---

## v0.3 — Pocket

*Skelenote in your pocket.*

**Status:** ✅ Shipped  
**Version:** `0.3.0`

> [!NOTE]
> v0.3 Pocket delivered native iOS/Android apps with full feature parity—not a companion app, the real thing. Mobile is available via TestFlight (iOS) and APK download (Android).

### Native Mobile Apps

| Platform | Technology | Distribution |
|----------|------------|--------------|
| **iOS** | Tauri 2.0 Mobile (WRY + wkwebview) | App Store + TestFlight |
| **Android** | Tauri 2.0 Mobile (WRY + WebView) | Play Store + APK |

**Feature Parity:**

- Full editor with BlockNote
- All object types and properties
- Campfire P2P sync (WiFi/Bluetooth)
- Cloud relay sync
- Zen Mode
- Omnibar (adapted for touch)

**Mobile-Specific UX:**

- Swipe gestures for navigation (back, archive, complete)
- Pull-to-refresh for sync
- Share sheet integration (receive text, URLs, images)
- Widget for Quick Capture (iOS) / App Shortcuts (Android)
- Haptic feedback on key interactions

**Technical Challenges:**

- Background sync while app is suspended
- Battery optimization (sync on WiFi only option)
- Large vault performance on older devices

---

### Secure Device Linking

*One-time, time-bound, visually-verified device pairing.*

[Detailed planning](./docs/product/planning/data-portability/05-secure-device-linking.md)

**Problem:** Transferring 24-word mnemonic is risky (shoulder surfing, no expiration, no verification).

**Solution:** Ephemeral key exchange protocol:

```
Source Device (has key)          Target Device (new)
────────────────────────         ───────────────────
1. Generate ephemeral X25519     
2. Display QR: pubkey+session    
                           ←───  3. Scan QR with camera
4. Wait for mDNS connection      5. Derive shared secret
                           ────→ 6. Send encrypted hello
7. Display 4-digit code          8. Display same code
9. User confirms match           
10. Encrypt & send Skeleton Key  
                           ────→ 11. Decrypt & unlock vault
12. Invalidate session           
```

**Security Properties:**

| Property | How Achieved |
|----------|--------------|
| One-time use | Session UUID invalidated after use or 5-min timeout |
| Forward secrecy | Ephemeral X25519 keypairs (destroyed after session) |
| MITM protection | 4-digit visual verification code |
| Local-only | mDNS discovery, no internet required |
| No raw mnemonic in QR | QR contains only public key + session ID |

**QR Format (v2):** `skelenote:v2/<base64_pubkey>/<session_uuid>/<unix_timestamp>`

**Fallback:** Manual mnemonic entry always available.

---

### Reminders & Notifications

*Complete the task management story.*

| Feature | Description |
|---------|-------------|
| **Due Date Reminders** | Notify at due date/time (configurable: at time, 1hr before, 1 day before) |
| **Custom Reminders** | Set arbitrary reminder on any object |
| **Snooze** | Quick reschedule: 1hr, tomorrow, next week, custom |
| **Push Notifications** | Native iOS/Android notifications |
| **Desktop Notifications** | System tray alerts with click-to-open |
| **Badge Count** | Number of overdue/due-today tasks on app icon |
| **Reminder Settings** | Central control: quiet hours, notification sounds, default lead time |

**Technical Notes:**

- Desktop: Tauri notification plugin
- iOS: UserNotifications framework
- Android: NotificationManager with channels
- Local scheduling—no server required

---

### Graph View

*Visualize your vault's connections.*

| Feature | Description |
|---------|-------------|
| **Force-directed layout** | D3.js or force-graph for physics simulation |
| **Node colors** | By object type (using type icon colors) |
| **Edge types** | Visual distinction: relation property vs. @mention |
| **Type filter** | Toggle visibility by object type |
| **Date filter** | Slider for created/modified date range |
| **Search highlight** | Find node and zoom to it |
| **Click navigation** | Select node → open in detail pane |
| **Local vs. Global** | Start from one object or show entire vault |
| **Performance** | Virtual rendering for vaults with 1000+ objects |

---

## v0.35 — Architect

*Build your own object types.*

**Status:** 📋 Planned
**Version:** `0.35.0`

> [!IMPORTANT]
> This release transforms Skelenote from a fixed 9-type system into a fully extensible platform. Create custom object types, customize built-in types, and toggle features on/off.

### Type Management

| Feature | Description | Status |
|---------|-------------|--------|
| **Built-in Type Settings** | Toggle built-in types on/off (hide from UI, preserve data) | 🔲 |
| **Type Visibility** | Objects of disabled types hidden but accessible via direct link | 🔲 |
| **Built-in Customization** | Add/hide properties on built-in types, rename display names | 🔲 |
| **Reset to Defaults** | Restore built-in types to original schema | 🔲 |

### Custom Object Types

| Feature | Description | Status |
|---------|-------------|--------|
| **Schema Sync** | Type definitions stored in Loro CRDT, sync across devices | 🔲 |
| **Property Builder** | Visual UI to add/remove/reorder properties with type selector | 🔲 |
| **Icon Picker** | Searchable Lucide icon grid with categories | 🔲 |
| **Type Creation** | Create types with name, icon, properties, hasContent toggle | 🔲 |
| **Template Assignment** | Associate templates with custom types | 🔲 |
| **Relation Targeting** | Custom types available as relation targets, backlinks work | 🔲 |

### CODE Object Type (Optional)

| Feature | Description | Status |
|---------|-------------|--------|
| **CODE Type Definition** | New built-in type for code snippets (opt-in) | 🔲 |
| **Code Editor** | Syntax highlighting, line numbers, proper indentation | 🔲 |
| **Language Selector** | 20+ languages with auto-detection | 🔲 |
| **Theme Support** | Light/dark syntax themes matching app theme | 🔲 |

### Type Import/Export (Nice-to-Have)

| Feature | Description | Status |
|---------|-------------|--------|
| **Export Type Definition** | Export custom type as JSON for sharing | 🔲 |
| **Import Type Definition** | Import JSON with conflict handling | 🔲 |
| **Type Presets** | Gallery of pre-built types (Recipe, Book, Workout, etc.) | 🔲 |

---

## v0.4 — Oracle

*AI that respects your privacy.*

**Status:** 📋 Planned  
**Version:** `0.4.0`  

> [!TIP]
> Every AI feature runs entirely on-device. Download models once, use forever, offline. Your journals and meeting notes never leave your hardware.

### Local Whisper

*Unlimited voice transcription, completely offline.*

| Feature | Description |
|---------|-------------|
| **Model Support** | Whisper tiny (75MB), base (150MB), small (500MB), medium (1.5GB), large (3GB) |
| **Languages** | 99 languages supported by Whisper |
| **Record Inline** | Microphone button in editor → transcribe directly to content |
| **Audio Files** | Drag-and-drop audio file → transcribe |
| **Meeting Transcription** | Create Meeting object with auto-transcribed content |
| **Daily Note Integration** | Voice notes append to today's daily note |
| **Timestamps** | Optional timestamp markers in transcription |

**Technical Implementation:**

- `whisper.cpp` compiled to WASM or native via Tauri
- Models stored in `~/.local/share/skelenote/models/`
- First-use download with progress indicator
- Settings: Choose model size (tradeoff: accuracy vs. speed vs. disk space)

---

### Local AI Copilot

*Your personal AI assistant that lives on your device.*

| Feature | Description |
|---------|-------------|
| **Model Support** | Llama 3.2 (3B, 8B), Mistral 7B, Phi-3, Qwen 2 |
| **Auto-Tagging** | Analyze content → suggest relevant tags |
| **Summarization** | Generate summary for long notes (1-2 paragraphs) |
| **Writing Assist** | Expand (more detail), condense (shorter), rewrite (different tone) |
| **Type Detection** | Suggest object type based on content patterns |
| **Chat Interface** | Ask questions about your vault ("What did I write about X?") |
| **Context Window** | Use multiple related objects as context |

**Technical Implementation:**

- `llama.cpp` or `mlc-llm` for inference
- Models stored in `~/.local/share/skelenote/models/`
- Quantized models (Q4_K_M) for reasonable hardware requirements
- GPU acceleration via Metal (macOS), CUDA (Linux/Windows with GPU)

**Privacy Guarantee:** No network calls. No telemetry. Model weights are static files on your disk.

---

### Enhanced Search

| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | "What did I decide about the Q3 budget?" |
| **Search Filters** | Filter by type, date range, properties, tags |
| **Boolean Operators** | AND, OR, NOT support |
| **Saved Searches** | Bookmark frequent queries |
| **Search History** | Recent searches with one-click re-run |

---

## v0.5 — Sentinel

*Trust, but verify.*

**Status:** � Planned  
**Version:** `0.5.0`  

> [!IMPORTANT]
> This release hardens security for users with elevated threat models—journalists, lawyers, healthcare workers, activists.

### Auto-Lock

| Feature | Description |
|---------|-------------|
| **Inactivity Timeout** | Lock after 5/15/30/60 minutes of no input |
| **Lock on Sleep** | Auto-lock when system sleeps or lid closes |
| **Lock on Screen Saver** | Sync with OS screen saver |
| **Manual Lock** | `Cmd+L` to lock immediately |
| **Lock Screen** | Blurred vault preview with unlock prompt |

---

### Biometric Unlock

| Feature | Description |
|---------|-------------|
| **Touch ID** | macOS Touch ID via LAContext |
| **Face ID** | iOS Face ID via LAContext |
| **Windows Hello** | Fingerprint/face via Windows.Security.Credentials |
| **Fallback** | Password/PIN if biometric fails |
| **Skip Biometric** | Option to require password on first unlock after reboot |

**Technical Notes:**

- Biometric unlocks the device key, which unlocks the master key
- Master key never stored in plaintext—always protected by device key
- Failed attempts trigger exponential backoff

---

### Secondary Vault (Sensitive Notes)

*Extra encryption layer for your most sensitive data.*

| Feature | Description |
|---------|-------------|
| **Vault Within Vault** | Objects marked as "Sensitive" get additional encryption |
| **Separate Password** | Optional second password (not derived from Skeleton Key) |
| **Plausible Deniability** | Sensitive vault invisible until unlocked |
| **Auto-Lock** | Sensitive vault locks independently (shorter timeout) |
| **No Sync Option** | Keep sensitive notes device-local only |

**Implementation Notes:**

- Sensitive objects encrypted with derived key from `SecureVaultPassword`
- Property `sensitiveVault: true` triggers UI treatment
- Search excludes sensitive objects unless vault is unlocked

---

### Key Rotation

*Update encryption without losing data.*

| Feature | Description |
|---------|-------------|
| **Generate New Key** | Create new 24-word mnemonic |
| **Re-encrypt Vault** | Decrypt with old key, re-encrypt with new key |
| **Progress Indicator** | For large vaults, show re-encryption progress |
| **Device Re-sync** | All devices must re-authenticate after rotation |
| **Old Key Revocation** | Previous Skeleton Key no longer unlocks vault |

**Use Cases:**

- Skeleton Key compromised
- Periodic security hygiene
- Removing access from untrusted device when revocation isn't enough

---

### Two-Factor Authentication (2FA)

| Feature | Description |
|---------|-------------|
| **TOTP Support** | Google Authenticator, Authy, 1Password, etc. |
| **Backup Codes** | One-time recovery codes for emergencies |
| **Required for Key Reveal** | 2FA required before showing Skeleton Key |
| **Device Trust** | Remember trusted devices for 30 days |

**Note:** 2FA protects the app unlock, not the encryption itself (Skeleton Key is the encryption key).

---

### Privacy Mode

| Feature | Description |
|---------|-------------|
| **Blur on Inactivity** | Blur content after 30s/1m/5m of no input |
| **Blur on Window Switch** | Blur when app loses focus |
| **Quick Toggle** | `Cmd+Shift+P` to toggle blur on/off |
| **Exclude Sidebar** | Keep navigation visible while content blurred |

---

### Security Audit Preparation

| Deliverable | Description |
|-------------|-------------|
| **Threat Model Document** | Published threat model and trust boundaries |
| **Cryptography Review** | Documentation of all crypto primitives and usage |
| **Audit Scope** | Defined scope for third-party security audit |
| **Bug Bounty** | Responsible disclosure policy and rewards |

---

## v1.0 — Cartographer

*Map your thinking.*

**Status:** 💭 Exploring  
**Version:** `1.0.0`  

> This release marks stable API, mature feature set, and readiness for production use. Features may shift based on user feedback during alpha/beta.

### Canvas View

*Spatial thinking board for visual organization.*

| Feature | Description |
|---------|-------------|
| **Infinite Canvas** | Pan and zoom with React Flow |
| **Drag from Sidebar** | Place objects spatially on canvas |
| **Freeform Shapes** | Rectangles, circles, arrows (not just objects) |
| **Connection Lines** | Drag to connect objects with labeled edges |
| **Mini-Map** | Overview panel for large canvases |
| **Multiple Canvases** | Create named canvases as a new object type |
| **Canvas Export** | Save as PNG, SVG, or PDF |

---

### Advanced Editor

| Feature | Description |
|---------|-------------|
| **LaTeX/KaTeX** | Math formula rendering with `$...$` and `$$...$$` syntax |
| **Chemistry (mhchem)** | Chemical formula rendering via KaTeX mhchem extension |
| **Audio Blocks** | Upload or record audio, inline playback |
| **Video Blocks** | Upload video or embed from URL, inline playback |
| **File Attachments** | Encrypted files attached to objects with preview |
| **Syntax Highlighting** | Language detection for code blocks |
| **Mermaid Diagrams** | Inline diagram rendering |

**Note:** Audio/video/file blocks store data in encrypted Loro blob storage, synced via CRDT.

---

### Extended Imports

*More migration paths for users leaving other apps.*

| Source | Status |
|--------|--------|
| **Evernote** | ENEX file parsing → Notes with attachments |
| **Google Keep** | Google Takeout JSON → Notes with checklists |
| **Bear** | Markdown with Bear tags → Notes + Tags |

---

### Desktop Polish

*Deferred from v0.2.*

| Feature | Description |
|---------|-------------|
| **Table of Contents** | Auto-generated from headings, collapsible sidebar |
| **System tray menu** | Quick access: new note, search, recent items |
| **Auto-start on startup** | Optional launch on system boot |

---

### API & Automation

| Feature | Description |
|---------|-------------|
| **Local API** | HTTP server on localhost for integrations |
| **Shortcuts (macOS)** | Siri Shortcuts actions for Quick Capture |
| **CLI Tool** | `skelenote` command for scripting |
| **URL Scheme** | `skelenote://` for deep linking |

---

## Open Source Packages

Beyond the core app, we're extracting reusable components as open-source packages.

### `skeleton-key` (Rust crate)

*BIP39 mnemonic key management with HKDF derivation.*

[Detailed planning](./docs/product/planning/packages/zero-knowledge-sync-package.md)

```rust
use skeleton_key::{generate_mnemonic, mnemonic_to_master_key, derive_key, encrypt};

let mnemonic = generate_mnemonic()?;  // "abandon ability able..."
let master = mnemonic_to_master_key(&mnemonic)?;
let sync_key = derive_key(&master, "my-app-sync-v1", "encryption");
let ciphertext = encrypt(&sync_key, plaintext)?;
```

| Feature | Description |
|---------|-------------|
| Mnemonic Generation | 24-word BIP39 phrases (256-bit entropy) |
| Key Derivation | HKDF-SHA256 with domain separation |
| Encryption | XChaCha20-Poly1305 (24-byte nonce) |
| Secure Storage | Optional OS keychain integration (`#[cfg(feature = "keychain")]`) |

**License:** MIT OR Apache-2.0

---

### `crypt-sync` (Rust + npm)

*Binary wire protocol for encrypted CRDT sync.*

[Detailed planning](./docs/product/planning/packages/zero-knowledge-sync-package.md)

| Message | Code | Description |
|---------|------|-------------|
| `HELLO` | `0x01` | Handshake with device ID, protocol version |
| `UPDATE` | `0x02` | Encrypted Loro CRDT update |
| `SNAPSHOT` | `0x04` | Full encrypted snapshot |
| `ACK` | `0x05` | Acknowledgment with session count |
| `PING/PONG` | `0x06-07` | Keep-alive |

**Wire Format:** `[type: 1 byte][length: 4 bytes LE][payload: N bytes]`

**License:** MIT OR Apache-2.0

---

### `blocknote-diff` (npm)

*Block-level diffing for BlockNote documents.*

[Detailed planning](./docs/product/planning/packages/blocknote-diff-package.md)

```typescript
import { computeContentDiff } from 'blocknote-diff';

const diff = computeContentDiff(historicalContent, currentContent);
// diff.summary: { added: 2, removed: 1, modified: 3, unchanged: 10 }
```

| Feature | Description |
|---------|-------------|
| Content Diff | Block-level add/remove/modify detection |
| Property Diff | Track metadata changes |
| Content Matching | Hash-based matching (ignores block ID changes) |
| React Component | Optional `<DiffViewer />` component |

**License:** MIT

---

## Feature Ideas (Backlog)

Features we're considering but haven't scheduled. Vote on [GitHub Discussions](https://github.com/skeletor-js/skelenote/discussions).

| Feature | Description | Fits Ethos? |
|---------|-------------|-------------|
| **Spaced Repetition** | Flashcard system integrated with notes | ✅ Local-only, enhances learning |
| **Pomodoro Timer** | Focus timer integrated with tasks | ✅ Productivity enhancement |
| **Journaling Prompts** | Daily prompts in daily note template | ✅ Templates already support this |
| **Habit Tracking** | Recurring checkbox with streak visualization | ✅ Extension of task system |
| **Read-it-Later** | Save URLs for later reading with offline cache | ✅ Local-first content capture |
| **OCR on Images** | Extract text from images locally | ✅ Tesseract runs locally |
| **Handwriting Recognition** | Apple Pencil → text (iOS only) | ✅ Native API, no cloud |
| **Custom Keyboard Shortcuts** | User-configurable hotkeys | ✅ Power user feature |
| **Print Support** | Native print dialog with formatting | ✅ Basic feature |
| **Localization (i18n)** | Multiple language support | ✅ Accessibility |

---

## Contributing

Have feature requests or feedback?

1. **Open an issue** on [GitHub](https://github.com/skeletor-js/skelenote/issues) with `feature-request` label
2. **Vote on ideas** in [GitHub Discussions](https://github.com/skeletor-js/skelenote/discussions)
3. **Join Discord** for real-time discussion
4. **Check planning docs** in [`docs/product/planning/`](./docs/product/planning/) for detailed specs

### Prioritization Framework

We prioritize based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| **User Demand** | High | What are people asking for? Volume of requests. |
| **Strategic Fit** | High | Does it reinforce our differentiation? |
| **Competitive Gap** | Medium | What do users expect from alternatives? |
| **Implementation Effort** | Medium | Quick wins vs. multi-week projects |
| **Ethos Alignment** | Required | Must be local-first, privacy-respecting, single-player |

### What We Won't Build

| Feature | Why Not |
|---------|---------|
| Real-time collaboration | Unapologetically single-player—export and share instead |
| Web app | Desktop-first philosophy |
| Plugin ecosystem | We build features natively for quality and security |
| Web clipper | Import/export handles content capture |
| Server-side AI | All AI runs locally or not at all |
| Team features | Skelenote is a personal tool |

---

*Last updated: January 2026*
