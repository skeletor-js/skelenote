# Skelenote

A local-first, end-to-end encrypted note and task app. Your vault lives on your device, encrypted with keys only you hold. It runs offline, syncs directly between your own devices, and does semantic search on-device without sending anything to a server.

[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.x-orange)](package.json)
[![Encryption](https://img.shields.io/badge/encryption-XChaCha20--Poly1305-purple)](SECURITY.md)

Built with Tauri 2, React, TypeScript, Loro CRDT, and BlockNote.

<!-- screenshot: add a screenshot of the editor + sidebar here -->

## Status

Skelenote is open source under Apache-2.0, currently at version 0.2.x, and actively maintained again as of July 2026.

There are no prebuilt binaries or app store listings yet. This is build-from-source only. If you want to run it, clone the repo and build it with the steps below. Mobile (iOS/Android) builds exist as Tauri targets but are experimental and not distributed anywhere, so you build those yourself too.

## Features

Everything runs locally by default. Sync is optional and encrypted end-to-end.

- **Rich block editor** built on BlockNote: headings, lists, checklists, tables, code blocks, images, @mentions, and backlinks.
- **Tasks** with status, priority, due dates, and recurrence (daily, weekly, monthly, and more).
- **Daily notes** with deterministic per-day IDs and optional templates.
- **Loro CRDT storage with Time Machine.** Every object keeps a version history, and you can inspect or roll any object back to an earlier state. The same CRDT layer is what makes conflict-free sync possible.
- **On-device semantic search.** Embeddings are computed locally with `@xenova/transformers` (Transformers.js). Nothing is sent to a cloud service. This runs alongside full-text and fuzzy search (Fuse.js) so you can match by meaning or by exact text.
- **End-to-end encrypted device sync.** A 24-word BIP39 mnemonic (the Skeleton Key) derives your keys. Data is encrypted client-side with XChaCha20-Poly1305 before it ever leaves the device. Sync runs peer-to-peer over your local network (mDNS discovery) or through a relay you host. The relay only ever sees ciphertext.
- **Import** from Notion, Obsidian, plain Markdown, and JSON backups. Structure (frontmatter, wiki-links, tags) is preserved where it maps cleanly.
- **Export** to Markdown, HTML, JSON, and PDF, individually or as a full-vault ZIP.
- **Keyboard-first navigation** with a command palette and configurable shortcuts.
- **Light and dark themes.**

## Quickstart

### Prerequisites

- **Node.js 22**
- **pnpm** ([install](https://pnpm.io/installation))
- **Rust toolchain** (stable, via [rustup](https://rustup.rs/))

Platform-specific native dependencies are required to build the Tauri shell:

- **macOS**: `xcode-select --install`
- **Windows**: Microsoft C++ Build Tools and WebView2 (WebView2 is usually preinstalled on Windows 10/11).
- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

### Run it

```bash
git clone <your-fork-or-clone-url> skelenote
cd skelenote
pnpm install
pnpm tauri dev
```

`pnpm tauri dev` starts the Vite dev server and launches the native app with hot reload. React changes hot-reload; Rust changes require a restart.

### Build a release bundle

```bash
pnpm tauri build
```

Output lands in `src-tauri/target/release/bundle/`.

### Test

```bash
pnpm test        # Vitest, watch mode
pnpm test:run    # single run (CI mode)
pnpm bench       # benchmarks
```

Frontend checks:

```bash
pnpm lint            # ESLint
pnpm exec tsc --noEmit
```

Rust checks:

```bash
cd src-tauri
cargo test
cargo fmt --check
cargo clippy
```

## Architecture

Skelenote is a Tauri 2 desktop app: a React/TypeScript frontend running in a system webview, with a Rust backend for crypto, networking, and platform integration. Application data lives in a Loro CRDT document; sync ships encrypted CRDT updates between devices.

```
skelenote/
├── src/                    # React + TypeScript frontend
│   ├── components/         # UI by feature (editor, sync, settings, import, ...)
│   ├── contexts/           # React context providers
│   ├── hooks/              # custom hooks
│   ├── lib/                # core logic
│   │   ├── loro/           # CRDT document store and queries
│   │   ├── sync/           # sync client and protocol
│   │   ├── crypto/         # frontend crypto wrapper
│   │   ├── semantic/       # on-device embeddings + semantic search
│   │   ├── search/         # full-text and fuzzy search
│   │   ├── export/         # Markdown / HTML / JSON / PDF export
│   │   ├── import/         # Notion / Obsidian / Markdown / JSON import
│   │   ├── tasks/          # task and recurrence logic
│   │   └── daily/          # daily notes
│   ├── theme/              # Mantine theme
│   └── styles/             # global CSS
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── crypto/         # BIP39, key derivation, XChaCha20-Poly1305
│   │   ├── network/        # mDNS discovery, TCP transport, device pairing
│   │   ├── mobile/         # mobile-specific glue
│   │   └── lib.rs          # Tauri command handlers
│   └── gen/                # generated iOS/Android platform projects (experimental)
├── sync-relay/             # self-hosted sync relay (Node + Docker)
├── workers/                # Cloudflare Worker variant of the relay
└── docs/                   # documentation
```

**Tech stack:** Tauri 2 (Rust) shell, React 18 + TypeScript + Vite, Mantine 8 UI, BlockNote editor, Loro CRDT, `@xenova/transformers` for embeddings, Fuse.js for fuzzy search.

## Sync

Sync is optional and end-to-end encrypted. Two transports:

- **Local network (peer-to-peer):** devices discover each other over mDNS and exchange encrypted CRDT updates directly. No server involved.
- **Relay:** for syncing when devices are not on the same network, you run your own relay. There is no hosted Skelenote sync service. The relay is a dumb pipe that stores and forwards ciphertext; it never has your keys and cannot read your data.

The self-hosted relay lives in [`sync-relay/`](sync-relay/) and ships with a Dockerfile and `docker-compose.yml`:

```bash
cd sync-relay
docker compose up -d
```

Then point Skelenote's sync settings at your relay URL (use `wss://` behind a TLS-terminating reverse proxy in production). See [`sync-relay/README.md`](sync-relay/README.md) for configuration, endpoints, and deployment notes.

## Mobile

The repo includes iOS and Android Tauri targets under `src-tauri/gen/`. These are experimental and not shipped, so there is no TestFlight build, no App Store listing, and no APK download. To try mobile, build it yourself:

```bash
pnpm tauri ios dev       # requires Xcode + CocoaPods + iOS Rust targets
pnpm tauri android dev   # requires Android Studio SDK/NDK + Android Rust targets
```

You need the corresponding native toolchains and Rust targets installed. Expect rough edges.

## Security

- Data at rest is encrypted with XChaCha20-Poly1305.
- Keys are derived from a 24-word BIP39 mnemonic (the Skeleton Key). If you lose it, you lose access. There is no recovery backdoor, by design.
- Sync data is encrypted client-side before transmission; relays and peers only see ciphertext.

Skelenote has not been independently audited. See [SECURITY.md](SECURITY.md) for the security model, cryptographic primitives, and how to report a vulnerability.

## Contributing

Build from source with the Quickstart above, run the test and lint steps before opening a PR, and match the existing code style (Mantine components, `lucide-react` icons, path aliases via `@/`). See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
