# Mobile Patterns

Mobile-specific design patterns for iOS and Android using Tauri 2.0 mobile.

---

## Platform Detection

Use `usePlatform()` hook for platform-specific behavior:

```typescript
const { platform, isMobile, isDesktop, safeAreaInsets } = usePlatform();
// platform: 'ios' | 'android' | 'macos' | 'windows' | 'linux'
```

---

## iOS Human Interface Guidelines

Constants from `src/lib/constants/ios-styles.ts`:

### Touch Targets

All interactive elements must be at least **44pt** (iOS standard).

```typescript
export const IOS_TOUCH_TARGET = 44;
```

### Chevron Specs

| Type | Size | Stroke | Color |
|------|------|--------|-------|
| Disclosure (forward) | 14px | 2.5 | Stone `#A1A1AA` |
| Back | 14px | 2.5 | Ember (tint color) |

```typescript
export const IOS_CHEVRON = {
  disclosure: { size: 14, color: '#A1A1AA', strokeWidth: 2.5 },
  back: { size: 14, color: 'var(--mantine-color-ember-6)', strokeWidth: 2.5 },
};
```

### Timing

| Type | Duration |
|------|----------|
| Long press | 500ms |
| Animation (standard) | 300ms |
| Animation (fast) | 150ms |

### Tab Bar

- Height: 49pt (excluding safe area)
- Bottom safe area is added automatically

---

## Safe Areas

Mobile components must respect safe areas (notch, home indicator):

```typescript
const { safeAreaInsets } = usePlatform();
// { top: number, bottom: number, left: number, right: number }
```

Use in headers:

```tsx
<Box style={{ paddingTop: safeAreaTop }}>
  {/* Header content */}
</Box>
```

---

## Bottom Sheets

Replaces modals on mobile. Uses `Drawer` with bottom position.

**Component:** `src/components/mobile/primitives/BottomSheet.tsx`

```tsx
<BottomSheet
  opened={opened}
  onClose={close}
  title="Sheet Title"
  size="auto"  // 'sm' | 'md' | 'lg' | 'full' | 'auto'
  withHandle   // Drag handle indicator
>
  {content}
</BottomSheet>
```

**Key styling:**

- Border radius: 16px (top corners only)
- Animation: 320ms cubic-bezier (iOS-style deceleration)
- Overlay: 0.35 opacity with 2px blur
- Drag handle: 36×4px centered gray bar

---

## Action Sheets

iOS-style context menus. Replaces right-click menus from desktop.

**Component:** `src/components/mobile/primitives/ActionSheet.tsx`

```tsx
<ActionSheet
  opened={opened}
  onClose={close}
  title="Choose Action"
  actions={[
    { id: 'edit', label: 'Edit', icon: Edit, onAction: handleEdit },
    { id: 'delete', label: 'Delete', icon: Trash2, variant: 'danger', onAction: handleDelete },
  ]}
/>
```

**Features:**

- Danger actions shown at bottom with red text
- Cancel button always present
- 56px min-height rows for touch targets

---

## Swipeable Rows

List items with swipe actions + rubber-band physics.

**Component:** `src/components/mobile/primitives/SwipeableRow.tsx`

```tsx
<SwipeableRow
  leftActions={[
    { id: 'complete', icon: CheckCircle, label: 'Complete', color: 'sage', onAction: handleComplete },
  ]}
  rightActions={[
    { id: 'archive', icon: Archive, label: 'Archive', color: 'ember', onAction: handleArchive },
    { id: 'delete', icon: Trash2, label: 'Delete', color: 'brick', onAction: handleDelete },
  ]}
  onPress={handlePress}
  onLongPress={handleLongPress}
  priority="high"  // Shows left border accent
  separatorInset={16}  // iOS standard
>
  {rowContent}
</SwipeableRow>
```

**Physics:**

- Swipe threshold: 80px
- Action width: 72px
- Rubber-band factor: 0.3 (over-swipe resistance)
- Spring physics on release
- Haptic feedback at threshold crossing

---

## Floating Action Button (FAB)

Primary action button positioned above tab bar.

**Component:** `src/components/mobile/primitives/FAB.tsx`

```tsx
<FAB
  onClick={handleCreate}
  label="Create new"
  icon={Plus}
  scrollContainerRef={scrollRef}  // Optional auto-hide on scroll
/>
```

**Positioning:**

- Right: 16px
- Bottom: Tab bar height + safe area + 32px
- Size: 56×56px, 28px radius
- Color: Ember with 30% shadow

**Behavior:**

- Spring animation on mount/unmount
- Hides on scroll down, shows on scroll up
- Haptic feedback on tap
- Respects reduced motion preferences

---

## Pull to Refresh

Native-feel refresh gesture.

**Component:** `src/components/mobile/primitives/PullToRefresh.tsx`

```tsx
<PullToRefresh onRefresh={handleRefresh}>
  {listContent}
</PullToRefresh>
```

**Behavior:**

- Threshold: 80px
- Max pull: 120px
- Resistance: 0.5 (progressive)
- Icon rotates proportionally to pull distance
- Ember color when ready to trigger

---

## Mobile View Header

Consistent header with back navigation and actions.

**Component:** `src/components/mobile/primitives/MobileViewHeader.tsx`

```tsx
<MobileViewHeader
  title="Inbox"
  count={42}
  showBack="auto"  // Shows if canGoBack is true
  showSearch
  showSync
  showSelectButton
  onSelectMode={enterSelection}
/>
```

**Height variants:**

| Variant | Height |
|---------|--------|
| `default` | 44pt |
| `compact` | 44pt |
| `large` | 96pt |

---

## Haptic Feedback

Use `useHaptics()` hook:

```typescript
const { impact, notification, selection } = useHaptics();

await impact('light');  // light | medium | heavy
await notification('success');  // success | warning | error
await selection();
```

---

## Gesture Patterns

### Long Press

Trigger duration: 500ms. Use for context menus.

```tsx
<SwipeableRow onLongPress={openActionSheet}>
```

### Scroll Direction

Use `useScrollDirection()` to show/hide toolbars:

```typescript
const { isVisible } = useScrollDirection(scrollRef, {
  threshold: 10,
  hideAfter: 100,
});
```

---

## Mobile-Specific Hooks

| Hook | Purpose |
|------|---------|
| `usePlatform()` | Platform detection, safe area insets |
| `useHaptics()` | Haptic feedback (vibration) |
| `useBiometric()` | Face ID, fingerprint auth |
| `useQRScanner()` | QR code scanning for device pairing |
| `useNotifications()` | Push notifications |
| `useAppIcon()` | Dynamic app icon switching |
| `useShareHandler()` | Handle share intents from other apps |
| `useBackgroundTask()` | Background task scheduling |
| `useDeepLinks()` | Deep link handling |
| `useScrollDirection()` | Scroll direction detection |
| `useReducedMotion()` | Respect accessibility preference |

---

## Component Directory Structure

```
src/components/mobile/
├── primitives/          # Reusable mobile UI primitives
│   ├── ActionSheet.tsx
│   ├── BottomSheet.tsx
│   ├── FAB.tsx
│   ├── MobileViewHeader.tsx
│   ├── PullToRefresh.tsx
│   ├── SwipeableRow.tsx
│   └── ...
├── rows/                # List row components
│   ├── MobileInboxRow.tsx
│   ├── MobileTaskRow.tsx
│   └── ...
├── sheets/              # Bottom sheet modals
│   ├── QuickCaptureSheet.tsx
│   ├── PropertyEditorSheet.tsx
│   └── ...
├── skeletons/           # Loading skeleton screens
└── views/               # Full-screen mobile views
    ├── MobileInboxView.tsx
    ├── MobileTasksView.tsx
    └── ...
```
