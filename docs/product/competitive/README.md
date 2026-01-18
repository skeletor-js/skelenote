# Competitive Analysis

Strategic positioning and competitive intelligence for Skelenote.

## Overview

Skelenote occupies a unique position in the privacy-focused productivity space—combining end-to-end encryption with a full productivity system (not just notes), CRDT-based sync, and one-time pricing.

## Documents

### Primary Competitor

| Document | Description |
|----------|-------------|
| [Notesnook Comparison](notesnook-comparison.md) | Feature-by-feature analysis vs. our closest encrypted competitor |

Notesnook is Skelenote's most direct competitor: both use XChaCha20-Poly1305 encryption, are open-source, and focus on privacy. Key differences:

| Aspect | Skelenote | Notesnook |
|--------|-----------|-----------|
| **Sync** | CRDT + P2P first | Server-based |
| **Pricing** | Free (optional $8/mo cloud) | Subscription $2-9/mo |
| **Focus** | Productivity system | Note-taking app |
| **Tasks** | First-class objects | Checklists only |
| **Mobile** | Beta | Available |

---

### Market Landscape

| Document | Description |
|----------|-------------|
| [Competitive Landscape](competitive-landscape.md) | Comprehensive overview of 20+ tools across privacy, sync, and pricing |

Categories covered:

- **Cloud Landlords** — Notion, Roam, Tana, Capacities, Mem, Craft, Heptabase
- **Sovereignty Tools** — Obsidian, Logseq, Anytype, Joplin, Standard Notes, SiYuan

---

## Key Competitive Advantages

1. **CRDT-Based Sync** — Automatic conflict resolution, no data loss
2. **P2P Sync (Campfire)** — Sync without servers, on local network
3. **Native Task Management** — First-class tasks with status, priority, recurrence
4. **PARA Structure** — Built-in methodology, not just blank pages
5. **Free Core App** — No subscriptions, own your software. Optional cloud relay only expenses.
6. **Local AI** — All AI runs on-device, zero cloud dependency (v0.4)

## Key Gaps (Being Addressed)

| Gap | Status | Target |
|-----|--------|--------|
| Mobile apps | Beta | ✅ v0.3 |
| Reminders | Planned | v0.3 |
| Import wizards | In development | v0.2 |
| App lock / 2FA | Planned | v0.5 |
| LaTeX support | Planned | v1.0 |

---

## Target Users

### Great Fit

- Privacy-conscious individuals who want zero-knowledge encryption
- Professionals with sensitive data (legal, medical, journalism)
- Users with subscription fatigue who prefer one-time purchase
- Local network sync users (households, small offices)
- PARA practitioners who want built-in structure

### Not Ideal (Yet)

- Teams needing real-time collaboration (Skelenote is single-player)
- Plugin tinkerers (Obsidian's ecosystem is unmatched)
- Visual/spatial thinkers (until Canvas in v1.0)

---

## Related Resources

- [ROADMAP.md](/ROADMAP.md) — Full release plans and feature priorities
- [Philosophy & Manifesto](/docs/user/about/philosophy-manifesto.md) — Why Skelenote exists
- [Security & Privacy](/docs/user/about/security-privacy.md) — Encryption deep-dive

---

*Last updated: January 2026*
