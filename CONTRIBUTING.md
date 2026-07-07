# Contributing to Skelenote

Thank you for your interest in contributing to Skelenote! This guide will help you get set up and understand our development workflow.

## Ways to Contribute

There are no prebuilt binaries. Skelenote is build-from-source only, so trying it out means building it (see below).

- **Report bugs** - [Open an issue](https://github.com/skeletor-js/skelenote/issues) with steps to reproduce
- **Request features** - [Open an issue](https://github.com/skeletor-js/skelenote/issues) with your idea
- **Contribute code** - continue reading below for setup and workflow

See the [Getting Started Guide](docs/user/getting-started.md) for build instructions.

## Prerequisites

### Required

- **Node.js 22** - [Download](https://nodejs.org/)
- **Rust (latest stable)** - [Install via rustup](https://rustup.rs/)
- **pnpm** - [Install pnpm](https://pnpm.io/installation)

### Platform-Specific Dependencies

#### macOS

```bash
xcode-select --install
```

#### Windows

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

#### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Mobile Development (Optional)

For iOS and Android development:

#### iOS

- **Xcode 15+** - Install from Mac App Store
- **iOS Simulator** - Installed with Xcode
- **CocoaPods** - `sudo gem install cocoapods`
- **Rust iOS targets**:

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

#### Android

- **Android Studio** - [Download](https://developer.android.com/studio)
- **Android SDK** (API 24+) - Install via Android Studio SDK Manager
- **Android NDK** - Install via Android Studio SDK Manager
- **Java 17** - Required for Gradle
- **Rust Android targets**:

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
```

See [docs/developer/mobile-development.md](docs/developer/mobile-development.md) for detailed setup.

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/skeletor-js/skelenote.git
cd skelenote
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm tauri dev
```

This starts the Vite dev server and launches the Tauri app with hot reload. Changes to React code will hot-reload; changes to Rust code require a restart.

### 4. Build for Production

```bash
pnpm tauri build
```

Produces platform-specific binaries in `src-tauri/target/release/bundle/`.

## Code Style

### TypeScript/React

- **Strict mode** enabled with `noUnusedLocals` and `noUnusedParameters`
- **Path aliases**: Use `@/` for imports from `src/` (e.g., `import { useObjects } from '@/contexts'`)
- **Component style**: Functional components with hooks
- **UI Framework**: Mantine 8 - use Mantine components for all UI
- **Icons**: Lucide React only - see `src/lib/icons.ts` for the icon map

### Rust

- Follow standard Rust conventions
- Use `cargo fmt` before committing
- Use `cargo clippy` to catch common issues

### Design System

Before making UI changes, review `docs/product/design/README.md`. Key principles:

- Light and Dark modes (warm palette: ember, clay, sage, ochre, brick, slate)
- No emojis in the interface
- Linear-inspired minimal aesthetic
- High-density, keyboard-first design

## Testing

```bash
pnpm test                   # Run all tests (watch mode)
pnpm test:run               # Run all tests once (CI mode)
pnpm test -- path/to/test   # Run specific test file
pnpm test:ui                # Run tests with Vitest UI
pnpm bench                  # Run benchmark suites
```

Test files are co-located with source files using `.test.ts` or `.spec.ts` suffix.

See [docs/developer/testing.md](docs/developer/testing.md) for comprehensive testing guide including test patterns, benchmarks, and Rust tests.

### Running the Full Test Suite

Before submitting a PR, run the complete test suite that CI runs:

```bash
# Frontend linting and type checking
pnpm lint
pnpm exec tsc --noEmit

# Frontend tests
pnpm test:run

# Rust tests
cd src-tauri
cargo test
cargo fmt --check
cargo clippy
```

## Git Workflow

### Branching

- `main` - Stable, production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add keyboard shortcut for quick create
fix: resolve sync conflict in object store
docs: update contributing guide
refactor: simplify object context provider
```

## Finding Work

We use [GitHub Issues](https://github.com/skeletor-js/skelenote/issues) for tracking bugs and feature requests. Browse open issues for something to pick up, and see [ROADMAP.md](ROADMAP.md) for planned direction.

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure tests pass (`pnpm test:run`)
5. Ensure linting passes (`pnpm lint`)
6. Ensure TypeScript compiles (`pnpm exec tsc --noEmit`)
7. Push to your fork
8. Open a Pull Request against `main`

GitHub Actions runs linting, type checking, and tests on your PR. Run these locally first (see below) so you're not waiting on CI.

### PR Review Checklist

- [ ] Tests added/updated for new functionality
- [ ] All tests pass locally (`pnpm test:run`)
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript types are correct (`pnpm exec tsc --noEmit`)
- [ ] No console.log statements left in code
- [ ] UI changes follow the style guide
- [ ] Documentation updated if needed
- [ ] CI checks pass (visible in PR)

## Project Structure

```
skelenote/
├── src/                    # React frontend
│   ├── components/         # UI components by feature
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core business logic
│   │   ├── loro/           # CRDT store and queries
│   │   ├── sync/           # P2P sync protocol
│   │   ├── crypto/         # Encryption wrapper
│   │   ├── types/          # TypeScript types
│   │   └── search/         # Search implementation
│   ├── theme/              # Mantine theme config
│   └── styles/             # Global CSS
├── src-tauri/              # Rust backend
│   └── src/
│       ├── crypto/         # Encryption, key management
│       ├── network/        # P2P networking
│       └── lib.rs          # Tauri command handlers
└── docs/                   # Documentation
    ├── design/             # Design system, brand
    ├── developer/          # Technical docs
    └── user/               # User guides
```

## Debugging

### Frontend

- Use browser DevTools (Cmd+Option+I in the Tauri window)
- React DevTools extension works normally

### Rust/Tauri

- Add `println!` or use the `dbg!` macro
- Output appears in the terminal running `pnpm tauri dev`

### Data Location

- **macOS**: `~/Library/Application Support/com.skelenote.app/`
- **Windows**: `%APPDATA%\com.skelenote.app\`
- **Linux**: `~/.local/share/com.skelenote.app/`

## CI

Skelenote uses GitHub Actions to run linting, type checking, and the test suite on pushes and PRs. See [docs/developer/ci-cd.md](docs/developer/ci-cd.md) for details. Desktop is developed and tested primarily on macOS and Linux; the mobile (iOS/Android) targets build via Tauri but are experimental and not covered by the same level of CI.

## Getting Help

- **Bugs and features**: [GitHub Issues](https://github.com/skeletor-js/skelenote/issues)
- Search existing issues before opening a new one

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 license.
