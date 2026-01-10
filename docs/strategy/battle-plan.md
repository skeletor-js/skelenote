# Battle Plan: The Next Six Months

> Strategic roadmap for Skelenote. No time estimates—just sequenced priorities and clear reasoning.

---

## Executive Summary

**Phase 1:** Ship mobile, go fully open source, get 10 alpha testers.
**Phase 2:** Public launch on Reddit/HN, build community, iterate on feedback.
**Phase 3:** Add local AI, establish positioning, optional monetization infrastructure.
**Phase 4:** Sustainability—either community-sustained open source or minimal viable revenue.

---

## Phase 1: Foundation

### Priority 1: Ship Mobile

**Why first:** A productivity app without mobile is incomplete. You can't build a daily usage habit if you can't capture thoughts when away from your desk. Everything else is blocked until mobile exists.

**Target:** Basic iOS and Android apps with:
- Note viewing and editing
- Task viewing and status changes
- P2P sync (Campfire) working
- Relay sync working
- Basic search

**Not required for v1:**
- Full feature parity with desktop
- Import/export
- Settings management
- Template editing

**Technical path:** Tauri 2.0 mobile. Same React codebase, same Loro CRDT, same Rust crypto. The architecture was designed for this.

**Validation:** You use it on your phone daily for at least one week before moving on.

---

### Priority 2: Go Fully Open Source

**Action:** Remove Commons Clause. Pick MIT or Apache 2.0.

**Why MIT over Apache:**
- Simpler, more permissive
- No patent clause (you don't have patents to protect)
- Lower friction for contributors
- Most recognizable "do whatever you want" license

**What to do:**
1. Update LICENSE file to MIT
2. Update package.json license field
3. Update README badges
4. Add CONTRIBUTING.md with:
   - How to set up development environment
   - Code style expectations (already documented in CLAUDE.md)
   - PR process
   - Issue templates
5. Create "good first issue" labels in GitHub
6. Enable GitHub Discussions for community questions

**What this enables:**
- Forks are explicitly welcome
- Community contributions have no legal ambiguity
- Aligns messaging with values
- Removes "but is it really open source?" objections

---

### Priority 3: Alpha Tester Program

**Target:** 10 people who are:
- Privacy-conscious (actually care about local-first)
- Currently using Obsidian, Notion, or Notesnook
- Willing to import their real vault and use Skelenote as primary for 2+ weeks
- Able to articulate what's broken (not just "it's buggy")

**Where to find them:**
- Personal network first (you said you've shown it to a handful of people)
- Privacy-focused Discord servers
- r/selfhosted, r/privacy, r/PKMS lurkers who've DMed about tools
- NOT public posts yet—this is curated

**What you want from them:**
1. Import their Obsidian/Notion vault (stress test imports)
2. Daily usage notes (what works, what's annoying)
3. Sync testing (do they have multiple devices? test P2P)
4. Edge case discovery (large vaults, weird characters, unusual workflows)

**Incentive:** Early access, name in credits, lifetime access to any future paid features. These are early believers, not customers.

---

### Priority 4: Critical Technical Fixes

Before public launch, fix these:

**1. Backlink indexing**
Current `findBacklinks()` scans all objects. Add a relation index to Loro storage that updates on object save. This is maybe 1-2 days of work and prevents performance complaints from users with large vaults.

**2. Offline queue persistence**
If app crashes, queued sync messages are lost. Add IndexedDB persistence for the sync queue. Users shouldn't lose data because the app crashed before sync completed.

**3. Test coverage for critical paths**
Add tests for:
- CRDT merge with concurrent edits to same object
- Import error handling (malformed exports, missing files)
- Encryption round-trip (encrypt → save → load → decrypt)
- P2P connection recovery after network interruption

**4. BlockNote upgrade path**
Document the current pinned version and why. Create an issue to track BlockNote updates and test compatibility. Editor bugs will be a source of user frustration.

---

## Phase 2: Public Launch

### Launch Channel Strategy

#### Primary: Reddit

**Target subreddits (in order):**

1. **r/selfhosted** (318k members)
   - Perfect audience: privacy-conscious, technical, self-host everything
   - Angle: "I built a local-first notes app with P2P sync and self-hostable relay"
   - They'll appreciate the Tauri/Rust technical choices
   - Expect detailed questions about the architecture

2. **r/PKMS** (Personal Knowledge Management Systems, 45k members)
   - Dedicated note-taking enthusiasts
   - Angle: "After paying for Notion, Obsidian, and Bear simultaneously, I built my own"
   - They understand the problem space deeply
   - Good for detailed feature feedback

3. **r/ObsidianMD** (200k+ members)
   - Tricky: you're competing with their tool
   - Angle: NOT "Obsidian killer" but "for people who want encryption + sync without plugins"
   - Emphasize what Obsidian doesn't have: built-in encryption, native CRDT sync, task management
   - Expect defensive responses; don't argue

4. **r/privacy** (1.8M members)
   - Mass audience but cares about the core value prop
   - Angle: "Zero-knowledge notes app: we literally can't read your data"
   - Focus on encryption architecture, not features
   - Link to security documentation

5. **r/degoogle** and **r/privacytoolsIO**
   - Niche but highly aligned
   - These users actively seek alternatives to big tech
   - Good for long-term community building

**Reddit launch post template:**
```
Title: I built a local-first, encrypted notes app with P2P sync (no cloud required)

After years of paying for multiple productivity apps, I built the tool I actually wanted:

- Fully local (your data never leaves your devices)
- End-to-end encrypted (XChaCha20-Poly1305, you hold the keys)
- P2P sync over local network (no server needed)
- Optional self-hosted relay for remote sync
- Import from Notion/Obsidian
- Open source (MIT)

I'm not trying to build a company or raise VC. I just wanted a notes app that respected my privacy and didn't cost $10/month.

Desktop apps (macOS, Windows, Linux) available now. Mobile coming soon.

[link to GitHub]

Happy to answer technical questions about the architecture.
```

#### Secondary: Hacker News

**Timing:** After Reddit validation. HN is higher stakes—one shot at the front page.

**Angle options:**
1. "Show HN: Local-first encrypted notes with CRDT sync" (technical)
2. "I built a $20 alternative to subscription productivity apps" (contrarian)
3. "Show HN: Note-taking app built in 30 days with Claude Code" (AI angle)

**HN-specific advice:**
- Launch on Tuesday-Thursday, morning US time
- Title matters enormously; test variations
- Be in the comments immediately answering questions
- Technical depth wins; marketing language loses
- If it doesn't hit front page, you can try again in a few months

#### Tertiary: Other Channels

**Product Hunt:** Lower priority. Audience is more mainstream, less technical. Consider after mobile ships.

**YouTube:** Find PKM/productivity YouTubers who review tools. Send cold emails offering early access. One video from the right creator can drive significant adoption.

**Twitter/X:** Build in public. Share development updates, architecture decisions, user feedback. The "solo dev with AI" angle is interesting to tech Twitter.

**Discord:** Create a Skelenote Discord server before public launch. Link from GitHub and app. This becomes your community hub and support channel.

---

### Handling Competition

#### Notesnook (Closest Competitor)

**Their position:** Privacy-focused, E2E encrypted, subscription model ($50/year), mobile apps, 5+ years of development.

**Your advantages:**
- One-time purchase (if you charge) or fully free (if open source)
- CRDT sync (they don't have this yet)
- P2P local sync (they don't have this)
- Tauri (smaller, faster than Electron)
- Daily notes, templates, task management (more complete productivity suite)

**Your disadvantages:**
- They have mobile apps now
- Larger community and longer track record
- Web app available
- More mature, battle-tested

**Strategy:** Don't attack them. They're doing good work for privacy. Position as "similar values, different approach":
- "Like Notesnook but with P2P sync"
- "Like Notesnook but open source with no subscription"

If their community asks about you, be respectful. Privacy-focused users aren't a zero-sum market—they're underserved.

---

#### Obsidian (The Giant)

**Their position:** Dominant in enthusiast PKM space. Plugin ecosystem. Freemium with $100/year sync.

**Your advantages:**
- Built-in encryption (they have none)
- Built-in sync (theirs is paid add-on)
- Simpler UX (no plugin dependency)
- Task management native (they need plugins)

**Your disadvantages:**
- Plugin ecosystem is a moat
- Community is enormous
- They're "good enough" for most users
- Markdown compatibility is their strength

**Strategy:** Don't try to convert happy Obsidian users. Target:
- People frustrated by plugin complexity
- People who won't pay $100/year for sync
- People who need encryption Obsidian doesn't offer
- People who want tasks + notes in one app

**Messaging:** "For people who want Obsidian's philosophy with built-in encryption and sync."

---

#### Notion (The Elephant)

**Their position:** Market leader. Team collaboration. Enterprise focus.

**Your advantages:**
- Actually private (they can read everything)
- No subscription required
- Works offline (Notion is crippled offline)
- You own your data

**Your disadvantages:**
- They have everything: databases, wikis, collaboration
- Brand recognition
- Team features

**Strategy:** Don't compete directly. Notion users who care about privacy aren't really Notion users—they're Notion users looking for an exit. Your job is to be the best exit path.

**Messaging:** "For people who like Notion but don't trust Notion with their data."

Import from Notion should be flawless. Make switching easy.

---

#### Anytype (Similar Philosophy)

**Their position:** Local-first, E2E encrypted, open source-ish (source available), free, CRDT-based.

**Your advantages:**
- Simpler (Anytype is complex)
- Lighter (Anytype is Electron, heavier)
- P2P without their network dependency

**Your disadvantages:**
- They're free forever (no monetization pressure)
- They have mobile
- Similar technical architecture

**Strategy:** This is your closest philosophical competitor. Differentiate on simplicity and lightness. "Anytype is powerful but complex. Skelenote is simple and focused."

---

#### Standard Notes (Encryption Focused)

**Their position:** E2E encrypted, subscription ($90/year for features), extensions.

**Your advantages:**
- Richer feature set in base app
- One-time or free
- Better UX (they're minimal to a fault)
- CRDT sync

**Your disadvantages:**
- Longer track record
- Security audited
- Simpler attack surface

**Strategy:** Similar positioning, different execution. They went minimal; you went featured. Users who want more than basic notes but still want encryption are your target.

---

#### Joplin (Open Source)

**Their position:** Fully open source, free, E2E encryption, sync via various backends.

**Your advantages:**
- Much better UX (Joplin looks dated)
- CRDT sync (they use sync folders)
- More complete task management
- Modern stack

**Your disadvantages:**
- Established community
- Truly free with no commercial ambitions

**Strategy:** Joplin users who wish it looked better and had native sync are your targets. "Joplin's philosophy with modern UX."

---

### Do You Even Care About Competition?

Honest answer: **Partially.**

You care enough to:
- Not duplicate exactly what exists
- Have clear "why Skelenote over X" answers
- Import from competitors (make switching easy)

You don't care enough to:
- Obsess over feature parity
- React to their every move
- Compromise your philosophy to compete

The market is large enough that multiple privacy-focused tools can succeed. Your goal isn't to win market share—it's to exist as a legitimate option for people who think like you.

---

## Phase 3: Differentiation

### Local AI as Moat

Once mobile is stable and community is forming, local AI becomes your most unique differentiator.

**Why this matters:**
- Every competitor either sends data to cloud AI or has no AI
- Local AI (Whisper, local LLM) preserves privacy promise
- "AI that never sees your data" is a powerful message

**What to build:**
1. **Local transcription (Whisper):** Voice notes → text, all on device
2. **Local summarization:** Summarize notes, generate titles, extract tasks
3. **Local embeddings:** Already have this for search; extend to "find similar notes"
4. **Local chat:** Ask questions about your vault, powered by local LLM

**Positioning:** "The AI notes app that keeps your data private." No one else can say this credibly.

---

### Template/Starter Vault Ecosystem

Enable power users to share configurations:
- Daily note templates
- Project structures
- Workflow setups
- Custom type definitions (when you add custom types)

This creates community content and reduces onboarding friction. "Start with the GTD template" or "Start with the Zettelkasten template."

---

## Phase 4: Sustainability

### The Monetization Question

You've said you don't care about making money. But sustainability matters. If you burn out or get busy, will Skelenote survive?

**Option A: Pure Open Source (No Revenue)**
- App is free forever
- Self-host everything
- Sustainability = personal motivation + community contributions
- Risk: If you stop, it dies (unless community forks)

**Option B: Open Core (Services Revenue)**
- App is free/open source (MIT)
- Sell hosted relay service ($2-5/month)
- Sell hosted AI inference (when AI features ship)
- Maybe: Premium support tier
- This funds ongoing development without compromising philosophy

**Option C: Donationware**
- App is free
- GitHub Sponsors, Open Collective, or similar
- "Pay what you want" model
- Works for some projects (Obsidian plugins, Neovim plugins)
- Unpredictable revenue

**Recommendation: Option B (Open Core)**

Why:
- Aligns with your stated willingness to "sell services, not software"
- Technical users self-host (they're not your customers anyway)
- Convenience customers pay for hosted infrastructure
- You've already built the relay; monetizing it is natural
- Keeps the app fully open source
- Creates sustainable development funding if you want it

**Pricing thoughts if you go this route:**
- Hosted relay: $3/month or $30/year
- Hosted AI: $5/month or $50/year
- Bundle: $7/month or $70/year

Compare to Notesnook ($50/year) and Standard Notes ($90/year)—you're cheaper and open source.

---

### If You Never Want Revenue

That's valid. But do this:
1. Document the architecture well enough that others can maintain it
2. Build community early so momentum continues without you
3. Accept that without funding, development pace will slow when life gets busy
4. Consider finding a co-maintainer who shares your values

---

## The Sequence (No Dates)

1. **Ship mobile MVP** — Basic iOS/Android with core features and sync
2. **Remove Commons Clause** — Go MIT, update docs
3. **Recruit 10 alpha testers** — Curated, from personal network
4. **Fix critical technical debt** — Backlink indexing, offline queue, test coverage
5. **Iterate on alpha feedback** — 2-3 cycles of feedback and fixes
6. **Launch on r/selfhosted** — First public exposure
7. **Launch on r/PKMS and r/ObsidianMD** — Expand reach
8. **Create Discord community** — Central hub for users
9. **Launch on Hacker News** — High-stakes, one shot
10. **Ship local AI v1** — Whisper transcription, local embeddings
11. **Decide on monetization** — Open core with hosted services, or pure open source
12. **If monetizing: Launch hosted relay** — Simple, sustainable revenue
13. **Continue iteration** — Features driven by community feedback

---

## Metrics to Track

**Leading indicators (check weekly):**
- GitHub stars
- Discord members
- Active alpha testers
- Issues opened (engagement signal)
- PRs from non-you (community health)

**Lagging indicators (check monthly):**
- Downloads (if tracking)
- Relay signups (if monetizing)
- Reddit/HN mentions
- Competitor comparison posts

**The only metric that matters personally:**
- Are you using Skelenote daily as your primary productivity tool?

---

## What Could Go Wrong

**1. Mobile has unforeseen technical issues**
CRDT sync on mobile, background sync, iOS limitations—these could take longer than expected. Mitigation: Start mobile now, expect surprises.

**2. Public launch gets no traction**
Reddit post dies in /new, HN doesn't bite. Mitigation: Multiple launch attempts, different angles, different communities.

**3. Alpha testers find critical bugs**
Import corrupts data, sync loses changes, encryption has issues. Mitigation: This is why you do alpha before public launch.

**4. A competitor ships your features**
Notesnook adds P2P, Anytype simplifies, Obsidian adds encryption. Mitigation: Move fast, differentiate on multiple axes, not just one feature.

**5. You lose motivation**
The dopamine of building something new wears off; you're debugging sync edge cases instead of shipping features. Mitigation: Use it daily, build community, find a co-maintainer.

---

## Decision Log

Record key decisions here as you make them:

| Date | Decision | Reasoning |
|------|----------|-----------|
| Jan 2026 | Building for personal use first | Sustainable motivation |
| Jan 2026 | Tauri 2.0 + Loro CRDTs | Performance, Rust learning, mobile path |
| Jan 2026 | P2P sync as core feature | Solves founder's actual problem |
| Jan 2026 | Considering full open source | Aligns with values, removes license ambiguity |
| | | |

---

---

## Appendix: Name Ideas

> Lowest priority, but worth capturing. Current name "Skelenote" comes from founder's nickname (Skeletor) but may not fit the "cozy rationalism" brand positioning.

### The Naming Problem

"Skelenote" has a few issues:
- Skeleton connotations are cold, bare, clinical—opposite of "cozy"
- Sounds like a horror/Halloween theme
- Not immediately clear what it does
- Hard to take seriously as a productivity tool

### What the Name Should Convey

Based on brand positioning:
- **Warmth** (ember, hearth, study, fireplace)
- **Privacy** (personal, sanctuary, refuge)
- **Permanence** (your data, your ownership)
- **Intellectual depth** (rationalism, knowledge, thinking)
- **Simplicity** (not enterprise, not complex)

### Strong Candidates

**1. Hearthpad**
- Hearth = center of home, warmth, fireplace
- Pad = notepad, simple
- Pros: Warm, personal, clear purpose
- Cons: Slightly generic
- Domain: Likely available

**2. Emberlog**
- Ember = your brand color, warmth, glowing coals
- Log = record, journal, persistent
- Pros: Directly ties to existing brand colors, warm + permanent
- Cons: Could be mistaken for a logging tool
- Domain: Check availability

**3. Glade**
- A clearing in a forest—open, peaceful, natural, private
- Pros: Short, memorable, conveys peace and personal space
- Cons: Doesn't explicitly say "notes"
- Domain: Probably taken as a single word

**4. Foxden**
- Fox = clever, agile, independent
- Den = cozy private space
- Pros: Warm, smart, personal territory
- Cons: Slightly playful; may not convey "productivity"
- Domain: Likely available

**5. Inkwell**
- Classic writing reference, permanent, timeless
- Pros: Clear connection to writing, elegant
- Cons: Old-fashioned; doesn't convey tech/modern
- Domain: Probably taken

**6. Sanctum**
- Private, protected, sacred personal space
- Pros: Strong privacy connotation, serious
- Cons: Slightly heavy/dramatic
- Domain: Check availability

**7. Cairn**
- Stack of stones marking a path or memorial
- Pros: Permanent, personal landmarks, unique
- Cons: Not widely known word; needs explanation
- Domain: Likely available

**8. Quillhaven**
- Quill = writing, classic
- Haven = refuge, safe place
- Pros: Clear purpose, warmth, safety
- Cons: Long-ish, slightly flowery
- Domain: Likely available

**9. Firn**
- Old snow compacting into ice; gradual accumulation
- Pros: Unique, metaphor for knowledge building over time
- Cons: Unknown word to most people
- Domain: Likely available

**10. Cove**
- Sheltered inlet, protected natural harbor
- Pros: Short, memorable, privacy implied
- Cons: Doesn't say "notes"; single common word
- Domain: Probably taken

**11. Amberlog**
- Amber = warm color, preserved (like insects in amber)
- Log = record
- Pros: Warm, preservation theme, unique
- Cons: Could be mistaken for logging software
- Domain: Likely available

**12. Logstead**
- Log = journal, record
- Stead = homestead, your place
- Pros: Ownership + recording, warm pioneer vibes
- Cons: Could sound like logging/lumber
- Domain: Check availability

**13. Writestead**
- Write + homestead
- Pros: Clear purpose, ownership, warmth
- Cons: Long, slightly awkward to say
- Domain: Likely available

**14. Glowvault**
- Glow = warm, soft light
- Vault = secure storage
- Pros: Security + warmth, unique combination
- Cons: "Vault" slightly cold/bank-like
- Domain: Likely available

**15. Kindlewood**
- Kindle = start fire, ignite thinking
- Wood = natural, organic, warm
- Pros: Warm, natural, thinking connotation
- Cons: Amazon Kindle association; might cause confusion
- Domain: Check availability

### Wildcards (Unusual but Memorable)

**Apricity** — The warmth of the sun in winter. Obscure but beautiful. Would require education but is deeply "cozy rationalism."

**Vellichor** — The strange wistfulness of used bookstores. Very literary, very niche, very memorable.

**Grimoire** — A personal book of knowledge/spells. Fantasy connotation but captures "personal knowledge base" perfectly.

### My Recommendation

If I had to pick one: **Emberlog** or **Glade**.

**Emberlog** because:
- Directly connects to your existing "Ember" brand color (#B85C50)
- Combines warmth (ember) with permanence (log/record)
- Unique enough to be memorable
- Clear enough to suggest purpose
- Likely available as domain

**Glade** because:
- Short, simple, memorable
- Natural clearing = private, peaceful, yours
- Works as both noun ("your glade") and verb-ish ("in the glade")
- Doesn't lock you into "notes" if you expand to broader productivity
- Aspirational and calming

### What to Check

Before committing:
1. Domain availability (.com, .app, .dev)
2. Trademark search (USPTO, common law)
3. App store availability (iOS, Android)
4. Social handle availability (Twitter/X, GitHub)
5. Say it out loud 50 times—does it still sound good?

### Keep Skelenote If...

The name might actually work if you:
- Lean into "skeleton key" metaphor (your key to everything, unlocks your knowledge)
- Position it as "stripped down to essentials" (skeleton = core structure, no bloat)
- Accept the slight edge/darkness as differentiation from warm-fuzzy competitors

But it requires messaging work to overcome the Halloween association.

---

## Document History

- **January 2026:** Initial version after venture audit and founder context discussion.
