/**
 * Notion Block to BlockNote Converter
 *
 * Converts Notion API block objects to BlockNote format for storage in Skelenote.
 * Uses the simplified NotionBlock type from our direct API client.
 */

import type { NotionBlock } from './notion-api';
import type {
  BlockNoteBlock,
  BlockNoteInlineContent,
  TableContent,
} from '../export/types';

/**
 * Rich text from Notion API
 */
interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  text?: {
    content: string;
    link: { url: string } | null;
  };
  mention?: {
    type: 'page' | 'database' | 'user' | 'date' | 'link_preview';
    page?: { id: string };
    database?: { id: string };
    user?: { id: string; name?: string };
    date?: { start: string; end?: string };
  };
}

/**
 * Helper to get block data by type
 */
function getBlockData(block: NotionBlock): Record<string, unknown> | undefined {
  return block[block.type] as Record<string, unknown> | undefined;
}

/**
 * Helper to get rich_text from block data
 */
function getRichText(
  blockData: Record<string, unknown> | undefined
): NotionRichText[] {
  if (!blockData) return [];
  return (blockData.rich_text as NotionRichText[]) ?? [];
}

/**
 * Convert an array of Notion blocks to BlockNote format
 */
export function convertNotionBlocks(
  blocks: NotionBlock[],
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock[] {
  const result: BlockNoteBlock[] = [];

  for (const block of blocks) {
    const converted = convertBlock(block, pageRelations);
    if (converted) {
      result.push(converted);
    }
  }

  return result;
}

/**
 * Convert a single Notion block to BlockNote format
 */
function convertBlock(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock | null {
  const blockType = block.type;

  switch (blockType) {
    case 'paragraph':
      return convertParagraph(block, pageRelations);

    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      return convertHeading(block, pageRelations);

    case 'bulleted_list_item':
      return convertBulletListItem(block, pageRelations);

    case 'numbered_list_item':
      return convertNumberedListItem(block, pageRelations);

    case 'to_do':
      return convertToDo(block, pageRelations);

    case 'code':
      return convertCode(block);

    case 'quote':
      return convertQuote(block, pageRelations);

    case 'callout':
      return convertCallout(block, pageRelations);

    case 'divider':
      return convertDivider();

    case 'table':
      return convertTable(block);

    case 'toggle':
      return convertToggle(block, pageRelations);

    case 'image':
      return convertImage(block);

    case 'bookmark':
      return convertBookmark(block);

    case 'embed':
      return convertEmbed(block);

    case 'file':
    case 'pdf':
    case 'video':
    case 'audio':
      return convertFileBlock(block);

    case 'equation':
      return convertEquation(block);

    // Blocks we skip or can't convert
    case 'child_page':
    case 'child_database':
    case 'synced_block':
    case 'template':
    case 'link_to_page':
    case 'breadcrumb':
    case 'column_list':
    case 'column':
    case 'table_of_contents':
      return null;

    default:
      // Unknown block type - convert to paragraph with placeholder
      return {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: `[Unsupported block: ${blockType}]`,
            styles: { italic: true },
          },
        ],
      };
  }
}

/**
 * Convert paragraph block
 */
function convertParagraph(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  return {
    type: 'paragraph',
    content: convertRichText(getRichText(data), pageRelations),
  };
}

/**
 * Convert heading blocks (1, 2, 3)
 */
function convertHeading(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  const richText = getRichText(data);

  let level: 1 | 2 | 3 = 1;
  if (block.type === 'heading_2') level = 2;
  else if (block.type === 'heading_3') level = 3;

  return {
    type: 'heading',
    props: { level },
    content: convertRichText(richText, pageRelations),
  };
}

/**
 * Convert bulleted list item
 */
function convertBulletListItem(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  return {
    type: 'bulletListItem',
    content: convertRichText(getRichText(data), pageRelations),
  };
}

/**
 * Convert numbered list item
 */
function convertNumberedListItem(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  return {
    type: 'numberedListItem',
    content: convertRichText(getRichText(data), pageRelations),
  };
}

/**
 * Convert to-do (checkbox) item
 */
function convertToDo(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  return {
    type: 'checkListItem',
    props: { checked: (data?.checked as boolean) ?? false },
    content: convertRichText(getRichText(data), pageRelations),
  };
}

/**
 * Convert code block
 */
function convertCode(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const richText = getRichText(data);
  const text = richText.map((t) => t.plain_text).join('');
  const language = (data?.language as string) || 'plain';

  return {
    type: 'codeBlock',
    props: { language },
    content: [{ type: 'text', text }],
  };
}

/**
 * Convert quote block
 */
function convertQuote(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  return {
    type: 'quote',
    content: convertRichText(getRichText(data), pageRelations),
  };
}

/**
 * Convert callout block to blockquote with icon prefix
 */
function convertCallout(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  const icon = data?.icon as { type: string; emoji?: string } | undefined;
  const iconText = icon?.type === 'emoji' && icon.emoji ? icon.emoji + ' ' : '';

  const content = convertRichText(getRichText(data), pageRelations);

  // Prepend icon as text
  if (iconText && content.length > 0 && content[0].type === 'text') {
    content[0].text = iconText + (content[0].text || '');
  } else if (iconText) {
    content.unshift({ type: 'text', text: iconText });
  }

  return {
    type: 'quote',
    content,
  };
}

/**
 * Convert divider to paragraph with horizontal rule text
 */
function convertDivider(): BlockNoteBlock {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text: '---' }],
  };
}

/**
 * Convert table block
 * Note: Table rows come as separate child blocks, not in this block
 */
function convertTable(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const tableWidth = (data?.table_width as number) || 1;

  // Table content will be populated by table_row children
  const tableContent: TableContent = {
    type: 'tableContent',
    columnWidths: Array(tableWidth).fill(100),
    rows: [],
  };

  return {
    type: 'table',
    content: tableContent,
  };
}

/**
 * Convert toggle block to paragraph (flattened)
 */
function convertToggle(
  block: NotionBlock,
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteBlock {
  const data = getBlockData(block);
  const content = convertRichText(getRichText(data), pageRelations);

  // Add toggle indicator
  if (content.length > 0 && content[0].type === 'text') {
    content[0].text = '▸ ' + (content[0].text || '');
  } else {
    content.unshift({ type: 'text', text: '▸ ' });
  }

  return {
    type: 'paragraph',
    content,
  };
}

/**
 * Convert image block to paragraph with link
 * (Image blocks are disabled in the editor schema due to Tauri asset:// URL issues)
 */
function convertImage(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const imageType = data?.type as string;
  let url = '';

  if (imageType === 'external') {
    url = (data?.external as { url: string })?.url || '';
  } else if (imageType === 'file') {
    url = (data?.file as { url: string })?.url || '';
  }

  const caption =
    (data?.caption as NotionRichText[])?.map((t) => t.plain_text).join('') ||
    '';

  // Convert to paragraph with link since image blocks are disabled
  const linkText = caption || url.split('/').pop() || 'Image';
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: '[Image: ' },
      {
        type: 'link',
        content: [{ type: 'text', text: linkText }],
        props: { href: url },
      },
      { type: 'text', text: ']' },
    ],
  };
}

/**
 * Convert bookmark block to paragraph with link
 */
function convertBookmark(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const url = (data?.url as string) || '';
  const caption =
    (data?.caption as NotionRichText[])?.map((t) => t.plain_text).join('') ||
    url;

  return {
    type: 'paragraph',
    content: [
      {
        type: 'link',
        content: [{ type: 'text', text: caption }],
        props: { href: url },
      },
    ],
  };
}

/**
 * Convert embed block to paragraph with link
 */
function convertEmbed(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const url = (data?.url as string) || '';
  const caption =
    (data?.caption as NotionRichText[])?.map((t) => t.plain_text).join('') ||
    'Embedded content';

  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: '[Embed: ' },
      {
        type: 'link',
        content: [{ type: 'text', text: caption }],
        props: { href: url },
      },
      { type: 'text', text: ']' },
    ],
  };
}

/**
 * Convert file/pdf/video/audio blocks to paragraph with link
 */
function convertFileBlock(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const fileType = data?.type as string;
  let url = '';

  if (fileType === 'external') {
    url = (data?.external as { url: string })?.url || '';
  } else if (fileType === 'file') {
    url = (data?.file as { url: string })?.url || '';
  }

  const name =
    (data?.name as string) ||
    block.type.charAt(0).toUpperCase() + block.type.slice(1);

  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: `[${name}: ` },
      {
        type: 'link',
        content: [{ type: 'text', text: url.split('/').pop() || 'Download' }],
        props: { href: url },
      },
      { type: 'text', text: ']' },
    ],
  };
}

/**
 * Convert equation block
 */
function convertEquation(block: NotionBlock): BlockNoteBlock {
  const data = getBlockData(block);
  const expression = (data?.expression as string) || '';

  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: `$$${expression}$$`,
        styles: { code: true },
      },
    ],
  };
}

/**
 * Convert Notion rich text array to BlockNote inline content
 */
function convertRichText(
  richText: NotionRichText[],
  pageRelations?: Map<string, { id: string; title: string; typeId: string }>
): BlockNoteInlineContent[] {
  const result: BlockNoteInlineContent[] = [];

  for (const item of richText) {
    // Handle mentions (page references)
    if (
      item.type === 'mention' &&
      item.mention?.type === 'page' &&
      item.mention.page
    ) {
      const pageId = item.mention.page.id;
      const resolved = pageRelations?.get(pageId);

      if (resolved) {
        // Create a Skelenote mention
        result.push({
          type: 'mention',
          props: {
            objectId: resolved.id,
            objectName: resolved.title,
            objectTypeId: resolved.typeId,
          },
        });
      } else {
        // Unresolved - convert to plain text with brackets
        result.push({
          type: 'text',
          text: `[[${item.plain_text}]]`,
          styles: buildStyles(item.annotations),
        });
      }
      continue;
    }

    // Handle links
    if (item.href || item.text?.link) {
      const href = item.href || item.text?.link?.url || '';
      result.push({
        type: 'link',
        content: [
          {
            type: 'text',
            text: item.plain_text,
          },
        ],
        props: { href },
        styles: buildStyles(item.annotations),
      });
      continue;
    }

    // Regular text
    result.push({
      type: 'text',
      text: item.plain_text,
      styles: buildStyles(item.annotations),
    });
  }

  // Ensure at least empty content
  if (result.length === 0) {
    result.push({ type: 'text', text: '' });
  }

  return result;
}

/**
 * Build BlockNote styles from Notion annotations
 */
function buildStyles(
  annotations: NotionRichText['annotations']
): Record<string, boolean | string> | undefined {
  if (!annotations) return undefined;

  const styles: Record<string, boolean | string> = {};

  if (annotations.bold) styles.bold = true;
  if (annotations.italic) styles.italic = true;
  if (annotations.strikethrough) styles.strike = true;
  if (annotations.code) styles.code = true;
  if (annotations.underline) styles.underline = true;

  return Object.keys(styles).length > 0 ? styles : undefined;
}

/**
 * Extract plain text from an array of Notion blocks
 * Useful for generating summaries or fallback content
 */
export function blocksToPlainText(blocks: NotionBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const data = getBlockData(block);
    const richText = getRichText(data);
    if (richText.length > 0) {
      lines.push(richText.map((t) => t.plain_text).join(''));
    }
  }

  return lines.join('\n');
}
