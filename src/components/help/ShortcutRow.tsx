/**
 * ShortcutRow - Single shortcut display row
 * Renders key combination with description
 */

import { Group, Text, Kbd } from '@mantine/core';
import type { Shortcut } from '@/lib/shortcuts';

/**
 * Platform-aware key symbol mappings
 */
const KEY_SYMBOLS: Record<string, string> = {
  Cmd: '\u2318',
  Command: '\u2318',
  Ctrl: '\u2303',
  Control: '\u2303',
  Alt: '\u2325',
  Option: '\u2325',
  Shift: '\u21E7',
  Enter: '\u21B5',
  Return: '\u21B5',
  Backspace: '\u232B',
  Delete: '\u2326',
  Tab: '\u21E5',
  Esc: '\u238B',
  Escape: '\u238B',
  Space: '\u2423',
  Up: '\u2191',
  Down: '\u2193',
  Left: '\u2190',
  Right: '\u2192',
};

/**
 * Check if running on Mac (including Tauri on macOS)
 */
function isMac(): boolean {
  if (typeof navigator !== 'undefined') {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  }
  return false;
}

/**
 * Get the display text for a key
 */
function getKeyDisplay(key: string): string {
  // Use symbol if available
  if (key in KEY_SYMBOLS) {
    return KEY_SYMBOLS[key];
  }

  // Platform-specific Cmd/Ctrl handling
  if (key === 'Cmd' && !isMac()) {
    return 'Ctrl';
  }

  // Return as-is for single characters or unknown keys
  return key;
}

interface ShortcutRowProps {
  shortcut: Shortcut;
}

export function ShortcutRow({ shortcut }: ShortcutRowProps) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{shortcut.description}</Text>
      <Group gap={4}>
        {shortcut.keys.map((key, index) => (
          <Kbd key={`${key}-${index}`} size="xs">
            {getKeyDisplay(key)}
          </Kbd>
        ))}
      </Group>
    </Group>
  );
}
