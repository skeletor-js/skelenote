# Mobile

Skelenote's mobile targets are experimental. There is no shipped mobile app.

## Status

Tauri generates iOS and Android projects from the same codebase as the desktop app, and they compile, but neither has ever been distributed. There is no TestFlight build, no App Store or Play Store listing, and no APK download. Treat mobile as unproven and build-it-yourself.

## Building it yourself

You need the desktop toolchain (Node.js 22, pnpm, Rust) plus the mobile toolchains and Rust targets.

**iOS** (requires macOS, Xcode, CocoaPods, and the iOS Rust targets):

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
pnpm tauri ios dev
```

**Android** (requires Android Studio SDK/NDK, Java 17, and the Android Rust targets):

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
pnpm tauri android dev
```

Expect rough edges. Mobile-specific behavior (biometric unlock, share sheet, notifications, touch layout) exists in the codebase but has not been tested to the same standard as desktop.

## Sync on mobile

Once running, a mobile build uses the same sync as desktop: local-network sync over Hearth (mDNS), and optional sync through a relay you host yourself. See the [Local Sync Guide](local-sync-guide.md) and the [Self-Hosted Sync Guide](cloud-sync-guide.md).

Everything is end-to-end encrypted. Data is encrypted on the device before it leaves it.

## Further Reading

- [Getting Started Guide](../getting-started.md) - Build and setup
- [Local Sync Guide](local-sync-guide.md) - Local network sync
- [Self-Hosted Sync Guide](cloud-sync-guide.md) - Sync through a relay you run
