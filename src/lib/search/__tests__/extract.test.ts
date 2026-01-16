import { describe, it, expect, vi } from 'vitest';
import {
  extractPlainTextFromBlocks,
  extractPlainTextFromContent,
} from '../extract';

// Mock the editor module
vi.mock('@/lib/editor', () => ({
  deserializeBlockNoteDocument: (json: string | null) => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  },
}));

describe('extract', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // extractPlainTextFromBlocks
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractPlainTextFromBlocks', () => {
    it('should return empty string for empty array', () => {
      expect(extractPlainTextFromBlocks([])).toBe('');
    });

    it('should return empty string for non-array input', () => {
      expect(extractPlainTextFromBlocks(null as unknown as [])).toBe('');
      expect(extractPlainTextFromBlocks(undefined as unknown as [])).toBe('');
    });

    it('should extract text from paragraph blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Hello world');
    });

    it('should extract text from heading blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'My Heading' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('My Heading');
    });

    it('should extract text from bullet list items', () => {
      const blocks = [
        {
          id: '1',
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'List item 1' }],
        },
        {
          id: '2',
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'List item 2' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe(
        'List item 1\nList item 2'
      );
    });

    it('should extract text from numbered list items', () => {
      const blocks = [
        {
          id: '1',
          type: 'numberedListItem',
          content: [{ type: 'text', text: 'First' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('First');
    });

    it('should extract text from check list items', () => {
      const blocks = [
        {
          id: '1',
          type: 'checkListItem',
          props: { checked: true },
          content: [{ type: 'text', text: 'Todo item' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Todo item');
    });

    it('should extract text from quote blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'quote',
          content: [{ type: 'text', text: 'Famous quote' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Famous quote');
    });

    it('should extract code from code blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'codeBlock',
          props: { code: 'const x = 1;', language: 'javascript' },
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('const x = 1;');
    });

    it('should extract mention names with @ prefix', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Check with ' },
            {
              type: 'mention',
              props: {
                objectId: 'user-1',
                objectName: 'John Doe',
                objectTypeId: 'person',
              },
            },
          ],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Check with @John Doe');
    });

    it('should extract link text', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Click ' },
            {
              type: 'link',
              href: 'https://example.com',
              content: [{ type: 'text', text: 'here' }],
            },
          ],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Click here');
    });

    it('should extract text from nested children', () => {
      const blocks = [
        {
          id: '1',
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'Parent' }],
          children: [
            {
              id: '1.1',
              type: 'bulletListItem',
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Parent\nChild');
    });

    it('should extract caption from image blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'image',
          props: {
            url: 'https://example.com/image.jpg',
            caption: 'Image caption',
          },
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Image caption');
    });

    it('should skip divider blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before' }],
        },
        { id: '2', type: 'divider' },
        {
          id: '3',
          type: 'paragraph',
          content: [{ type: 'text', text: 'After' }],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Before\nAfter');
    });

    it('should handle multiple nested content types', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'link',
              href: 'https://example.com',
              content: [{ type: 'text', text: 'world' }],
            },
            { type: 'text', text: '!' },
          ],
        },
      ];

      expect(extractPlainTextFromBlocks(blocks)).toBe('Hello world!');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // extractPlainTextFromContent
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractPlainTextFromContent', () => {
    it('should return empty string for null content', () => {
      expect(extractPlainTextFromContent(null)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(extractPlainTextFromContent('')).toBe('');
    });

    it('should parse JSON and extract text', () => {
      const content = JSON.stringify([
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ]);

      expect(extractPlainTextFromContent(content)).toBe('Hello');
    });

    it('should handle invalid JSON', () => {
      expect(extractPlainTextFromContent('not json')).toBe('');
    });

    it('should handle complex documents', () => {
      const content = JSON.stringify([
        {
          id: '1',
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          id: '2',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Body text' }],
        },
      ]);

      expect(extractPlainTextFromContent(content)).toBe('Title\nBody text');
    });
  });
});
