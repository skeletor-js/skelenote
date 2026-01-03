# Skelenote

**The Permanent Operating System for Your Mind**

A local-first, zero-knowledge private workspace. Your vault lives on your device, encrypted with keys only you control.

[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)](https://github.com/jordanstella/skelenote/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0%20%2B%20Commons%20Clause-green)](LICENSE)

---

## Why Skelenote?

For the last decade, we traded ownership for access. We stopped buying software and started paying landlords. The modern productivity landscape is a noisy open-plan office—loud, rented, and hostile to deep work.

**Skelenote is the rejection of that era.**

It is your **Digital Study**—a quiet room you own, not a noisy service you visit. The door locks, the tools are yours, and your thoughts remain private until you choose to share them.

| | Cloud Apps | Skelenote |
|---|---|---|
| **Where Data Lives** | Their servers | Your vault, on your device |
| **Who Can Read It** | The company, hackers, governments | Only you (zero-knowledge) |
| **Offline?** | Limited or broken | Full functionality, always |
| **Sync Model** | They see everything | [Campfire](#campfire-sync-local-first-p2p): encrypted P2P |
| **Lock-in** | Export? Good luck. | Your files. Walk away anytime. |

### Core Principles

- **Local. Encrypted. Yours.** — Your vault lives on your device, encrypted with XChaCha20-Poly1305 before anything leaves your machine. The key? A 24-word "Skeleton Key" that only you control.

- **Campfire Sync** — Physical proximity is the ultimate encryption. Devices on the same network discover each other and sync directly—no cloud, no relay, no middleman. [Learn more](#campfire-sync-local-first-p2p).

- **Structure is Freedom** — Skelenote comes furnished with the PARA method (Projects, Areas, Resources, Archives). Step into a working system on day one. In a future update, you'll be able to rearrange the furniture.

- **Offline-First, Always** — Full functionality without internet. No spinners waiting for the cloud. Changes sync when you reconnect.

- **No Lock-in** — Your objects live in files on your computer. Export to Markdown anytime. Walk away whenever you want.

### Built to Own

Skelenote costs $19.99—once. No subscription, no account required.

You own version 1 forever. Future major versions are separate purchases (like Sketch or Things 3). We only charge recurring fees for optional infrastructure services. Technical users can self-host everything.

---

## Features

### The Object Graph
Everything is an **Object**: tasks, notes, projects, areas, links, meetings, people. A todo item has the same power as a 5,000-word thesis—same properties, tags, and linking capabilities. Objects connect via typed relations with automatic backlinks, forming your personal knowledge graph.

### Inbox-Driven Workflow
New objects land in your inbox for intentional triage. Process them when you're ready, not when they arrive. Your study stays quiet; the noise stays in the inbox.

### Quick Capture
Global hotkey (`Cmd+Shift+Space` / `Ctrl+Shift+Space`) captures thoughts from anywhere without switching apps. Thoughts go to inbox; triage happens later.

### Command Palette
Navigate anywhere instantly with `Cmd+K` / `Ctrl+K`. Search objects, run commands, switch views. Keyboard-first design for flow states.

### Time Machine
Built on [Loro CRDTs](https://loro.dev/), Skelenote records the history of your vault. Revert a single object—or your entire vault—to any previous state. Fear of deleting the wrong paragraph is gone.

### Clean, Focused UI
Warm earth tones (ember, sage, clay) replace cold corporate blues. High-density, low-noise interface that recedes until needed. Your content, not our chrome.


---

## How It Works

### The Skeleton Key

Your Skeleton Key is a 24-word phrase (BIP39 mnemonic) that serves as your master encryption key. It's generated once, stored securely on your device, and used to derive all encryption keys.

```
example: abandon ability able about above absent absorb abstract absurd abuse access accident ...
```

**Important:** Save your Skeleton Key somewhere safe. It's the only way to decrypt your data on a new device. We can't recover it for you—that's the point.

### Campfire Sync: Local-First P2P

When devices share the same network, they find each other automatically and sync directly—no internet required. Physical proximity is the ultimate encryption: your data never leaves your local network.

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

### The Exodus (Next)
- **Import Wizards** — One-click migration from Notion, Obsidian, and Roam
- **Native Mobile** — iOS and Android apps (same vault, same encryption)
- **Local Whisper** — Unlimited offline voice transcription (bring your own model)
- **Skelenote Publish** — One-click web publishing from your vault
- **Graph View** — Visualize the neural network of your knowledge

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

## Documentation

- [Security & Privacy Architecture](docs/security-privacy.md) — Encryption, threat model, zero-knowledge design
- [Campfire Mode Guide](docs/campfire-guide.md) — Local P2P sync setup and use cases
- [Cloud Sync Setup](docs/cloud-sync-guide.md) — Optional relay server configuration
- [Design System](docs/style-guide.md) — UI components and patterns

---

<p align="center">
  <strong>Local. Encrypted. Yours.</strong>
</p>
