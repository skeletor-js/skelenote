/**
 * Helper for linking objects to today's daily note
 * Adds relation property and appends inline mention to daily note content
 */

import type { ObjectStore } from '@/lib/loro';
import type { SkelenoteObject } from '@/lib/types';
import { blockNoteAdapter } from '@/lib/editor/adapter';
import { getOrCreateDailyNote, getDailyNoteId } from './daily-notes';

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
 * Append a mention to the daily note's content
 * Delegates to EditorContentAdapter for implementation.
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

  // Append mention using the adapter
  const updatedContent = blockNoteAdapter.appendMention(existingContent, {
    objectId: object.id,
    objectName: getObjectDisplayName(object),
    objectTypeId: object.typeId,
  });

  // Save updated content
  store.setContent(dailyNoteId, updatedContent);
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
