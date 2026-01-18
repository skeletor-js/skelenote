/**
 * EditorContentAdapter - Abstracts editor content structure from core domain
 *
 * This interface allows the domain logic (relations, backlinks, search) to work
 * with editor content without coupling to BlockNote's specific JSON schema.
 * The default implementation uses BlockNote, but this abstraction supports
 * future migration to other editors.
 */

import type { PartialBlock } from '@blocknote/core';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (Editor-Agnostic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents an @mention reference in content
 */
export interface ContentMention {
  objectId: string;
  objectName: string;
  objectTypeId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTER INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EditorContentAdapter interface - can be implemented for different editors
 */
export interface EditorContentAdapter {
  /**
   * Extract all mention object IDs from serialized content
   * @param content - JSON string of editor content (or null)
   * @returns Array of object IDs that are mentioned
   */
  extractMentionIds(content: string | null): string[];

  /**
   * Extract plain text from content for search indexing
   * @param content - JSON string of editor content (or null)
   * @returns Plain text string
   */
  extractPlainText(content: string | null): string;

  /**
   * Remove all mentions of a specific object from content
   * @param content - JSON string of editor content
   * @param objectId - The object ID to remove mentions of
   * @returns Modified content string, or null if no changes were made
   */
  removeMentions(content: string | null, objectId: string): string | null;

  /**
   * Append a mention block to existing content
   * @param content - Existing content JSON string (or null)
   * @param mention - The mention to append
   * @returns Updated content JSON string
   */
  appendMention(content: string | null, mention: ContentMention): string;

  /**
   * Check if content is empty (no meaningful text/blocks)
   * @param content - JSON string of editor content (or null)
   * @returns true if content is effectively empty
   */
  isEmpty(content: string | null): boolean;

  /**
   * Serialize blocks to JSON string (for storage)
   * @param blocks - Raw block array
   * @returns JSON string
   */
  serialize(blocks: unknown[]): string;

  /**
   * Deserialize JSON string to blocks (with repairs)
   * @param content - JSON string
   * @returns Block array or undefined if invalid
   */
  deserialize(content: string | null): unknown[] | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKNOTE IMPLEMENTATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Block types that are disabled in the editor schema
const UNSUPPORTED_BLOCK_TYPES = ['image', 'video', 'audio', 'file'];

/**
 * Repair a block to ensure compatibility with the current schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repairBlock(block: any): PartialBlock {
  // Fix incorrect block type: blockquote -> quote
  if (block.type === 'blockquote') {
    block.type = 'quote';
  }

  // Convert unsupported block types to paragraph with link
  if (UNSUPPORTED_BLOCK_TYPES.includes(block.type)) {
    const url = block.props?.url || block.props?.href || '';
    const caption = block.props?.caption || '';
    const linkText = caption || url.split('/').pop() || block.type;

    return {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `[${block.type.charAt(0).toUpperCase() + block.type.slice(1)}: `,
        },
        {
          type: 'link',
          content: [{ type: 'text', text: linkText }],
          props: { href: url },
        },
        { type: 'text', text: ']' },
      ],
      children: block.children ? block.children.map(repairBlock) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as PartialBlock;
  }

  // Repair inline content (mentions)
  if (Array.isArray(block.content)) {
    block.content = block.content.map((item: Record<string, unknown>) => {
      if (item.type === 'mention' && item.props) {
        const props = item.props as Record<string, unknown>;
        // Ensure objectTypeId exists
        if (!props.objectTypeId) {
          return {
            ...item,
            props: {
              ...props,
              objectTypeId: 'built-in:note', // Default fallback
            },
          };
        }
      }
      return item;
    });
  }

  // Recursively repair children
  if (Array.isArray(block.children)) {
    block.children = block.children.map(repairBlock);
  }

  return block;
}

/**
 * Check if a block is empty (no content or only empty content)
 */
function isEmptyBlock(block: unknown): boolean {
  if (!block || typeof block !== 'object') return true;
  const b = block as { type?: string; content?: unknown[] };
  if (b.type === 'paragraph') {
    if (!b.content || !Array.isArray(b.content) || b.content.length === 0) {
      return true;
    }
    if (b.content.length === 1) {
      const item = b.content[0] as { type?: string; text?: string };
      if (item.type === 'text' && (!item.text || item.text.trim() === '')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract text from inline content array
 */
function extractInlineText(content: unknown[] | undefined): string {
  if (!content || !Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      const typed = item as Record<string, unknown>;
      if (typed.type === 'text') {
        return typed.text as string;
      }
      if (typed.type === 'mention') {
        const props = typed.props as { objectName?: string } | undefined;
        return `@${props?.objectName ?? ''}`;
      }
      if (typed.type === 'link') {
        return extractInlineText(typed.content as unknown[]);
      }
      return '';
    })
    .join('');
}

/**
 * Extract plain text from a single block
 */
function extractBlockText(block: Record<string, unknown>): string {
  const texts: string[] = [];

  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'bulletListItem':
    case 'numberedListItem':
    case 'checkListItem':
    case 'quote':
      texts.push(extractInlineText(block.content as unknown[]));
      break;

    case 'codeBlock': {
      const props = block.props as Record<string, unknown> | undefined;
      if (props?.code && typeof props.code === 'string') {
        texts.push(props.code);
      }
      break;
    }

    case 'table': {
      const props = block.props as Record<string, unknown> | undefined;
      if (props?.rows && Array.isArray(props.rows)) {
        for (const row of props.rows as Record<string, unknown>[]) {
          if (Array.isArray(row.cells)) {
            for (const cell of row.cells as unknown[]) {
              texts.push(extractInlineText(cell as unknown[]));
            }
          }
        }
      }
      break;
    }

    case 'image': {
      const props = block.props as Record<string, unknown> | undefined;
      if (props?.caption && typeof props.caption === 'string') {
        texts.push(props.caption);
      }
      break;
    }

    default:
      break;
  }

  // Recursively process children
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children as Record<string, unknown>[]) {
      texts.push(extractBlockText(child));
    }
  }

  return texts.filter(Boolean).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT BLOCKNOTE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BlockNote implementation of EditorContentAdapter
 * This is the default adapter used throughout the application.
 */
export const blockNoteAdapter: EditorContentAdapter = {
  extractMentionIds(content: string | null): string[] {
    if (!content) return [];

    try {
      const blocks = JSON.parse(content);
      const mentions: string[] = [];

      function searchBlocks(items: unknown[]): void {
        for (const item of items) {
          if (typeof item !== 'object' || item === null) continue;

          const block = item as Record<string, unknown>;

          // Check if this is a mention inline content
          if (block.type === 'mention' && block.props) {
            const props = block.props as Record<string, unknown>;
            if (typeof props.objectId === 'string') {
              mentions.push(props.objectId);
            }
          }

          // Search in content array (inline content)
          if (Array.isArray(block.content)) {
            searchBlocks(block.content);
          }

          // Search in children array (nested blocks)
          if (Array.isArray(block.children)) {
            searchBlocks(block.children);
          }
        }
      }

      if (Array.isArray(blocks)) {
        searchBlocks(blocks);
      }

      return mentions;
    } catch {
      return [];
    }
  },

  extractPlainText(content: string | null): string {
    if (!content) {
      return '';
    }

    const blocks = blockNoteAdapter.deserialize(content);
    if (!blocks || !Array.isArray(blocks)) {
      return '';
    }

    return blocks
      .map((block) => extractBlockText(block as Record<string, unknown>))
      .filter(Boolean)
      .join('\n');
  },

  removeMentions(content: string | null, objectId: string): string | null {
    if (!content) return null;

    const blocks = blockNoteAdapter.deserialize(content);
    if (!blocks) return null;

    let modified = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function processContent(contentArr: any[]): any[] {
      return contentArr.filter((item) => {
        if (item.type === 'mention' && item.props?.objectId === objectId) {
          modified = true;
          return false;
        }
        return true;
      });
    }

    function processBlock(block: PartialBlock): void {
      if (Array.isArray(block.content)) {
        block.content = processContent(block.content);
      }
      if (Array.isArray(block.children)) {
        block.children.forEach(processBlock);
      }
    }

    (blocks as PartialBlock[]).forEach(processBlock);

    if (!modified) return null;

    return blockNoteAdapter.serialize(blocks);
  },

  appendMention(content: string | null, mention: ContentMention): string {
    let blocks: unknown[] = [];

    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          blocks = parsed;
          // Filter out trailing empty blocks
          while (blocks.length > 0 && isEmptyBlock(blocks[blocks.length - 1])) {
            blocks.pop();
          }
        }
      } catch {
        // Invalid content, start fresh
      }
    }

    // Create mention block
    const mentionBlock = {
      type: 'paragraph',
      content: [
        {
          type: 'mention',
          props: {
            objectId: mention.objectId,
            objectName: mention.objectName,
            objectTypeId: mention.objectTypeId,
          },
        },
      ],
    };

    blocks.push(mentionBlock);

    return blockNoteAdapter.serialize(blocks);
  },

  isEmpty(content: string | null): boolean {
    if (!content) return true;

    try {
      const blocks = JSON.parse(content);
      if (!Array.isArray(blocks) || blocks.length === 0) return true;

      // Check if all blocks are empty
      return blocks.every(isEmptyBlock);
    } catch {
      return true;
    }
  },

  serialize(blocks: unknown[]): string {
    return JSON.stringify(blocks);
  },

  deserialize(content: string | null): unknown[] | undefined {
    if (!content) return undefined;

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map(repairBlock);
      }
      return undefined;
    } catch {
      console.warn('Failed to deserialize BlockNote document:', content);
      return undefined;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD-COMPATIBLE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all mentioned object IDs from BlockNote content JSON
 * @deprecated Use blockNoteAdapter.extractMentionIds instead
 */
export function extractMentionsFromContent(content: string | null): string[] {
  return blockNoteAdapter.extractMentionIds(content);
}

/**
 * Extract plain text from serialized BlockNote content string
 * @deprecated Use blockNoteAdapter.extractPlainText instead
 */
export function extractPlainTextFromContent(content: string | null): string {
  return blockNoteAdapter.extractPlainText(content);
}
