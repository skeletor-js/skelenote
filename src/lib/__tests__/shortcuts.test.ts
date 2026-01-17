/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  SHORTCUTS,
  CATEGORY_INFO,
  getShortcutsByCategory,
  type ShortcutCategory,
} from '../shortcuts';

describe('lib/shortcuts', () => {
  describe('CATEGORY_INFO', () => {
    it('should have all category labels', () => {
      expect(CATEGORY_INFO.global.label).toBe('Global');
      expect(CATEGORY_INFO.navigation.label).toBe('Navigation');
      expect(CATEGORY_INFO.views.label).toBe('Views');
      expect(CATEGORY_INFO.objects.label).toBe('Objects');
      expect(CATEGORY_INFO.editing.label).toBe('Editing');
    });

    it('should have order values for all categories', () => {
      expect(CATEGORY_INFO.global.order).toBe(1);
      expect(CATEGORY_INFO.navigation.order).toBe(2);
      expect(CATEGORY_INFO.views.order).toBe(3);
      expect(CATEGORY_INFO.objects.order).toBe(4);
      expect(CATEGORY_INFO.editing.order).toBe(5);
    });
  });

  describe('SHORTCUTS', () => {
    it('should be an array of shortcuts', () => {
      expect(Array.isArray(SHORTCUTS)).toBe(true);
      expect(SHORTCUTS.length).toBeGreaterThan(0);
    });

    it('should have shortcuts with required fields', () => {
      for (const shortcut of SHORTCUTS) {
        expect(shortcut.keys).toBeDefined();
        expect(Array.isArray(shortcut.keys)).toBe(true);
        expect(shortcut.keys.length).toBeGreaterThan(0);
        expect(shortcut.description).toBeDefined();
        expect(shortcut.category).toBeDefined();
      }
    });

    it('should have Command Palette shortcut', () => {
      const cmdK = SHORTCUTS.find(
        (s) => s.keys.includes('K') && s.keys.includes('Cmd')
      );
      expect(cmdK).toBeDefined();
      expect(cmdK?.description).toBe('Command Palette');
      expect(cmdK?.category).toBe('global');
    });

    it('should have navigation shortcuts', () => {
      const navShortcuts = SHORTCUTS.filter((s) => s.category === 'navigation');
      expect(navShortcuts.length).toBeGreaterThan(0);
    });

    it('should have editing shortcuts', () => {
      const editShortcuts = SHORTCUTS.filter((s) => s.category === 'editing');
      expect(editShortcuts.length).toBeGreaterThan(0);
    });

    it('should have undo shortcut', () => {
      const undo = SHORTCUTS.find(
        (s) => s.keys.includes('Z') && s.description === 'Undo'
      );
      expect(undo).toBeDefined();
      expect(undo?.category).toBe('editing');
    });

    it('should have redo shortcut', () => {
      const redo = SHORTCUTS.find(
        (s) => s.keys.includes('Z') && s.description === 'Redo'
      );
      expect(redo).toBeDefined();
    });
  });

  describe('getShortcutsByCategory', () => {
    it('should return a Map', () => {
      const result = getShortcutsByCategory();
      expect(result instanceof Map).toBe(true);
    });

    it('should have all category keys', () => {
      const result = getShortcutsByCategory();
      const categories: ShortcutCategory[] = [
        'global',
        'navigation',
        'views',
        'objects',
        'editing',
      ];

      for (const category of categories) {
        expect(result.has(category)).toBe(true);
      }
    });

    it('should group shortcuts correctly', () => {
      const result = getShortcutsByCategory();
      const globalShortcuts = result.get('global') ?? [];

      expect(globalShortcuts.length).toBeGreaterThan(0);
      expect(globalShortcuts.every((s) => s.category === 'global')).toBe(true);
    });

    it('should order categories correctly', () => {
      const result = getShortcutsByCategory();
      const keys = Array.from(result.keys());

      expect(keys[0]).toBe('global');
      expect(keys[1]).toBe('navigation');
      expect(keys[2]).toBe('views');
      expect(keys[3]).toBe('objects');
      expect(keys[4]).toBe('editing');
    });

    it('should contain all shortcuts', () => {
      const result = getShortcutsByCategory();
      let totalCount = 0;

      for (const [, shortcuts] of result) {
        totalCount += shortcuts.length;
      }

      expect(totalCount).toBe(SHORTCUTS.length);
    });
  });
});
