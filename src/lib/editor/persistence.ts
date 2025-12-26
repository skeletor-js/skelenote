/**
 * BlockNote document persistence utilities
 * Handles serialization/deserialization of editor content
 */

import type { Block } from '@blocknote/core';

/**
 * Serialize BlockNote document to JSON string for storage
 */
export function serializeBlockNoteDocument(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

/**
 * Deserialize stored JSON string to BlockNote blocks
 * Returns empty array if data is invalid
 */
export function deserializeBlockNoteDocument(data: string | null): Block[] | undefined {
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
