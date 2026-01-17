/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  getStaticActions,
  fuzzyMatch,
  filterActions,
  navigationActions,
  createActions,
  SEARCH_ACTION_ID,
  TOGGLE_THEME_ACTION_ID,
} from '../actions';
import { BuiltInTypeIds } from '@/lib/types';

describe('lib/palette/actions', () => {
  describe('navigationActions', () => {
    it('should contain expected navigation actions', () => {
      expect(navigationActions).toBeDefined();
      expect(navigationActions.length).toBeGreaterThan(0);
    });

    it('should have search action', () => {
      const searchAction = navigationActions.find(
        (a) => a.id === SEARCH_ACTION_ID
      );
      expect(searchAction).toBeDefined();
      expect(searchAction?.label).toBe('Search');
      expect(searchAction?.category).toBe('action');
    });

    it('should have toggle theme action', () => {
      const themeAction = navigationActions.find(
        (a) => a.id === TOGGLE_THEME_ACTION_ID
      );
      expect(themeAction).toBeDefined();
      expect(themeAction?.label).toBe('Toggle Theme');
    });

    it('should have navigation actions with views', () => {
      const navActions = navigationActions.filter((a) => a.view);
      expect(navActions.length).toBeGreaterThan(0);
      expect(navActions.every((a) => a.category === 'navigation')).toBe(true);
    });
  });

  describe('createActions', () => {
    it('should contain expected create actions', () => {
      expect(createActions).toBeDefined();
      expect(createActions.length).toBeGreaterThan(0);
    });

    it('should have create task action', () => {
      const taskAction = createActions.find((a) => a.id === 'create-task');
      expect(taskAction).toBeDefined();
      expect(taskAction?.category).toBe('create');
      expect(taskAction?.typeId).toBe(BuiltInTypeIds.TASK);
    });

    it('should have create note action', () => {
      const noteAction = createActions.find((a) => a.id === 'create-note');
      expect(noteAction).toBeDefined();
      expect(noteAction?.typeId).toBe(BuiltInTypeIds.NOTE);
    });

    it('should all have typeId', () => {
      expect(createActions.every((a) => a.typeId)).toBe(true);
    });
  });

  describe('getStaticActions', () => {
    it('should return all navigation and create actions', () => {
      const actions = getStaticActions();
      expect(actions.length).toBe(
        navigationActions.length + createActions.length
      );
    });

    it('should include both navigation and create categories', () => {
      const actions = getStaticActions();
      const categories = [...new Set(actions.map((a) => a.category))];
      expect(categories).toContain('navigation');
      expect(categories).toContain('create');
      expect(categories).toContain('action');
    });
  });

  describe('fuzzyMatch', () => {
    it('should match exact string', () => {
      expect(fuzzyMatch('inbox', 'Inbox')).toBe(true);
    });

    it('should match partial string', () => {
      expect(fuzzyMatch('inb', 'Inbox')).toBe(true);
    });

    it('should match characters in order', () => {
      expect(fuzzyMatch('ibx', 'Inbox')).toBe(true);
    });

    it('should not match out of order characters', () => {
      expect(fuzzyMatch('xbi', 'Inbox')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(fuzzyMatch('INBOX', 'inbox')).toBe(true);
      expect(fuzzyMatch('inbox', 'INBOX')).toBe(true);
    });

    it('should match empty query', () => {
      expect(fuzzyMatch('', 'anything')).toBe(true);
    });

    it('should not match if query is longer than target', () => {
      expect(fuzzyMatch('inbox!!', 'inbox')).toBe(false);
    });

    it('should handle symbols', () => {
      expect(fuzzyMatch('task', 'Create new Task')).toBe(true);
    });
  });

  describe('filterActions', () => {
    const testActions = [
      {
        id: '1',
        label: 'Go to Inbox',
        icon: 'inbox',
        category: 'navigation' as const,
      },
      {
        id: '2',
        label: 'Go to Today',
        icon: 'today',
        category: 'navigation' as const,
      },
      {
        id: '3',
        label: 'Create Task',
        icon: 'task',
        category: 'create' as const,
      },
    ];

    it('should return all actions for empty query', () => {
      const result = filterActions(testActions, '');
      expect(result).toHaveLength(3);
    });

    it('should return all actions for whitespace query', () => {
      const result = filterActions(testActions, '   ');
      expect(result).toHaveLength(3);
    });

    it('should filter by label match', () => {
      const result = filterActions(testActions, 'inbox');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter multiple matches', () => {
      const result = filterActions(testActions, 'go');
      expect(result).toHaveLength(2);
    });

    it('should return empty for no matches', () => {
      const result = filterActions(testActions, 'xyz');
      expect(result).toHaveLength(0);
    });
  });
});
