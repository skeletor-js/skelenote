---
description: Build production binaries for distribution
---

# Build Skill

Creates production-ready binaries for the current platform.

## Steps

1. Run the Tauri production build:
```bash
pnpm tauri build
```

2. Report the output location and file sizes.

## Output Locations

### macOS
- `src-tauri/target/release/bundle/dmg/Skelenote_*.dmg`
- `src-tauri/target/release/bundle/macos/Skelenote.app`

### Windows
- `src-tauri/target/release/bundle/nsis/Skelenote_*_x64-setup.exe`

### Linux
- `src-tauri/target/release/bundle/deb/skelenote_*_amd64.deb`
- `src-tauri/target/release/bundle/rpm/skelenote-*.x86_64.rpm`
- `src-tauri/target/release/bundle/appimage/skelenote_*.AppImage`

## When to Use

- Testing production builds locally
- Preparing for a release
- Debugging production-only issues

## Notes

- Takes longer than dev builds (5-10 minutes)
- Outputs are optimized and minified
- Binaries are currently unsigned (alpha)
- For releases, prefer the GitHub Actions workflow which builds for all platforms

## Example Output

```
Building Skelenote for macOS...

   Compiling skelenote v0.1.0 (release)
    Bundling Skelenote.app
    Bundling Skelenote_0.1.0_aarch64.dmg

✓ Build complete!

Output:
  DMG: src-tauri/target/release/bundle/dmg/Skelenote_0.1.0_aarch64.dmg (45.2 MB)
  App: src-tauri/target/release/bundle/macos/Skelenote.app (142 MB)
```
