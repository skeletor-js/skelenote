# Confidently Single-Player: Export, Import & Sharing Strategy

> **Philosophy**: "Skelenote is your private second brain. For collaboration, export and use tools built for that."

Being unapologetically single-player is a **differentiator** in a market where every app is trying to add multiplayer.

---

## Executive Summary

After exploring collaboration features (Campfire Rooms, shared vaults, cross-key sync), we've concluded that **collaboration is not the right direction for Skelenote**. Instead, we're doubling down on being the best single-player experience with excellent sharing capabilities.

### What We're Building

| Feature | Purpose | Priority |
|---------|---------|----------|
| **Share as Link** | One-click read-only web view of any document | High |
| **Enhanced Export** | PDF, HTML, JSON, Plain Text (in addition to Markdown) | High |
| **Import** | Notion, Obsidian, Markdown files, JSON backup | High |
| **Skeleton Key Docs** | Clear documentation for high-trust vault sharing | Medium |

### What We're NOT Building

- Real-time collaboration (Campfire Rooms)
- Cross-vault sharing with different Skeleton Keys
- Multi-user permissions within a vault
- Comments or suggestions on shared documents

---

## 1. Share as Link

### Overview

Users can generate a shareable link for any document. The link leads to a read-only web view where others can see the content without installing Skelenote.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Share" in Skelenote                           │
│  ↓                                                          │
│  Client encrypts document with random AES-256-GCM key       │
│  ↓                                                          │
│  Encrypted blob uploaded to Cloudflare R2                   │
│  ↓                                                          │
│  URL returned: skelenote.sh/s/{id}                         │
│  Access code: XXXX-XXXX-XXXX-XXXX (shown separately)        │
│  ↓                                                          │
│  Recipient visits URL, enters access code                   │
│  ↓                                                          │
│  Browser decrypts client-side, renders read-only view       │
└─────────────────────────────────────────────────────────────┘
```

### Security Model

**Critical Design Decision**: Access code is entered separately, NOT in the URL.

This prevents:
- Key appearing in browser history
- Key syncing via Chrome/Firefox sync
- Key being captured by browser extensions with `tabs` permission

| Property | Implementation |
|----------|---------------|
| **Zero-knowledge** | Server stores ciphertext but not keys |
| **End-to-end encrypted** | Decryption happens client-side only |
| **Integrity protection** | Commitment scheme prevents blob swapping |
| **Revocation support** | Capability tokens can be revoked server-side |
| **Expiration** | Time-based and view-count limits enforced |

### Features

- **Password protection** (optional): Argon2id key derivation (64MB memory-hard)
- **Expiration**: 1 hour, 1 day, 7 days, 30 days, or never
- **View limits**: Optional max view count
- **Revocation**: Owner can revoke access anytime
- **View tracking**: See how many times link was accessed

### UX Flow

1. User presses `Cmd+Shift+L` or clicks "Share link" in document menu
2. Modal opens with options:
   - Password protection (toggle)
   - Expiration dropdown
   - Warning about snapshot nature
3. Click "Create Link"
4. Success state shows:
   - Link (copy button)
   - Access code (copy separately)
   - "Share link and code via different channels" guidance
5. Manage shares in Settings > Shared Links

### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Share Document as Link                              [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 Understanding CRDT Synchronization                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Protect with password                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Link expires: [ 7 days ▼ ]                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚠️ Anyone with this link can view this document.    │    │
│  │ The document is a snapshot - changes you make       │    │
│  │ after sharing won't appear in the link.             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                              [Cancel]  [Create Link]        │
└─────────────────────────────────────────────────────────────┘
```

### Technical Components

| Component | Technology | Effort |
|-----------|------------|--------|
| Cloudflare Worker | Hono/itty-router | 2-3 days |
| R2 blob storage | Cloudflare R2 | 1 day |
| Client encryption | Web Crypto API | 1-2 days |
| Share modal UI | Mantine | 1 day |
| Web viewer SPA | React + BlockNote read-only | 2-3 days |
| Manage shares UI | Mantine | 1 day |
| **Total** | | **8-11 days** |

### Security Mitigations

| Risk | Mitigation |
|------|------------|
| Key in browser history | Two-part share (URL + access code entered separately) |
| Browser extension interception | User warning, recommend incognito mode |
| Blob swapping attack | Commitment scheme with AAD in AEAD |
| Weak password brute-force | Argon2id with 64MB memory cost |
| No revocation | Capability token system with server-side enforcement |

---

## 2. Enhanced Export

### Current State

Existing export (`src/lib/export/`) provides:
- Single object to Markdown
- Bulk export to ZIP (Markdown with YAML frontmatter)

### New Formats

#### PDF Export

**Specification**:
- Styled PDF with Skelenote typography
- Respects light/dark mode preference
- Includes metadata header block
- Proper handling of code blocks, lists, tables

**Technology**: `@react-pdf/renderer` (client-side generation)

```typescript
// src/lib/export/pdf.ts
import { Document, Page, Text, View } from '@react-pdf/renderer';

export async function generatePDF(
  object: SkelenoteObject,
  content: BlockNoteBlock[],
  options: { theme: 'light' | 'dark' }
): Promise<Blob> {
  // Render BlockNote content to React PDF components
}
```

#### HTML Export

**Specification**:
- Standalone HTML file with embedded CSS
- No external dependencies
- Identical rendering to PDF
- Includes metadata in `<meta>` tags

```typescript
// src/lib/export/html.ts
export function generateHTML(
  object: SkelenoteObject,
  content: string,
  resolveObjectName: (id: string) => string | undefined
): string {
  // Convert BlockNote to HTML with embedded styles
}
```

#### JSON Export (Full Fidelity)

**Specification**:
- Complete object data including all properties
- BlockNote content in original JSON format
- Type definitions included
- Relations preserved as IDs
- Suitable for backup/restore

```typescript
interface SkelenoteExportJSON {
  version: '1.0';
  exportedAt: string;
  objects: Array<{
    object: SkelenoteObject;
    content: BlockNoteBlock[] | null;
  }>;
  types: TypeDefinition[];
}
```

#### Plain Text Export

**Specification**:
- Simple text fallback
- No formatting, just content
- Mentions rendered as `@Name`

### Handling @Mentions

| Format | Mention Rendering |
|--------|-------------------|
| Markdown | `[[Object Name]]` wiki-links |
| PDF/HTML | Styled chips (non-clickable) |
| JSON | Preserve original IDs |
| Plain Text | `@Object Name` |

### Export UI

**Entry Points**:
- Document menu > "Export as..."
- Right-click context menu
- Keyboard: `Cmd+Shift+E`

**Modal Flow**:
1. Format selector (radio buttons with descriptions)
2. Format-specific options (conditional)
3. Preview toggle (optional)
4. Export button triggers native file picker

**Batch Export**:
- When multiple documents selected
- "Merge into single file" toggle
- Creates ZIP if not merged

### Effort Estimate

| Component | Effort |
|-----------|--------|
| PDF export with @react-pdf/renderer | 3-4 days |
| HTML export (standalone) | 1 day |
| JSON export (full fidelity) | 0.5 day |
| Plain text export | 0.5 day |
| Export menu UI updates | 1 day |
| **Total** | **6-7 days** |

---

## 3. Import

### Supported Sources

#### Notion Import

**Input**: Notion's "Export" format (ZIP with Markdown + CSV)

**Mapping**:
| Notion | Skelenote |
|--------|-----------|
| Page | Note |
| Database row | Inferred type based on properties |
| Status property | status |
| Date property | dueDate or date |
| Multi-select | tags (creates Tag objects) |
| Checkbox | checkbox |

**Flow**:
1. User exports from Notion as "Markdown & CSV"
2. User selects unzipped folder in Skelenote
3. Preview shows detected documents with type inference
4. User can override types before import
5. Import with progress indicator

#### Obsidian Import

**Input**: Folder of Markdown files (Obsidian vault)

**Features**:
- Parse YAML frontmatter for properties
- Convert `[[wiki-links]]` to Skelenote mentions
- Preserve folder structure as Projects/Areas (optional)
- Handle `#tags` in content

#### Markdown Files Import

**Input**: Individual .md files or folder

**Features**:
- Parse YAML frontmatter if present
- Convert Markdown to BlockNote format
- Infer type from content/frontmatter

#### JSON Import (Backup Restore)

**Input**: Skelenote JSON export

**Options**:
- Preserve IDs (complete restore) or generate new IDs (merge)
- Conflict handling: skip, replace, or duplicate

#### Apple Notes Import

**Input**: HTML export from Apple Notes

**Note**: Limited support due to proprietary format. Lower priority.

### Import UX

**Entry Point**: Settings > Data > "Import Data"

**Source Selection**:
```
┌─────────────────────────────────────────────────────────────┐
│  Import Data                                         [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Choose where to import from:                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Notion     │  │   Obsidian   │  │   Markdown   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Skelenote   │  │ Apple Notes  │  │  Plain Text  │      │
│  │   Backup     │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Import Configuration** (after source selected):
1. Source-specific instructions
2. File/folder picker
3. Preview with type inference
4. Options: skip duplicates, add to inbox, preserve dates
5. Import button with document count

**Progress State**:
- Progress bar with percentage
- Current document name
- Estimated time remaining
- Cannot close modal during import

**Success State**:
- Checkmark icon
- "Imported X documents" with breakdown by type
- Error summary if any failed
- "View in Inbox" button

### Effort Estimate

| Component | Effort |
|-----------|--------|
| Markdown to BlockNote converter | 3-4 days |
| Notion import | 2-3 days |
| Obsidian import | 2-3 days |
| JSON import (backup restore) | 1 day |
| Apple Notes import | 3-4 days |
| Import UI (modal, progress) | 2 days |
| **Total** | **13-17 days** |

---

## 4. Skeleton Key Sharing Documentation

### Current Capability

The Skeleton Key (24-word mnemonic) already enables vault sharing:
- Same Skeleton Key on multiple devices = same vault
- All data syncs via CRDT
- Zero-knowledge encryption preserved

### When to Use

**Good scenarios**:
- Sharing a family knowledge base with partner
- Giving a trusted assistant access to work notes
- Setting up a shared workspace with co-founder

**Not recommended for**:
- Casual collaboration (use Share as Link)
- Temporary access (no revocation without changing key)
- People you don't fully trust

### Documentation Updates

**User Guide**: "Sharing Your Vault with Family"
- Explain that sharing key = sharing EVERYTHING
- Emphasize full trust requirement
- Provide secure sharing methods (in-person, encrypted messaging)
- Point to alternatives (Share as Link, Export)

**In-App Messaging**:
- Warning when revealing Skeleton Key
- Clear labeling on device pairing flow
- Alternatives prominently displayed

### UX Improvements

**Skeleton Key Section** (Settings > Account):
```
┌─────────────────────────────────────────────────────────────┐
│  Skeleton Key                                               │
│                                                             │
│  Your 24-word recovery phrase. Treat this like a master     │
│  password - anyone with access can decrypt your entire      │
│  vault.                                                     │
│                                                             │
│                                        [Reveal Key]         │
└─────────────────────────────────────────────────────────────┘
```

**When Revealed**:
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ FULL ACCESS WARNING                                     │
│                                                             │
│  Anyone with this key can access ALL your documents         │
│  across all devices. Only share with people you trust       │
│  completely.                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  1. word    2. word    3. word    4. word    5. word       │
│  6. word    7. word    8. word    9. word   10. word       │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘

[Copy to Clipboard]  [Hide Key]

Instead of sharing your Skeleton Key, consider:
• Export specific documents (Settings > Data > Export)
• Create temporary share links (Document menu > Share link)
```

---

## 5. Implementation Roadmap

### Phase 1: Enhanced Export (Weeks 1-2)
**Goal**: Ship new export formats

- [ ] PDF export with @react-pdf/renderer
- [ ] HTML export (standalone file)
- [ ] JSON export (full fidelity backup)
- [ ] Plain text export
- [ ] Update export menu UI
- [ ] Batch export improvements

**Why first**: Lowest risk, immediate user value, builds infrastructure for Share as Link.

### Phase 2: Share as Link (Weeks 3-4)
**Goal**: Ship read-only web sharing

- [ ] Cloudflare Worker setup
- [ ] R2 blob storage integration
- [ ] Client-side encryption utilities
- [ ] Share modal UI
- [ ] Web viewer SPA (BlockNote read-only)
- [ ] Capability token system (expiration, revocation)
- [ ] Password protection (Argon2id)
- [ ] Manage shares UI

**Why second**: High user demand, differentiating feature.

### Phase 3: Import (Weeks 5-7)
**Goal**: Ship import from major sources

- [ ] Markdown to BlockNote converter (core dependency)
- [ ] JSON import (backup restore) - quick win
- [ ] Markdown files import
- [ ] Obsidian import
- [ ] Notion import
- [ ] Import UI (source selector, preview, progress)
- [ ] Apple Notes import (if time permits)

**Why third**: Critical for user acquisition from other apps.

### Phase 4: Documentation (Ongoing)
**Goal**: Clear guidance on data portability and sharing

- [ ] User guide: Sharing Your Vault
- [ ] User guide: Exporting Your Data
- [ ] User guide: Importing from Other Apps
- [ ] In-app Skeleton Key warnings
- [ ] Security model documentation

---

## 6. Technical Dependencies

### New NPM Packages

```json
{
  "@react-pdf/renderer": "^3.x",  // PDF generation
  "marked": "^12.x",              // Markdown parsing (for import)
  "jszip": "^3.x",                // Already present, used for import
  "argon2-browser": "^1.x"        // Password-based key derivation
}
```

### Cloudflare Resources

- **Workers**: Share API endpoints
- **R2**: Encrypted blob storage
- **KV**: Capability token metadata
- **Custom domain**: `share.skelenote.app` or similar

### Key Files to Modify

| File | Changes |
|------|---------|
| `src/lib/export/index.ts` | Add new format exports |
| `src/lib/export/markdown.ts` | Reference for reverse conversion |
| `src/components/settings/panels/DataSettings.tsx` | Add import section |
| `src/components/object/ObjectHeader.tsx` | Add share link action |

---

## 7. Open Questions

### Share as Link
- [ ] **Domain**: `share.skelenote.app` or `skelenote.sh/s/`?
- [ ] **Limits**: Max blob size? Max shares per user? Rate limits?
- [ ] **Analytics**: Track view counts? Geographic distribution?
- [ ] **Offline viewer**: Should web viewer work offline after first load?

### Export
- [ ] **Images**: How to handle images in BlockNote content? Embed as base64?
- [ ] **PDF library**: Confirm @react-pdf/renderer works in Tauri WebView
- [ ] **Bundle size**: Lazy-load PDF library to avoid bloating main bundle?

### Import
- [ ] **Conflict resolution**: How to detect duplicates? Title + date hash?
- [ ] **Type inference**: How aggressively guess types from content/properties?
- [ ] **Wiki-links**: Create placeholder objects for unresolved links?
- [ ] **Rollback**: Should imports be reversible (undo all imported objects)?

### General
- [ ] **Telemetry**: Track export/import/share usage for product decisions?
- [ ] **Error reporting**: How detailed should error messages be?

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Share links created | 100+ in first month | Cloudflare analytics |
| Documents exported | Track by format | Local telemetry (opt-in) |
| Imports completed | Track by source | Local telemetry (opt-in) |
| Import success rate | >95% | Errors / total attempts |
| Share link view rate | >50% of links viewed | Capability token access logs |

---

## 9. Rejected Alternatives

### Why Not Campfire Rooms?

We extensively explored "Campfire Rooms" - shared spaces with separate encryption keys for real-time collaboration. We rejected this because:

1. **Complexity**: Significant crypto changes, room lifecycle management, membership UX
2. **Scope creep**: Moves Skelenote toward Notion territory
3. **Weak value prop**: Users who need collaboration already use Notion/Google Docs
4. **Security trade-offs**: Shared keys between users, revocation complexity

### Why Not Cross-Vault Sharing?

Sharing specific objects between users with different Skeleton Keys would require:
- Per-object encryption keys
- Key exchange protocols
- Complex permission model

This is architecturally sound but not worth the effort for our target users.

### Why Not In-App Comments?

Comments on shared documents would require:
- Server-side storage of comment data
- User identity for commenters
- Notification system
- Moderation capabilities

This is collaboration, which we're explicitly avoiding.

---

## Appendix A: Security Threat Model

### Assets
1. Document content (confidential)
2. Encryption keys (critical)
3. Access metadata (low sensitivity)

### Threat Actors
1. **Curious Server Operator** - Can see metadata, not content
2. **Malicious Recipient** - Can share link/code, download content
3. **Network Attacker** - Mitigated by HTTPS
4. **Browser Extension** - Can access URLs in tabs
5. **Malware on Device** - Can read memory, screenshots

### Trust Assumptions
- User trusts: Skelenote client code, their own device
- User MUST trust: TLS/PKI, share.skelenote.com delivers honest JS
- User does NOT trust: Server operator (zero-knowledge), network

### Out of Scope
- Protecting against recipient screenshots/photos
- Preventing recipient from re-sharing content
- Forward secrecy (not possible for one-way sharing)
- Recipient device compromise

---

## Appendix B: Web Viewer Security

The share web viewer at `share.skelenote.app` must be carefully secured:

### Content Security Policy
```http
Content-Security-Policy:
  default-src 'none';
  script-src 'sha256-{hash}';
  style-src 'sha256-{hash}';
  connect-src 'self';
  img-src 'self' data:;
  frame-ancestors 'none';
```

### Subresource Integrity
All external scripts use SRI hashes to prevent tampering.

### User Warnings
```
This document is encrypted end-to-end.
Skelenote's servers cannot read the content.

For maximum security, access sensitive links in
Incognito Mode with browser extensions disabled.
```

### Future: Desktop Viewer
For maximum security, offer a desktop app or CLI tool that decrypts locally without trusting server-delivered JavaScript:

```bash
npx skelenote-view https://share.skelenote.app/s/abc123
# Prompts for access code, decrypts locally
```

---

## Appendix C: Related Documentation

- `docs/design/style-guide.md` - UI component specs for modals
- `docs/developer/architecture.md` - System architecture reference
- `docs/user/guides/` - User documentation location
- `src/lib/export/` - Existing export implementation
- `src/lib/crypto/` - Encryption utilities
