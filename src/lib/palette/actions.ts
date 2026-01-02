/**
 * Command Palette actions
 */

import type { ViewType } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import type { MatchType } from '@/lib/search';

export interface PaletteAction {
  id: string;
  label: string;
  icon: string;
  category: 'navigation' | 'action' | 'create' | 'object';
  /** View to navigate to (for navigation actions) */
  view?: ViewType;
  /** Object ID to navigate to (for object actions) */
  objectId?: string;
  /** Type ID for create actions */
  typeId?: string;
  /** Action handler (for non-navigation actions) */
  action?: () => void;
  /** Match type for search results (text, semantic, or hybrid) */
  matchType?: MatchType;
  /** Semantic similarity score (0-1) */
  semanticScore?: number;
}

/**
 * Special action IDs (handled specially by the palette)
 */
export const QUICK_CAPTURE_ACTION_ID = 'action-quick-capture';
export const SEARCH_ACTION_ID = 'action-search';
export const OPEN_IN_SPLIT_ACTION_ID = 'action-open-in-split';
export const DUPLICATE_OBJECT_ACTION_ID = 'action-duplicate-object';
export const KEYBOARD_SHORTCUTS_ACTION_ID = 'action-keyboard-shortcuts';
export const CREATE_FROM_TEMPLATE_ACTION_ID = 'action-create-from-template';
export const MANAGE_TEMPLATES_ACTION_ID = 'action-manage-templates';
export const NEW_TEMPLATE_ACTION_ID = 'action-new-template';
export const TOGGLE_THEME_ACTION_ID = 'action-toggle-theme';

/**
 * Navigation actions for jumping to views
 */
export const navigationActions: PaletteAction[] = [
  { id: SEARCH_ACTION_ID, label: 'Search', icon: '🔎', category: 'action' },
  { id: QUICK_CAPTURE_ACTION_ID, label: 'Quick Capture', icon: '⚡', category: 'action' },
  { id: CREATE_FROM_TEMPLATE_ACTION_ID, label: 'Create from Template', icon: '📋', category: 'action' },
  { id: NEW_TEMPLATE_ACTION_ID, label: 'New Template', icon: '✨', category: 'action' },
  { id: OPEN_IN_SPLIT_ACTION_ID, label: 'Open in Split View', icon: '⊞', category: 'action' },
  { id: DUPLICATE_OBJECT_ACTION_ID, label: 'Duplicate Object', icon: '📄', category: 'action' },
  { id: KEYBOARD_SHORTCUTS_ACTION_ID, label: 'Keyboard Shortcuts', icon: '⌨️', category: 'action' },
  { id: 'nav-inbox', label: 'Go to Inbox', icon: '📥', category: 'navigation', view: 'inbox' },
  { id: 'nav-today', label: 'Go to Today', icon: '📅', category: 'navigation', view: 'today' },
  { id: 'nav-daily-notes', label: 'Go to Daily Notes', icon: '📆', category: 'navigation', view: 'daily-notes' },
  { id: 'nav-this-week', label: 'Go to This Week', icon: '📋', category: 'navigation', view: 'this-week' },
  { id: 'nav-overdue', label: 'Go to Overdue', icon: '⚠️', category: 'navigation', view: 'overdue' },
  { id: 'nav-blocked', label: 'Go to Blocked', icon: '🚫', category: 'navigation', view: 'blocked' },
  { id: 'nav-eventually', label: 'Go to Eventually', icon: '📌', category: 'navigation', view: 'eventually' },
  { id: 'nav-completed', label: 'Go to Completed', icon: '✅', category: 'navigation', view: 'completed' },
  { id: 'nav-time-machine', label: 'Go to Time Machine', icon: '🕰️', category: 'navigation', view: 'time-machine' },
  { id: 'nav-archive', label: 'Go to Archive', icon: '📦', category: 'navigation', view: 'archive' },
  { id: 'nav-settings', label: 'Go to Settings', icon: '⚙️', category: 'navigation', view: 'settings' },
  { id: TOGGLE_THEME_ACTION_ID, label: 'Toggle Theme', icon: '🌓', category: 'action' },
];

/**
 * Create actions for creating new objects
 */
export const createActions: PaletteAction[] = [
  { id: 'create-task', label: 'Create new Task', icon: '✓', category: 'create', typeId: BuiltInTypeIds.TASK },
  { id: 'create-note', label: 'Create new Note', icon: '📝', category: 'create', typeId: BuiltInTypeIds.NOTE },
  { id: 'create-link', label: 'Create new Link', icon: '🔗', category: 'create', typeId: BuiltInTypeIds.LINK },
];

/**
 * Get all static palette actions
 */
export function getStaticActions(): PaletteAction[] {
  return [...navigationActions, ...createActions];
}

/**
 * Simple fuzzy match - checks if query characters appear in order in target
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerTarget.length && queryIndex < lowerQuery.length; i++) {
    if (lowerTarget[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

/**
 * Filter actions by query
 */
export function filterActions(actions: PaletteAction[], query: string): PaletteAction[] {
  if (!query.trim()) {
    return actions;
  }

  return actions.filter((action) => fuzzyMatch(query, action.label));
}
