import { describe, it, expect } from 'vitest';
import {
  extractWikiLinks,
  preprocessWikiLinks,
  convertWikiLinksToMentions,
  hasWikiLinks,
} from './wiki-links';
import type { BlockNoteBlock, BlockNoteInlineContent } from './types';

describe('Wiki Links', () => {
  describe('extractWikiLinks', () => {
    it('should find simple links', () => {
      const content = 'Check out [[Project Alpha]] tomorrow';
      const links = extractWikiLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('Project Alpha');
      expect(links[0].displayText).toBeUndefined();
    });

    it('should find links with display text', () => {
      const content = 'See [[Project Alpha|Alpha]] for details';
      const links = extractWikiLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('Project Alpha');
      expect(links[0].displayText).toBe('Alpha');
    });

    it('should find multiple links', () => {
      const content = '[[Link 1]] and [[Link 2|Two]]';
      const links = extractWikiLinks(content);
      expect(links).toHaveLength(2);
    });
  });

  describe('preprocessWikiLinks', () => {
    it('should replace links with placeholders', () => {
      const content = 'Link to [[Page]]';
      const processed = preprocessWikiLinks(content);

      expect(processed).toContain('@[Page](skelenote:mention:Page)');
      expect(processed).not.toContain('[[Page]]');
    });

    it('should handle display text in placeholders', () => {
      const content = 'Link to [[Page|My Page]]';
      const processed = preprocessWikiLinks(content);

      expect(processed).toContain('@[My Page](skelenote:mention:Page)');
    });
  });

  describe('convertWikiLinksToMentions', () => {
    it('should convert matching placeholders to mentions', () => {
      const blocks: BlockNoteBlock[] = [
        {
          id: '1',
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'link',
              props: { href: 'skelenote:mention:Target' }, // Correct structure
              content: 'Target',
            } as any,
          ],
          children: [],
        },
      ];

      const resolve = (target: string) => {
        if (target === 'Target') return { id: 'obj-1', typeId: 'note' };
        return null;
      };

      const { blocks: result } = convertWikiLinksToMentions(blocks, resolve);

      const inline = result[0].content as BlockNoteInlineContent[];
      expect(inline[0].type).toBe('mention');
      expect(inline[0].props).toEqual({
        objectId: 'obj-1',
        objectName: 'Target',
        objectTypeId: 'note',
      });
    });

    it('should leave unresolved links as text', () => {
      const blocks: BlockNoteBlock[] = [
        {
          id: '1',
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'link',
              props: { href: 'skelenote:mention:Unknown' }, // Correct structure
              content: 'Unknown',
            } as any,
          ],
          children: [],
        },
      ];

      const { blocks: result, unresolvedLinks } = convertWikiLinksToMentions(
        blocks,
        () => null
      );

      const inline = result[0].content as BlockNoteInlineContent[];
      expect(inline[0].type).toBe('text');
      expect(inline[0].text).toBe('[[Unknown]]');
      expect(unresolvedLinks).toContain('Unknown');
    });
  });

  describe('hasWikiLinks', () => {
    it('should detect links', () => {
      expect(hasWikiLinks('Text [[Link]] text')).toBe(true);
      expect(hasWikiLinks('Text only')).toBe(false);
    });
  });
});
