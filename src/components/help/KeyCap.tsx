/**
 * KeyCap - Styled keyboard key representation
 * Displays individual keys with platform-aware symbols
 */

import './KeyboardShortcutsModal.css';

interface KeyCapProps {
  /** The key to display (e.g., 'Cmd', 'Shift', 'K') */
  keyName: string;
}

/**
 * Platform-aware key symbol mappings
 */
const KEY_SYMBOLS: Record<string, string> = {
  Cmd: '⌘',
  Command: '⌘',
  Ctrl: '⌃',
  Control: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Enter: '↵',
  Return: '↵',
  Backspace: '⌫',
  Delete: '⌦',
  Tab: '⇥',
  Esc: '⎋',
  Escape: '⎋',
  Space: '␣',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
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

export function KeyCap({ keyName }: KeyCapProps) {
  const display = getKeyDisplay(keyName);
  const isSymbol = display in KEY_SYMBOLS || display.length === 1;

  return (
    <kbd
      className={`keycap ${isSymbol ? 'keycap--symbol' : ''}`}
      aria-label={keyName}
    >
      {display}
    </kbd>
  );
}
