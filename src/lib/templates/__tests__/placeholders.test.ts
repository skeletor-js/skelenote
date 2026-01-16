import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPlaceholderValue,
  isValidPlaceholder,
  expandPlaceholders,
  expandPlaceholdersInContent,
  extractPlaceholders,
  createDefaultContext,
  textToBlockNoteJson,
  isValidBlockNoteJson,
  ensureBlockNoteFormat,
} from '../placeholders';
import type { PlaceholderContext, PlaceholderType } from '../types';

describe('Placeholders', () => {
  // Use fixed date for consistent testing
  const testDate = new Date(2024, 11, 25, 14, 30, 0); // December 25, 2024 2:30 PM

  const testContext: PlaceholderContext = {
    date: testDate,
    title: 'Test Title',
  };

  describe('getPlaceholderValue', () => {
    it('should expand date to long format', () => {
      expect(getPlaceholderValue('date', testContext)).toBe(
        'December 25, 2024'
      );
    });

    it('should expand date_short to ISO format', () => {
      expect(getPlaceholderValue('date_short', testContext)).toBe('2024-12-25');
    });

    it('should expand title', () => {
      expect(getPlaceholderValue('title', testContext)).toBe('Test Title');
    });

    it('should expand title to empty string if not provided', () => {
      const noTitle: PlaceholderContext = { date: testDate };
      expect(getPlaceholderValue('title', noTitle)).toBe('');
    });

    it('should expand time', () => {
      const result = getPlaceholderValue('time', testContext);
      expect(result).toMatch(/2:30\s*PM/i);
    });

    it('should expand tomorrow', () => {
      expect(getPlaceholderValue('tomorrow', testContext)).toBe(
        'December 26, 2024'
      );
    });

    it('should expand yesterday', () => {
      expect(getPlaceholderValue('yesterday', testContext)).toBe(
        'December 24, 2024'
      );
    });

    it('should expand week', () => {
      const result = getPlaceholderValue('week', testContext);
      expect(result).toMatch(/Week \d+/);
    });

    it('should expand month', () => {
      expect(getPlaceholderValue('month', testContext)).toBe('December');
    });

    it('should expand year', () => {
      expect(getPlaceholderValue('year', testContext)).toBe('2024');
    });

    it('should return custom value if provided', () => {
      const customContext: PlaceholderContext = {
        date: testDate,
        customValues: { custom_field: 'Custom Value' },
      };
      expect(
        getPlaceholderValue('custom_field' as PlaceholderType, customContext)
      ).toBe('Custom Value');
    });

    it('should return original placeholder for unknown types without custom value', () => {
      expect(
        getPlaceholderValue(
          'unknown_placeholder' as PlaceholderType,
          testContext
        )
      ).toBe('{{unknown_placeholder}}');
    });
  });

  describe('isValidPlaceholder', () => {
    it('should return true for valid placeholders', () => {
      expect(isValidPlaceholder('date')).toBe(true);
      expect(isValidPlaceholder('date_short')).toBe(true);
      expect(isValidPlaceholder('title')).toBe(true);
      expect(isValidPlaceholder('time')).toBe(true);
      expect(isValidPlaceholder('tomorrow')).toBe(true);
      expect(isValidPlaceholder('yesterday')).toBe(true);
      expect(isValidPlaceholder('week')).toBe(true);
      expect(isValidPlaceholder('month')).toBe(true);
      expect(isValidPlaceholder('year')).toBe(true);
    });

    it('should return false for invalid placeholders', () => {
      expect(isValidPlaceholder('invalid')).toBe(false);
      expect(isValidPlaceholder('custom')).toBe(false);
      expect(isValidPlaceholder('')).toBe(false);
    });
  });

  describe('expandPlaceholders', () => {
    it('should expand single placeholder', () => {
      const result = expandPlaceholders('Today is {{date}}', testContext);
      expect(result).toBe('Today is December 25, 2024');
    });

    it('should expand multiple placeholders', () => {
      const result = expandPlaceholders(
        '{{date}} - {{title}} - {{year}}',
        testContext
      );
      expect(result).toBe('December 25, 2024 - Test Title - 2024');
    });

    it('should leave unknown placeholders unchanged', () => {
      const result = expandPlaceholders('Value: {{unknown_type}}', testContext);
      expect(result).toBe('Value: {{unknown_type}}');
    });

    it('should expand custom values', () => {
      const customContext: PlaceholderContext = {
        date: testDate,
        customValues: { project: 'My Project' },
      };
      const result = expandPlaceholders('Project: {{project}}', customContext);
      expect(result).toBe('Project: My Project');
    });

    it('should handle text with no placeholders', () => {
      const result = expandPlaceholders('Plain text', testContext);
      expect(result).toBe('Plain text');
    });

    it('should handle empty string', () => {
      const result = expandPlaceholders('', testContext);
      expect(result).toBe('');
    });

    it('should handle adjacent placeholders', () => {
      const result = expandPlaceholders('{{year}}{{month}}', testContext);
      expect(result).toBe('2024December');
    });
  });

  describe('extractPlaceholders', () => {
    it('should extract single placeholder', () => {
      expect(extractPlaceholders('Hello {{date}}')).toEqual(['date']);
    });

    it('should extract multiple placeholders', () => {
      const result = extractPlaceholders('{{date}} and {{title}} and {{year}}');
      expect(result).toEqual(['date', 'title', 'year']);
    });

    it('should not duplicate placeholders', () => {
      const result = extractPlaceholders('{{date}} and {{date}} again');
      expect(result).toEqual(['date']);
    });

    it('should return empty array for no placeholders', () => {
      expect(extractPlaceholders('Plain text')).toEqual([]);
    });

    it('should handle empty string', () => {
      expect(extractPlaceholders('')).toEqual([]);
    });
  });

  describe('createDefaultContext', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 25, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create context with current date', () => {
      const context = createDefaultContext();
      expect(context.date.getFullYear()).toBe(2024);
      expect(context.date.getMonth()).toBe(11);
      expect(context.date.getDate()).toBe(25);
    });

    it('should include title if provided', () => {
      const context = createDefaultContext('My Title');
      expect(context.title).toBe('My Title');
    });

    it('should have undefined title if not provided', () => {
      const context = createDefaultContext();
      expect(context.title).toBeUndefined();
    });
  });

  describe('textToBlockNoteJson', () => {
    it('should convert single line to BlockNote JSON', () => {
      const result = textToBlockNoteJson('Hello world');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('paragraph');
      expect(parsed[0].content[0].text).toBe('Hello world');
    });

    it('should convert multiple lines to separate blocks', () => {
      const result = textToBlockNoteJson('Line 1\nLine 2\nLine 3');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(3);
      expect(parsed[0].content[0].text).toBe('Line 1');
      expect(parsed[1].content[0].text).toBe('Line 2');
      expect(parsed[2].content[0].text).toBe('Line 3');
    });

    it('should handle empty lines', () => {
      const result = textToBlockNoteJson('Line 1\n\nLine 3');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(3);
      expect(parsed[1].content).toEqual([]);
    });

    it('should include block IDs', () => {
      const result = textToBlockNoteJson('Test');
      const parsed = JSON.parse(result);

      expect(parsed[0].id).toBeDefined();
      expect(parsed[0].id).toMatch(/^block-/);
    });
  });

  describe('isValidBlockNoteJson', () => {
    it('should return true for valid BlockNote JSON', () => {
      const valid = JSON.stringify([
        { type: 'paragraph', content: [] },
        { type: 'heading', content: [] },
      ]);
      expect(isValidBlockNoteJson(valid)).toBe(true);
    });

    it('should return false for non-array JSON', () => {
      expect(isValidBlockNoteJson('{"type": "paragraph"}')).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(isValidBlockNoteJson('not json')).toBe(false);
    });

    it('should return false for array without type property', () => {
      const invalid = JSON.stringify([{ content: 'no type' }]);
      expect(isValidBlockNoteJson(invalid)).toBe(false);
    });
  });

  describe('ensureBlockNoteFormat', () => {
    it('should return BlockNote JSON unchanged', () => {
      const blockNote = JSON.stringify([{ type: 'paragraph', content: [] }]);
      expect(ensureBlockNoteFormat(blockNote)).toBe(blockNote);
    });

    it('should convert plain text to BlockNote JSON', () => {
      const result = ensureBlockNoteFormat('Plain text');
      expect(isValidBlockNoteJson(result)).toBe(true);

      const parsed = JSON.parse(result);
      expect(parsed[0].content[0].text).toBe('Plain text');
    });
  });

  describe('expandPlaceholdersInContent', () => {
    it('should expand placeholders in BlockNote JSON', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Today is {{date}}' }],
        },
      ]);

      const result = expandPlaceholdersInContent(content, testContext);
      const parsed = JSON.parse(result);

      expect(parsed[0].content[0].text).toBe('Today is December 25, 2024');
    });

    it('should convert plain text and expand placeholders', () => {
      const result = expandPlaceholdersInContent(
        'Today is {{date}}',
        testContext
      );
      const parsed = JSON.parse(result);

      expect(parsed[0].content[0].text).toBe('Today is December 25, 2024');
    });

    it('should handle nested content', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Year: {{year}}' },
            { type: 'text', text: ' Month: {{month}}' },
          ],
        },
      ]);

      const result = expandPlaceholdersInContent(content, testContext);
      const parsed = JSON.parse(result);

      expect(parsed[0].content[0].text).toBe('Year: 2024');
      expect(parsed[0].content[1].text).toBe(' Month: December');
    });
  });
});
