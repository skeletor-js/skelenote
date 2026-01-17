/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { getWelcomeNoteBlocks } from '../welcome-content';

describe('lib/first-run/welcome-content', () => {
  describe('getWelcomeNoteBlocks', () => {
    it('should return an array of blocks', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-1', 'Monday, January 15');
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should have heading block with welcome message', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-1', 'Monday, January 15');
      const headingBlock = blocks.find(
        (b: any) => b.type === 'heading' && b.props?.level === 2
      );
      expect(headingBlock).toBeDefined();

      expect((headingBlock as any).content[0].text).toBe(
        'Welcome to skelenote'
      );
    });

    it('should include mention of daily note', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-id', 'Today');

      const blockWithMention = blocks.find((b: any) =>
        b.content?.some((c: any) => c.type === 'mention')
      );
      expect(blockWithMention).toBeDefined();

      const mention = (blockWithMention as any).content.find(
        (c: any) => c.type === 'mention'
      );
      expect(mention.props.objectId).toBe('daily-note-id');
      expect(mention.props.objectName).toBe('Today');
    });

    it('should include keyboard shortcut instructions', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-1', 'Monday, January 15');
      const blocksJson = JSON.stringify(blocks);

      // Check for common shortcuts mentioned
      expect(blocksJson).toContain('Cmd+N');
      expect(blocksJson).toContain('Cmd+K');
    });

    it('should have multiple sections with headings', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-1', 'Monday, January 15');

      const headings = blocks.filter((b: any) => b.type === 'heading');
      expect(headings.length).toBeGreaterThan(3);
    });

    it('should have unique ids for all blocks', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-1', 'Monday, January 15');

      const ids = blocks.map((b: any) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should cover key concepts', () => {
      const blocks = getWelcomeNoteBlocks('daily-note-1', 'Monday, January 15');
      const blocksJson = JSON.stringify(blocks);

      expect(blocksJson).toContain('Inbox');
      expect(blocksJson).toContain('Daily Notes');
      expect(blocksJson).toContain('mention');
      expect(blocksJson).toContain('Command Palette');
    });
  });
});
