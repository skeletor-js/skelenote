/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  extractPlainText,
  getIndexableContentForObject,
  getAllIndexableContent,
} from '../indexable';

// Mock types
const mockStore = {
  get: vi.fn(),
  getAll: vi.fn(),
  getContent: vi.fn(),
};

const mockTypeRegistry = {
  get: vi.fn(),
};

describe('indexable', () => {
  describe('extractPlainText', () => {
    it('should extract text from simple blocks', () => {
      const blocks = [
        {
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
          ],
        },
        {
          content: [{ type: 'text', text: 'Another paragraph' }],
        },
      ];
      expect(extractPlainText(blocks)).toBe('Hello World Another paragraph');
    });

    it('should handle nested children', () => {
      const blocks = [
        {
          content: [{ type: 'text', text: 'Parent' }],
          children: [
            {
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      ];
      expect(extractPlainText(blocks)).toBe('Parent Child');
    });

    it('should extract text from links', () => {
      const blocks = [
        {
          content: [
            { type: 'link', text: 'GitHub', href: 'https://github.com' },
          ],
        },
      ];
      expect(extractPlainText(blocks)).toBe('GitHub');
    });

    it('should handle empty or invalid blocks', () => {
      expect(extractPlainText([])).toBe('');

      expect(
        extractPlainText([null, undefined, {}, { content: 'invalid' }] as any)
      ).toBe('');
    });
  });

  describe('getIndexableContentForObject', () => {
    it('should return null if object not found', () => {
      mockStore.get.mockReturnValue(null);

      expect(
        getIndexableContentForObject(
          'missing',
          mockStore as any,
          mockTypeRegistry as any
        )
      ).toBeNull();
    });

    it('should index object title and properties', () => {
      const obj = {
        id: '123',
        typeId: 'note',
        properties: { title: 'My Note', status: 'active' },
        hasContent: false,
      };

      mockStore.get.mockReturnValue(obj);
      mockTypeRegistry.get.mockReturnValue({
        schema: [{ id: 'status', type: 'text' }],
      });

      const result = getIndexableContentForObject(
        '123',
        mockStore as any,
        mockTypeRegistry as any
      );

      expect(result).toEqual({
        objectId: '123',
        title: 'My Note',
        content: 'active', // Should include text property
      });
    });

    it('should index rich text content', () => {
      const obj = {
        id: '456',
        typeId: 'note',
        properties: { title: 'Content Note' },
        hasContent: true,
      };

      const blocks = [{ content: [{ type: 'text', text: 'Some content' }] }];

      mockStore.get.mockReturnValue(obj);
      mockStore.getContent.mockReturnValue(JSON.stringify(blocks));
      mockTypeRegistry.get.mockReturnValue({ schema: [] });

      const result = getIndexableContentForObject(
        '456',
        mockStore as any,
        mockTypeRegistry as any
      );

      expect(result).toEqual({
        objectId: '456',
        title: 'Content Note',
        content: 'Some content',
      });
    });

    it('should handle raw text content (fallback)', () => {
      const obj = {
        id: '789',
        typeId: 'note',
        properties: { title: 'Raw Note' },
        hasContent: true,
      };

      mockStore.get.mockReturnValue(obj);
      mockStore.getContent.mockReturnValue('Raw text content'); // Not JSON
      mockTypeRegistry.get.mockReturnValue({ schema: [] });

      const result = getIndexableContentForObject(
        '789',
        mockStore as any,
        mockTypeRegistry as any
      );

      expect(result).toEqual({
        objectId: '789',
        title: 'Raw Note',
        content: 'Raw text content',
      });
    });
  });

  describe('getAllIndexableContent', () => {
    it('should return all indexable objects', () => {
      const obj1 = { id: '1', properties: { title: 'A' }, hasContent: false };
      const obj2 = { id: '2', properties: { title: 'B' }, hasContent: false };

      mockStore.getAll.mockReturnValue([obj1, obj2]);
      mockStore.get.mockImplementation((id) => (id === '1' ? obj1 : obj2));
      mockTypeRegistry.get.mockReturnValue({ schema: [] });

      const results = getAllIndexableContent(
        mockStore as any,
        mockTypeRegistry as any
      );

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('A');
      expect(results[1].title).toBe('B');
    });
  });
});
