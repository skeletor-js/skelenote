# The Landscape: Skelenote vs. The Field

The note-taking and PKM space has exploded. There are now dozens of tools promising to be your "second brain." Most of them share a common trait: they want you to rent your thinking from their servers, forever.

This document is an honest look at where Skelenote sits in that landscape—what we do better, what others do better, and who should use what.

---

## The Two Philosophies

Before diving into feature tables, understand that these tools fall into two camps:

### The Cloud Landlords

Notion, Roam, Tana, Capacities, Mem, Craft, Den, Reflect, Heptabase.

Your data lives on their servers. You pay monthly to access it. They can read it (or claim they can't, but you're trusting their word). If they shut down, raise prices, or get acquired—you scramble.

### The Sovereignty Tools

Skelenote, Obsidian, Logseq, Anytype, Joplin, AppFlowy, AFFiNE, Notesnook, Standard Notes, SiYuan, TriliumNext.

Your data lives on your device first. Some offer optional cloud sync. Many are open-source. You own what you create.

**Skelenote sits firmly in the second camp**—but we go further than most. We encrypt by default, sync peer-to-peer without servers, and charge once instead of forever.

---

## Quick Reference Tables

### Privacy & Data Ownership

| Tool | Data Location | Encryption | Who Holds Keys | Can They Read Your Data? |
|------|---------------|------------|----------------|-------------------------|
| **Skelenote** | Local-first | XChaCha20-Poly1305 E2E | You | No |
| **Anytype** | Local-first | E2E encrypted | You | No |
| **Standard Notes** | Cloud + local | XChaCha20-Poly1305 E2E | You | No |
| **Notesnook** | Cloud + local | XChaCha20-Poly1305 E2E | You | No |
| **Joplin** | Local + sync | E2E (optional) | You | No (if enabled) |
| **Obsidian** | Local files | None (plugin available) | N/A | N/A (local only) |
| **Logseq** | Local files | None | N/A | N/A (local only) |
| **Reflect** | Cloud | E2E encrypted | You | No (they claim) |
| **Craft** | Cloud | E2E (on-device AI) | You | Partial |
| **Notion** | Cloud | At-rest only | Notion | Yes |
| **Roam Research** | Cloud | At-rest only | Roam | Yes |
| **Tana** | Cloud | At-rest only | Tana | Yes |
| **Capacities** | Cloud | At-rest only | Capacities | Yes |
| **Mem.ai** | Cloud | At-rest only | Mem | Yes |
| **Den** | Cloud | At-rest (SOC 2) | Den | Yes |
| **Heptabase** | Cloud | At-rest only | Heptabase | Yes |
| **Apple Notes** | iCloud | iCloud encryption | Apple | Technically yes |

---

### Sync Architecture

| Tool | Sync Method | Conflict Resolution | Works Fully Offline | P2P Option |
|------|-------------|--------------------|--------------------|------------|
| **Skelenote** | CRDT (Loro) | Automatic merge | Yes | Yes (Campfire) |
| **Anytype** | CRDT + P2P | Automatic merge | Yes | Yes |
| **Obsidian** | File-based (paid sync or DIY) | Last write wins | Yes | No |
| **Logseq** | File-based (paid sync or DIY) | Last write wins | Yes | No |
| **Joplin** | Server sync (self-host or cloud) | Last write wins | Yes | No |
| **Standard Notes** | Server sync | Server decides | Limited | No |
| **Notesnook** | Server sync | Server decides | Limited | No |
| **Notion** | Server sync | Server decides | Limited | No |
| **Roam Research** | Server sync | Server decides | No | No |
| **Tana** | Server sync | Server decides | No | No |
| **Capacities** | Server sync | Server decides | Limited (new) | No |
| **Craft** | iCloud/server | Last write wins | Yes | No |

**What CRDT means:** When you edit the same Object on two devices simultaneously, Skelenote merges both changes intelligently. Most apps pick one version and discard the other—or create conflicting copies you have to resolve manually.

**What Campfire means:** Devices on the same network discover each other and sync directly. No internet. No cloud relay. No exposure. Physical proximity becomes your encryption.

---

### Pricing Models

| Tool | Model | Typical Cost | One-Time Option |
|------|-------|--------------|-----------------|
| **Skelenote** | Free + optional cloud sync | $0 (app) / $8/mo (cloud) | N/A (Free) |
| **Obsidian** | Free + paid sync | $0 (app) / $96/yr (sync) | Yes (app only) |
| **Logseq** | Free (open-source) | $0 | N/A |
| **Anytype** | Free (open-source) | $0 | N/A |
| **AppFlowy** | Free (open-source) | $0 | N/A |
| **AFFiNE** | Free + paid cloud | $0-9/mo | No |
| **Joplin** | Free (open-source) | $0 | N/A |
| **SiYuan** | Free (open-source) | $0 | N/A |
| **TriliumNext** | Free (open-source) | $0 | N/A |
| **Standard Notes** | Subscription | $0-10/mo | No |
| **Notesnook** | Subscription | $2-7/mo | No |
| **Notion** | Subscription | $0-10/mo | No |
| **Roam Research** | Subscription | $15-20/mo | No (5-yr plan available) |
| **Tana** | Subscription | $0-14/mo | No |
| **Capacities** | Subscription | $0-10/mo | No |
| **Mem.ai** | Subscription | $0-12/mo | No |
| **Reflect** | Subscription | $10-15/mo | No |
| **Heptabase** | Subscription | $12/mo | No |
| **Craft** | Subscription | $0-8/mo | No |
| **Den** | Subscription | Free tier + paid | No |
| **Bear** | Subscription | $3/mo | No |
| **Apple Notes** | Free (with iCloud) | $0 | N/A |

---

## Detailed Comparisons

### vs. Notion

**Notion is better for:**

- Large team collaboration with permissions and guests
- Complex relational databases with multiple views
- Public websites and wikis
- Integrations with everything (Zapier, APIs, embeds)
- Mobile apps that exist today

**Skelenote is better for:**

- Privacy (we literally cannot read your Vault)
- Offline reliability (no spinners, no "reconnecting...")
- Data longevity (your files outlive any company)
- One-time cost (Free vs. $120+/year)
- Local network sync without touching the internet

**The core difference:** Notion is a workspace you visit. Skelenote is a Study you own.

---

### vs. Obsidian

**Obsidian is better for:**

- Massive plugin ecosystem (2,000+ community plugins)
- Graph visualization (today)
- Community themes and customization
- Mobile apps (now in Beta)
- Mobile support (via TestFlight/APK)
- Markdown power users who want raw files

**Skelenote is better for:**

- Built-in encryption (no plugins, no configuration)
- P2P sync without third-party services or DIY setup
- CRDT sync (true merge vs. "last write wins" conflicts)
- Native task management (not plugin-dependent)
- Structured Objects (typed data, not just markdown files)
- Core app is free (features not locked behind paywall)

**The core difference:** Obsidian is a markdown editor you extend with plugins. Skelenote is an encrypted Object database with structure built in.

---

### vs. Logseq

**Logseq is better for:**

- Outliner-style thinking (everything is bullets)
- Open-source transparency (audit the code yourself)
- Free forever (no purchase required)
- Strong community and development momentum

**Skelenote is better for:**

- Document-style writing (not just outlines)
- Built-in encryption without configuration
- P2P sync that works out of the box
- CRDT conflict resolution
- Native PARA structure (Projects, Areas, Resources, Archives)

**The core difference:** Logseq is an outliner for bullet-journal thinkers. Skelenote is a structured workspace for document-and-task thinkers.

---

### vs. Anytype

**Anytype is better for:**

- Fully open-source (audit everything)
- Free forever with no purchase
- Similar object-based philosophy
- Established longer (more mature)

**Skelenote is better for:**

- Simpler onboarding (PARA defaults vs. blank canvas)
- Native Tauri/Rust performance (lighter than Electron)
- Clear business model: Free core app + optional paid cloud relay (vs. completely free with unclear future monetization)
- Time Machine with Loro CRDTs (revert any Object to any point)

**The core difference:** Anytype and Skelenote share DNA—local-first, encrypted, object-based, P2P sync. Anytype is fully free and open-source. Skelenote offers a clearer structure and business model.

---

### vs. Standard Notes & Notesnook

**They are better for:**

- Pure encrypted notes (simpler, focused)
- Security audits completed (Standard Notes)
- Longer track record
- Mobile apps (today)

**Skelenote is better for:**

- Richer Object types (tasks, projects, areas, not just notes)
- P2P sync without any server
- Free core app (vs. subscription)
- CRDT-based sync (better conflict handling)
- PARA methodology built in

**The core difference:** Standard Notes and Notesnook are encrypted notepads. Skelenote is an encrypted productivity system.

---

### vs. Roam Research & Tana

**They are better for:**

- Pioneering networked thought (Roam invented modern backlinking UX)
- AI-native features (Tana's supertags, voice transcription)
- Cloud convenience (no setup, no sync configuration)

**Skelenote is better for:**

- Privacy (they store and can access your data)
- Offline-first (Roam barely works offline; Tana requires connection)
- Cost (Free vs. $180+/year for Roam)
- Data ownership (export and leave anytime)

**The core difference:** Roam and Tana are cloud-native thinking tools. Skelenote is a local-first system that happens to sync.

---

### vs. Craft

**Craft is better for:**

- Apple ecosystem integration (beautiful on Mac/iOS)
- Document design and sharing
- On-device AI that respects privacy
- Mobile experience (today)

**Skelenote is better for:**

- Cross-platform (Windows, Linux, not just Apple)
- True local-first (Craft still relies on cloud)
- P2P sync without iCloud
- Free core app
- Structured task/project management

**The core difference:** Craft is a beautiful document tool for Apple users. Skelenote is a cross-platform productivity system.

---

### vs. Heptabase & Kosmik

**They are better for:**

- Visual/spatial thinking (whiteboards, canvases)
- Arranging ideas in 2D space
- Mind mapping and diagramming

**Skelenote is better for:**

- Document and task-based workflows
- Privacy (both store data on their servers)
- Offline-first reliability
- Free core app

**The core difference:** Heptabase and Kosmik are visual canvases for spatial thinkers. Skelenote is a structured workspace for linear thinkers.

---

### vs. Den

**Den is better for:**

- AI agent workflows (agents that work while you sleep)
- Team communication (Slack-like features)
- Deep integrations (50+ tools)
- Collaborative documentation

**Skelenote is better for:**

- Privacy (Den is cloud-based and AI-processes your data)
- Solo deep work (Den is built for teams)
- Offline capability (Den requires internet)
- Data ownership (Den stores everything on their servers)

**The core difference:** Den is "Cursor for knowledge workers"—AI-native, cloud-based, team-focused. Skelenote is a private Study for focused individual work.

---

### vs. Joplin, SiYuan & TriliumNext

**They are better for:**

- Self-hosting everything (full control)
- Free and open-source (no purchase required)
- Technical users comfortable with setup

**Skelenote is better for:**

- Zero-configuration P2P sync
- Native encryption without setup
- CRDT conflict resolution (Joplin uses last-write-wins)
- Polished UX out of the box
- Clear support and development direction

**The core difference:** These are powerful self-hosted tools for technical users. Skelenote offers similar sovereignty with less configuration.

---

### vs. Apple Notes & Bear

**They are better for:**

- Apple ecosystem (deep integration, Handoff, Shortcuts)
- Zero setup (just works)
- Handwriting and sketching (Apple Notes)
- Beautiful design (Bear)

**Skelenote is better for:**

- Cross-platform (Windows, Linux)
- True zero-knowledge encryption
- P2P sync without iCloud
- Data portability (export everything, no lock-in)
- Structured productivity (tasks, projects, PARA)

**The core difference:** Apple Notes and Bear are locked to Apple's ecosystem. Skelenote works everywhere and you control everything.

---

## Feature Matrix

### Core Capabilities

| Feature | Skelenote | Notion | Obsidian | Logseq | Anytype | Standard Notes |
|---------|-----------|--------|----------|--------|---------|----------------|
| Local-first | Yes | No | Yes | Yes | Yes | Optional |
| E2E Encryption | Yes (default) | No | Plugin | No | Yes | Yes |
| P2P Sync | Yes | No | No | No | Yes | No |
| CRDT Merge | Yes (Loro) | Server | No | No | Yes | No |
| Offline-first | Yes | Limited | Yes | Yes | Yes | Limited |
| One-time purchase | N/A (Free) | No | Yes (app) | Free | Free | No |
| Graph View | Planned | No | Yes | Yes | Yes | No |
| Mobile Apps | Yes (Beta) | Yes | Yes | Yes | Yes | Yes |
| Task Management | Native | Native | Plugin | Plugin | Native | Plugin |
| Daily Notes | Yes | Template | Plugin | Native | Yes | No |
| Templates | Yes | Yes | Yes | Yes | Yes | Limited |
| Backlinks | Yes | Yes | Yes | Yes | Yes | No |
| API | Future | Yes | Plugin | Yes | Yes | Yes |

---

### AI Features

| Feature | Skelenote | Notion | Obsidian | Tana | Mem.ai | Reflect |
|---------|-----------|--------|----------|------|--------|---------|
| AI Summarization | Planned (local) | Yes (cloud) | Plugin | Yes | Yes | Yes |
| AI Search | Yes (local) | Yes | Plugin | Yes | Yes | Yes |
| Voice Transcription | Planned (local Whisper) | No | Plugin | Yes | Yes | Yes |
| Data sent to AI servers | No (local models) | Yes | Depends | Yes | Yes | Yes |

**The Skelenote difference:** Our AI runs entirely on your device. Your private journals, confidential meetings, and sensitive documents never leave your hardware. Download the models once, use them forever, offline.

---

## What We're Missing (Honestly)

| Feature | Current Status | Notes |
|---------|---------------|-------|
| Mobile apps | Yes (Beta) | Native Tauri iOS/Android now available |
| Graph visualization | Planned | Visual map of connections |
| Web clipper | Not planned | Use export/import instead |
| Real-time collaboration | Not planned | Unapologetically single-player |
| Plugin ecosystem | Not planned | We build features natively |
| API/integrations | Future | Focus on local-first integrity first |
| Security audit | Planned | Will complete post-beta |
| Web app | Not planned | Desktop-first philosophy |

We believe in building fewer features well rather than everything poorly. If a feature isn't here, it's because we're focused on getting the core right first.

---

## Who Should Use Skelenote?

### Great Fit

- **Privacy-conscious individuals** who don't want corporations reading their thoughts
- **Journalists, lawyers, healthcare workers** with genuinely sensitive data
- **People with subscription fatigue** who want to own their software again
- **Local network sync users** (households, small offices, co-located teams)
- **Long-term thinkers** who want their notes to outlive any company
- **PARA practitioners** who want structure without building it themselves

### Not Ideal (Yet)

- **Teams needing real-time collaboration** (Skelenote is single-player by design)
- **Plugin tinkerers** (Obsidian's ecosystem is unmatched)
- **Visual/spatial thinkers** (Heptabase or Kosmik may suit you better)
- **Organizations requiring SSO/admin controls** (enterprise features are future)

---

## The Skelenote Difference

Most tools in this space make you choose:

- **Privacy OR features** (encrypted notepads are basic; full-featured tools are cloud-based)
- **Ownership OR convenience** (self-hosted is powerful but complex; cloud is easy but rented)
- **Structure OR flexibility** (opinionated systems are rigid; blank canvases are overwhelming)

Skelenote refuses these trade-offs:

- **Privacy AND features:** Full encryption with a complete productivity system
- **Ownership AND convenience:** Local-first with zero-configuration P2P sync
- **Structure AND flexibility:** PARA defaults you can rearrange

We're not building another SaaS platform. We're building a Digital Study—a quiet room you own, with the door locked and the fire lit.

---

## Try It Yourself

The best comparison is using Skelenote with your actual workflow:

1. [Download the app](https://github.com/skeletor-js/skelenote/releases)
2. Import some test content
3. See if it fits how you think

We'd love your [feedback](https://discord.gg/4apsgSRB7D) on what's working and what's missing.

---

*Last updated: January 2026*
