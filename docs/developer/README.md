# Developer Documentation

Technical reference for Skelenote contributors.

## Quick Start

Ship your first PR in 30 minutes.

### 1. Environment Setup

**Prerequisites**:

- **Node.js** 18+
- **Rust** (latest stable) - [Install Rust](https://rustup.rs/)
- **pnpm** (recommended) or npm/yarn

**Platform Specifics**:

- **macOS**: `xcode-select --install`
- **Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`
- **Mobile**: Xcode 15+ (iOS), Android Studio (Android) - see [Mobile Development](mobile-development.md)

### 2. Clone & Install

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
pnpm install
```

### 3. Run the App

```bash
pnpm tauri dev              # Desktop app with hot reload
# OR
pnpm tauri ios dev          # iOS simulator
pnpm tauri android dev      # Android emulator
```

The desktop app window should open in ~30 seconds.
**Note**: Rust changes require restarting the dev server. React changes hot reload instantly.

### 4. Make a Change

**Example: Add a Keyboard Shortcut**
Edit `src/contexts/KeyboardShortcutsContext.tsx`:

```typescript
{
  key: 'd',
  modifiers: ['meta', 'shift'],
  action: () => console.log('Debug mode toggled!'),
  description: 'Toggle debug mode',
}
```

**Example: Add a Tauri Command**

1. **Rust**: Add function in `src-tauri/src/lib.rs` and register in `invoke_handler`.
2. **Frontend**: Call it with `invoke('my_command', { ... })`.

### 5. Test & Submit

Before pushing, ensure these pass:

```bash
pnpm lint                    # ESLint
pnpm exec tsc --noEmit       # TypeScript
pnpm test:run                # Vitest
```

Then create a PR using the template.

---

## Project Overview

### Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Desktop Shell | [Tauri 2.0](https://tauri.app/) (Rust) |
| Mobile | Tauri 2.0 mobile (iOS/Android) |
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | [Mantine 8](https://mantine.dev/) |
| Editor | [BlockNote](https://www.blocknotejs.org/) |
| Data Layer | [Loro CRDT](https://loro.dev/) |
| Encryption | XChaCha20-Poly1305, BIP39 |
| Hearth | mDNS/Bonjour + Direct TCP |

### Project Structure

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
│   │   └── ...             # See AGENTS.md for full list
│   └── styles/             # Global CSS
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── crypto/         # BIP39, HKDF, XChaCha20-Poly1305
│   │   ├── network/        # mDNS discovery, TCP, QR pairing
│   │   └── lib.rs          # Tauri commands
│   └── gen/                # Mobile platform code (iOS/Android)
└── docs/                   # Documentation
```

## Key Conventions

### Code Style

- **Path aliases**: Use `@/` (e.g., `import { useObjects } from '@/contexts'`).
- **UI**: Use [Mantine](https://mantine.dev/) components, not raw HTML.
- **Icons**: Use `lucide-react`.
- **Design**: See [Style Guide](../design/style-guide.md).

## Testing

```bash
pnpm test                   # Run tests (watch mode)
pnpm test:run               # Run tests once (CI mode)
pnpm bench                  # Run benchmarks
```

**Rust tests:** `cd src-tauri && cargo test`

See [testing.md](testing.md) for the comprehensive testing guide.

## Documentation Index

| Guide | Description |
| ----- | ----------- |
| [Architecture](architecture.md) | System design and data flow |
| [Tauri API](tauri-api.md) | Rust command reference |
| [CI/CD Pipeline](ci-cd.md) | GitHub Actions and releases |
| [Testing](testing.md) | Testing guide and benchmarks |
| [Mobile Development](mobile-development.md) | iOS/Android setup |
| [AGENTS.md](../../AGENTS.md) | Development patterns and gotchas |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Workflow details |
