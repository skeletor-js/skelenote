/**
 * BlockNote document persistence utilities
 * Handles serialization/deserialization of editor content
 *
 * This module delegates to the EditorContentAdapter for implementation,
 * maintaining backward-compatible exports.
 */

import type { PartialBlock } from '@blocknote/core';
import { blockNoteAdapter } from './adapter';

// Using PartialBlock[] for block types to support custom schemas
type BlockArray = PartialBlock[];

/**
 * Serialize BlockNote document to JSON string for storage
 */
export function serializeBlockNoteDocument(blocks: BlockArray): string {
  return blockNoteAdapter.serialize(blocks);
}

/**
 * Deserialize stored JSON string to BlockNote blocks
 * Automatically repairs incompatible content (unsupported blocks, incomplete mentions)
 * Returns undefined if data is invalid
 *
 * Delegates to EditorContentAdapter for implementation.
 */
export function deserializeBlockNoteDocument(
  data: string | null
): BlockArray | undefined {
  return blockNoteAdapter.deserialize(data) as BlockArray | undefined;
}

/**
 * Remove all mentions of a specific object from BlockNote content
 * Returns the modified content string, or null if no changes were made
 *
 * Delegates to EditorContentAdapter for implementation.
 */
export function removeMentionsFromContent(
  contentJson: string | null,
  objectIdToRemove: string
): string | null {
  return blockNoteAdapter.removeMentions(contentJson, objectIdToRemove);
}
