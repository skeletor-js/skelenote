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

/**
 * Deserialize stored JSON string to BlockNote blocks
 * Returns undefined if data is invalid
 */
export function deserializeBlockNoteDocument(
  data: string | null
): BlockArray | undefined {
  if (!data) return undefined;

  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
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
