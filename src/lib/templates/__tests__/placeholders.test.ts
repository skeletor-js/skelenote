import { describe, it, expect, beforeEach } from 'vitest';
import {
  expandPlaceholders,
  expandPlaceholdersInContent,
  extractPlaceholders,
  isValidBlockNoteJson,
  textToBlockNoteJson,
  ensureBlockNoteFormat,
  getPlaceholderValue,
} from '../placeholders';
import type { PlaceholderContext } from '../types';

describe('placeholders', () => {
  const mockDate = new Date('2025-12-27T15:45:00.000Z');
  const mockContext: PlaceholderContext = {
    date: mockDate,
    title: 'Test Note',
  };

  beforeEach(() => {
    // Mock system time if needed, but we pass date in context usually
  });

  describe('getPlaceholderValue', () => {
    it('formats date correctly', () => {
      expect(getPlaceholderValue('date', mockContext)).toBe(
        'December 27, 2025'
      );
    });

    it('formats short date correctly', () => {
      expect(getPlaceholderValue('date_short', mockContext)).toBe('2025-12-27');
    });

    it('formats time correctly', () => {
      // Time formatting depends on locale, checking partial match or mocking toLocaleTimeString behavior if strictly needed.
      // For now, assuming en-US environment as per implementation.
      const time = getPlaceholderValue('time', mockContext);
      expect(time).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });

    it('returns title', () => {
      expect(getPlaceholderValue('title', mockContext)).toBe('Test Note');
    });

    it('returns empty string for missing title', () => {
      expect(getPlaceholderValue('title', { date: mockDate })).toBe('');
    });

    it('returns year', () => {
      expect(getPlaceholderValue('year', mockContext)).toBe('2025');
    });

    it('returns month', () => {
      expect(getPlaceholderValue('month', mockContext)).toBe('December');
    });

    it('returns week number', () => {
      const week = getPlaceholderValue('week', mockContext);
      expect(week).toMatch(/^Week \d+$/);
    });

    it('returns tomorrow date', () => {
      const tomorrow = getPlaceholderValue('tomorrow', mockContext);
      expect(tomorrow).toBe('December 28, 2025');
    });

    it('returns yesterday date', () => {
      const yesterday = getPlaceholderValue('yesterday', mockContext);
      expect(yesterday).toBe('December 26, 2025');
    });

    it('returns custom value when provided', () => {
      const ctx = {
        ...mockContext,
        customValues: { myCustom: 'Custom!' },
      };
      expect(getPlaceholderValue('myCustom' as any, ctx)).toBe('Custom!');
    });

    it('returns placeholder string for unknown type without custom value', () => {
      expect(getPlaceholderValue('unknown' as any, mockContext)).toBe(
        '{{unknown}}'
      );
    });
  });

  describe('expandPlaceholders', () => {
    it('replaces single placeholder', () => {
      expect(expandPlaceholders('Hello {{title}}', mockContext)).toBe(
        'Hello Test Note'
      );
    });

    it('replaces multiple placeholders', () => {
      expect(
        expandPlaceholders(
          'Date: {{date_short}}, Title: {{title}}',
          mockContext
        )
      ).toBe('Date: 2025-12-27, Title: Test Note');
    });

    it('ignores unknown placeholders', () => {
      expect(expandPlaceholders('Hello {{unknown}}', mockContext)).toBe(
        'Hello {{unknown}}'
      );
    });

    it('supports custom values', () => {
      const contextWithCustom = {
        ...mockContext,
        customValues: { my_var: 'Custom Value' },
      };
      expect(expandPlaceholders('Value: {{my_var}}', contextWithCustom)).toBe(
        'Value: Custom Value'
      );
    });
  });

  describe('expandPlaceholdersInContent', () => {
    it('expands in JSON string', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Today is {{date_short}}' }],
        },
      ]);

      const result = expandPlaceholdersInContent(content, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed[0].content[0].text).toBe('Today is 2025-12-27');
    });

    it('expands in object structure', () => {
      const content = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hi {{title}}' }],
        },
      ];

      const result = expandPlaceholdersInContent(content, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed[0].content[0].text).toBe('Hi Test Note');
    });

    it('converts plain text to BlockNote format and expands', () => {
      const result = expandPlaceholdersInContent(
        'Simple text {{title}}',
        mockContext
      );
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].content[0].text).toBe('Simple text Test Note');
    });

    it('handles JSON that parses but is not an array', () => {
      // An object that parses as valid JSON but is not BlockNote format (not an array)
      const notArray = JSON.stringify({ type: 'paragraph', text: '{{title}}' });
      const result = expandPlaceholdersInContent(notArray, mockContext);
      const parsed = JSON.parse(result);

      // Should be converted to BlockNote format
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('handles null and undefined in content nodes', () => {
      const content = [
        {
          type: 'paragraph',
          content: null,
          props: undefined,
        },
      ];

      const result = expandPlaceholdersInContent(content, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed[0].content).toBe(null);
    });

    it('handles primitive values in content', () => {
      const content = [
        {
          type: 'paragraph',
          count: 42,
          active: true,
          content: [{ type: 'text', text: '{{title}}' }],
        },
      ];

      const result = expandPlaceholdersInContent(content, mockContext);
      const parsed = JSON.parse(result);

      // Primitives should be preserved
      expect(parsed[0].count).toBe(42);
      expect(parsed[0].active).toBe(true);
      expect(parsed[0].content[0].text).toBe('Test Note');
    });

    it('handles nested arrays in content', () => {
      const content = [
        {
          type: 'table',
          rows: [
            [{ type: 'text', text: '{{date_short}}' }],
            [{ type: 'text', text: '{{title}}' }],
          ],
        },
      ];

      const result = expandPlaceholdersInContent(content, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed[0].rows[0][0].text).toBe('2025-12-27');
      expect(parsed[0].rows[1][0].text).toBe('Test Note');
    });
  });

  describe('extractPlaceholders', () => {
    it('finds unique placeholders', () => {
      const text = '{{title}} and {{date}} and {{title}} again';
      const result = extractPlaceholders(text);
      expect(result).toEqual(['title', 'date']);
    });

    it('returns empty array if no placeholders', () => {
      expect(extractPlaceholders('No placeholders here')).toEqual([]);
    });
  });

  describe('BlockNote utilities', () => {
    it('validates correct BlockNote JSON', () => {
      const valid = JSON.stringify([{ type: 'p' }]);
      expect(isValidBlockNoteJson(valid)).toBe(true);
    });

    it('invalidates malformed JSON', () => {
      expect(isValidBlockNoteJson('{ invalid }')).toBe(false);
    });

    it('converts text to BlockNote JSON', () => {
      const json = textToBlockNoteJson('line 1\nline 2');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].content[0].text).toBe('line 1');
      expect(parsed[1].content[0].text).toBe('line 2');
    });

    it('ensures BlockNote format converts plain text', () => {
      const res = ensureBlockNoteFormat('hello');
      expect(isValidBlockNoteJson(res)).toBe(true);
    });

    it('ensures BlockNote format keeps valid JSON', () => {
      const valid = JSON.stringify([{ type: 'p' }]);
      expect(ensureBlockNoteFormat(valid)).toBe(valid);
    });
  });
});
