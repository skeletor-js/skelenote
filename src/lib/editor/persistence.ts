/**
 * BlockNote document persistence utilities
 * Handles serialization/deserialization of editor content
 */

// Using any[] for block types to support custom schemas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockArray = any[];

/**
 * Serialize BlockNote document to JSON string for storage
 */
export function serializeBlockNoteDocument(blocks: BlockArray): string {
  return JSON.stringify(blocks);
}

// Block types that are disabled in the editor schema
const UNSUPPORTED_BLOCK_TYPES = ['image', 'video', 'audio', 'file'];

/**
 * Repair a block to ensure compatibility with the current schema
 * - Fixes blockquote -> quote (BlockNote uses 'quote' not 'blockquote')
 * - Converts unsupported media blocks to paragraphs with links
 * - Ensures mentions have all required props
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repairBlock(block: any): any {
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
    };
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
 * Deserialize stored JSON string to BlockNote blocks
 * Automatically repairs incompatible content (unsupported blocks, incomplete mentions)
 * Returns undefined if data is invalid
 */
export function deserializeBlockNoteDocument(
  data: string | null
): BlockArray | undefined {
  if (!data) return undefined;

  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      // Repair blocks to ensure compatibility
      return parsed.map(repairBlock);
    }
    return undefined;
  } catch {
    console.warn('Failed to deserialize BlockNote document:', data);
    return undefined;
  }
}

/**
 * Remove all mentions of a specific object from BlockNote content
 * Returns the modified content string, or null if no changes were made
 */
export function removeMentionsFromContent(
  contentJson: string | null,
  objectIdToRemove: string
): string | null {
  if (!contentJson) return null;

  const blocks = deserializeBlockNoteDocument(contentJson);
  if (!blocks) return null;

  let modified = false;

  // Recursively process blocks to remove mentions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function processContent(content: any[]): any[] {
    return content.filter((item) => {
      // If this is a mention of the deleted object, remove it
      if (
        item.type === 'mention' &&
        item.props?.objectId === objectIdToRemove
      ) {
        modified = true;
        return false;
      }
      return true;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function processBlock(block: any): void {
    // Process inline content
    if (Array.isArray(block.content)) {
      block.content = processContent(block.content);
    }

    // Process children blocks recursively
    if (Array.isArray(block.children)) {
      block.children.forEach(processBlock);
    }
  }

  blocks.forEach(processBlock);

  if (!modified) return null;

  return serializeBlockNoteDocument(blocks);
}
