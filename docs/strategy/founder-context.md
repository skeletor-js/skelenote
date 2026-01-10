# Founder Context & Project Philosophy

> Internal document capturing the origin story, motivations, and guiding principles behind Skelenote. Written January 2026 after a comprehensive venture audit.

---

## The Founder

**Background:** 15-year startup veteran. Deep experience in product, positioning, and building companies. Not a first-time founder learning on the job—someone who knows what building a company looks like and is choosing to do something different.

**Building Timeline:** One month of development, solo, using Claude Code as a co-development partner. The entire codebase—60,000 lines of TypeScript, 4,000 lines of Rust, full Tauri 2.0 desktop app with encryption, P2P sync, import/export, and CRDT-based data layer—was built in approximately 30 days.

**Primary Motivation:** Solving a personal problem. After years of paying for multiple productivity tools simultaneously (Notion, Obsidian, Bear, Apple Notes, etc.), none felt right. Every tool had something good but nothing was complete. The cost of paying for 2-3 subscriptions just to cover different use cases became absurd.

---

## The Core Problem Being Solved

### For the Founder
1. **Privacy without compromise.** Working in startups means handling proprietary and personal information that shouldn't exist on corporate servers. No cloud storage, period.

2. **Device sync without the cloud.** The insight: "There's very rarely going to be a time where I'm editing on one device that I'm not going to go back and be near my other device." P2P sync on the local network solves 95% of sync needs without touching the internet.

3. **Self-hosted relay as backup.** For the 5% of cases where devices aren't on the same network, a self-hosted relay server provides encrypted sync without trusting third parties.

4. **One tool that works.** Not Obsidian for notes, Notion for tasks, Bear for quick capture. One app that handles the full personal productivity stack.

### For the Market
1. **Subscription fatigue.** Productivity tools have become rent-seeking. $10-15/month for a notes app is normalized but absurd.

2. **False privacy promises.** Every app claims "encryption" but holds the keys. "Zero-knowledge" is marketing copy, not architecture.

3. **Forced collaboration.** Enterprise features subsidized by individuals who just want to think privately.

4. **Vendor lock-in.** Proprietary formats, difficult exports, data held hostage.

---

## Guiding Principles

### 1. Build for Yourself First
The most sustainable motivation is personal utility. If Skelenote becomes the founder's daily driver—where actual thinking and work happens—development will continue indefinitely. Building for hypothetical users leads to abandoned projects.

### 2. Prove a Point About Pricing
> "Why are we paying so much for productivity tools? Why are we paying so much for note-taking apps?"

The thesis: Note-taking apps shouldn't cost $10/month. The existence of a high-quality, fully-featured, encrypted, syncing notes app at $20 one-time (or free/open-source) proves the incumbents are overcharging.

### 3. Local-First is Non-Negotiable
Not "local-first with cloud backup." Not "local-first but we'll add collaboration later." Actually local-first:
- All data lives on user devices
- Encryption happens client-side with user-held keys
- Cloud services are optional infrastructure, not requirements
- The app works forever offline

### 4. Anti-Enterprise
> "I'm not going for the enterprise; I don't really care. I don't need collaboration."

Skelenote is unapologetically single-player. This isn't a defensive positioning—it's an intentional choice. Enterprise collaboration features drive complexity, compromise privacy, and justify subscription pricing. Skelenote opts out entirely.

### 5. Open Source as Philosophy
> "Let's disrupt this industry. Use the power of AI for what I think it can be used for, which is to really truly democratize and break down systems that previously were built on inequalities."

The goal isn't building a billion-dollar company. It's proving that:
- One person with AI assistance can build production-quality software
- Productivity tools don't need VC funding and subscription revenue
- Open source can compete with commercial offerings

---

## Technical Philosophy

### Why Tauri 2.0
- Electron is bloated; Tauri produces ~15MB binaries
- Wanted to learn Rust
- Rust's safety guarantees matter for crypto code
- Tauri 2.0 enables mobile (iOS/Android) from the same codebase

### Why Loro CRDTs
- Conflict-free sync without manual merge logic
- Automatic version history ("Time Machine")
- Works with Rust (native bindings)
- Enables true P2P sync where any device can be the source of truth

### Why XChaCha20-Poly1305
- Modern authenticated encryption
- 192-bit nonce safe for random generation (important for distributed systems)
- Used by WireGuard, Cloudflare—battle-tested
- Not rolling custom crypto; using established libraries

### Why P2P Sync
- Solves the personal use case: phone and laptop usually on same network
- Complete air gap from cloud infrastructure
- Self-hosted relay available for remote sync
- No dependency on company servers existing

---

## What Success Looks Like

### Not Success
- Raising VC money
- Reaching $1M ARR
- Getting acquired
- Beating Notion's market share

### Actual Success
1. **Personal daily driver.** Using Skelenote instead of the apps currently paid for.
2. **6-month survival.** Still developing and using after the initial build excitement fades.
3. **100 weekly active users.** Proof that others find value in the same problem solution.
4. **Community contribution.** At least one PR from someone external.
5. **Industry acknowledgment.** Competitors notice; comparison posts appear; the "you can do this for $20" point is made.

---

## Current State (January 2026)

### What's Built
- Full desktop app (macOS, Windows, Linux)
- 9 built-in object types (Task, Note, Project, Area, Tag, Person, Meeting, Link, Template)
- XChaCha20-Poly1305 encryption with BIP39 mnemonic key
- Loro CRDT with version history
- P2P sync via mDNS + TCP
- Optional cloud relay (WebSocket)
- Import from Notion API, Obsidian, Markdown
- Export to PDF, HTML, Markdown, JSON
- Daily notes with templates
- Task management with recurrence
- Semantic search (local embeddings)
- Device management and revocation

### What's Next
- Mobile app (iOS/Android) via Tauri 2.0 - weeks away
- Full open source release (removing Commons Clause)
- Alpha tester program (10 trusted users)
- Local AI features (Whisper transcription, local LLM)

### What's Not Planned
- Web app (conflicts with local-first philosophy)
- Real-time collaboration (conflicts with single-player philosophy)
- Enterprise features (not the target market)

---

## The Contrarian Bet

Most productivity tools follow the same playbook:
1. Launch freemium
2. Add collaboration
3. Target enterprise
4. Raise VC
5. Maximize subscriptions

Skelenote's bet is that a meaningful market segment wants the opposite:
1. Pay once, own forever
2. Single-player focus
3. Individual users only
4. Bootstrapped/open source
5. Minimize recurring costs

This is a bet that privacy-conscious individuals who own their data and reject subscription rent-seeking exist in sufficient numbers to sustain an open-source project and optional paid services.

---

## Key Quotes from Founder

On motivation:
> "I'm making this for myself to solve a need that I had, and something that I think other people will agree with because there's a lot of people like me on Reddit."

On business model:
> "Frankly, I don't give a shit if we make this zero dollars at the end of the day. I'm not doing this to make money; I'm doing this to solve a problem."

On the industry:
> "How are companies like Notion and all these actually creating multi-million dollar businesses on a notes app? That makes no sense. It's absolutely insane."

On open source:
> "I'm happy to pull that out and just say fuck it and make it all open source at this point because again, I don't really care about making money on this at the end of the day."

On disruption:
> "Let's disrupt this industry. And use the power of AI for what I think it can be used for, which is to really truly democratize and break down systems that previously were built on inequalities."

---

## Document History

- **January 2026:** Initial version after comprehensive venture audit and founder context discussion.
