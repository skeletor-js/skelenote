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
| **Pricing** | Free (optional $8/mo cloud) | Subscription $2-9/mo |
| **Mobile Apps** | Available | Available |
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
| **Latest Release** | v3.3.7 (January 2026) |
| **Tech Stack** | TypeScript (84.5%), JavaScript (13.6%), React, Electron, React Native |

### Skelenote

| Attribute | Details |
|-----------|---------|
| **GitHub** | [skeletor-js/skelenote](https://github.com/skeletor-js/skelenote) |
| **License** | Apache 2.0 (open source) |
| **Founded** | December 2025 |
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
| Vault (extra encryption) | Planned (v0.5) | Yes | N>S | Notesnook has secondary vault |
| Two-factor auth (2FA) | No | Yes | N>S | TOTP, SMS, email options |
| Device revocation | Yes | No | S>N | Skelenote can revoke compromised devices |
| Device fingerprint | Yes | No | S>N | Visual verification for P2P |
| App lock | Planned (v0.5) | Yes | N>S | Auto-lock on inactivity |
| Privacy mode | No | Yes | N>S | Blur content on screen |
| Security audit | Planned | Planned | = | Neither fully audited |
| Vericrypt (verify encryption) | No | Yes | N>S | Tool to verify encryption claims |

**Gap Analysis:** Skelenote should add Secondary Vault (v0.5), 2FA, and App Lock to match Notesnook's security features.

---

### Sync Architecture

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Courier | Optional relay | Primary method | N>S | Notesnook's cloud is more mature |
| Hearth | Yes (Hearth) | No | S>N | **Major Skelenote advantage** |
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
| iOS | Yes | Yes | = | Native via Tauri 2.0 mobile |
| Android | Yes | Yes | = | Native via Tauri 2.0 mobile |
| Web app | Not planned | Yes | N>S | Skelenote desktop-only by design |
| Browser extension | No | Yes (Web Clipper) | N>S | |

**Gap Analysis:** Mobile is now available (Beta). Skelenote should add Secondary Vault (v0.5), 2FA, and App Lock to match Notesnook's remaining security features.

---

### Editor & Content

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Rich text editor | BlockNote | TipTap (Prosemirror) | = | Both have modern block editors |
| Markdown support | Via BlockNote | Full | N>S | Notesnook has deeper markdown |
| Markdown pasting | Yes (v0.2) | Yes | = | Paste markdown → rich text |
| Tables | Yes | Yes | = | |
| Code blocks | Yes | Yes (syntax highlighting) | = | |
| Math formulas (LaTeX) | Planned (v1.0) | Yes | N>S | **Gap: Notesnook has KaTeX** |
| Chemistry formulas | No | Yes | N>S | |
| Callouts/Alerts | No | Yes | N>S | Alert blocks for notes |
| Table of Contents | No | Yes | N>S | Auto-generated from headings |
| Checklists | Yes | Yes | = | |
| @mentions | Yes | Yes | = | |
| Internal links | Yes | Yes (bidirectional) | = | Both support internal links |
| Embeds (video/audio) | Planned (v1.0) | Yes | N>S | |
| Images | Via BlockNote | Yes | = | |
| File attachments | Planned (v1.0) | Yes (encrypted) | N>S | |
| Editor statistics | Planned (v0.2) | Yes (v3.3) | N>S | Word count, reading time |
| Outline lists | Yes | Yes | = | |

**Gap Analysis:** Skelenote needs LaTeX/KaTeX support, callouts, table of contents, and markdown pasting.

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
| Reminders/notifications | Yes (v0.3) | Yes | = | Both now have reminders |

**Analysis:** Skelenote has a complete task management system with reminders (v0.3). Notesnook only has basic checklists.

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
| Lantern | Yes (local ML) | No | S>N | **Skelenote advantage** |
| Search filters | Basic | Yes (v3.3) | N>S | Notesnook recently added |
| Backlinks | Yes (computed) | Yes | = | |
| Graph view | Planned | No | = | Neither has it yet |
| Search highlighting | Yes | Yes | = | |

**Advantage:** Skelenote's local Lantern is unique - searches by meaning without sending data to cloud.

---

### Export & Import

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Markdown export | Yes | Yes | = | |
| ZIP export | Yes | Yes | = | |
| PDF export | Yes (v0.2) | Yes | = | |
| HTML export | Planned | Yes | N>S | |
| JSON export | Yes (Loro) | Yes | = | |
| Plain text export | Planned | Yes | N>S | |
| Import from Notion | Yes (v0.2) | Yes | = | |
| Import from Obsidian | Yes (v0.2) | Yes | = | |
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
| Custom themes | Limited | Yes (Theme Builder) | N>S | Notesnook has theme marketplace |
| Font customization | Yes | Yes | = | |
| Keyboard shortcuts | 20+ | Yes (v3.1+) | = | |
| Command palette | Yes (Omnibar) | Yes (v3.0.27) | = | |
| Zen/focus mode | Yes | Yes | = | |
| Quick capture | Yes (in-app) | Yes | = | |
| Tabs | Split view | Yes | = | Different approaches |
| Multi-window support | No | Planned | N>S | |
| Customizable sidebar | Yes | Yes | = | |

---

### Desktop Integration

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| System tray menu | No | Yes | N>S | Quick access without full app |
| Auto-start on startup | No | Yes | N>S | Launch on system boot |
| Jumplist/dock menu | No | Yes | N>S | Recent notes in OS dock |
| Spell checker | Yes | Yes | = | Native browser spellcheck |

---

### Mobile Integration

| Feature | Skelenote | Notesnook | Parity | Notes |
|---------|:---------:|:---------:|:------:|-------|
| Home screen widgets | Yes | Yes | = | Quick access widgets |
| Pin notes to notifications | Yes | Yes | = | Persistent note access |
| Quick notes from notification | Yes | Yes | = | Create notes from drawer |
| Share sheet integration | Yes | Yes | = | Receive from other apps |

---

### Pricing Comparison

| Plan | Skelenote | Notesnook |
|------|-----------|-----------|
| **Free tier** | Alpha (all features) | Limited (100MB storage) |
| **Entry** | Free (Core App) | $1.99/mo ($24/yr) Essential |
| **Standard** | Included | $6.99/mo ($70/yr) Pro |
| **Premium** | N/A | $8.99/mo ($90/yr) Believer |
| **Storage** | Unlimited local | 1-25GB cloud |
| **File size limit** | None | 50MB-1GB |

**Business Model Advantage:** Skelenote's free core offering is more accessible than Notesnook's subscription model.

---

## Notesnook Roadmap Analysis

Based on [Notesnook's public roadmap](https://notesnook.com/roadmap/):

### In Progress (as of January 2026)

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
| Multi-window support | Already have split view |
| Encrypted workspaces | Similar concept to our Areas |
| Third-party security audit | Both planning this |

### Recently Completed

| Feature | Version | Relevance |
|---------|---------|-----------|
| Markdown pasting | v3.0.27 | Skelenote should add |
| Command palette | v3.0.27 | Skelenote has Omnibar |
| Unified sidebar | v3.1.0 | Similar to Skelenote |
| Tabs system | v3.0.0 | Skelenote has split view |
| Table of Contents | v3.0.0 | Skelenote should add |
| Callouts | v3.0.0 | Skelenote should add |
| App lock at rest | v3.0.0 | Skelenote planning (v0.5) |

---

## Strategic Recommendations

### Priority 1: Close Critical Gaps

These features would bring Skelenote to parity with Notesnook's strongest offerings:

| Feature | Effort | Impact | Target |
|---------|--------|--------|--------|
| **Mobile apps** | High | Critical | ✅ v0.3 (Beta) |
| **Reminders** | Medium | High | ✅ v0.3 |
| **PDF/HTML export** | Low | Medium | ✅ v0.2 |
| **Import wizards** | Medium | High | ✅ v0.2 |

### Priority 2: Security Parity

| Feature | Effort | Impact | Target |
|---------|--------|--------|--------|
| App lock (auto-lock) | Medium | High | v0.5 |
| Secondary vault | Medium | High | v0.5 |
| Two-factor auth (2FA) | Medium | Medium | v0.5 |
| Privacy mode (blur) | Low | Low | v0.5 |

### Priority 3: Editor Enhancements

| Feature | Effort | Impact | Target |
|---------|--------|--------|--------|
| LaTeX/KaTeX support | Medium | Medium | v1.0 |
| Callouts/Alert blocks | Low | Medium | v0.2 |
| Table of Contents | Low | Medium | v0.2 |
| Markdown pasting | Low | Low | v0.2 |
| Editor statistics | Low | Low | v0.2 |

### Priority 4: Desktop Polish

| Feature | Effort | Impact | Target |
|---------|--------|--------|--------|
| System tray menu | Low | Low | v0.2 |
| Auto-start on startup | Low | Low | v0.2 |
| Jumplist/dock menu | Low | Low | Future |

### Priority 5: Supersede Notesnook

These features would make Skelenote definitively better:

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Graph view** | Medium | High | Already planned (v0.3) |
| **Local AI copilot** | High | High | Already planned (v0.4) - major differentiator |
| **Whisper transcription** | Medium | High | Already planned (v0.4) |
| **Canvas view** | High | Medium | Spatial thinking (v1.0) |

### Priority 6: Maintain Advantages

Features where Skelenote is already ahead—don't regress:

- **CRDT-based sync** — Major technical moat
- **Hearth** — No server required
- **Native task management** — First-class, not checklists
- **PARA structure** — Built-in methodology
- **Daily notes with templates** — Deterministic IDs, auto-creation
- **Lantern** — Local ML, no cloud
- **Time Machine** — Granular CRDT history
- **Free core app** — No subscriptions for core features

---

## Competitive Positioning

### Skelenote vs Notesnook: Positioning Statement

> **Notesnook** is an encrypted notepad with excellent mobile apps and mature cloud infrastructure.
>
> **Skelenote** is an encrypted productivity system with superior sync architecture and native task management, designed for users who want to own their data without subscriptions.

### Target User Comparison

| User Type | Better Choice | Why |
|-----------|---------------|-----|
| Mobile-heavy users | Either | Both now have mobile apps |
| Task-focused workers | Skelenote | Native task management |
| PARA practitioners | Skelenote | Built-in methodology |
| Academic writers | Notesnook | LaTeX support |
| Privacy maximalists | Skelenote | Hearth, no servers |
| Subscription-averse | Skelenote | Free core app |
| Web clipper users | Notesnook | Has web clipper |
| Local network sync | Skelenote | Hearth |

---

## Conclusion

Skelenote and Notesnook occupy similar positions in the privacy-focused note-taking space but serve different user needs:

**Notesnook excels at:**

- Cross-platform availability (mobile, web)
- Traditional Courier reliability
- Note-specific features (math, web clipper, sharing)
- Lower entry price point

**Skelenote excels at:**

- Sync architecture (CRDT + P2P)
- Productivity features (tasks, projects, templates)
- Data ownership (no server dependency)
- Business model (free core app, optional cloud)

**Path to Victory:**

1. Ship mobile apps (closes biggest gap)
2. Add reminders (completes task management)
3. Execute on local AI (creates new advantage)
4. Maintain CRDT/P2P moat (technical differentiation)

The market has room for both, but Skelenote can capture users who want a complete productivity system rather than just an encrypted notepad.

---

*Last updated: January 2026*
*Sources: [Notesnook GitHub](https://github.com/streetwriters/notesnook), [Notesnook Roadmap](https://notesnook.com/roadmap/), [Notesnook Blog](https://blog.notesnook.com/)*
