import { describe, it, expect } from 'vitest';
import {
  convertBlockNoteToMarkdown,
  extractFilePathFromUrl,
  extractFileUrls,
  rewriteFileUrls,
} from '../markdown';
import type { BlockNoteBlock } from '../types';

describe('markdown', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // convertBlockNoteToMarkdown
  // ─────────────────────────────────────────────────────────────────────────

  describe('convertBlockNoteToMarkdown', () => {
    const resolveObjectName = (id: string) => {
      const names: Record<string, string> = {
        'obj-1': 'My Note',
        'obj-2': 'Project Alpha',
      };
      return names[id];
    };

    it('should convert paragraph blocks', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('Hello world');
    });

    it('should convert heading blocks', () => {
      const blocks = [
        {
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'heading',
          props: { level: 2 },
          content: [{ type: 'text', text: 'Subtitle' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('## Subtitle');
    });

    it('should convert bullet list items', () => {
      const blocks = [
        {
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'Item 1' }],
        },
        {
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'Item 2' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('- Item 1');
      expect(result.markdown).toContain('- Item 2');
    });

    it('should convert numbered list items', () => {
      const blocks = [
        {
          type: 'numberedListItem',
          content: [{ type: 'text', text: 'First' }],
        },
        {
          type: 'numberedListItem',
          content: [{ type: 'text', text: 'Second' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('1. First');
      expect(result.markdown).toContain('1. Second');
    });

    it('should convert checklist items', () => {
      const blocks = [
        {
          type: 'checkListItem',
          props: { checked: false },
          content: [{ type: 'text', text: 'Todo' }],
        },
        {
          type: 'checkListItem',
          props: { checked: true },
          content: [{ type: 'text', text: 'Done' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('- [ ] Todo');
      expect(result.markdown).toContain('- [x] Done');
    });

    it('should convert code blocks', () => {
      const blocks = [
        {
          type: 'codeBlock',
          props: { language: 'javascript' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('```javascript');
      expect(result.markdown).toContain('const x = 1;');
      expect(result.markdown).toContain('```');
    });

    it('should convert blockquotes', () => {
      const blocks = [
        {
          type: 'blockquote',
          content: [{ type: 'text', text: 'Famous quote' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('> Famous quote');
    });

    it('should convert images', () => {
      const blocks = [
        {
          type: 'image',
          props: { url: 'https://example.com/image.jpg', caption: 'My Image' },
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe(
        '![My Image](https://example.com/image.jpg)'
      );
    });

    it('should prefer sourceUrl over url for images', () => {
      const blocks = [
        {
          type: 'image',
          props: {
            url: 'data:image/png;base64,...',
            sourceUrl: 'https://example.com/real.jpg',
            caption: 'Test',
          },
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('![Test](https://example.com/real.jpg)');
    });

    it('should convert videos as links', () => {
      const blocks = [
        {
          type: 'video',
          props: { url: 'https://example.com/video.mp4', caption: 'My Video' },
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('[My Video](https://example.com/video.mp4)');
    });

    it('should convert audio as links', () => {
      const blocks = [
        {
          type: 'audio',
          props: { url: 'https://example.com/audio.mp3', name: 'Song' },
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('[Song](https://example.com/audio.mp3)');
    });

    it('should convert file blocks as links', () => {
      const blocks = [
        {
          type: 'file',
          props: { url: 'https://example.com/doc.pdf', name: 'Document.pdf' },
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe(
        '[Document.pdf](https://example.com/doc.pdf)'
      );
    });

    it('should handle nested list items', () => {
      const blocks = [
        {
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'Parent' }],
          children: [
            {
              type: 'bulletListItem',
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('- Parent');
      expect(result.markdown).toContain('  - Child');
    });

    // ─── Inline styles ────────────────────────────────────────────────────

    it('should apply bold style', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'bold text', styles: { bold: true } },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('**bold text**');
    });

    it('should apply italic style', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'italic', styles: { italic: true } }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('*italic*');
    });

    it('should apply code style', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'code', styles: { code: true } }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('`code`');
    });

    it('should apply strikethrough style', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'deleted', styles: { strike: true } },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('~~deleted~~');
    });

    it('should apply combined styles', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold italic',
              styles: { bold: true, italic: true },
            },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('***bold italic***');
    });

    // ─── Links ────────────────────────────────────────────────────────────

    it('should convert links', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'link',
              props: { href: 'https://example.com' },
              content: [{ type: 'text', text: 'Click here' }],
            },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('[Click here](https://example.com)');
    });

    // ─── Mentions ─────────────────────────────────────────────────────────

    it('should convert mentions to wiki-links', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Check ' },
            {
              type: 'mention',
              props: { objectId: 'obj-1', objectName: 'Old Name' },
            },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('Check [[My Note]]');
      expect(result.mentionedObjectIds).toContain('obj-1');
    });

    it('should fall back to stored name if object not found', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              props: { objectId: 'unknown', objectName: 'Stored Name' },
            },
          ],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('[[Stored Name]]');
    });

    // ─── Tables ───────────────────────────────────────────────────────────

    it('should convert tables to GFM format', () => {
      const blocks = [
        {
          type: 'table',
          content: {
            type: 'tableContent' as const,
            rows: [
              {
                cells: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Header 1' }],
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Header 2' }],
                  },
                ],
              },
              {
                cells: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Cell 1' }],
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Cell 2' }],
                  },
                ],
              },
            ],
          },
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toContain('| Header 1 | Header 2 |');
      expect(result.markdown).toContain('| --- | --- |');
      expect(result.markdown).toContain('| Cell 1 | Cell 2 |');
    });

    // ─── Edge cases ───────────────────────────────────────────────────────

    it('should handle JSON string input', () => {
      const blocks = [
        { type: 'paragraph', content: [{ type: 'text', text: 'Test' }] },
      ];

      const result = convertBlockNoteToMarkdown(
        JSON.stringify(blocks),
        resolveObjectName
      );

      expect(result.markdown).toBe('Test');
    });

    it('should handle invalid JSON', () => {
      const result = convertBlockNoteToMarkdown(
        'not valid json',
        resolveObjectName
      );

      expect(result.markdown).toBe('');
      expect(result.mentionedObjectIds).toEqual([]);
    });

    it('should handle non-array input', () => {
      const result = convertBlockNoteToMarkdown(
        '{"type": "object"}',
        resolveObjectName
      );

      expect(result.markdown).toBe('');
    });

    it('should handle empty blocks array', () => {
      const result = convertBlockNoteToMarkdown([], resolveObjectName);

      expect(result.markdown).toBe('');
    });

    it('should handle unknown block types by extracting content', () => {
      const blocks = [
        {
          type: 'customBlock',
          content: [{ type: 'text', text: 'Custom content' }],
        },
      ];

      const result = convertBlockNoteToMarkdown(blocks, resolveObjectName);

      expect(result.markdown).toBe('Custom content');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // extractFilePathFromUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractFilePathFromUrl', () => {
    it('should extract path from file:// URLs', () => {
      const url = 'file:///Users/test/image.jpg';
      expect(extractFilePathFromUrl(url)).toBe('/Users/test/image.jpg');
    });

    it('should extract path from asset://localhost URLs', () => {
      const url = 'asset://localhost/path/to/image.jpg';
      expect(extractFilePathFromUrl(url)).toBe('path/to/image.jpg');
    });

    it('should extract path from https://asset.localhost URLs', () => {
      const url = 'https://asset.localhost/C:/path/to/image.jpg';
      expect(extractFilePathFromUrl(url)).toBe('C:/path/to/image.jpg');
    });

    it('should decode URL-encoded paths', () => {
      const url = 'asset://localhost/path/with%20spaces/image.jpg';
      expect(extractFilePathFromUrl(url)).toBe('path/with spaces/image.jpg');
    });

    it('should return null for non-local URLs', () => {
      expect(
        extractFilePathFromUrl('https://example.com/image.jpg')
      ).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // extractFileUrls
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractFileUrls', () => {
    it('should extract local file URLs from image blocks', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { url: 'file:///path/to/image.jpg' },
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toContain('file:///path/to/image.jpg');
    });

    it('should extract local URLs from video blocks', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'video',
          props: { url: 'asset://localhost/video.mp4' },
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toContain('asset://localhost/video.mp4');
    });

    it('should extract local URLs from audio blocks', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'audio',
          props: { url: 'https://asset.localhost/audio.mp3' },
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toContain('https://asset.localhost/audio.mp3');
    });

    it('should extract local URLs from file blocks', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'file',
          props: { url: 'file:///document.pdf' },
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toContain('file:///document.pdf');
    });

    it('should prefer sourceUrl over url', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: {
            url: 'https://cdn.example.com/hosted.jpg',
            sourceUrl: 'file:///local.jpg',
          },
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toContain('file:///local.jpg');
      expect(urls).not.toContain('https://cdn.example.com/hosted.jpg');
    });

    it('should ignore remote URLs', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { url: 'https://example.com/image.jpg' },
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toEqual([]);
    });

    it('should extract URLs from nested children', () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'bulletListItem',
          content: [],
          children: [
            {
              type: 'image',
              props: { url: 'file:///nested.jpg' },
            },
          ],
        },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toContain('file:///nested.jpg');
    });

    it('should deduplicate URLs', () => {
      const blocks: BlockNoteBlock[] = [
        { type: 'image', props: { url: 'file:///same.jpg' } },
        { type: 'image', props: { url: 'file:///same.jpg' } },
      ];

      const urls = extractFileUrls(blocks);

      expect(urls).toEqual(['file:///same.jpg']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // rewriteFileUrls
  // ─────────────────────────────────────────────────────────────────────────

  describe('rewriteFileUrls', () => {
    it('should replace file URLs with relative paths', () => {
      const markdown = '![Image](file:///path/to/image.jpg)';
      const urlMap = new Map([
        ['file:///path/to/image.jpg', './attachments/image.jpg'],
      ]);

      const result = rewriteFileUrls(markdown, urlMap);

      expect(result).toBe('![Image](./attachments/image.jpg)');
    });

    it('should replace multiple occurrences', () => {
      const markdown =
        'Start ![](file:///img.jpg) middle ![](file:///img.jpg) end';
      const urlMap = new Map([['file:///img.jpg', './img.jpg']]);

      const result = rewriteFileUrls(markdown, urlMap);

      expect(result).toBe('Start ![](./img.jpg) middle ![](./img.jpg) end');
    });

    it('should handle multiple different URLs', () => {
      const markdown = '![A](file:///a.jpg) and ![B](file:///b.jpg)';
      const urlMap = new Map([
        ['file:///a.jpg', './a.jpg'],
        ['file:///b.jpg', './b.jpg'],
      ]);

      const result = rewriteFileUrls(markdown, urlMap);

      expect(result).toBe('![A](./a.jpg) and ![B](./b.jpg)');
    });

    it('should return original markdown if no URLs to replace', () => {
      const markdown = '![Image](https://example.com/image.jpg)';
      const urlMap = new Map<string, string>();

      const result = rewriteFileUrls(markdown, urlMap);

      expect(result).toBe(markdown);
    });
  });
});
