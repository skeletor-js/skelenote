# CI/CD Pipeline

Skelenote uses GitHub Actions for continuous integration, cross-platform builds, and releases. This document explains how the CI/CD pipeline works, what gets tested, and how to work with it.

## Overview

The CI/CD pipeline consists of three main workflows:

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| **Test** | Every push, every PR | Linting, frontend tests, Rust tests | ~3-5 min |
| **Build** | Push to `main`, PRs to `main` | Cross-platform builds (macOS, Windows, Linux) | ~15-25 min |
| **Release** | Version tags (`v*`) | Publish GitHub releases with binaries | ~20-30 min |

## Workflow Details

### Test Workflow (`.github/workflows/test.yml`)

**Runs on:** Ubuntu 22.04

**Steps:**
1. Install system dependencies (WebKit2GTK, librsvg2, etc.)
2. Setup pnpm, Node.js 22, and Rust toolchain
3. Install project dependencies (`pnpm install`)
4. Run ESLint (`pnpm lint`)
5. Run frontend tests with Vitest (`pnpm test:run`)
6. Run Rust tests (`cargo test`)

**Purpose:** Fast feedback loop for code quality and correctness. This runs on every push to any branch and on all PRs.

**How to replicate locally:**
```bash
# Install dependencies (one time)
pnpm install

# Run the same checks CI runs
pnpm lint                 # ESLint
pnpm test:run             # Frontend tests
cd src-tauri && cargo test # Rust tests
```

### Build Workflow (`.github/workflows/build.yml`)

**Runs on:** Matrix of platforms

**Platform Matrix:**
- **macOS (latest)** - Builds both ARM64 and x86_64 (Intel) binaries
- **Windows (latest)** - Builds x86_64 NSIS installer
- **Ubuntu 22.04** - Builds .deb, .rpm, and .AppImage

**Steps (per platform):**
1. Install platform-specific system dependencies
2. Setup pnpm, Node.js 22, and Rust
3. Install Rust targets (macOS: `aarch64-apple-darwin`, `x86_64-apple-darwin`)
4. Cache Rust build artifacts for faster subsequent builds
5. Install project dependencies
6. Build Tauri app with platform-specific arguments
7. Upload artifacts to GitHub Actions

**Artifacts produced:**
- **macOS**: `.dmg` and `.app` bundles for ARM64 and Intel
- **Windows**: `.exe` NSIS installer
- **Linux**: `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), `.AppImage` (universal)

**Build arguments:**
```bash
# macOS ARM
pnpm tauri build --target aarch64-apple-darwin

# macOS Intel
pnpm tauri build --target x86_64-apple-darwin

# Windows (NSIS only, faster)
pnpm tauri build --bundles nsis

# Linux (all formats)
pnpm tauri build
```

**How to build locally:**
```bash
# Default build for your platform
pnpm tauri build

# Cross-compile (macOS only, for the other architecture)
pnpm tauri build --target aarch64-apple-darwin  # ARM from Intel
pnpm tauri build --target x86_64-apple-darwin   # Intel from ARM
```

**Output location:**
```
src-tauri/target/
├── aarch64-apple-darwin/release/bundle/  # macOS ARM
├── x86_64-apple-darwin/release/bundle/   # macOS Intel
└── release/bundle/                       # Current platform
    ├── dmg/          # macOS disk images
    ├── macos/        # macOS .app bundles
    ├── nsis/         # Windows installers
    ├── deb/          # Debian packages
    ├── rpm/          # RPM packages
    └── appimage/     # AppImage files
```

### Release Workflow (`.github/workflows/release.yml`)

**Runs on:** Git tags matching `v*` (e.g., `v0.1.0-alpha.1`)

**Steps:**
1. Same build matrix as Build workflow (macOS, Windows, Linux)
2. Uses `tauri-apps/tauri-action@v0` to build and publish
3. Creates a GitHub Release (draft mode)
4. Uploads all platform binaries to the release

**Release notes template:**
```markdown
## Skelenote v0.1.0-alpha.1

See the assets below to download and install.

**Note:** This is an alpha release. Binaries are not code-signed and may show security warnings on macOS and Windows.

### Downloads
- **macOS**: `.dmg` (both Apple Silicon and Intel)
- **Windows**: `.exe` (NSIS installer)
- **Linux**: `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), `.AppImage` (universal)
```

**How to trigger a release:**
```bash
# Bump version in package.json and src-tauri/tauri.conf.json
# Commit changes
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.1.0-alpha.2"

# Create and push tag
git tag v0.1.0-alpha.2
git push origin main --tags

# GitHub Actions will automatically build and create the release
```

**Release settings:**
- `releaseDraft: true` - Releases are created as drafts for manual review before publishing
- `prerelease: true` - All releases are marked as pre-release during alpha

## Cross-Platform Support

Skelenote is fully tested and supported on the following platforms:

### macOS
- **Architectures**: ARM64 (Apple Silicon), x86_64 (Intel)
- **Minimum version**: macOS 10.15 (Catalina)
- **Format**: `.dmg` installer and `.app` bundle
- **Dependencies**: Xcode Command Line Tools
- **Note**: Unsigned builds will show "unidentified developer" warnings

### Windows
- **Architecture**: x86_64
- **Minimum version**: Windows 10
- **Format**: `.exe` NSIS installer
- **Dependencies**: WebView2 (usually pre-installed on Windows 10/11)
- **Note**: Unsigned builds will show SmartScreen warnings

### Linux
- **Tested distributions**: Ubuntu 22.04, Fedora (latest)
- **Formats**:
  - `.deb` - Debian, Ubuntu, Linux Mint, Pop!_OS
  - `.rpm` - Fedora, RHEL, CentOS, openSUSE
  - `.AppImage` - Universal (works on any distro)
- **Dependencies**: WebKit2GTK 4.1, AppIndicator3
- **Install commands**:
  ```bash
  # Debian/Ubuntu
  sudo dpkg -i skelenote_*.deb

  # Fedora/RHEL
  sudo rpm -i skelenote-*.rpm

  # AppImage (any distro)
  chmod +x skelenote-*.AppImage
  ./skelenote-*.AppImage
  ```

## Platform-Specific Build Dependencies

### macOS
No additional dependencies needed beyond Xcode Command Line Tools:
```bash
xcode-select --install
```

### Windows
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10/11)

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf rpm
```

Note: `rpm` package is needed for building `.rpm` files on Ubuntu.

### Linux (Fedora/RHEL)
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel patchelf rpm-build
```

## CI Optimization

### Caching Strategy

The workflows use multiple caching layers for faster builds:

1. **pnpm cache** - `setup-node` with `cache: 'pnpm'`
2. **Rust cache** - `swatinem/rust-cache@v2` with workspace targeting

### Build Times

Typical build times (with warm cache):
- **Test workflow**: 3-5 minutes
- **Build workflow (per platform)**: 5-10 minutes
- **Full matrix build**: 15-25 minutes (parallel)
- **Release workflow**: 20-30 minutes (includes uploads)

### Parallelization

The Build and Release workflows use a strategy matrix with `fail-fast: false`, meaning:
- All platforms build in parallel
- One platform failing doesn't cancel the others
- You get artifacts for all successful builds even if one fails

## Troubleshooting CI Failures

### Test Failures

**Symptom:** ESLint errors, TypeScript errors, or test failures

**Solution:**
```bash
# Run locally to reproduce
pnpm lint
pnpm exec tsc --noEmit
pnpm test:run
```

Fix the errors and push again.

### Build Failures

**Symptom:** Platform-specific build errors

**Common causes:**
1. Missing system dependencies (check platform-specific deps above)
2. Rust compilation errors (run `cargo build` locally)
3. Tauri configuration issues (validate `src-tauri/tauri.conf.json`)

**Debug steps:**
1. Check the GitHub Actions logs for the specific platform that failed
2. Replicate locally on that platform (or use a VM/Docker)
3. Run the exact build command CI uses:
   ```bash
   pnpm tauri build $ARGS
   ```

### Release Failures

**Symptom:** Tag push doesn't trigger release, or release is incomplete

**Common causes:**
1. Tag doesn't match `v*` pattern (must start with `v`)
2. Version mismatch between `package.json` and `tauri.conf.json`
3. Missing `GITHUB_TOKEN` permissions

**Verification:**
```bash
# Check tag matches pattern
git tag -l "v*"

# Verify versions match
grep '"version"' package.json
grep '"version"' src-tauri/tauri.conf.json
```

## Running Builds Locally

### Development Builds

Fast iteration with hot reload:
```bash
pnpm tauri dev
```

Changes to React code hot-reload instantly. Changes to Rust require a restart.

### Production Builds

Build optimized binaries:
```bash
# Default platform
pnpm tauri build

# Specific format (faster)
pnpm tauri build --bundles dmg         # macOS only
pnpm tauri build --bundles nsis        # Windows only
pnpm tauri build --bundles deb         # Linux only
pnpm tauri build --bundles appimage    # Linux only
```

### Cross-Platform Builds

**macOS only** - Can cross-compile for both architectures:
```bash
# Install both targets
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# Build for specific architecture
pnpm tauri build --target aarch64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin
```

**Cross-compiling between platforms** (e.g., Windows on macOS) is not supported by Tauri. Use GitHub Actions for multi-platform builds.

## Viewing CI Artifacts

After a Build workflow completes successfully:

1. Go to the GitHub Actions run
2. Scroll to the bottom to see "Artifacts"
3. Download artifacts for your platform:
   - `skelenote-macOS-ARM`
   - `skelenote-macOS-Intel`
   - `skelenote-Windows`
   - `skelenote-Linux`

Artifacts are kept for 90 days (GitHub default).

## Future Improvements

Planned CI/CD enhancements:
- Code signing for macOS and Windows (requires certificates)
- Automated notarization for macOS
- Automated testing on real devices (macOS, Windows, Linux VMs)
- Performance benchmarking in CI
- Bundle size tracking
- Automatic changelog generation from commits
