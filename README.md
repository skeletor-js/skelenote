# Skelenote

**A local-first, zero-knowledge note-taking app for object-based thinking.**

[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)](https://github.com/jordanstella/skelenote/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0%20%2B%20Commons%20Clause-green)](LICENSE)

---

## Why Skelenote?

Most note-taking apps store your thoughts on someone else's servers. Skelenote is different.

| | Traditional Apps | Skelenote |
|---|---|---|
| **Data Location** | Their servers | Your device |
| **Who Can Read It** | The company, hackers, governments | Only you |
| **Works Offline** | Limited or not at all | Full functionality |
| **Sync Privacy** | They see everything | Zero-knowledge encryption |
| **Vendor Lock-in** | Export? Good luck. | Your data, your files |

### Core Principles

- **Your Data, Your Device** — All data stored locally using conflict-free replicated data types (CRDTs). No account required. No cloud dependency.

- **True P2P Sync** — Sync directly between your devices on the same network. No cloud servers, no relay, no middleman. Your data never leaves your local network.

- **End-to-End Encrypted** — Your data is encrypted with XChaCha20-Poly1305 before it ever leaves your device. The encryption key? A 24-word "Skeleton Key" that only you control.

- **Works Offline** — Full functionality without an internet connection. Changes sync automatically when you reconnect.

- **No Vendor Lock-in** — Your notes live in files on your computer. You're never locked into our ecosystem.

---

## Features

### Object-Based Thinking
Everything is an object: notes, tasks, projects, links, meetings. Objects connect via typed relations with automatic backlinks, forming your personal knowledge graph.

### Inbox-Driven Workflow
New objects land in your inbox for intentional triage. Process them when you're ready, not when they arrive.

### Quick Capture
Global hotkey (`Cmd+Shift+Space` / `Ctrl+Shift+Space`) lets you capture thoughts from anywhere without switching apps.

### Command Palette
Navigate anywhere instantly with `Cmd+K` / `Ctrl+K`. Search objects, run commands, switch views.

### Daily Notes
Calendar-based daily notes for journaling and time-based organization.

### Clean, Focused UI
Monochromatic black/white/gray design. Tags provide the only color—intentionally minimal to keep focus on your content.

### Google Calendar Integration
Read-only sync of calendar events as Meeting objects. See your schedule alongside your notes.

---

## How It Works

### The Skeleton Key

Your Skeleton Key is a 24-word phrase (BIP39 mnemonic) that serves as your master encryption key. It's generated once, stored securely on your device, and used to derive all encryption keys.

```
example: abandon ability able about above absent absorb abstract absurd abuse access accident ...
```

**Important:** Save your Skeleton Key somewhere safe. It's the only way to decrypt your data on a new device. We can't recover it for you—that's the point.

### P2P Sync Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Your Local Network (WiFi/LAN)                     │
│                                                                          │
│   ┌─────────────────┐              Direct TCP             ┌─────────────────┐
│   │    Device A     │◄────────────────────────────────────►│    Device B     │
│   │   (MacBook)     │         Encrypted Packets            │    (iPhone)     │
│   │                 │                                      │                 │
│   │  ┌───────────┐  │                                      │  ┌───────────┐  │
│   │  │ Loro CRDT │  │    ┌────────────────────────────┐    │  │ Loro CRDT │  │
│   │  │   Store   │  │    │  mDNS/Bonjour Discovery    │    │  │   Store   │  │
│   │  └───────────┘  │    │  _skelenote._tcp.local     │    │  └───────────┘  │
│   │                 │    └────────────────────────────┘    │                 │
│   │  ┌───────────┐  │                                      │  ┌───────────┐  │
│   │  │ XChaCha20 │  │         No external servers          │  │ XChaCha20 │  │
│   │  │ Encrypt   │  │         No cloud dependency          │  │ Encrypt   │  │
│   │  └───────────┘  │         No data leaves network       │  └───────────┘  │
│   └─────────────────┘                                      └─────────────────┘
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. Devices discover each other via mDNS/Bonjour on your local network
2. Direct TCP connections are established between devices
3. You make a change locally (edit a note, create a task)
4. The update is encrypted with your Skeleton Key (XChaCha20-Poly1305)
5. Encrypted data syncs directly to other devices on the network
6. Loro CRDT merges changes automatically (no conflicts)

**Your data never leaves your network.** No cloud, no relay servers, no third parties.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | [Tauri 2.0](https://tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript |
| Editor | [BlockNote](https://www.blocknotejs.org/) |
| Data Layer | [Loro CRDT](https://loro.dev/) |
| Encryption | XChaCha20-Poly1305, BIP39, HKDF-SHA256 |
| P2P Sync | mDNS/Bonjour + Direct TCP |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** (latest stable) — [Install Rust](https://rustup.rs/)
- **pnpm** (recommended) or npm/yarn

### Clone & Install

```bash
git clone https://github.com/jordanstella/skelenote.git
cd skelenote
pnpm install
```

### Development

```bash
pnpm tauri:dev
```

This starts the Vite dev server and launches the Tauri app with hot reload.

### Build

```bash
pnpm tauri:build
```

Produces platform-specific binaries in `src-tauri/target/release/bundle/`.

### Testing

```bash
pnpm test        # Run tests
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

### The P2P Release (Next)
- **Device Management** — View, rename, and revoke access for synced devices
- **Time Machine** — Browse your entire knowledge base at any point in time, restore previous versions
- **Semantic Search** — Local ML-powered conceptual search (opt-in, runs entirely on device)
- **Side-by-Side View** — Compare objects or versions in split pane layout

### The Convenience Release
- **Custom Saved Views** — Save filtered, sorted views of your objects
- **Templates** — Quick-create objects from templates
- **Markdown Export** — Export notes to standard markdown
- **Bulk Operations** — Select and act on multiple objects at once
- **Pinned Objects** — Pin frequently accessed objects to the top
- **Transclusion** — Embed content from one note into another

### Future
- **Mobile Apps** — iOS and Android clients

---

## Contributing

Contributions are welcome! Here's how to get started:

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

<p align="center">
  <strong>Your notes. Your device. Your keys.</strong>
</p>
