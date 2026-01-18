# Contributing to Skelenote

Thank you for your interest in contributing to Skelenote! This guide will help you get set up and understand our development workflow.

## Ways to Contribute

### Alpha Testing (No Code Required)

We're in alpha and actively seeking testers. This is one of the most valuable contributions right now:

1. **Test the app** - Download from [Releases](https://github.com/skeletor-js/skelenote/releases) and use it
2. **Report bugs** - [File a bug](https://linear.app/skeletorjs/team/skelenote) with steps to reproduce
3. **Request features** - [Request a feature](https://linear.app/skeletorjs/team/skelenote) with your ideas
4. **Join Discord** - Chat with other testers and provide real-time feedback

See the [Getting Started Guide](docs/user/getting-started.md) for detailed instructions.

### Code Contributions

For code contributions, continue reading below for setup and workflow.

## Prerequisites

### Required

- **Node.js 18+** - [Download](https://nodejs.org/)
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

Before making UI changes, review `docs/product/design/style-guide.md`. Key principles:

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

## Project Management
  
  We use **Linear** for issue tracking and project management.
  
### Finding Work
  
  1. Check our [Linear Roadmap](https://linear.app/skeletorjs/team/skelenote)
  2. Join our [Discord](https://discord.gg/4apsgSRB7D) to discuss what to work on

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure tests pass (`pnpm test:run`)
5. Ensure linting passes (`pnpm lint`)
6. Ensure TypeScript compiles (`pnpm exec tsc --noEmit`)
7. Push to your fork
8. Open a Pull Request against `main`

GitHub Actions will automatically:

- Run tests on Ubuntu
- Run linting and type checking
- Build for macOS (ARM + Intel), Windows, and Linux

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

## CI/CD Pipeline

Skelenote uses GitHub Actions for continuous integration and deployment. See [docs/developer/ci-cd.md](docs/developer/ci-cd.md) for details.

### Workflows

- **Test** - Runs on every push and PR. Executes linting, frontend tests, and Rust tests.
- **Build** - Runs on pushes to `main` and PRs. Builds binaries for all platforms (macOS, Windows, Linux).
- **Release** - Runs on version tags (`v*`). Creates GitHub releases with signed binaries.

### Cross-Platform Testing

Skelenote is fully tested and supported on:

- macOS (ARM64 and x86_64)
- Windows (x86_64)
- Linux (Ubuntu, Fedora, and other distros via AppImage)
- iOS (via Tauri 2.0 mobile)
- Android (via Tauri 2.0 mobile)

The CI pipeline builds and tests on all platforms automatically.

## Getting Help

- **Bugs**: [File a bug](https://linear.app/skeletorjs/team/skelenote)
- **Features**: [Request a feature](https://linear.app/skeletorjs/team/skelenote)
- **Questions**: Join our [Discord](https://discord.gg/4apsgSRB7D)
- Check [Linear Roadmap](https://linear.app/skeletorjs/team/skelenote) before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 license.

### Contributor License Agreement (CLA)

Before we can accept your contribution, you must sign our CLA. This is a one-time process:

1. Open a pull request
2. The CLA bot will comment with instructions
3. Sign by commenting "I have read the CLA and agree to its terms"
4. Future PRs skip this step

The CLA ensures you have the right to contribute and protects both you and the project. See [.github/CLA.md](.github/CLA.md) for the full agreement.
