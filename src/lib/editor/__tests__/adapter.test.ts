import { describe, it, expect } from 'vitest';
import { blockNoteAdapter, extractMentionsFromContent } from '../adapter';

describe('EditorContentAdapter', () => {
  describe('blockNoteAdapter.extractMentionIds', () => {
    it('should return empty array for null content', () => {
      expect(blockNoteAdapter.extractMentionIds(null)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(blockNoteAdapter.extractMentionIds('')).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      expect(blockNoteAdapter.extractMentionIds('not valid json')).toEqual([]);
    });

    it('should return empty array for content without mentions', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
          children: [],
        },
      ]);
      expect(blockNoteAdapter.extractMentionIds(content)).toEqual([]);
    });

    it('should extract a single mention', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              props: {
                objectId: 'obj-1',
                objectName: 'Test',
                objectTypeId: 'task',
              },
            },
          ],
        },
      ]);
      expect(blockNoteAdapter.extractMentionIds(content)).toEqual(['obj-1']);
    });

    it('should extract multiple mentions', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'mention', props: { objectId: 'obj-1' } },
            { type: 'text', text: ' and ' },
            { type: 'mention', props: { objectId: 'obj-2' } },
          ],
        },
      ]);
      expect(blockNoteAdapter.extractMentionIds(content)).toEqual([
        'obj-1',
        'obj-2',
      ]);
    });

    it('should extract mentions from nested children', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [],
          children: [
            {
              type: 'paragraph',
              content: [{ type: 'mention', props: { objectId: 'nested-obj' } }],
            },
          ],
        },
      ]);
      expect(blockNoteAdapter.extractMentionIds(content)).toContain(
        'nested-obj'
      );
    });

    it('should handle non-array content gracefully', () => {
      const content = JSON.stringify({ type: 'not-array' });
      expect(blockNoteAdapter.extractMentionIds(content)).toEqual([]);
    });

    it('should ignore mentions without objectId', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'mention', props: { name: 'no-id' } }],
        },
      ]);
      expect(blockNoteAdapter.extractMentionIds(content)).toEqual([]);
    });
  });

  describe('extractMentionsFromContent (backward-compatible export)', () => {
    it('should delegate to blockNoteAdapter.extractMentionIds', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'mention', props: { objectId: 'test-id' } }],
        },
      ]);
      expect(extractMentionsFromContent(content)).toEqual(['test-id']);
    });
  });

  describe('blockNoteAdapter.extractPlainText', () => {
    it('should return empty string for null content', () => {
      expect(blockNoteAdapter.extractPlainText(null)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(blockNoteAdapter.extractPlainText('')).toBe('');
    });

    it('should extract text from paragraph', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('Hello world');
    });

    it('should extract mention names with @ prefix', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', props: { objectId: '1', objectName: 'Alice' } },
          ],
        },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('Hello @Alice');
    });

    it('should extract text from multiple blocks', () => {
      const content = JSON.stringify([
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('First\nSecond');
    });

    it('should extract text from headings', () => {
      const content = JSON.stringify([
        { type: 'heading', content: [{ type: 'text', text: 'Title' }] },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('Title');
    });

    it('should extract text from lists', () => {
      const content = JSON.stringify([
        { type: 'bulletListItem', content: [{ type: 'text', text: 'Item 1' }] },
        {
          type: 'numberedListItem',
          content: [{ type: 'text', text: 'Item 2' }],
        },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('Item 1\nItem 2');
    });

    it('should extract text from code blocks', () => {
      const content = JSON.stringify([
        { type: 'codeBlock', props: { code: 'const x = 1;' } },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('const x = 1;');
    });

    it('should extract text from links', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'link', content: [{ type: 'text', text: 'Click here' }] },
          ],
        },
      ]);
      expect(blockNoteAdapter.extractPlainText(content)).toBe('Click here');
    });
  });

  describe('blockNoteAdapter.removeMentions', () => {
    it('should return null for null content', () => {
      expect(blockNoteAdapter.removeMentions(null, 'any-id')).toBeNull();
    });

    it('should remove mention of specific object', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', props: { objectId: 'remove-me' } },
            { type: 'text', text: ' world' },
          ],
        },
      ]);
      const result = blockNoteAdapter.removeMentions(content, 'remove-me');
      const parsed = JSON.parse(result!);

      expect(parsed[0].content).toHaveLength(2);
      expect(parsed[0].content[1].text).toBe(' world');
    });

    it('should return null if no changes made', () => {
      const content = JSON.stringify([{ type: 'paragraph', content: [] }]);
      expect(blockNoteAdapter.removeMentions(content, 'other-id')).toBeNull();
    });

    it('should remove multiple mentions of same object', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'mention', props: { objectId: 'remove-me' } },
            { type: 'text', text: ' and ' },
            { type: 'mention', props: { objectId: 'remove-me' } },
          ],
        },
      ]);
      const result = blockNoteAdapter.removeMentions(content, 'remove-me');
      const parsed = JSON.parse(result!);

      expect(parsed[0].content).toHaveLength(1);
      expect(parsed[0].content[0].text).toBe(' and ');
    });

    it('should preserve other mentions', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'mention', props: { objectId: 'keep-me' } },
            { type: 'mention', props: { objectId: 'remove-me' } },
          ],
        },
      ]);
      const result = blockNoteAdapter.removeMentions(content, 'remove-me');
      const parsed = JSON.parse(result!);

      expect(parsed[0].content).toHaveLength(1);
      expect(parsed[0].content[0].props.objectId).toBe('keep-me');
    });
  });

  describe('blockNoteAdapter.appendMention', () => {
    it('should create new content with mention for null input', () => {
      const result = blockNoteAdapter.appendMention(null, {
        objectId: 'obj-1',
        objectName: 'Test Object',
        objectTypeId: 'task',
      });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('paragraph');
      expect(parsed[0].content[0].type).toBe('mention');
      expect(parsed[0].content[0].props.objectId).toBe('obj-1');
    });

    it('should append mention to existing content', () => {
      const existing = JSON.stringify([
        { type: 'paragraph', content: [{ type: 'text', text: 'Existing' }] },
      ]);
      const result = blockNoteAdapter.appendMention(existing, {
        objectId: 'obj-1',
        objectName: 'New Mention',
        objectTypeId: 'note',
      });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[1].content[0].props.objectName).toBe('New Mention');
    });

    it('should strip trailing empty paragraphs before appending', () => {
      const existing = JSON.stringify([
        { type: 'paragraph', content: [{ type: 'text', text: 'Content' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ]);
      const result = blockNoteAdapter.appendMention(existing, {
        objectId: 'obj-1',
        objectName: 'Mention',
        objectTypeId: 'task',
      });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].content[0].text).toBe('Content');
      expect(parsed[1].content[0].type).toBe('mention');
    });

    it('should handle invalid existing content', () => {
      const result = blockNoteAdapter.appendMention('invalid json', {
        objectId: 'obj-1',
        objectName: 'Test',
        objectTypeId: 'task',
      });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].content[0].props.objectId).toBe('obj-1');
    });
  });

  describe('blockNoteAdapter.isEmpty', () => {
    it('should return true for null', () => {
      expect(blockNoteAdapter.isEmpty(null)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(blockNoteAdapter.isEmpty('')).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(blockNoteAdapter.isEmpty('[]')).toBe(true);
    });

    it('should return true for array with only empty paragraphs', () => {
      const content = JSON.stringify([
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ]);
      expect(blockNoteAdapter.isEmpty(content)).toBe(true);
    });

    it('should return false for content with text', () => {
      const content = JSON.stringify([
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
      ]);
      expect(blockNoteAdapter.isEmpty(content)).toBe(false);
    });

    it('should return false for content with mentions', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'mention', props: { objectId: '1' } }],
        },
      ]);
      expect(blockNoteAdapter.isEmpty(content)).toBe(false);
    });

    it('should return true for invalid JSON', () => {
      expect(blockNoteAdapter.isEmpty('invalid')).toBe(true);
    });
  });

  describe('blockNoteAdapter.serialize', () => {
    it('should stringify blocks', () => {
      const blocks = [{ type: 'paragraph' }];
      expect(blockNoteAdapter.serialize(blocks)).toBe('[{"type":"paragraph"}]');
    });

    it('should handle empty array', () => {
      expect(blockNoteAdapter.serialize([])).toBe('[]');
    });
  });

  describe('blockNoteAdapter.deserialize', () => {
    it('should return undefined for null', () => {
      expect(blockNoteAdapter.deserialize(null)).toBeUndefined();
    });

    it('should parse valid JSON', () => {
      const json = '[{"type":"paragraph"}]';
      const result = blockNoteAdapter.deserialize(json);
      expect(result).toEqual([{ type: 'paragraph' }]);
    });

    it('should return undefined for invalid JSON', () => {
      expect(blockNoteAdapter.deserialize('invalid')).toBeUndefined();
    });

    it('should repair blockquote to quote', () => {
      const json = JSON.stringify([{ type: 'blockquote' }]);
      const result = blockNoteAdapter.deserialize(json);
      expect(result![0]).toHaveProperty('type', 'quote');
    });

    it('should repair incomplete mentions', () => {
      const json = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'mention', props: { objectId: '123' } }],
        },
      ]);
      const result = blockNoteAdapter.deserialize(json) as any[];
      expect(result[0].content[0].props.objectTypeId).toBe('built-in:note');
    });

    it('should convert unsupported image blocks to paragraphs with links', () => {
      const json = JSON.stringify([
        { type: 'image', props: { url: 'http://example.com/img.png' } },
      ]);
      const result = blockNoteAdapter.deserialize(json) as any[];
      expect(result[0].type).toBe('paragraph');
      expect(result[0].content).toContainEqual(
        expect.objectContaining({ type: 'link' })
      );
    });
  });

  describe('round-trip', () => {
    it('should preserve content through serialize/deserialize', () => {
      const original = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              props: {
                objectId: '1',
                objectName: 'Test',
                objectTypeId: 'note',
              },
            },
          ],
        },
      ];
      const serialized = blockNoteAdapter.serialize(original);
      const deserialized = blockNoteAdapter.deserialize(serialized);
      expect(deserialized).toEqual(original);
    });
  });
});
