/**
 * Static keyboard shortcut definitions for the help modal
 */

export type ShortcutCategory =
  | 'global'
  | 'navigation'
  | 'editing'
  | 'objects'
  | 'views';

export interface Shortcut {
  /** Keys in the shortcut (e.g., ['Cmd', 'Shift', 'Space']) */
  keys: string[];
  /** Human-readable description */
  description: string;
  /** Category for grouping in the help modal */
  category: ShortcutCategory;
}

/**
 * Category display names and order
 */
export const CATEGORY_INFO: Record<ShortcutCategory, { label: string; order: number }> = {
  global: { label: 'Global', order: 1 },
  navigation: { label: 'Navigation', order: 2 },
  views: { label: 'Views', order: 3 },
  objects: { label: 'Objects', order: 4 },
  editing: { label: 'Editing', order: 5 },
};

/**
 * All keyboard shortcuts in the application
 */
export const SHORTCUTS: Shortcut[] = [
  // Global shortcuts
  { keys: ['Cmd', 'Shift', 'Space'], description: 'Quick Capture', category: 'global' },
  { keys: ['Cmd', 'K'], description: 'Command Palette', category: 'global' },
  { keys: ['Cmd', '?'], description: 'Keyboard Shortcuts', category: 'global' },
  { keys: ['Cmd', 'Shift', 'F'], description: 'Search', category: 'global' },

  // Navigation shortcuts
  { keys: ['↑', '↓'], description: 'Move selection', category: 'navigation' },
  { keys: ['Tab'], description: 'Next focusable element', category: 'navigation' },
  { keys: ['Shift', 'Tab'], description: 'Previous focusable element', category: 'navigation' },
  { keys: ['Enter'], description: 'Open / Confirm', category: 'navigation' },
  { keys: ['Esc'], description: 'Close / Cancel', category: 'navigation' },

  // View shortcuts
  { keys: ['Cmd', '1'], description: 'Go to Inbox', category: 'views' },
  { keys: ['Cmd', '2'], description: 'Go to Today', category: 'views' },
  { keys: ['Cmd', '\\'], description: 'Close split view', category: 'views' },
  { keys: ['Cmd', 'Shift', '\\'], description: 'Swap split panes', category: 'views' },
  { keys: ['Cmd', 'Shift', 'H'], description: 'Time Machine', category: 'views' },

  // Object shortcuts
  { keys: ['Cmd', 'N'], description: 'New object', category: 'objects' },
  { keys: ['Cmd', 'Backspace'], description: 'Delete object', category: 'objects' },

  // Editing shortcuts
  { keys: ['@'], description: 'Mention object', category: 'editing' },
  { keys: ['Cmd', 'B'], description: 'Bold', category: 'editing' },
  { keys: ['Cmd', 'I'], description: 'Italic', category: 'editing' },
  { keys: ['Cmd', 'U'], description: 'Underline', category: 'editing' },
  { keys: ['Cmd', 'Z'], description: 'Undo', category: 'editing' },
  { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo', category: 'editing' },
];

/**
 * Group shortcuts by category, sorted by category order
 */
export function getShortcutsByCategory(): Map<ShortcutCategory, Shortcut[]> {
  const grouped = new Map<ShortcutCategory, Shortcut[]>();

  // Initialize all categories in order
  const sortedCategories = Object.entries(CATEGORY_INFO)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key as ShortcutCategory);

  for (const category of sortedCategories) {
    grouped.set(category, []);
  }

  // Group shortcuts
  for (const shortcut of SHORTCUTS) {
    const existing = grouped.get(shortcut.category) ?? [];
    existing.push(shortcut);
    grouped.set(shortcut.category, existing);
  }

  return grouped;
}
