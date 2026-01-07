# Skelenote vs Notesnook: Comprehensive Feature Comparison

*A competitive analysis and parity exercise for Skelenote's primary encrypted note-taking competitor.*

---

## Executive Summary

**Notesnook** is Skelenote's closest competitor in the privacy-focused note-taking space. Both apps share the same encryption algorithm (XChaCha20-Poly1305), open-source ethos, and commitment to user privacy. However, they differ significantly in architecture, sync philosophy, and feature focus.

| Aspect | Skelenote | Notesnook |
|--------|-----------|-----------|
| **Primary Focus** | Encrypted productivity system | Encrypted note-taking |
| **Architecture** | Tauri/Rust (native) | Electron/React Native |
| **Sync Model** | CRDT + P2P first | Server-based sync |
| **Pricing** | One-time $19.99 | Subscription $2-9/mo |
| **Mobile Apps** | Planned | Available |
| **GitHub Stars** | Early stage | 13.4k |

**Key Insight:** Notesnook is a mature, feature-rich encrypted notepad. Skelenote is an encrypted productivity system with superior sync architecture but less platform coverage.

---

## Company & Project Overview

### Notesnook

| Attribute | Details |
|-----------|---------|
| **GitHub** | [streetwriters/notesnook](https://github.com/streetwriters/notesnook) |
| **Stars** | 13,400+ |
| **License** | GPL-3.0 |
| **Contributors** | 43 |
| **Commits** | 14,585+ |
| **Founded** | 2020 |
| **Latest Release** | v3.3.7 (December 2025) |
| **Tech Stack** | TypeScript (84.5%), JavaScript (13.6%), React, Electron, React Native |

### Skelenote

| Attribute | Details |
|-----------|---------|
| **GitHub** | [skeletor-js/skelenote](https://github.com/skeletor-js/skelenote) |
| **License** | Proprietary (alpha) |
| **Founded** | 2024 |
| **Stage** | Alpha |
| **Tech Stack** | TypeScript, React, Tauri 2.0, Rust, Loro CRDT |

---

## Feature Parity Matrix

### Legend
- **S**: Skelenote has this feature
- **N**: Notesnook has this feature
- **S>N**: Skelenote's implementation is superior
- **N>S**: Notesnook's implementation is superior
- **=**: Roughly equivalent
- **-**: Neither has this feature

### Core Security & Encryption

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| E2E Encryption | Yes | Yes | = | Both use XChaCha20-Poly1305 |
| Zero-knowledge | Yes | Yes | = | Neither can read user data |
| Key derivation | BIP39 + HKDF | Argon2 | = | Different but equally strong |
| Local key storage | OS Keychain + Stronghold | Local encrypted | S>N | Skelenote uses secure enclave |
| Mnemonic backup | 24-word Skeleton Key | Password-based | S>N | BIP39 mnemonic more recoverable |
| Vault (extra encryption) | No | Yes | N>S | Notesnook has secondary vault |
| Device revocation | Yes | No | S>N | Skelenote can revoke compromised devices |
| Device fingerprint | Yes | No | S>N | Visual verification for P2P |
| Security audit | Planned | Not completed | = | Neither fully audited |

**Gap Analysis:** Skelenote should consider adding a "Vault" feature for extra-sensitive notes.

---

### Sync Architecture

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Cloud sync | Optional relay | Primary method | N>S | Notesnook's cloud is more mature |
| P2P sync | Yes (Campfire) | No | S>N | **Major Skelenote advantage** |
| CRDT merge | Yes (Loro) | No | S>N | **Major Skelenote advantage** |
| Conflict resolution | Automatic | Manual user choice | S>N | CRDTs prevent data loss |
| Offline-first | Yes | Limited | S>N | Skelenote truly works offline |
| Self-hosted server | Via relay | In progress (75%) | = | Both support/planning self-host |
| Real-time collab | No | No | = | Neither supports multi-user editing |

**Critical Advantage:** Skelenote's CRDT-based sync is architecturally superior. Notesnook uses version-based sync with manual conflict resolution, which can lead to data loss if users don't carefully review conflicts.

---

### Platform Support

| Platform | Skelenote | Notesnook | Parity | Notes |
|----------|:---------:|:---------:|:------:|-------|
| Windows | Yes | Yes | = | |
| macOS | Yes | Yes | = | |
| Linux | Yes | Yes | = | |
| iOS | Planned | Yes | N>S | **Gap: Notesnook has mobile** |
| Android | Planned | Yes | N>S | **Gap: Notesnook has mobile** |
| Web app | Not planned | Yes | N>S | Skelenote desktop-only by design |
| Browser extension | No | Yes (Web Clipper) | N>S | |

**Gap Analysis:** Mobile is Skelenote's biggest platform gap. Notesnook's mobile apps are full-featured.

---

### Editor & Content

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Rich text editor | BlockNote | Custom | = | Both have modern block editors |
| Markdown support | Via BlockNote | Full | N>S | Notesnook has deeper markdown |
| Tables | Yes | Yes | = | |
| Code blocks | Yes | Yes (syntax highlighting) | = | |
| Math formulas (LaTeX) | No | Yes | N>S | **Gap: Notesnook has KaTeX** |
| Chemistry formulas | No | Yes | N>S | |
| Checklists | Yes | Yes | = | |
| @mentions | Yes | Yes | = | |
| Internal links | Yes | Yes (bidirectional) | = | Both support internal links |
| Embeds (video/audio) | No | Yes | N>S | |
| Images | Via BlockNote | Yes | = | |
| File attachments | Limited | Yes (encrypted) | N>S | |
| Editor statistics | No | Yes (v3.3) | N>S | Word count, reading time |

**Gap Analysis:** Skelenote needs LaTeX/KaTeX support and better attachment handling.

---

### Organization & Structure

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Notebooks/folders | Projects + Areas | Nested notebooks + topics | S>N | Skelenote has PARA structure |
| Tags | Yes (colored) | Yes (colored) | = | |
| Custom colors | Limited (6 preset) | Unlimited custom | N>S | |
| Favorites/pinning | Yes | Yes | = | |
| Archive | Yes | No (just delete) | S>N | |
| Inbox workflow | Yes | No | S>N | **Skelenote advantage** |
| Daily notes | Yes (deterministic IDs) | No native support | S>N | **Skelenote advantage** |
| Saved views | Yes | No | S>N | Custom filtered views |
| Tree view sidebar | Limited | Yes (v3) | N>S | Notesnook has hierarchical tree |

**Skelenote Advantages:** PARA methodology, Inbox workflow, Daily Notes, Saved Views.

---

### Object Types & Data Model

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Notes | Yes | Yes | = | |
| Tasks | Native first-class | Checklists only | S>N | **Major Skelenote advantage** |
| Projects | Native type | Via notebooks | S>N | |
| Areas | Native type | Via notebooks | S>N | |
| Tags | Native type | Yes | = | |
| People/Contacts | Native type | No | S>N | |
| Meetings | Native type | No | S>N | |
| Links/Bookmarks | Native type | No | S>N | |
| Templates | Yes | No native system | S>N | **Skelenote advantage** |
| Custom properties | Schema-based | No | S>N | |
| Relations | Typed + bidirectional | Bidirectional links | S>N | |

**Major Advantage:** Skelenote's typed object system with 9 built-in types vs Notesnook's notes-only model.

---

### Task Management

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Native tasks | Yes | No (checklists only) | S>N | **Major gap for Notesnook** |
| Task status | todo/in-progress/waiting/done | Checkbox only | S>N | |
| Due dates | Yes | No | S>N | |
| Priority levels | 4 levels | No | S>N | |
| Recurring tasks | Yes (complex patterns) | No | S>N | |
| Task filters | 6 built-in views | No | S>N | |
| Project assignment | Yes | No | S>N | |
| Reminders/notifications | No | Yes | N>S | **Gap: Skelenote needs reminders** |

**Analysis:** Skelenote has a complete task management system. Notesnook only has basic checklists. However, Notesnook has reminders which Skelenote lacks.

---

### Templates

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Template system | Yes (native) | No | S>N | |
| Daily note templates | Yes | No | S>N | |
| Placeholder expansion | 9 placeholders | N/A | S>N | |
| Template properties | Yes (JSON) | N/A | S>N | |
| Template content | Yes | N/A | S>N | |

**Advantage:** Skelenote's template system is a significant differentiator.

---

### Search & Discovery

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Full-text search | Yes (Fuse.js) | Yes | = | |
| Semantic search | Yes (local ML) | No | S>N | **Skelenote advantage** |
| Search filters | Basic | Yes (v3.3) | N>S | Notesnook recently added |
| Backlinks | Yes (computed) | Yes | = | |
| Graph view | Planned | No | = | Neither has it yet |
| Search highlighting | Yes | Yes | = | |

**Advantage:** Skelenote's local semantic search is unique - searches by meaning without sending data to cloud.

---

### Export & Import

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Markdown export | Yes | Yes | = | |
| ZIP export | Yes | Yes | = | |
| PDF export | Planned | Yes | N>S | |
| HTML export | Planned | Yes | N>S | |
| JSON export | Yes (Loro) | Yes | = | |
| Plain text export | Planned | Yes | N>S | |
| Import from Notion | Planned | Yes | N>S | |
| Import from Obsidian | Planned | Yes | N>S | |
| Import from Evernote | No | Yes | N>S | |
| Import from Google Keep | No | Yes | N>S | |
| Web Clipper | Not planned | Yes | N>S | |

**Gap:** Notesnook has more import sources and export formats. Skelenote needs the Exodus Wizards.

---

### Sharing & Collaboration

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Monographs (secure sharing) | No | Yes | N>S | Password-protected note sharing |
| Self-destruct sharing | No | Yes | N>S | Auto-delete after view |
| Public note publishing | No | Yes | N>S | |
| Real-time collaboration | No | No | = | Neither supports |

**Gap:** Notesnook's Monograph feature for secure sharing is compelling. Consider for roadmap.

---

### History & Recovery

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Version history | Yes (Time Machine) | Yes | = | |
| Point-in-time restore | Yes (any point) | Limited | S>N | CRDT enables granular restore |
| Trash/recovery | Archive view | Yes | = | |
| Diff view | Yes | Limited | S>N | |

---

### UI/UX & Customization

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Dark mode | Yes | Yes | = | |
| Light mode | Yes | Yes | = | |
| Custom themes | Limited | Yes (custom CSS) | N>S | |
| Font customization | Yes | Yes | = | |
| Keyboard shortcuts | 20+ | In progress | S>N | |
| Command palette | Yes (Omnibar) | Yes (v3.0.27) | = | |
| Zen/focus mode | Yes | Yes | = | |
| Quick capture | Yes (in-app) | Yes | = | |

---

### Pricing Comparison

| Plan | Skelenote | Notesnook |
|------|-----------|-----------|
| **Free tier** | Alpha (all features) | Limited (100MB storage) |
| **Entry** | $19.99 one-time | $1.99/mo ($24/yr) Essential |
| **Standard** | Included | $6.99/mo ($70/yr) Pro |
| **Premium** | N/A | $8.99/mo ($90/yr) Believer |
| **Storage** | Unlimited local | 1-25GB cloud |
| **File size limit** | None | 50MB-1GB |

**Business Model Advantage:** Skelenote's one-time purchase is more user-friendly than Notesnook's subscription model.

---

## Notesnook Roadmap Analysis

Based on [Notesnook's public roadmap](https://notesnook.com/roadmap/):

### In Progress (as of April 2025)
| Feature | Completion | Impact on Skelenote |
|---------|------------|---------------------|
| Self-hosting sync server | 75% | Reduces Skelenote's server-free advantage |
| Localization (i18n) | In progress | Low priority for Skelenote |
| Keyboard shortcuts | In progress | Skelenote already ahead |
| More app stores | 78% (7/9) | Platform distribution |

### Planned
| Feature | Notes |
|---------|-------|
| ProductHunt launch | Marketing milestone |
| Vericrypt | Encryption verification tool |

### Recently Completed
| Feature | Version | Relevance |
|---------|---------|-----------|
| Search filters | v3.3 | Skelenote should match |
| Editor stats | v3.3 | Nice-to-have |
| Command palette | v3.0.27 | Skelenote has Omnibar |
| Unified sidebar | v3.1.0 | Similar to Skelenote |
| Yearly reminders | v3.0.0 | Skelenote needs reminders |

---

## Strategic Recommendations

### Priority 1: Close Critical Gaps

These features would bring Skelenote to parity with Notesnook's strongest offerings:

| Feature | Effort | Impact | Recommendation |
|---------|--------|--------|----------------|
| **Mobile apps** | High | Critical | Top priority - blocks adoption |
| **Reminders** | Medium | High | Essential for task management |
| **PDF export** | Low | Medium | Quick win |
| **HTML export** | Low | Medium | Quick win |

### Priority 2: Match Important Features

| Feature | Effort | Impact | Recommendation |
|---------|--------|--------|----------------|
| LaTeX/KaTeX support | Medium | Medium | Important for academic users |
| File attachments | Medium | Medium | Encrypted attachments |
| Custom colors | Low | Low | More than 6 preset colors |
| Import wizards | Medium | High | Notion/Obsidian importers |

### Priority 3: Supersede Notesnook

These features would make Skelenote definitively better:

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Graph view** | Medium | High | Already planned, execute well |
| **Local AI copilot** | High | High | Already planned - major differentiator |
| **Whisper transcription** | Medium | High | Already planned |
| **Canvas view** | High | Medium | Spatial thinking |
| **Secure sharing (like Monographs)** | Medium | Medium | E2E encrypted sharing |

### Priority 4: Maintain Advantages

Features where Skelenote is already ahead - don't regress:

- CRDT-based sync (major technical moat)
- P2P sync (Campfire)
- Native task management
- PARA structure
- Daily notes with templates
- Semantic search
- Time Machine
- One-time pricing

---

## Competitive Positioning

### Skelenote vs Notesnook: Positioning Statement

> **Notesnook** is an encrypted notepad with excellent mobile apps and mature cloud infrastructure.
>
> **Skelenote** is an encrypted productivity system with superior sync architecture and native task management, designed for users who want to own their data without subscriptions.

### Target User Comparison

| User Type | Better Choice | Why |
|-----------|---------------|-----|
| Mobile-heavy users | Notesnook | Mobile apps available |
| Task-focused workers | Skelenote | Native task management |
| PARA practitioners | Skelenote | Built-in methodology |
| Academic writers | Notesnook | LaTeX support |
| Privacy maximalists | Skelenote | P2P sync, no servers |
| Subscription-averse | Skelenote | One-time purchase |
| Web clipper users | Notesnook | Has web clipper |
| Local network sync | Skelenote | Campfire P2P |

---

## Conclusion

Skelenote and Notesnook occupy similar positions in the privacy-focused note-taking space but serve different user needs:

**Notesnook excels at:**
- Cross-platform availability (mobile, web)
- Traditional cloud sync reliability
- Note-specific features (math, web clipper, sharing)
- Lower entry price point

**Skelenote excels at:**
- Sync architecture (CRDT + P2P)
- Productivity features (tasks, projects, templates)
- Data ownership (no server dependency)
- Business model (one-time purchase)

**Path to Victory:**
1. Ship mobile apps (closes biggest gap)
2. Add reminders (completes task management)
3. Execute on local AI (creates new advantage)
4. Maintain CRDT/P2P moat (technical differentiation)

The market has room for both, but Skelenote can capture users who want a complete productivity system rather than just an encrypted notepad.

---

*Last updated: January 2026*
*Sources: [Notesnook GitHub](https://github.com/streetwriters/notesnook), [Notesnook Roadmap](https://notesnook.com/roadmap/), [Notesnook Blog](https://blog.notesnook.com/)*
