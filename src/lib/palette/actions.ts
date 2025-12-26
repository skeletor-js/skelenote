/**
 * Command Palette actions
 */

import type { ViewType } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';

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
}

/**
 * Special action IDs (handled specially by the palette)
 */
export const QUICK_CAPTURE_ACTION_ID = 'action-quick-capture';
export const SEARCH_ACTION_ID = 'action-search';

/**
 * Navigation actions for jumping to views
 */
export const navigationActions: PaletteAction[] = [
  { id: SEARCH_ACTION_ID, label: 'Search', icon: '🔎', category: 'action' },
  { id: QUICK_CAPTURE_ACTION_ID, label: 'Quick Capture', icon: '⚡', category: 'action' },
  { id: 'nav-inbox', label: 'Go to Inbox', icon: '📥', category: 'navigation', view: 'inbox' },
  { id: 'nav-today', label: 'Go to Today', icon: '📅', category: 'navigation', view: 'today' },
  { id: 'nav-daily-notes', label: 'Go to Daily Notes', icon: '📆', category: 'navigation', view: 'daily-notes' },
  { id: 'nav-this-week', label: 'Go to This Week', icon: '📋', category: 'navigation', view: 'this-week' },
  { id: 'nav-overdue', label: 'Go to Overdue', icon: '⚠️', category: 'navigation', view: 'overdue' },
  { id: 'nav-blocked', label: 'Go to Blocked', icon: '🚫', category: 'navigation', view: 'blocked' },
  { id: 'nav-eventually', label: 'Go to Eventually', icon: '📌', category: 'navigation', view: 'eventually' },
  { id: 'nav-completed', label: 'Go to Completed', icon: '✅', category: 'navigation', view: 'completed' },
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
