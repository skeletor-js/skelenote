import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeContentDiff,
  computePropertyDiff,
  hasContentChanges,
} from '../block-diff';

// Mock the editor module
vi.mock('@/lib/editor', () => ({
  deserializeBlockNoteDocument: (json: string | null) => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  },
}));

describe('block-diff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeContentDiff
  // ─────────────────────────────────────────────────────────────────────────

  describe('computeContentDiff', () => {
    it('should return empty diff for two null documents', () => {
      const result = computeContentDiff(null, null);

      expect(result.historical).toEqual([]);
      expect(result.current).toEqual([]);
      expect(result.summary.added).toBe(0);
      expect(result.summary.removed).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.unchanged).toBe(0);
    });

    it('should mark all blocks as added when historical is null', () => {
      const currentBlocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          id: '2',
          type: 'paragraph',
          content: [{ type: 'text', text: 'World' }],
        },
      ];

      const result = computeContentDiff(null, JSON.stringify(currentBlocks));

      expect(result.summary.added).toBe(2);
      expect(result.summary.removed).toBe(0);
      expect(result.current.every((b) => b.status === 'added')).toBe(true);
    });

    it('should mark all blocks as removed when current is null', () => {
      const historicalBlocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          id: '2',
          type: 'paragraph',
          content: [{ type: 'text', text: 'World' }],
        },
      ];

      const result = computeContentDiff(JSON.stringify(historicalBlocks), null);

      expect(result.summary.removed).toBe(2);
      expect(result.summary.added).toBe(0);
      expect(result.historical.every((b) => b.status === 'removed')).toBe(true);
    });

    it('should detect unchanged blocks by content', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ];

      const result = computeContentDiff(
        JSON.stringify(blocks),
        JSON.stringify(blocks)
      );

      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.modified).toBe(0);
      expect(result.historical[0].status).toBe('unchanged');
      expect(result.current[0].status).toBe('unchanged');
    });

    it('should detect modified blocks when same type at same position', () => {
      const historical = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ];
      const current = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello World' }],
        },
      ];

      const result = computeContentDiff(
        JSON.stringify(historical),
        JSON.stringify(current)
      );

      // Same type at same position = modified
      expect(result.summary.modified).toBe(1);
      expect(result.historical[0].status).toBe('modified');
      expect(result.current[0].status).toBe('modified');
    });

    it('should handle nested children blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'Item 1' }],
          children: [
            {
              id: '1.1',
              type: 'bulletListItem',
              content: [{ type: 'text', text: 'Nested' }],
            },
          ],
        },
      ];

      const result = computeContentDiff(
        JSON.stringify(blocks),
        JSON.stringify(blocks)
      );

      // Flattened, so should have 2 unchanged
      expect(result.summary.unchanged).toBe(2);
    });

    it('should handle empty block arrays', () => {
      const result = computeContentDiff(JSON.stringify([]), JSON.stringify([]));

      expect(result.historical).toEqual([]);
      expect(result.current).toEqual([]);
      expect(result.summary.unchanged).toBe(0);
    });

    it('should handle blocks with different types', () => {
      const historical = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Text' }],
        },
      ];
      const current = [
        {
          id: '1',
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'Text' }],
        },
      ];

      const result = computeContentDiff(
        JSON.stringify(historical),
        JSON.stringify(current)
      );

      // Different types should be detected as changes
      expect(result.summary.added + result.summary.removed).toBeGreaterThan(0);
    });

    it('should handle mention blocks', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              props: { objectId: 'obj-1', objectName: 'Test' },
            },
          ],
        },
      ];

      const result = computeContentDiff(
        JSON.stringify(blocks),
        JSON.stringify(blocks)
      );

      expect(result.summary.unchanged).toBe(1);
    });

    it('should handle link content', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [
            {
              type: 'link',
              href: 'https://example.com',
              content: [{ type: 'text', text: 'Link' }],
            },
          ],
        },
      ];

      const result = computeContentDiff(
        JSON.stringify(blocks),
        JSON.stringify(blocks)
      );

      expect(result.summary.unchanged).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computePropertyDiff
  // ─────────────────────────────────────────────────────────────────────────

  describe('computePropertyDiff', () => {
    it('should return empty array for identical properties', () => {
      const props = { title: 'Test', status: 'todo' };
      const result = computePropertyDiff(props, props);

      // computePropertyDiff only returns diffs with actual changes, not unchanged
      expect(result.length).toBe(0);
    });

    it('should detect added properties', () => {
      const historical = { title: 'Test' };
      const current = { title: 'Test', status: 'todo' };

      const result = computePropertyDiff(historical, current);

      const added = result.find((r) => r.key === 'status');
      expect(added?.status).toBe('added');
      expect(added?.newValue).toBe('todo');
    });

    it('should detect removed properties', () => {
      const historical = { title: 'Test', status: 'todo' };
      const current = { title: 'Test' };

      const result = computePropertyDiff(historical, current);

      const removed = result.find((r) => r.key === 'status');
      expect(removed?.status).toBe('removed');
      expect(removed?.oldValue).toBe('todo');
    });

    it('should detect modified properties', () => {
      const historical = { title: 'Test', status: 'todo' };
      const current = { title: 'Test', status: 'done' };

      const result = computePropertyDiff(historical, current);

      const modified = result.find((r) => r.key === 'status');
      expect(modified?.status).toBe('modified');
      expect(modified?.oldValue).toBe('todo');
      expect(modified?.newValue).toBe('done');
    });

    it('should handle nested objects', () => {
      const historical = { meta: { count: 1 } };
      const current = { meta: { count: 2 } };

      const result = computePropertyDiff(historical, current);

      const meta = result.find((r) => r.key === 'meta');
      expect(meta?.status).toBe('modified');
    });

    it('should handle array properties', () => {
      const historical = { tags: ['a', 'b'] };
      const current = { tags: ['a', 'b', 'c'] };

      const result = computePropertyDiff(historical, current);

      const tags = result.find((r) => r.key === 'tags');
      expect(tags?.status).toBe('modified');
    });

    it('should handle null to value as added', () => {
      const historical = { dueDate: null };
      const current = { dueDate: 1234567890 };

      const result = computePropertyDiff(historical, current);

      // null is treated as "empty", so null->value is 'added'
      const dueDate = result.find((r) => r.key === 'dueDate');
      expect(dueDate?.status).toBe('added');
    });

    it('should handle empty objects', () => {
      const result = computePropertyDiff({}, {});
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // hasContentChanges
  // ─────────────────────────────────────────────────────────────────────────

  describe('hasContentChanges', () => {
    it('should return false for two null documents', () => {
      expect(hasContentChanges(null, null)).toBe(false);
    });

    it('should return true when historical is null and current has content', () => {
      const blocks = [{ id: '1', type: 'paragraph', content: [] }];
      expect(hasContentChanges(null, JSON.stringify(blocks))).toBe(true);
    });

    it('should return true when current is null and historical has content', () => {
      const blocks = [{ id: '1', type: 'paragraph', content: [] }];
      expect(hasContentChanges(JSON.stringify(blocks), null)).toBe(true);
    });

    it('should return false for identical documents', () => {
      const blocks = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ];
      const json = JSON.stringify(blocks);

      expect(hasContentChanges(json, json)).toBe(false);
    });

    it('should return true for different documents', () => {
      const historical = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ];
      const current = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello World' }],
        },
      ];

      expect(
        hasContentChanges(JSON.stringify(historical), JSON.stringify(current))
      ).toBe(true);
    });

    it('should return true when blocks are added', () => {
      const historical = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'First' }],
        },
      ];
      const current = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'First' }],
        },
        {
          id: '2',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second' }],
        },
      ];

      expect(
        hasContentChanges(JSON.stringify(historical), JSON.stringify(current))
      ).toBe(true);
    });

    it('should return true when blocks are removed', () => {
      const historical = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'First' }],
        },
        {
          id: '2',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second' }],
        },
      ];
      const current = [
        {
          id: '1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'First' }],
        },
      ];

      expect(
        hasContentChanges(JSON.stringify(historical), JSON.stringify(current))
      ).toBe(true);
    });
  });
});
