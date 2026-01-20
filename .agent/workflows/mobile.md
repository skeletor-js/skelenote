---
description: Generate mobile-specific React components with platform detection and safe areas
---

# Mobile Skill

Generates mobile-specific React components following Skelenote mobile patterns.

## Information Needed

1. **Name** (PascalCase) - Component name
2. **Type** - Component type:
   - `sheet` - Bottom sheet modal
   - `row` - List row component
   - `view` - Full-screen view
   - `primitive` - Reusable UI primitive
3. **Description** - What the component does

## Generated Files

Based on type, generates in `src/components/mobile/{type}s/`:

### Sheet Component

`src/components/mobile/sheets/{Name}Sheet.tsx`:

```typescript
import { useState } from 'react';
import { Stack, Text, Button } from '@mantine/core';
import { usePlatform } from '@/hooks/usePlatform';
import { useHaptics } from '@/hooks/useHaptics';
import { BottomSheet } from '../primitives/BottomSheet';

interface {Name}SheetProps {
  opened: boolean;
  onClose: () => void;
}

export function {Name}Sheet({ opened, onClose }: {Name}SheetProps) {
  const { safeAreaInsets } = usePlatform();
  const { impact } = useHaptics();

  const handleAction = () => {
    impact('light');
    // Action logic
  };

  return (
    <BottomSheet opened={opened} onClose={onClose}>
      <Stack gap="md" pb={safeAreaInsets.bottom}>
        {/* Sheet content */}
      </Stack>
    </BottomSheet>
  );
}
```

### Row Component

`src/components/mobile/rows/{Name}Row.tsx`:

```typescript
import { Group, Text, ActionIcon } from '@mantine/core';
import { usePlatform } from '@/hooks/usePlatform';
import { useHaptics } from '@/hooks/useHaptics';
import styles from './{Name}Row.module.css';

interface {Name}RowProps {
  item: SomeType;
  onPress: () => void;
}

export function {Name}Row({ item, onPress }: {Name}RowProps) {
  const { isMobile } = usePlatform();
  const { selection } = useHaptics();

  const handlePress = () => {
    selection();
    onPress();
  };

  return (
    <Group className={styles.row} onClick={handlePress}>
      {/* Row content */}
    </Group>
  );
}
```

### View Component

`src/components/mobile/views/{Name}View.tsx`:

```typescript
import { Stack } from '@mantine/core';
import { usePlatform } from '@/hooks/usePlatform';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { MobileHeader } from '../primitives/MobileHeader';
import styles from './{Name}View.module.css';

export function {Name}View() {
  const { safeAreaInsets } = usePlatform();
  const { scrollDirection, scrollRef } = useScrollDirection();

  return (
    <Stack
      className={styles.view}
      style={{ paddingTop: safeAreaInsets.top }}
    >
      <MobileHeader
        title="{Name}"
        hidden={scrollDirection === 'down'}
      />
      <div ref={scrollRef} className={styles.content}>
        {/* View content */}
      </div>
    </Stack>
  );
}
```

## Mobile-Specific Hooks

| Hook | Purpose |
| ---- | ------- |
| `usePlatform()` | Platform detection, safe area insets |
| `useHaptics()` | Haptic feedback (impact, selection, notification) |
| `useScrollDirection()` | Detect scroll for hiding toolbars |
| `useReducedMotion()` | Respect accessibility preference |

## Safe Area Handling

Always respect safe areas for notch and home indicator:

```typescript
const { safeAreaInsets } = usePlatform();
// { top: number, bottom: number, left: number, right: number }

<Stack style={{
  paddingTop: safeAreaInsets.top,
  paddingBottom: safeAreaInsets.bottom
}}>
```

## Steps

1. Ask user for component name, type, and description
2. Generate component file with proper imports and patterns
3. Generate CSS module if needed
4. Add haptic feedback for interactions
5. Include safe area handling

## Notes

- All mobile components use `usePlatform()` for detection
- Touch interactions should include haptic feedback
- Bottom sheets use the `BottomSheet` primitive
- Views handle scroll direction for toolbar hiding
- Follow iOS HIG and Material Design patterns
