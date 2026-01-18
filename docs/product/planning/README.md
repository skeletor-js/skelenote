# Planning Documents

Internal planning and specification documents for upcoming Skelenote features.

> **Note:** These are living documents used during development. For the user-facing roadmap, see [ROADMAP.md](/ROADMAP.md).

---

## Release Plans

### [Data Portability (v0.2 Exodus)](data-portability/)

The "Exodus" release focuses on data freedom—import from anywhere, export to any format.

| Document | Description |
|----------|-------------|
| [Overview](data-portability/README.md) | Goals, scope, timeline |
| [Export Formats](data-portability/01-export-formats.md) | PDF, HTML, JSON, Plain Text specs |
| [Import Sources](data-portability/02-import-sources.md) | Notion, Obsidian, Markdown wizards |
| [Skeleton Key Docs](data-portability/03-skeleton-key-docs.md) | Sharing vault documentation |
| [Bundle Optimization](data-portability/04-bundle-optimization.md) | Lazy-loading strategy |
| [Secure Device Linking](data-portability/05-secure-device-linking.md) | QR-based encrypted pairing (v0.3) |

---

## Open Source Packages

### [Package Extraction](packages/)

Reusable modules we're extracting from Skelenote as standalone open-source packages.

| Document | Description |
|----------|-------------|
| [Zero-Knowledge Sync](packages/zero-knowledge-sync-package.md) | `skeleton-key` + `crypt-sync` packages |
| [BlockNote Diff](packages/blocknote-diff-package.md) | Block-level diffing for BlockNote |

---

## Contributing to Planning

Planning documents follow a consistent format:

1. **Goals** — What problem are we solving?
2. **Non-Goals** — What are we explicitly NOT doing?
3. **Design Decisions** — Key choices and rationale
4. **Implementation** — Technical approach and files
5. **Open Questions** — Unresolved decisions

To propose a new feature, start with a planning doc in this directory.

---

*These documents are for development use. They may contain outdated information.*
