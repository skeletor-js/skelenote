# How Skelenote Compares

A honest comparison with popular note-taking and productivity apps.

---

## Quick Comparison

| Feature | Skelenote | Notion | Obsidian | Standard Notes | Apple Notes |
|---------|-----------|--------|----------|----------------|-------------|
| **Local-first** | Yes | No | Yes | Optional | Yes |
| **Zero-knowledge E2E encryption** | Yes | No | Plugin | Yes | No* |
| **Open source** | Yes | No | No | Yes | No |
| **Offline-first** | Yes | Limited | Yes | Yes | Yes |
| **P2P sync (no server)** | Yes | No | No | No | No |
| **CRDT conflict resolution** | Yes | Server | No | No | No |
| **Cross-platform** | Mac/Win/Linux | All | All | All | Apple only |
| **Mobile apps** | Planned | Yes | Yes | Yes | Yes |
| **Free tier** | Yes | Yes | Yes | Yes | Yes |
| **One-time purchase** | Yes | No | Yes | No | Free |

*Apple Notes uses iCloud encryption, but Apple holds the keys.

---

## Detailed Breakdown

### vs Notion

**Notion is better for**:
- Team collaboration with permissions
- Databases with complex views (Kanban, Calendar, Gallery)
- Public websites and wikis
- Mobile apps (today)

**Skelenote is better for**:
- Privacy (we literally cannot read your data)
- Offline reliability (works without internet)
- Data ownership (your files, your device)
- No subscription fees
- Local network sync without cloud

**Key difference**: Notion stores your data on their servers and can access it. Skelenote encrypts locally - we never see your content.

---

### vs Obsidian

**Obsidian is better for**:
- Massive plugin ecosystem
- Graph visualization (today)
- Mobile apps (today)
- Markdown power users
- Community themes

**Skelenote is better for**:
- Built-in encryption (no plugins needed)
- P2P sync without third-party services
- Task management (native, not plugins)
- CRDT sync (true conflict resolution, not "last write wins")
- Structured data (typed objects, not just files)

**Key difference**: Obsidian is a Markdown editor with plugins. Skelenote is an encrypted object database with a built-in editor.

---

### vs Standard Notes

**Standard Notes is better for**:
- Longer track record (established since 2017)
- Security audits completed
- Mobile apps (today)
- Simpler, pure notes focus

**Skelenote is better for**:
- Richer object types (tasks, projects, areas, meetings)
- P2P sync (no server needed)
- One-time purchase vs subscription
- CRDT-based sync (better conflict handling)
- More powerful editor (BlockNote vs plain text)

**Key difference**: Standard Notes focuses purely on encrypted notes. Skelenote is a full productivity system with encryption.

---

### vs Apple Notes

**Apple Notes is better for**:
- Deep Apple ecosystem integration
- iCloud sync just works
- Handwriting and sketching
- Zero setup required

**Skelenote is better for**:
- Cross-platform (Windows, Linux)
- True zero-knowledge encryption
- Data portability (export everything)
- No vendor lock-in
- Local network sync (no cloud required)
- Structured task/project management

**Key difference**: Apple Notes is convenient but locks you into Apple's ecosystem. Skelenote works everywhere and you control your data.

---

## Encryption Comparison

| App | Encryption Type | Who Holds Keys | Can Company Read Data? |
|-----|-----------------|----------------|----------------------|
| **Skelenote** | XChaCha20-Poly1305 E2E | You | No |
| **Standard Notes** | XChaCha20-Poly1305 E2E | You | No |
| **Obsidian** | None (or plugin) | You (if plugin) | N/A (local) |
| **Notion** | At-rest only | Notion | Yes |
| **Apple Notes** | iCloud encryption | Apple | Technically yes |
| **Evernote** | At-rest only | Evernote | Yes |
| **OneNote** | At-rest only | Microsoft | Yes |

---

## Sync Comparison

| App | Sync Method | Conflict Resolution | Works Offline | P2P Option |
|-----|-------------|--------------------| --------------|------------|
| **Skelenote** | CRDT (Loro) | Automatic merge | Full | Yes |
| **Obsidian** | File-based | Last write wins | Full | No |
| **Standard Notes** | Server sync | Last write wins | Limited | No |
| **Notion** | Server sync | Server decides | Limited | No |
| **Apple Notes** | iCloud | Last write wins | Limited | No |

**What CRDT means**: When you edit the same note on two devices simultaneously, Skelenote merges both changes intelligently. Other apps typically pick one version and discard the other.

---

## Pricing Comparison

| App | Model | Cost |
|-----|-------|------|
| **Skelenote** | One-time purchase | $19.99 |
| **Notion** | Subscription | $0-10/month |
| **Obsidian** | One-time + optional sync | $0 (app) + $8/month (sync) |
| **Standard Notes** | Subscription | $0-10/month |
| **Apple Notes** | Free with iCloud | $0-10/month (storage) |

---

## What We're Missing (For Now)

Honest gaps compared to mature competitors:

| Feature | Status | Timeline |
|---------|--------|----------|
| Mobile apps | Planned | 2025 |
| Graph visualization | Planned | 2025 |
| Web clipper | Not planned | - |
| API/integrations | Future | TBD |
| Team/sharing | Future | TBD |
| Security audit | Planned | Post-beta |

---

## Who Should Use Skelenote?

**Great fit**:
- Privacy-conscious individuals
- Journalists, lawyers, healthcare workers with sensitive data
- People who want to own their data forever
- Users frustrated with subscription fatigue
- Local network sync users (same household/office)

**Not ideal (yet)**:
- Teams needing real-time collaboration
- Heavy mobile users (until mobile apps ship)
- Users needing massive plugin ecosystems
- Organizations requiring SSO/admin controls

---

## Try It Yourself

The best comparison is trying Skelenote with your actual workflow:

1. [Download the alpha](https://github.com/jordanstella/skelenote/releases)
2. Import some test content
3. See if it fits how you think

We'd love your [feedback](https://discord.gg/4apsgSRB7D) on what's missing.
