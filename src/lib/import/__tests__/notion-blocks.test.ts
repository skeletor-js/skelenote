import { describe, it, expect } from 'vitest';
import { convertNotionBlocks, blocksToPlainText } from '../notion-blocks';
import type { NotionBlock } from '../notion-api';

// Helper to create a basic Notion block
function createBlock(
  type: string,
  data: Record<string, unknown> = {}
): NotionBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    [type]: data,
  } as NotionBlock;
}

// Helper to create rich text
function createRichText(
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    href?: string;
  } = {}
) {
  return {
    type: 'text',
    plain_text: text,
    href: options.href || null,
    annotations: {
      bold: options.bold || false,
      italic: options.italic || false,
      strikethrough: options.strikethrough || false,
      underline: options.underline || false,
      code: options.code || false,
      color: 'default',
    },
    text: {
      content: text,
      link: options.href ? { url: options.href } : null,
    },
  };
}

describe('notion-blocks', () => {
  describe('convertNotionBlocks', () => {
    it('should convert an empty array', () => {
      const result = convertNotionBlocks([]);
      expect(result).toEqual([]);
    });

    it('should convert multiple blocks', () => {
      const blocks = [
        createBlock('paragraph', {
          rich_text: [createRichText('First paragraph')],
        }),
        createBlock('paragraph', {
          rich_text: [createRichText('Second paragraph')],
        }),
      ];

      const result = convertNotionBlocks(blocks);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('paragraph');
      expect(result[1].type).toBe('paragraph');
    });

    it('should skip unsupported blocks like child_page', () => {
      const blocks = [
        createBlock('paragraph', {
          rich_text: [createRichText('Text')],
        }),
        createBlock('child_page', { title: 'Child Page' }),
      ];

      const result = convertNotionBlocks(blocks);

      expect(result).toHaveLength(1);
    });
  });

  describe('paragraph conversion', () => {
    it('should convert simple paragraph', () => {
      const block = createBlock('paragraph', {
        rich_text: [createRichText('Hello world')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      expect(result[0].content).toHaveLength(1);
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        'Hello world'
      );
    });

    it('should convert empty paragraph', () => {
      const block = createBlock('paragraph', { rich_text: [] });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      expect(result[0].content).toHaveLength(1);
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe('');
    });
  });

  describe('heading conversion', () => {
    it('should convert heading_1 with level 1', () => {
      const block = createBlock('heading_1', {
        rich_text: [createRichText('Main Title')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('heading');
      expect(result[0].props?.level).toBe(1);
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        'Main Title'
      );
    });

    it('should convert heading_2 with level 2', () => {
      const block = createBlock('heading_2', {
        rich_text: [createRichText('Section Title')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('heading');
      expect(result[0].props?.level).toBe(2);
    });

    it('should convert heading_3 with level 3', () => {
      const block = createBlock('heading_3', {
        rich_text: [createRichText('Subsection')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('heading');
      expect(result[0].props?.level).toBe(3);
    });
  });

  describe('list item conversion', () => {
    it('should convert bulleted list item', () => {
      const block = createBlock('bulleted_list_item', {
        rich_text: [createRichText('Bullet item')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('bulletListItem');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        'Bullet item'
      );
    });

    it('should convert numbered list item', () => {
      const block = createBlock('numbered_list_item', {
        rich_text: [createRichText('Numbered item')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('numberedListItem');
    });
  });

  describe('to_do conversion', () => {
    it('should convert unchecked to_do', () => {
      const block = createBlock('to_do', {
        rich_text: [createRichText('Task to do')],
        checked: false,
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('checkListItem');
      expect(result[0].props?.checked).toBe(false);
    });

    it('should convert checked to_do', () => {
      const block = createBlock('to_do', {
        rich_text: [createRichText('Completed task')],
        checked: true,
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('checkListItem');
      expect(result[0].props?.checked).toBe(true);
    });

    it('should default checked to false when missing', () => {
      const block = createBlock('to_do', {
        rich_text: [createRichText('Task')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].props?.checked).toBe(false);
    });
  });

  describe('code block conversion', () => {
    it('should convert code block with language', () => {
      const block = createBlock('code', {
        rich_text: [createRichText('const x = 1;')],
        language: 'javascript',
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('codeBlock');
      expect(result[0].props?.language).toBe('javascript');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        'const x = 1;'
      );
    });

    it('should default to plain language when missing', () => {
      const block = createBlock('code', {
        rich_text: [createRichText('plain code')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].props?.language).toBe('plain');
    });
  });

  describe('quote conversion', () => {
    it('should convert quote block', () => {
      const block = createBlock('quote', {
        rich_text: [createRichText('This is a quote')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('quote');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        'This is a quote'
      );
    });
  });

  describe('callout conversion', () => {
    it('should convert callout with emoji icon', () => {
      const block = createBlock('callout', {
        rich_text: [createRichText('Important note')],
        icon: { type: 'emoji', emoji: '💡' },
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('quote');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        '💡 Important note'
      );
    });

    it('should convert callout without icon', () => {
      const block = createBlock('callout', {
        rich_text: [createRichText('Note without icon')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('quote');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        'Note without icon'
      );
    });

    it('should handle callout with empty content', () => {
      const block = createBlock('callout', {
        rich_text: [],
        icon: { type: 'emoji', emoji: '🔔' },
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('quote');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        '🔔 '
      );
    });
  });

  describe('divider conversion', () => {
    it('should convert divider to text separator', () => {
      const block = createBlock('divider', {});

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        '---'
      );
    });
  });

  describe('table conversion', () => {
    it('should convert table with width', () => {
      const block = createBlock('table', {
        table_width: 3,
        has_column_header: true,
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('table');
      expect(
        (result[0].content as { columnWidths: number[] }).columnWidths
      ).toHaveLength(3);
    });

    it('should default table width to 1', () => {
      const block = createBlock('table', {});

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('table');
      expect(
        (result[0].content as { columnWidths: number[] }).columnWidths
      ).toHaveLength(1);
    });
  });

  describe('toggle conversion', () => {
    it('should convert toggle with indicator', () => {
      const block = createBlock('toggle', {
        rich_text: [createRichText('Toggle content')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      expect((result[0].content as Array<{ text: string }>)[0].text).toBe(
        '▸ Toggle content'
      );
    });

    it('should handle empty toggle', () => {
      const block = createBlock('toggle', { rich_text: [] });

      const result = convertNotionBlocks([block]);

      expect((result[0].content as Array<{ text: string }>)[0].text).toBe('▸ ');
    });
  });

  describe('image conversion', () => {
    it('should convert external image to link', () => {
      const block = createBlock('image', {
        type: 'external',
        external: { url: 'https://example.com/image.png' },
        caption: [],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      const content = result[0].content as Array<{
        type: string;
        props?: { href: string };
      }>;
      expect(content[1].type).toBe('link');
      expect(content[1].props?.href).toBe('https://example.com/image.png');
    });

    it('should convert file image to link', () => {
      const block = createBlock('image', {
        type: 'file',
        file: { url: 'https://s3.amazonaws.com/image.jpg' },
        caption: [],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        type: string;
        props?: { href: string };
      }>;
      expect(content[1].type).toBe('link');
      expect(content[1].props?.href).toBe('https://s3.amazonaws.com/image.jpg');
    });

    it('should use caption as link text when available', () => {
      const block = createBlock('image', {
        type: 'external',
        external: { url: 'https://example.com/image.png' },
        caption: [createRichText('My caption')],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        type: string;
        content?: Array<{ text: string }>;
      }>;
      expect(content[1].content?.[0].text).toBe('My caption');
    });
  });

  describe('bookmark conversion', () => {
    it('should convert bookmark to link', () => {
      const block = createBlock('bookmark', {
        url: 'https://example.com/article',
        caption: [createRichText('Article Title')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      const content = result[0].content as Array<{
        type: string;
        props?: { href: string };
        content?: Array<{ text: string }>;
      }>;
      expect(content[0].type).toBe('link');
      expect(content[0].props?.href).toBe('https://example.com/article');
      expect(content[0].content?.[0].text).toBe('Article Title');
    });

    it('should use URL as caption when caption is empty', () => {
      const block = createBlock('bookmark', {
        url: 'https://example.com',
        caption: [],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        type: string;
        content?: Array<{ text: string }>;
      }>;
      expect(content[0].content?.[0].text).toBe('https://example.com');
    });
  });

  describe('embed conversion', () => {
    it('should convert embed to link', () => {
      const block = createBlock('embed', {
        url: 'https://youtube.com/watch?v=123',
        caption: [createRichText('Video Title')],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      const content = result[0].content as Array<{
        text?: string;
        type: string;
      }>;
      expect(content[0].text).toBe('[Embed: ');
      expect(content[1].type).toBe('link');
    });

    it('should use default caption when empty', () => {
      const block = createBlock('embed', {
        url: 'https://example.com/embed',
        caption: [],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        type: string;
        content?: Array<{ text: string }>;
      }>;
      expect(content[1].content?.[0].text).toBe('Embedded content');
    });
  });

  describe('file block conversion', () => {
    it('should convert external file to link', () => {
      const block = createBlock('file', {
        type: 'external',
        external: { url: 'https://example.com/doc.pdf' },
        name: 'Document',
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        text?: string;
        type: string;
        props?: { href: string };
      }>;
      expect(content[0].text).toBe('[Document: ');
      expect(content[1].props?.href).toBe('https://example.com/doc.pdf');
    });

    it('should convert uploaded file to link', () => {
      const block = createBlock('pdf', {
        type: 'file',
        file: { url: 'https://s3.amazonaws.com/file.pdf' },
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        text?: string;
        props?: { href: string };
      }>;
      expect(content[0].text).toBe('[Pdf: ');
      expect(content[1].props?.href).toBe('https://s3.amazonaws.com/file.pdf');
    });
  });

  describe('equation conversion', () => {
    it('should convert equation to code', () => {
      const block = createBlock('equation', {
        expression: 'E = mc^2',
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].type).toBe('paragraph');
      const content = result[0].content as Array<{
        text: string;
        styles?: { code: boolean };
      }>;
      expect(content[0].text).toBe('$$E = mc^2$$');
      expect(content[0].styles?.code).toBe(true);
    });
  });

  describe('rich text conversion', () => {
    it('should convert bold text', () => {
      const block = createBlock('paragraph', {
        rich_text: [createRichText('Bold text', { bold: true })],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        styles?: { bold: boolean };
      }>;
      expect(content[0].styles?.bold).toBe(true);
    });

    it('should convert italic text', () => {
      const block = createBlock('paragraph', {
        rich_text: [createRichText('Italic text', { italic: true })],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        styles?: { italic: boolean };
      }>;
      expect(content[0].styles?.italic).toBe(true);
    });

    it('should convert strikethrough text', () => {
      const block = createBlock('paragraph', {
        rich_text: [createRichText('Struck text', { strikethrough: true })],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        styles?: { strike: boolean };
      }>;
      expect(content[0].styles?.strike).toBe(true);
    });

    it('should convert code text', () => {
      const block = createBlock('paragraph', {
        rich_text: [createRichText('code', { code: true })],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        styles?: { code: boolean };
      }>;
      expect(content[0].styles?.code).toBe(true);
    });

    it('should convert underlined text', () => {
      const block = createBlock('paragraph', {
        rich_text: [createRichText('underlined', { underline: true })],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        styles?: { underline: boolean };
      }>;
      expect(content[0].styles?.underline).toBe(true);
    });

    it('should convert text with link', () => {
      const block = createBlock('paragraph', {
        rich_text: [
          createRichText('Click here', { href: 'https://example.com' }),
        ],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        type: string;
        props?: { href: string };
      }>;
      expect(content[0].type).toBe('link');
      expect(content[0].props?.href).toBe('https://example.com');
    });

    it('should convert multiple styled text segments', () => {
      const block = createBlock('paragraph', {
        rich_text: [
          createRichText('Normal '),
          createRichText('bold', { bold: true }),
          createRichText(' and '),
          createRichText('italic', { italic: true }),
        ],
      });

      const result = convertNotionBlocks([block]);

      expect(result[0].content).toHaveLength(4);
    });

    it('should convert page mention to Skelenote mention when resolved', () => {
      const pageRelations = new Map([
        [
          'page-123',
          { id: 'skelenote-id', title: 'Referenced Page', typeId: 'note' },
        ],
      ]);

      const block = createBlock('paragraph', {
        rich_text: [
          {
            type: 'mention',
            plain_text: 'Referenced Page',
            href: null,
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default',
            },
            mention: {
              type: 'page',
              page: { id: 'page-123' },
            },
          },
        ],
      });

      const result = convertNotionBlocks([block], pageRelations);

      const content = result[0].content as Array<{
        type: string;
        props?: { objectId: string; objectName: string };
      }>;
      expect(content[0].type).toBe('mention');
      expect(content[0].props?.objectId).toBe('skelenote-id');
      expect(content[0].props?.objectName).toBe('Referenced Page');
    });

    it('should convert unresolved page mention to bracketed text', () => {
      const block = createBlock('paragraph', {
        rich_text: [
          {
            type: 'mention',
            plain_text: 'Unknown Page',
            href: null,
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default',
            },
            mention: {
              type: 'page',
              page: { id: 'page-unknown' },
            },
          },
        ],
      });

      const result = convertNotionBlocks([block]);

      const content = result[0].content as Array<{
        type: string;
        text: string;
      }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toBe('[[Unknown Page]]');
    });
  });

  describe('unsupported blocks', () => {
    it('should skip child_page blocks', () => {
      const blocks = [createBlock('child_page', { title: 'Subpage' })];
      const result = convertNotionBlocks(blocks);
      expect(result).toHaveLength(0);
    });

    it('should skip child_database blocks', () => {
      const blocks = [createBlock('child_database', { title: 'Database' })];
      const result = convertNotionBlocks(blocks);
      expect(result).toHaveLength(0);
    });

    it('should skip synced_block', () => {
      const blocks = [createBlock('synced_block', {})];
      const result = convertNotionBlocks(blocks);
      expect(result).toHaveLength(0);
    });

    it('should skip column_list', () => {
      const blocks = [createBlock('column_list', {})];
      const result = convertNotionBlocks(blocks);
      expect(result).toHaveLength(0);
    });

    it('should convert unknown block type to placeholder', () => {
      const blocks = [createBlock('some_future_block_type', {})];
      const result = convertNotionBlocks(blocks);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
      const content = result[0].content as Array<{
        text: string;
        styles?: { italic: boolean };
      }>;
      expect(content[0].text).toContain('Unsupported block');
      expect(content[0].styles?.italic).toBe(true);
    });
  });

  describe('blocksToPlainText', () => {
    it('should extract plain text from paragraph', () => {
      const blocks = [
        createBlock('paragraph', {
          rich_text: [createRichText('Hello world')],
        }),
      ];

      const result = blocksToPlainText(blocks);

      expect(result).toBe('Hello world');
    });

    it('should join multiple blocks with newlines', () => {
      const blocks = [
        createBlock('paragraph', {
          rich_text: [createRichText('First line')],
        }),
        createBlock('paragraph', {
          rich_text: [createRichText('Second line')],
        }),
      ];

      const result = blocksToPlainText(blocks);

      expect(result).toBe('First line\nSecond line');
    });

    it('should handle blocks without rich_text', () => {
      const blocks = [createBlock('divider', {})];

      const result = blocksToPlainText(blocks);

      expect(result).toBe('');
    });

    it('should concatenate rich text segments', () => {
      const blocks = [
        createBlock('paragraph', {
          rich_text: [createRichText('Hello '), createRichText('world')],
        }),
      ];

      const result = blocksToPlainText(blocks);

      expect(result).toBe('Hello world');
    });

    it('should return empty string for empty blocks', () => {
      const result = blocksToPlainText([]);
      expect(result).toBe('');
    });
  });
});
