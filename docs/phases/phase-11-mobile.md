# Phase 11: Mobile (Tauri Mobile)

## Objective
Build iOS and Android versions of the app using Tauri 2.0 mobile capabilities, with Quick Capture, object browsing, and sync with desktop.

## Dependencies
- Phase 1: Tauri 2.0 foundation (mobile-ready)
- Phase 2: Data layer (shared with mobile)
- Phase 6: Quick Capture flow
- Phase 9: Sync architecture

## Key Deliverables
- [ ] iOS build configuration
- [ ] Android build configuration
- [ ] Mobile-optimized layout
- [ ] Quick Capture on mobile
- [ ] Object browsing/viewing
- [ ] Limited editing capabilities
- [ ] Sync with desktop devices

## Technical Notes

### V1 Mobile Scope (from PRD)
- Quick Capture
- View/browse objects (read-only or limited editing)
- Sync with desktop

Deferred for v1:
- Full rich text editing
- All desktop features

### Tauri 2.0 Mobile
Tauri 2.0 supports iOS and Android builds from the same codebase:
- Uses WKWebView on iOS
- Uses WebView on Android
- Shared Rust backend
- Shared React frontend (with responsive adjustments)

### Build Setup

**iOS**:
```bash
# Install iOS targets
rustup target add aarch64-apple-ios
rustup target add aarch64-apple-ios-sim

# Build for iOS
npm run tauri ios build
```

**Android**:
```bash
# Install Android targets
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi

# Set up Android SDK/NDK
# Build for Android
npm run tauri android build
```

### Mobile Layout Considerations
- Single-column layout (no sidebar on small screens)
- Bottom navigation or hamburger menu
- Larger touch targets (min 44pt)
- Swipe gestures where appropriate
- Native keyboard handling

### Quick Capture on Mobile
- Floating action button (FAB) for quick access
- Or share sheet integration (receive URLs, text)
- Simplified form (type selector + required fields)
- Links to daily note like desktop

### Object Browsing
- List view of objects by type
- Pull-to-refresh for sync
- Tap to view object detail
- View-only or limited editing for v1

### Limited Editing
What to support in v1:
- Toggle task status (checkbox)
- Add/remove tags
- Simple text edits (title)

What to defer:
- Full BlockNote editing (complex on mobile)
- Relation editing
- Property editing beyond basics

### Sync on Mobile
- Same Loro-based sync as desktop
- Connect to same Cloudflare Durable Object
- Offline support with local storage
- Background sync when app returns to foreground

### Platform-Specific Considerations

**iOS**:
- App Store submission requirements
- Push notifications (optional, future)
- iCloud Keychain for token storage
- Face ID / Touch ID (optional)

**Android**:
- Play Store submission
- Android Keystore for tokens
- Handle back button navigation
- Various screen sizes

### Shared Code Strategy
```
src/
├── components/
│   ├── desktop/          # Desktop-only components
│   ├── mobile/           # Mobile-only components
│   └── shared/           # Shared components
├── hooks/
│   └── usePlatform.ts    # Detect iOS/Android/Desktop
└── lib/
    └── platform.ts       # Platform utilities
```

Use CSS media queries and `usePlatform()` hook to conditionally render.

## Files to Create/Modify
- `src-tauri/tauri.conf.json` - Add mobile configurations
- `src-tauri/gen/apple/` - iOS project files (generated)
- `src-tauri/gen/android/` - Android project files (generated)
- `src/components/mobile/MobileLayout.tsx` - Mobile shell
- `src/components/mobile/MobileNav.tsx` - Bottom/hamburger nav
- `src/components/mobile/QuickCaptureFAB.tsx` - Floating button
- `src/components/mobile/ObjectListMobile.tsx` - Object browser
- `src/components/mobile/ObjectViewMobile.tsx` - Detail view
- `src/hooks/usePlatform.ts` - Platform detection
- `src/styles/mobile.css` - Mobile-specific styles
- Update responsive breakpoints throughout

## Acceptance Criteria
- [ ] iOS app builds and runs on simulator
- [ ] Android app builds and runs on emulator
- [ ] Mobile layout adapts to small screens
- [ ] Can perform Quick Capture on mobile
- [ ] Can browse objects by type
- [ ] Can view object details
- [ ] Can toggle task status
- [ ] Sync works between mobile and desktop
- [ ] Offline mode works on mobile
- [ ] App handles orientation changes
- [ ] Touch targets meet accessibility guidelines (44pt+)
