# Skelenote

**The Permanent Operating System for Your Mind**

A local-first, zero-knowledge private study. Your vault lives on your device, encrypted with keys only you control.

[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)](https://github.com/skeletor-js/skelenote/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0%20%2B%20Commons%20Clause-green)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/skeletor-js/skelenote/build.yml?branch=main)](https://github.com/skeletor-js/skelenote/actions)
[![Encryption](https://img.shields.io/badge/encryption-XChaCha20--Poly1305-purple)](docs/user/about/security-privacy.md)
[![Zero Knowledge](https://img.shields.io/badge/zero--knowledge-E2E%20encrypted-purple)](docs/user/about/security-faq.md)
[![Local First](https://img.shields.io/badge/local--first-your%20device-orange)](docs/user/about/philosophy-manifesto.md)

---

## Vision & Philosophy

Skelenote is built for the "Digital Study"—a quiet room you own, not a noisy service you visit. 

- **Local. Encrypted. Yours.** — Physical proximity is the ultimate encryption.
- **Structure is Freedom** — PARA method by default, your way by choice.
- **No Lock-in** — Your data lives in files, not a database we control.

For a deeper dive into our vision and how we handle ownership, see:
- [Philosophy & Manifesto](docs/user/about/philosophy-manifesto.md)
- [Ownership & Pricing](docs/user/about/ownership-pricing.md)

---

## Alpha Testing

Skelenote is currently in **alpha**. We're looking for testers to help shape the app.

**Want to help test?**

1. Download from [Releases](https://github.com/skeletor-js/skelenote/releases)
2. Read the [Alpha Tester Guide](docs/user/alpha/README.md)
3. Join our [Discord](https://discord.gg/4apsgSRB7D) for discussion
4. Report bugs via [GitHub Issues](https://github.com/skeletor-js/skelenote/issues/new?template=bug_report.yml)

See also:
- [Known Issues](docs/user/alpha/KNOWN_ISSUES.md)
- [Troubleshooting](docs/user/alpha/TROUBLESHOOTING.md)
- [Testing Checklist](docs/user/alpha/TEST_PLAN.md)

---

## Core Features

- **Object Graph**: Everything is an object (tasks, notes, projects) with typed relations.
- **Campfire Sync**: Local-first P2P synchronization via mDNS/Bonjour.
- **Time Machine**: Infinite history built on Loro CRDTs.
- **Quiet Interface**: High-density UI designed for flow states.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | [Tauri 2.0](https://tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript |
| Editor | [BlockNote](https://www.blocknotejs.org/) |
| Data Layer | [Loro CRDT](https://loro.dev/) |
| Encryption | XChaCha20-Poly1305, BIP39 |
| P2P Sync | mDNS/Bonjour + Direct TCP |

---

## Platform Support

Skelenote is fully tested and works on:

- **macOS** - Apple Silicon (ARM64) and Intel (x86_64), macOS 10.15+
- **Windows** - Windows 10/11 (x86_64)
- **Linux** - Ubuntu, Fedora, and other distros via .deb, .rpm, or AppImage

All platforms are automatically built and tested via GitHub Actions CI/CD.

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** (latest stable) — [Install Rust](https://rustup.rs/)
- **pnpm** (recommended) or npm/yarn
- Platform-specific dependencies (see [CONTRIBUTING.md](CONTRIBUTING.md#platform-specific-dependencies))

### Clone & Install

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
pnpm install
```

### Development

```bash
pnpm tauri dev
```

This starts the Vite dev server and launches the Tauri app with hot reload.

### Build

```bash
pnpm tauri build
```

Produces platform-specific binaries in `src-tauri/target/release/bundle/`.

For cross-platform builds and CI/CD details, see [docs/developer/ci-cd.md](docs/developer/ci-cd.md).

### Testing

```bash
pnpm test        # Run tests (watch mode)
pnpm test:run    # Run tests once (CI mode)
pnpm test:ui     # Run tests with UI
```

---

## Project Structure

```
skelenote/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── contexts/           # React contexts (sync, objects, navigation)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core libraries
│   │   ├── sync/           # P2P sync client (discovery, pairing, protocol)
│   │   ├── crypto/         # Encryption wrapper (calls Tauri)
│   │   └── loro/           # CRDT document store
│   └── styles/             # CSS
├── src-tauri/              # Rust backend
│   └── src/
│       ├── crypto/         # BIP39, HKDF, XChaCha20-Poly1305
│       ├── network/        # mDNS discovery, TCP server/client
│       └── lib.rs          # Tauri commands
└── docs/                   # Documentation
```

---

## Roadmap

### The Exodus (Next)
- **Import Wizards** — One-click migration from Notion, Obsidian, and Roam
- **Native Mobile** — iOS and Android apps (same vault, same encryption)
- **Local Whisper** — Unlimited offline voice transcription (bring your own model)
- **Skelenote Publish** — One-click web publishing from your vault
- **Graph View** — Visualize the neural network of your knowledge

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

Quick start:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please ensure your code follows the existing style and includes tests where appropriate.

---

## License

Skelenote is licensed under **Apache 2.0 with Commons Clause**.

**What this means:**
- **You can** use Skelenote for personal or commercial work
- **You can** fork, modify, and contribute back
- **You can** run it for your team or company internally
- **You cannot** sell Skelenote or offer it as a paid service

See [LICENSE](LICENSE) for the full text.

---

## Documentation

### User Guides
- [Getting Started](docs/user/getting-started.md) — Your first day in the Study
- [Campfire Mode](docs/user/guides/campfire-guide.md) — Local P2P sync setup and use cases
- [Cloud Sync](docs/user/guides/cloud-sync-guide.md) — Optional relay server configuration

### About Skelenote
- [Philosophy & Manifesto](docs/user/about/philosophy-manifesto.md) — The Core Narrative and Three Laws
- [Security & Privacy](docs/user/about/security-privacy.md) — Encryption, threat model, zero-knowledge design
- [Ownership & Pricing](docs/user/about/ownership-pricing.md) — The Sovereign Business Model

### For Contributors
- [Contributing Guide](CONTRIBUTING.md) — Setup, workflow, and PR process
- [CI/CD Pipeline](docs/developer/ci-cd.md) — GitHub Actions workflows and cross-platform builds
- [Design System](docs/design/style-guide.md) — UI components and patterns
- [Brand Bible](docs/design/skelenote-brand-bible.md) — Voice, lexicon, and strategic positioning
- [Feature List](docs/design/skelenote-feature-list.md) — Current and planned features
- [Architecture](docs/developer/architecture.md) — Data flow and system design
- [Tauri API](docs/developer/tauri-api.md) — Rust command reference

---

<p align="center">
  <strong>Local. Encrypted. Yours.</strong>
</p>
