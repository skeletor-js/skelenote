import { describe, it, expect } from 'vitest';
import {
  highlightText,
  createSnippet,
  getBestSnippet,

} from '../highlight';
import type { SearchMatch } from '../types';

describe('highlight', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // highlightText
  // ─────────────────────────────────────────────────────────────────────────

  describe('highlightText', () => {
    it('should return single non-highlighted segment for no matches', () => {
      const result = highlightText('Hello world', []);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Hello world');
      expect(result[0].highlighted).toBe(false);
    });

    it('should return single non-highlighted segment for empty text', () => {
      const result = highlightText('', [[0, 5]]);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('');
      expect(result[0].highlighted).toBe(false);
    });

    it('should highlight a single match at the start', () => {
      const result = highlightText('Hello world', [[0, 4]]);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Hello');
      expect(result[0].highlighted).toBe(true);
      expect(result[1].text).toBe(' world');
      expect(result[1].highlighted).toBe(false);
    });

    it('should highlight a single match at the end', () => {
      const result = highlightText('Hello world', [[6, 10]]);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Hello ');
      expect(result[0].highlighted).toBe(false);
      expect(result[1].text).toBe('world');
      expect(result[1].highlighted).toBe(true);
    });

    it('should highlight a single match in the middle', () => {
      const result = highlightText('Hello world today', [[6, 10]]);

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Hello ');
      expect(result[0].highlighted).toBe(false);
      expect(result[1].text).toBe('world');
      expect(result[1].highlighted).toBe(true);
      expect(result[2].text).toBe(' today');
      expect(result[2].highlighted).toBe(false);
    });

    it('should handle multiple non-overlapping matches', () => {
      const result = highlightText('Hello world today', [
        [0, 4],
        [12, 16],
      ]);

      // Result: 'Hello' (highlighted), ' world ' (not), 'today' (highlighted)
      // No trailing segment since match ends at text end
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ text: 'Hello', highlighted: true });
      expect(result[1]).toEqual({ text: ' world ', highlighted: false });
      expect(result[2]).toEqual({ text: 'today', highlighted: true });
    });

    it('should merge overlapping matches', () => {
      // Indices [0, 4] and [3, 7] should merge to [0, 7]
      const result = highlightText('Hello world', [
        [0, 4],
        [3, 7],
      ]);

      // Merged match covers "Hello wo"
      const highlighted = result.filter((s) => s.highlighted);
      expect(highlighted.length).toBe(1);
      expect(highlighted[0].text.length).toBeGreaterThan(5);
    });

    it('should merge adjacent matches', () => {
      // Indices [0, 2] and [3, 5] should merge (within 2 chars)
      const result = highlightText('Hello world', [
        [0, 2],
        [3, 5],
      ]);

      const highlighted = result.filter((s) => s.highlighted);
      expect(highlighted.length).toBe(1);
    });

    it('should highlight entire text when match covers all', () => {
      const result = highlightText('Hello', [[0, 4]]);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Hello');
      expect(result[0].highlighted).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createSnippet
  // ─────────────────────────────────────────────────────────────────────────

  describe('createSnippet', () => {
    const longText =
      'This is a very long text that contains many words and should be used to test the snippet creation functionality with various edge cases.';

    it('should return truncated text with no matches', () => {
      const result = createSnippet(longText, [], 50);

      expect(result.text.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(result.text.endsWith('...')).toBe(true);
    });

    it('should return full text if shorter than max length', () => {
      const shortText = 'Hello world';
      const result = createSnippet(shortText, [], 50);

      expect(result.text).toBe(shortText);
    });

    it('should center snippet around first match', () => {
      const result = createSnippet(longText, [[50, 54]], 40, 10);

      // Match is "words" at index 50-54
      expect(result.text).toContain('words');
      // Should have ellipsis since match is in the middle
      expect(result.text.includes('...')).toBe(true);
    });

    it('should include highlighted segments', () => {
      const result = createSnippet('Hello world today', [[6, 10]], 50);

      const highlighted = result.segments.filter((s) => s.highlighted);
      expect(highlighted.length).toBeGreaterThan(0);
    });

    it('should handle match at start of text', () => {
      const result = createSnippet(longText, [[0, 3]], 40, 10);

      expect(result.text.startsWith('This')).toBe(true);
    });

    it('should handle match at end of text', () => {
      const matchStart = longText.length - 10;
      const result = createSnippet(
        longText,
        [[matchStart, longText.length - 1]],
        40,
        10
      );

      expect(result.text.endsWith('cases.')).toBe(true);
    });

    it('should handle empty text', () => {
      const result = createSnippet('', [[0, 5]], 50);

      expect(result.text).toBe('');
    });

    it('should respect max length', () => {
      const result = createSnippet(longText, [[50, 54]], 30);

      // Including ellipsis
      expect(result.text.length).toBeLessThanOrEqual(40);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getBestSnippet
  // ─────────────────────────────────────────────────────────────────────────

  describe('getBestSnippet', () => {
    it('should return null for empty matches', () => {
      const result = getBestSnippet([]);
      expect(result).toBeNull();
    });

    it('should return null for undefined matches', () => {
      const result = getBestSnippet(undefined as unknown as SearchMatch[]);
      expect(result).toBeNull();
    });

    it('should prioritize content matches', () => {
      const matches: SearchMatch[] = [
        {
          key: 'properties',
          value: 'title text',
          indices: [[0, 4]],
        },
        {
          key: 'content',
          value: 'This is the content text',
          indices: [[12, 18]],
        },
      ];

      const result = getBestSnippet(matches);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('content');
    });

    it('should fall back to property matches if no content', () => {
      const matches: SearchMatch[] = [
        {
          key: 'properties',
          value: 'title text',
          indices: [[0, 4]],
        },
      ];

      const result = getBestSnippet(matches);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('title');
    });

    it('should return null if no content or properties match', () => {
      const matches: SearchMatch[] = [
        {
          key: 'title',
          value: 'some-id',
          indices: [[0, 6]],
        },
      ];

      const result = getBestSnippet(matches);
      expect(result).toBeNull();
    });

    it('should respect custom max length', () => {
      const matches: SearchMatch[] = [
        {
          key: 'content',
          value:
            'This is a very long content that should be truncated appropriately',
          indices: [[0, 3]],
        },
      ];

      const result = getBestSnippet(matches, 30);

      expect(result).not.toBeNull();
      expect(result!.text.length).toBeLessThanOrEqual(40); // Some buffer for ellipsis
    });
  });
});
