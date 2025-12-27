/**
 * Helper for linking objects to today's daily note
 * Adds relation property and appends inline mention to daily note content
 */

import type { ObjectStore } from '@/lib/loro';
import type { SkelenoteObject } from '@/lib/types';
import { getOrCreateDailyNote, getDailyNoteId } from './daily-notes';

/**
 * Block structure for a paragraph with a mention
 */
interface MentionBlock {
  type: 'paragraph';
  content: Array<{
    type: 'mention';
    props: {
      objectId: string;
      objectName: string;
      objectTypeId: string;
    };
  }>;
}

/**
 * Get the display name for an object based on its type
 */
function getObjectDisplayName(object: SkelenoteObject): string {
  const title = object.properties.title as string | undefined;
  const name = object.properties.name as string | undefined;
  const url = object.properties.url as string | undefined;
  return title ?? name ?? url ?? object.id;
}

/**
 * Create a mention block for an object
 */
function createMentionBlock(object: SkelenoteObject): MentionBlock {
  return {
    type: 'paragraph',
    content: [
      {
        type: 'mention',
        props: {
          objectId: object.id,
          objectName: getObjectDisplayName(object),
          objectTypeId: object.typeId,
        },
      },
    ],
  };
}

/**
 * Check if a block is empty (no content or only empty content)
 */
function isEmptyBlock(block: unknown): boolean {
  if (!block || typeof block !== 'object') return true;
  const b = block as { type?: string; content?: unknown[] };
  if (b.type === 'paragraph') {
    // Empty if no content array or content is empty/only whitespace
    if (!b.content || !Array.isArray(b.content) || b.content.length === 0) {
      return true;
    }
    // Check if content is only whitespace text
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
 * Append a mention to the daily note's content
 */
function appendMentionToContent(
  store: ObjectStore,
  dailyNoteId: string,
  object: SkelenoteObject
): void {
  // Get existing content
  let existingContent: string | null = null;
  try {
    existingContent = store.getContent(dailyNoteId);
  } catch {
    // Content may not exist yet
  }

  // Parse existing blocks or start with empty array
  let blocks: unknown[] = [];
  if (existingContent) {
    try {
      const parsed = JSON.parse(existingContent);
      if (Array.isArray(parsed)) {
        // Filter out trailing empty blocks to prevent extra line breaks
        blocks = parsed;
        while (blocks.length > 0 && isEmptyBlock(blocks[blocks.length - 1])) {
          blocks.pop();
        }
      }
    } catch {
      // Invalid content, start fresh
    }
  }

  // Create mention block and append
  const mentionBlock = createMentionBlock(object);
  blocks.push(mentionBlock);

  // Save updated content
  store.setContent(dailyNoteId, JSON.stringify(blocks));
}

/**
 * Link an object to today's daily note
 *
 * This function:
 * 1. Gets or creates today's daily note
 * 2. Sets the 'dailyNote' relation property on the object
 * 3. Appends an inline mention of the object to the daily note's content
 *
 * @param store - The object store
 * @param object - The object to link to today's daily note
 * @returns The daily note that was linked to
 */
export function linkObjectToDaily(
  store: ObjectStore,
  object: SkelenoteObject
): SkelenoteObject {
  const today = new Date();
  const dailyNote = getOrCreateDailyNote(store, today);

  // Set the dailyNote relation on the object
  store.setProperty(object.id, 'dailyNote', [dailyNote.id]);

  // Append mention to daily note content
  appendMentionToContent(store, dailyNote.id, object);

  return dailyNote;
}

/**
 * Check if an object is already linked to today's daily note
 */
export function isLinkedToToday(object: SkelenoteObject): boolean {
  const dailyNoteRelation = object.properties.dailyNote;
  if (!Array.isArray(dailyNoteRelation) || dailyNoteRelation.length === 0) {
    return false;
  }

  const todaysDailyNoteId = getDailyNoteId(new Date());
  return dailyNoteRelation.includes(todaysDailyNoteId);
}
