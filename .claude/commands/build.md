---
description: Build production binaries for distribution (project)
allowed-tools: Bash(pnpm tauri:*)
---

Create production-ready binaries for the current platform.

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

## Notes

- Takes longer than dev builds (5-10 minutes)
- Outputs are optimized and minified
- Binaries are currently unsigned (alpha)
