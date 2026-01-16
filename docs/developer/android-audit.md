# Android vs iOS Parity Audit

Last updated: January 2026

## Summary

Android is **near-parity with iOS** for all core functionality. The two known deferrals (haptics, background sync) are the only significant gaps.

## Feature Parity Status

| Feature | iOS | Android | Notes |
|---------|:---:|:-------:|-------|
| Share Extension | Y | Y | iOS: App Groups UserDefaults / Android: ShareReceiverActivity |
| Deep Links | Y | Y | `skelenote://` scheme via tauri-plugin-deep-link |
| Biometric Auth | Y | Y | Face ID/Touch ID vs Fingerprint |
| Local Notifications | Y | Y | tauri-plugin-notification |
| QR Scanner | Y | Y | tauri-plugin-barcode-scanner |
| Edge-to-Edge | Y | Y | usePlatform() hook provides safe area values |
| Secure Storage | Y | Y | Keychain vs Android Keystore |
| Semantic Search | Y | Y | IndexedDB + Transformers.js |
| **Haptics** | Y | N | Known deferral - Kotlin helper ready |
| **Background Sync** | Y | N | Known deferral - needs WorkManager |

## Known Deferrals

### 1. Haptic Feedback

**Status:** iOS fully working, Android silently no-ops

**Implementation:**
- iOS: Objective-C via `objc` crate (UIKit feedback generators)
- Android: Stub returns `Ok(())`, but `HapticsPlugin.kt` is ready

**Files:**
- `src-tauri/src/haptics.rs` - iOS implementation, Android no-op
- `src-tauri/gen/android/app/src/main/java/com/skelenote/app/HapticsPlugin.kt` - Kotlin helper ready

**To implement:** Create Tauri Android plugin or JNI bridge to call `HapticsHelper` methods.

### 2. Background Sync

**Status:** iOS gets ~30 seconds background execution, Android has no equivalent

**Implementation:**
- iOS: `UIApplication.beginBackgroundTaskWithExpirationHandler`
- Android: None (returns `Ok(0)` no-op)

**Files:**
- `src-tauri/src/lib.rs:2073-2128` - Background task commands
- `src/hooks/useBackgroundTask.ts` - Hook with `isIOS` guard
- `src/contexts/SyncContext.tsx:185-267` - Uses background task

**To implement:** Use Android WorkManager or JobScheduler.

## Platform-Specific Implementation Details

### Share Extension

| Platform | Component | Storage |
|----------|-----------|---------|
| iOS | App Groups UserDefaults | `group.com.skelenote.app` |
| Android | ShareReceiverActivity | `pending_shares.json` in filesDir |

### Safe Area Insets

| Platform | Top | Bottom |
|----------|-----|--------|
| iOS | 47px (notch/Dynamic Island) | 34px (home indicator) |
| Android | 24px (status bar) | 0px |

Handled via the `usePlatform()` hook which provides `safeAreaTop` and `safeAreaBottom` values.

**Note:** The `tauri-plugin-edge-to-edge` CSS variable injection doesn't work reliably on Android. Components use `usePlatform()` directly instead:

```typescript
const { safeAreaTop, safeAreaBottom } = usePlatform();
// Use safeAreaTop directly in styles
paddingTop: safeAreaTop
```

### Biometric Types

| Platform | Types | Display Name |
|----------|-------|--------------|
| iOS | Face ID, Touch ID | Platform-specific via useBiometric |
| Android | Fingerprint, Iris | Generic "Fingerprint" |

## Platform Detection Patterns

### TypeScript (Frontend)

```typescript
const { isMobile, isIOS, isAndroid } = usePlatform();

// Most features use isMobile (both platforms)
if (!isMobile) return;

// iOS-only features check isIOS
if (!isMobile || !isIOS) return;
```

### Rust (Backend)

```rust
#[cfg(target_os = "ios")]
async fn ios_only() { /* iOS impl */ }

#[cfg(target_os = "android")]
async fn android_only() { /* Android impl */ }

#[cfg(not(any(target_os = "ios", target_os = "android")))]
async fn fallback() { /* No-op or desktop */ }
```

## Files with iOS-Only Guards

| File | Feature |
|------|---------|
| `src/contexts/SyncContext.tsx` | Background task management |
| `src/hooks/useBackgroundTask.ts` | Background task hook |

All other mobile features use `isMobile` which includes both platforms.

## Key Files Reference

- `src/hooks/usePlatform.ts` - Platform detection hook with safe area values
- `src/components/layout/MobileLayout.tsx` - Mobile layout wrapper
- `src/components/mobile/primitives/MobileViewHeader.tsx` - Header with safe area padding
- `src-tauri/src/haptics.rs` - Haptic feedback (iOS impl, Android no-op)
- `src-tauri/src/lib.rs` - Tauri commands including background tasks
- `src-tauri/gen/android/app/` - Android native code
