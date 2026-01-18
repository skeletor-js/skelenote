/**
 * Plain text extraction from BlockNote content
 * Traverses block structure to extract searchable text
 *
 * This module delegates to the EditorContentAdapter for the primary extraction,
 * while maintaining backward-compatible exports for direct block processing.
 */

import { blockNoteAdapter } from '@/lib/editor/adapter';

/**
 * BlockNote inline content types
 */
interface TextInlineContent {
  type: 'text';
  text: string;
  styles?: Record<string, unknown>;
}

interface MentionInlineContent {
  type: 'mention';
  props: {
    objectId: string;
    objectName: string;
    objectTypeId: string;
  };
}

interface LinkInlineContent {
  type: 'link';
  content: InlineContent[];
  href: string;
}

type InlineContent =
  | TextInlineContent
  | MentionInlineContent
  | LinkInlineContent
  | { type: string };

/**
 * BlockNote block structure
 */
interface Block {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineContent[];
  children?: Block[];
}

/**
 * Extract text from inline content array
 */
function extractInlineText(content: InlineContent[] | undefined): string {
  if (!content || !Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      if (item.type === 'text') {
        return (item as TextInlineContent).text;
      }
      if (item.type === 'mention') {
        // Include mention display name in search (with @ prefix)
        return `@${(item as MentionInlineContent).props.objectName}`;
      }
      if (item.type === 'link') {
        // Extract text from link content
        return extractInlineText((item as LinkInlineContent).content);
      }
      return '';
    })
    .join('');
}

/**
 * Extract plain text from a single block
 */
function extractBlockText(block: Block): string {
  const texts: string[] = [];

  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'bulletListItem':
    case 'numberedListItem':
    case 'checkListItem':
    case 'quote':
      // These block types have inline content
      texts.push(extractInlineText(block.content));
      break;

    case 'codeBlock':
      // Code blocks store content in props.code
      if (block.props?.code && typeof block.props.code === 'string') {
        texts.push(block.props.code);
      }
      break;

    case 'table':
      // Tables have rows with cells
      if (block.props?.rows && Array.isArray(block.props.rows)) {
        for (const row of block.props.rows) {
          if (Array.isArray(row.cells)) {
            for (const cell of row.cells) {
              texts.push(extractInlineText(cell));
            }
          }
        }
      }
      break;

    case 'image':
      // Include alt text if available
      if (block.props?.caption && typeof block.props.caption === 'string') {
        texts.push(block.props.caption);
      }
      break;

    // Ignore other block types (divider, etc.)
    default:
      break;
  }

  // Recursively process children
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children) {
      texts.push(extractBlockText(child));
    }
  }

  return texts.filter(Boolean).join('\n');
}

/**
 * Extract plain text from BlockNote document blocks
 * @param blocks - Array of BlockNote blocks
 * @returns Plain text string with content from all blocks
 */
export function extractPlainTextFromBlocks(blocks: Block[]): string {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }

  return blocks
    .map((block) => extractBlockText(block))
    .filter(Boolean)
    .join('\n');
}

/**
 * Extract plain text from serialized BlockNote content string
 * Delegates to EditorContentAdapter for implementation.
 *
 * @param content - JSON string of BlockNote document
 * @returns Plain text string
 */
export function extractPlainTextFromContent(content: string | null): string {
  return blockNoteAdapter.extractPlainText(content);
}
