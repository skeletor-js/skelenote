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
export function deserializeBlockNoteDocument(data: string | null): BlockArray | undefined {
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
