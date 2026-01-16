import { describe, it, expect } from 'vitest';
import * as persistence from '../persistence';

describe('Editor Persistence', () => {
  describe('serializeBlockNoteDocument', () => {
    it('should stringify blocks', () => {
      const blocks = [{ type: 'paragraph' }];
      expect(persistence.serializeBlockNoteDocument(blocks)).toBe(
        '[{"type":"paragraph"}]'
      );
    });
  });

  describe('deserializeBlockNoteDocument', () => {
    it('should parse valid JSON', () => {
      const json = '[{"type":"paragraph"}]';
      const result = persistence.deserializeBlockNoteDocument(json);
      expect(result).toEqual([{ type: 'paragraph' }]);
    });

    it('should return undefined for invalid JSON', () => {
      const result = persistence.deserializeBlockNoteDocument('invalid');
      expect(result).toBeUndefined();
    });

    it('should repair unsupported blocks', () => {
      const json = JSON.stringify([
        {
          type: 'image',
          props: { url: 'http://example.com/img.png' },
        },
      ]);
      const result = persistence.deserializeBlockNoteDocument(json);
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('paragraph');
      // Should contain link to image
    });

    it('should repair blockquote to quote', () => {
      const json = JSON.stringify([{ type: 'blockquote' }]);
      const result = persistence.deserializeBlockNoteDocument(json);
      expect(result![0].type).toBe('quote');
    });

    it('should repair incomplete mentions', () => {
      const json = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              props: { objectId: '123' }, // missing objectTypeId
            },
          ],
        },
      ]);
      const result = persistence.deserializeBlockNoteDocument(json);
      const mention = result![0].content[0];
      expect(mention.props.objectTypeId).toBe('built-in:note');
    });
  });

  describe('removeMentionsFromContent', () => {
    it('should remove mentions of specific object', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', props: { objectId: 'remove-me' } },
            { type: 'text', text: ' world' },
          ],
        },
      ];
      const json = JSON.stringify(blocks);

      const result = persistence.removeMentionsFromContent(json, 'remove-me');
      const parsed = JSON.parse(result!);

      expect(parsed[0].content).toHaveLength(2);
      expect(parsed[0].content[1].text).toBe(' world');
    });

    it('should return null if no changes', () => {
      const blocks = [{ type: 'paragraph', content: [] }];
      const json = JSON.stringify(blocks);
      expect(
        persistence.removeMentionsFromContent(json, 'other-id')
      ).toBeNull();
    });
  });
});
