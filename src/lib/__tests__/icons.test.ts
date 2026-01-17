/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  getIconFromEmoji,
  EMOJI_TO_ICON,
  DEFAULT_ICON,
  type IconName,
} from '../icons';

describe('lib/icons', () => {
  describe('EMOJI_TO_ICON', () => {
    it('should have mappings for common emojis', () => {
      expect(EMOJI_TO_ICON['✓']).toBe('circle-check');
      expect(EMOJI_TO_ICON['📝']).toBe('file-text');
      expect(EMOJI_TO_ICON['📁']).toBe('folder');
      expect(EMOJI_TO_ICON['🔗']).toBe('link');
    });

    it('should have mappings for navigation emojis', () => {
      expect(EMOJI_TO_ICON['📥']).toBe('inbox');
      expect(EMOJI_TO_ICON['🔎']).toBe('search');
      expect(EMOJI_TO_ICON['🕰️']).toBe('history');
    });

    it('should have mappings for action emojis', () => {
      expect(EMOJI_TO_ICON['⚡']).toBe('zap');
      expect(EMOJI_TO_ICON['✨']).toBe('sparkles');
      expect(EMOJI_TO_ICON['📌']).toBe('pin');
    });
  });

  describe('DEFAULT_ICON', () => {
    it('should be file', () => {
      expect(DEFAULT_ICON).toBe('file');
    });
  });

  describe('getIconFromEmoji', () => {
    it('should return icon for valid icon name', () => {
      expect(getIconFromEmoji('circle-check')).toBe('circle-check');
      expect(getIconFromEmoji('file-text')).toBe('file-text');
      expect(getIconFromEmoji('inbox')).toBe('inbox');
    });

    it('should convert emoji to icon name', () => {
      expect(getIconFromEmoji('✓')).toBe('circle-check');
      expect(getIconFromEmoji('📝')).toBe('file-text');
      expect(getIconFromEmoji('📥')).toBe('inbox');
    });

    it('should return default icon for unknown emoji', () => {
      expect(getIconFromEmoji('🤷')).toBe(DEFAULT_ICON);
      expect(getIconFromEmoji('unknown')).toBe(DEFAULT_ICON);
    });

    it('should handle all valid icon names', () => {
      const testIconNames: IconName[] = [
        'folder',
        'layers',
        'link',
        'calendar',
        'tag',
        'user',
        'clipboard',
        'search',
        'moon',
        'sun',
        'pin',
        'archive',
      ];

      for (const iconName of testIconNames) {
        expect(getIconFromEmoji(iconName)).toBe(iconName);
      }
    });

    it('should prioritize valid icon name over emoji mapping', () => {
      // If both exist, icon name should be returned as-is
      expect(getIconFromEmoji('check-circle')).toBe('check-circle');
    });

    it('should handle empty string', () => {
      expect(getIconFromEmoji('')).toBe(DEFAULT_ICON);
    });

    it('should handle settings emoji with and without variant selector', () => {
      expect(getIconFromEmoji('⚙')).toBe('settings');
      expect(getIconFromEmoji('⚙️')).toBe('settings');
    });
  });
});
