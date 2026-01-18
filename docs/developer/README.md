# Developer Documentation

Technical reference for Skelenote contributors.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Desktop Shell | [Tauri 2.0](https://tauri.app/) (Rust) |
| Mobile | Tauri 2.0 mobile (iOS/Android) |
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | [Mantine 8](https://mantine.dev/) |
| Editor | [BlockNote](https://www.blocknotejs.org/) |
| Data Layer | [Loro CRDT](https://loro.dev/) |
| Encryption | XChaCha20-Poly1305, BIP39 |
| P2P Sync | mDNS/Bonjour + Direct TCP |

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** (latest stable) - [Install Rust](https://rustup.rs/)
- **pnpm** (recommended) or npm/yarn
- Platform-specific dependencies (see [CONTRIBUTING.md](../../CONTRIBUTING.md#platform-specific-dependencies))

**For mobile development:**

- **iOS**: Xcode 15+, iOS Simulator
- **Android**: Android Studio, Android SDK

### Clone & Install

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
pnpm install
```

### Development

```bash
pnpm tauri dev              # Desktop app with hot reload
pnpm tauri ios dev          # iOS simulator
pnpm tauri android dev      # Android emulator
```

### Build

```bash
pnpm tauri build            # Desktop production binaries
pnpm tauri ios build        # iOS release
pnpm tauri android build    # Android release
```

Produces platform-specific binaries in `src-tauri/target/release/bundle/`.

## Project Structure

```
skelenote/
├── src/                    # React frontend
│   ├── components/         # UI components (including mobile/)
│   ├── contexts/           # React contexts (12 total)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core libraries
│   │   ├── loro/           # CRDT document store
│   │   ├── sync/           # P2P sync client
│   │   ├── crypto/         # Encryption wrapper
│   │   ├── export/         # Export formats (MD, HTML, JSON, PDF)
│   │   ├── import/         # Notion, Obsidian importers
│   │   ├── semantic/       # ML-powered search
│   │   └── ...             # See AGENTS.md for full list
│   └── styles/             # CSS
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── crypto/         # BIP39, HKDF, XChaCha20-Poly1305
│   │   ├── network/        # mDNS discovery, TCP, QR pairing
│   │   └── lib.rs          # Tauri commands
│   └── gen/                # Mobile platform code (iOS/Android)
└── docs/                   # Documentation
```

## Testing

```bash
pnpm test                   # Run tests (watch mode)
pnpm test:run               # Run tests once (CI mode)
pnpm test:ui                # Vitest UI
pnpm bench                  # Run benchmarks
```

**Rust tests:**

```bash
cd src-tauri
cargo test                  # Run Rust tests
cargo tarpaulin             # Coverage report
```

See [testing.md](testing.md) for comprehensive testing guide.

## Documentation

| Guide | Description |
| ----- | ----------- |
| [Quick Start](QUICK_START.md) | Ship your first PR in 30 minutes |
| [Architecture](architecture.md) | System design and data flow |
| [Tauri API](tauri-api.md) | Rust command reference |
| [CI/CD Pipeline](ci-cd.md) | GitHub Actions and releases |
| [Testing](testing.md) | Testing guide and benchmarks |
| [Mobile Development](mobile-development.md) | iOS/Android setup |
| [AGENTS.md](../../AGENTS.md) | Development patterns and gotchas |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Setup and contribution workflow |
| [Style Guide](../design/style-guide.md) | UI components and design system |
