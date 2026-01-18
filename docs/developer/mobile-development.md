# Mobile Development Guide

Skelenote uses Tauri 2.0's mobile support to build native iOS and Android apps from the same codebase as the desktop app. This guide covers setup, development, and mobile-specific patterns.

## Overview

The mobile apps share the same React frontend and Rust backend as the desktop app, with platform-specific native capabilities accessed through Tauri plugins and custom commands.

**Mobile code locations:**

| Path | Description |
|------|-------------|
| `src-tauri/gen/apple/` | iOS/macOS Xcode project |
| `src-tauri/gen/android/` | Android Gradle project |
| `src/components/mobile/` | Mobile-specific React components |
| `src/hooks/use*.ts` | Platform-aware hooks (many are mobile-specific) |

## Prerequisites

### iOS Development

1. **macOS** - iOS development requires macOS
2. **Xcode 15+** - Install from the App Store
3. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
4. **CocoaPods** (for iOS dependencies):
   ```bash
   sudo gem install cocoapods
   ```
5. **iOS Simulator** - Included with Xcode (download additional simulators in Xcode > Settings > Platforms)

### Android Development

1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **Android SDK** - Install via Android Studio (SDK Manager)
3. **Android NDK** - Required for Rust compilation
   - Open Android Studio > SDK Manager > SDK Tools
   - Check "NDK (Side by side)" and install
4. **Environment variables** - Add to your shell profile (`.zshrc` or `.bashrc`):
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export NDK_HOME="$ANDROID_HOME/ndk/<version>"
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   export PATH="$PATH:$ANDROID_HOME/emulator"
   ```
5. **Java 17** - Required by Gradle:
   ```bash
   # macOS with Homebrew
   brew install openjdk@17
   ```

### Rust Targets

Install the mobile Rust targets:

```bash
# iOS (from macOS)
rustup target add aarch64-apple-ios        # iOS devices
rustup target add aarch64-apple-ios-sim    # iOS Simulator (ARM)
rustup target add x86_64-apple-ios         # iOS Simulator (Intel)

# Android
rustup target add aarch64-linux-android    # ARM64 devices
rustup target add armv7-linux-androideabi  # ARM32 devices
rustup target add x86_64-linux-android     # x86_64 emulator
rustup target add i686-linux-android       # x86 emulator
```

## iOS Development Setup

### Initial Setup

1. Initialize iOS project (if not already done):
   ```bash
   pnpm tauri ios init
   ```

2. Install CocoaPods dependencies:
   ```bash
   cd src-tauri/gen/apple
   pod install
   ```

3. Open in Xcode (optional, for signing and capabilities):
   ```bash
   open src-tauri/gen/apple/skelenote.xcworkspace
   ```

### Running on iOS Simulator

```bash
pnpm tauri ios dev
```

This will:
1. Build the Rust library for the iOS simulator
2. Build the frontend
3. Launch the iOS simulator
4. Install and run the app

**Specify a simulator:**
```bash
pnpm tauri ios dev --device "iPhone 15 Pro"
```

**List available simulators:**
```bash
xcrun simctl list devices
```

### Running on Physical iOS Device

1. Connect your device via USB
2. Open `src-tauri/gen/apple/skelenote.xcworkspace` in Xcode
3. Select your team in Signing & Capabilities
4. Select your device as the run target
5. Run from Xcode (Cmd+R) or:
   ```bash
   pnpm tauri ios dev --device "Your Device Name"
   ```

### Building for Release

```bash
pnpm tauri ios build
```

Output: `src-tauri/gen/apple/build/skelenote_iOS.xcarchive`

For App Store distribution, archive and export from Xcode.

## Android Development Setup

### Initial Setup

1. Initialize Android project (if not already done):
   ```bash
   pnpm tauri android init
   ```

2. Verify environment:
   ```bash
   pnpm tauri info
   ```
   Check that Android SDK and NDK are detected.

### Running on Android Emulator

1. Create an AVD (Android Virtual Device) in Android Studio:
   - Open AVD Manager (Tools > Device Manager)
   - Create a device with API 24+ (Android 7.0+)

2. Start the emulator and run:
   ```bash
   pnpm tauri android dev
   ```

**Specify an emulator:**
```bash
pnpm tauri android dev --device "Pixel_7_API_34"
```

### Running on Physical Android Device

1. Enable Developer Options on your device
2. Enable USB Debugging
3. Connect via USB and authorize the connection
4. Run:
   ```bash
   pnpm tauri android dev
   ```

### Building for Release

```bash
pnpm tauri android build
```

Output: `src-tauri/gen/android/app/build/outputs/apk/`

For Play Store distribution, generate a signed AAB:
```bash
pnpm tauri android build --apk  # APK for testing
pnpm tauri android build        # AAB for Play Store
```

## Platform Detection Patterns

Use the `usePlatform()` hook to detect the current platform and adapt the UI:

```typescript
import { usePlatform } from '@/hooks/usePlatform';

function MyComponent() {
  const {
    platform,      // 'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'unknown'
    isMobile,      // true on iOS or Android
    isDesktop,     // true on macOS, Windows, or Linux
    isIOS,
    isAndroid,
    safeAreaTop,   // Pixels to reserve for notch/status bar
    safeAreaBottom // Pixels to reserve for home indicator
  } = usePlatform();

  if (isMobile) {
    return <MobileLayout />;
  }
  return <DesktopLayout />;
}
```

### Conditional Rendering

```typescript
// Render different components by platform
{isMobile ? <MobileTaskRow task={task} /> : <DesktopTaskRow task={task} />}

// Disable features on certain platforms
<Button disabled={!isDesktop}>Desktop-only Feature</Button>
```

## Safe Area Handling

Mobile devices have safe area insets for notches, home indicators, and status bars. The `usePlatform()` hook provides these values:

```typescript
const { safeAreaTop, safeAreaBottom } = usePlatform();

// Apply as padding
<Box style={{ paddingTop: safeAreaTop, paddingBottom: safeAreaBottom }}>
  <Content />
</Box>
```

### CSS Environment Variables

For CSS-based handling, use the `env()` function:

```css
.mobile-container {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

### Default Values

| Platform | `safeAreaTop` | `safeAreaBottom` |
|----------|---------------|------------------|
| iOS (iPhone with notch) | 47px | 34px |
| Android | 24px | 0px |
| Desktop | 0px | 0px |

The hook reads actual values from CSS `env()` on mount and uses these defaults as fallbacks.

## Mobile Hooks Reference

### `usePlatform()`

Platform detection and safe area insets.

```typescript
const {
  platform,           // Platform identifier
  isMobile,           // iOS or Android
  isDesktop,          // macOS, Windows, or Linux
  isIOS,
  isAndroid,
  isMacOS,
  isWindows,
  isLinux,
  windowControlsHeight,  // Desktop only: title bar height
  windowControlsWidth,   // Desktop only: traffic lights width (macOS)
  safeAreaTop,
  safeAreaBottom,
} = usePlatform();
```

### `useHaptics()`

Haptic feedback for tactile responses on mobile.

```typescript
const { impact, notification, selection, isAvailable } = useHaptics();

// Impact feedback (taps, swipes, toggles)
await impact('light');   // Subtle tap
await impact('medium');  // Standard feedback (default)
await impact('heavy');   // Strong feedback
await impact('soft');    // Gentle (iOS 13+)
await impact('rigid');   // Sharp (iOS 13+)

// Notification feedback (outcomes)
await notification('success');  // Positive outcome
await notification('warning');  // Cautionary
await notification('error');    // Negative outcome

// Selection feedback (continuous gestures)
await selection();  // Lightest, for picker scrolling
```

**Tauri commands called:**
- `haptic_impact`
- `haptic_notification`
- `haptic_selection`

### `useBiometric()`

Biometric authentication (Face ID, Touch ID, fingerprint).

```typescript
const {
  isAvailable,    // Whether biometric is available
  biometryType,   // 'faceId' | 'touchId' | 'fingerprint' | 'iris' | null
  biometryName,   // Human-readable name
  isLoading,      // Status check in progress
  authenticate,   // Trigger authentication
} = useBiometric();

// Request authentication
const success = await authenticate('Unlock your notes');
if (success) {
  // User authenticated
}
```

**Plugin used:** `@tauri-apps/plugin-biometric`

### `useQRScanner()`

QR code scanning for device pairing.

```typescript
const {
  isAvailable,  // Mobile only
  isScanning,   // Scan in progress
  error,        // Error message
  scanQR,       // Start scanning
  cancelScan,   // Cancel active scan
  clearError,   // Clear error state
} = useQRScanner();

// Scan a QR code
const content = await scanQR();
if (content) {
  // Parse pairing data from QR content
}
```

**Plugin used:** `@tauri-apps/plugin-barcode-scanner`

### `useNotifications()`

Push notifications for task reminders.

```typescript
const {
  isAvailable,       // Mobile only
  hasPermission,     // Permission granted
  requestPermission, // Request permission
  syncReminder,      // Schedule/update a reminder
  cancelReminder,    // Cancel a scheduled reminder
} = useNotifications();

// Request permission (shows system dialog)
const granted = await requestPermission();

// Sync a task's reminder
await syncReminder(task);

// Cancel when task is completed
await cancelReminder(task.id);
```

**Plugin used:** `@tauri-apps/plugin-notification`

### `useAppIcon()`

Dynamic app icon switching (iOS, Android, macOS).

```typescript
const {
  currentIcon,  // 'dark' | 'light'
  changeIcon,   // Switch icon
  isChanging,   // Change in progress
  isSupported,  // Platform supports icon switching
  variants,     // Available icon variants
  error,        // Error from last attempt
} = useAppIcon();

// Change the app icon
await changeIcon('light');
```

**Platform behavior:**
- **iOS**: Shows system confirmation prompt, persists across launches
- **Android**: Uses activity aliases, persists across launches
- **macOS**: Changes dock icon for current session only

**Tauri commands called:**
- `is_icon_switching_supported`
- `get_available_icons`
- `set_app_icon`

### `useShareHandler()`

Handle content shared from other apps.

```typescript
const { checkPendingShares } = useShareHandler();

// Manually check for pending shares (auto-checks on mount and visibility change)
await checkPendingShares();
```

**Behavior:**
- Checks for pending shares on mount
- Checks when app returns from background
- Creates Link objects for URLs, Note objects for text
- Shows toast notification on success

**Native implementation:**
- **iOS**: Share Extension in `src-tauri/gen/apple/SkelenoteShare/`
- **Android**: Share Intent handler in `ShareReceiverActivity.kt`

### `useBackgroundTask()`

iOS background execution for completing sync.

```typescript
const {
  beginTask,        // Start background task
  endTask,          // End background task
  isTaskActive,     // Check if task is active
  getCurrentTaskId, // Get current task ID
} = useBackgroundTask();

// When app goes to background during sync
if (document.visibilityState === 'hidden' && isSyncing) {
  await beginTask();
}

// When sync completes
if (isTaskActive()) {
  await endTask();
}
```

**Note:** iOS grants approximately 30 seconds for background execution.

**Tauri commands called:**
- `begin_background_task`
- `end_background_task`

### `useDeepLinks()`

Handle `skelenote://` URLs for navigation.

```typescript
// Just call the hook - it sets up listeners automatically
useDeepLinks();
```

**Supported URL formats:**
- `skelenote://task/{id}` - Navigate to task
- `skelenote://note/{id}` - Navigate to note
- `skelenote://object/{id}` - Navigate to any object
- `skelenote://inbox` - Navigate to inbox
- `skelenote://tasks` - Navigate to tasks view
- `skelenote://daily` - Navigate to daily notes

**Plugin used:** `@tauri-apps/plugin-deep-link`

## Mobile Components

Mobile-specific React components are in `src/components/mobile/`:

### Primitives

Basic building blocks for mobile UI:

| Component | Description |
|-----------|-------------|
| `SwipeableRow` | Row with swipe-to-reveal actions |
| `BottomSheet` | iOS-style bottom sheet modal |
| `ActionSheet` | iOS-style action menu |
| `FAB` | Floating action button |
| `PullToRefresh` | Pull-to-refresh wrapper |
| `CollapsibleSection` | Expandable/collapsible section |
| `AnimatedCheckbox` | Animated task checkbox |
| `SelectionToolbar` | Multi-select action toolbar |
| `MobileViewHeader` | Standard mobile view header |
| `MobileSyncIndicator` | Sync status indicator |
| `PropertyChip` | Compact property display |
| `EmptyState` | Empty state placeholder |

### Views

Full-screen mobile views:

| View | Description |
|------|-------------|
| `MobileInboxView` | Inbox with swipe actions |
| `MobileTasksView` | Tasks with filters and quick add |
| `MobileDailyNotesView` | Daily notes timeline |
| `MobileObjectDetailView` | Object detail/editor |
| `MobileSearchModal` | Full-screen search |
| `MobileSettingsView` | Settings with nested sheets |
| `MobileBrowseView` | Browse by type/project/area |
| `MobileArchiveView` | Archived objects |
| `LockScreen` | Biometric lock screen |

### Sheets

Bottom sheet modals for actions and pickers:

| Sheet | Description |
|-------|-------------|
| `QuickAddTaskSheet` | Quick task creation |
| `QuickCaptureSheet` | Quick capture to inbox |
| `PropertyEditorSheet` | Edit object properties |
| `StatusPickerSheet` | Task status picker |
| `PriorityPickerSheet` | Priority picker |
| `DueDateSheet` | Date picker with presets |
| `ReminderSheet` | Reminder time picker |
| `RecurrenceSheet` | Recurrence pattern editor |
| `TagPickerSheet` | Tag multi-select |
| `ProjectPickerSheet` | Project selector |
| `AreaPickerSheet` | Area selector |
| `TemplatePickerSheet` | Template selector |
| `BulkActionsSheet` | Multi-select actions |
| `AccountSettingsSheet` | Account settings |
| `SyncSettingsSheet` | Sync configuration |
| `DeviceManagerSheet` | Device management |

## Debugging on Mobile

### iOS Debugging

**Safari Web Inspector** (recommended):
1. Enable Web Inspector on device: Settings > Safari > Advanced > Web Inspector
2. Open Safari on Mac
3. Develop menu > [Device Name] > [App WebView]
4. Full DevTools access (Console, Network, Elements, etc.)

**Xcode Console**:
1. Run from Xcode
2. View > Debug Area > Activate Console
3. See `println!` output from Rust and `console.log` from JavaScript

**Logging:**
```rust
// Rust (appears in Xcode console)
println!("[MyFeature] Debug info: {:?}", data);
```

```typescript
// TypeScript (appears in Safari Web Inspector)
console.log('[MyFeature] Debug info:', data);
```

### Android Debugging

**Chrome DevTools**:
1. Enable USB debugging on device
2. Open `chrome://inspect` in Chrome
3. Find your app's WebView and click "inspect"
4. Full DevTools access

**Android Studio Logcat**:
1. Run from Android Studio or connect device
2. View > Tool Windows > Logcat
3. Filter by app package name

**ADB Logcat** (command line):
```bash
adb logcat -s "skelenote"
```

### Common Debugging Tips

1. **Check platform detection**: Log `usePlatform()` values on mount
2. **Verify Tauri commands**: Wrap in try/catch and log errors
3. **Test on real devices**: Simulators may behave differently
4. **Check permissions**: Camera, biometric, notifications need explicit permission

## Building for Release

### iOS Release Build

```bash
# Build for all iOS targets
pnpm tauri ios build

# Build for specific architecture
pnpm tauri ios build --target aarch64-apple-ios  # Devices only
```

**Output:** `src-tauri/gen/apple/build/skelenote_iOS.xcarchive`

**For App Store submission:**
1. Open the xcarchive in Xcode Organizer
2. Validate App
3. Distribute App > App Store Connect

### Android Release Build

```bash
# Build release APK
pnpm tauri android build --apk

# Build release AAB (for Play Store)
pnpm tauri android build
```

**Signing the release:**

1. Create a keystore:
   ```bash
   keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias skelenote
   ```

2. Configure signing in `src-tauri/gen/android/app/build.gradle.kts`:
   ```kotlin
   signingConfigs {
       create("release") {
           storeFile = file("release-key.jks")
           storePassword = System.getenv("KEYSTORE_PASSWORD")
           keyAlias = "skelenote"
           keyPassword = System.getenv("KEY_PASSWORD")
       }
   }
   ```

**Output:** `src-tauri/gen/android/app/build/outputs/`

### Configuration Files

**iOS** (`src-tauri/tauri.conf.json`):
```json
{
  "bundle": {
    "iOS": {
      "minimumSystemVersion": "15.0"
    }
  }
}
```

**Android** (`src-tauri/gen/android/app/build.gradle.kts`):
- `minSdk`, `targetSdk`, `compileSdk`
- Signing configuration
- ProGuard rules

## Troubleshooting

### iOS Issues

**"Could not find a development team"**
- Open the Xcode project and select a team in Signing & Capabilities

**CocoaPods errors**
```bash
cd src-tauri/gen/apple
pod deintegrate
pod install
```

**Simulator not starting**
```bash
# Reset the simulator
xcrun simctl erase all
```

### Android Issues

**"NDK not found"**
- Install NDK via Android Studio SDK Manager
- Set `NDK_HOME` environment variable

**"JAVA_HOME is not set"**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

**Emulator performance**
- Enable hardware acceleration (HAXM on Intel, Hypervisor on ARM)
- Use x86_64 system image for better performance

### General Issues

**"Command not found: tauri"**
```bash
pnpm install
```

**Rust target not installed**
```bash
rustup target add <target-triple>
```

**Build cache issues**
```bash
# Clean all build artifacts
cd src-tauri
cargo clean
rm -rf gen/android/app/build
rm -rf gen/apple/build
```
