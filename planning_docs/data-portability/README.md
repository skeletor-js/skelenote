# Data Portability Release

> **Philosophy**: "Skelenote is your private second brain. For sharing, export and use tools built for that."

Being unapologetically single-player is a **differentiator** in a market where every app is trying to add multiplayer. We don't build bridges across the internet—we give you excellent tools to take your work with you.

---

## Overview

This release adds comprehensive data portability to Skelenote:
- **Export** your work in multiple formats (PDF, HTML, JSON, Plain Text)
- **Import** from other apps (Notion, Obsidian, Markdown, JSON backup)
- **Documentation** for high-trust vault sharing via Skeleton Key

## Documents

| Document | Scope | Estimated Effort |
|----------|-------|------------------|
| [01-export-formats.md](./01-export-formats.md) | PDF, HTML, JSON, Plain Text export | 6-7 days |
| [02-import-sources.md](./02-import-sources.md) | Notion, Obsidian, Markdown, JSON, Apple Notes | 13-17 days |
| [03-skeleton-key-docs.md](./03-skeleton-key-docs.md) | User guides and UX improvements | 2-3 days |
| [04-bundle-optimization.md](./04-bundle-optimization.md) | Lazy loading, bundle analysis | 2 days |
| [05-secure-device-linking.md](./05-secure-device-linking.md) | Future: secure QR-based device pairing | — (mobile app) |

**Total: ~5.5 weeks** (excludes future mobile work)

---

## What We're Building

| Feature | Purpose | Priority |
|---------|---------|----------|
| **Enhanced Export** | PDF, HTML, JSON, Plain Text (in addition to Markdown) | High |
| **Import** | Notion, Obsidian, Markdown files, JSON backup | High |
| **Skeleton Key Docs** | Clear documentation for high-trust vault sharing | Medium |

## What We're NOT Building

- Real-time collaboration (Campfire Rooms)
- Web-based document sharing (Share as Link)
- Cross-vault sharing with different Skeleton Keys
- Multi-user permissions within a vault
- Comments or suggestions on shared documents

> [!IMPORTANT]
> **No Web Viewer.** Sharing happens through export. Users share PDFs, HTML files, or Markdown through whatever channel they trust (email, Signal, AirDrop). We don't host content on the internet—period.

---

## Implementation Roadmap

### Phase 1: Enhanced Export (Weeks 1-2)
- PDF export with @react-pdf/renderer
- HTML export (standalone file)
- JSON export (full fidelity backup)
- Plain text export
- Export menu UI updates

### Phase 2: Import (Weeks 3-5)
- Markdown to BlockNote converter
- JSON import (backup restore)
- Markdown files import
- Obsidian import
- Notion import
- Import UI (source selector, preview, progress)

### Phase 3: Documentation (Ongoing)
- User guide: Sharing Your Vault
- User guide: Exporting Your Data
- User guide: Importing from Other Apps
- In-app Skeleton Key warnings

---

## Rejected Alternatives

### Share as Link
We explored web-based sharing with encrypted links hosted on Cloudflare. Rejected because:
1. **Philosophy conflict**: Our brand promise is "no cloud, no relay, no exposure"
2. **Trust model**: Recipients must trust server-delivered JavaScript
3. **Scope creep**: Maintaining a web viewer is SaaS infrastructure

**The principled answer:** Export and share through channels you trust.

### Campfire Rooms
Shared spaces with separate encryption keys for real-time collaboration. Rejected due to complexity and scope creep toward Notion territory.

### Cross-Vault Sharing
Per-object encryption and key exchange between different Skeleton Keys. Architecturally sound but not worth the effort for our users.

### In-App Comments
Comments require server-side storage, user identity, notifications—this is collaboration, which we're explicitly avoiding.
