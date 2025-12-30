/**
 * Daily notes service - core logic for creating and retrieving daily notes
 */

import type { ObjectStore } from '../loro/objects';
import type { SkelenoteObject } from '../types';
import { BuiltInTypeIds } from '../types';
import { formatDateTitle, formatDateId } from './date-utils';
import { applyDailyNoteTemplate } from '../templates';

/**
 * Generate a deterministic ID for a daily note based on the date
 * @example getDailyNoteId(new Date(2024, 11, 25)) → "note-2024-12-25"
 */
export function getDailyNoteId(date: Date): string {
  return `note-${formatDateId(date)}`;
}

/**
 * Extract the date string from a daily note ID
 * @example extractDateFromId("note-2024-12-25") → "2024-12-25"
 */
export function extractDateFromId(id: string): string | null {
  const match = id.match(/^note-(\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}

/**
 * Check if an object is a daily note
 */
export function isDailyNote(obj: SkelenoteObject): boolean {
  return obj.typeId === BuiltInTypeIds.NOTE && obj.properties.isDailyNote === true;
}

/**
 * Get a daily note by date (returns undefined if it doesn't exist)
 */
export function getDailyNoteByDate(store: ObjectStore, date: Date): SkelenoteObject | undefined {
  const id = getDailyNoteId(date);
  const obj = store.get(id);

  // Verify it's actually a daily note
  if (obj && isDailyNote(obj)) {
    return obj;
  }

  return undefined;
}

/**
 * Get the start of day timestamp for a date (midnight)
 */
function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get or create a daily note for the given date
 * - Uses a deterministic ID based on the date
 * - Returns existing note if already created
 * - Creates new note with proper properties if not
 * - Applies daily note template if configured
 */
export function getOrCreateDailyNote(store: ObjectStore, date: Date): SkelenoteObject {
  const id = getDailyNoteId(date);

  // Check if it already exists
  const existing = store.get(id);
  if (existing) {
    return existing;
  }

  // Create new daily note
  const title = formatDateTitle(date);
  const dateTimestamp = getStartOfDay(date);

  const dailyNote = store.create({
    id,
    typeId: BuiltInTypeIds.NOTE,
    properties: {
      title,
      date: dateTimestamp,
      isDailyNote: true,
    },
    inboxed: false, // Daily notes skip the inbox
    withContent: true,
  });

  // Apply daily note template if configured
  applyDailyNoteTemplate(store, dailyNote.id, date);

  return dailyNote;
}

/**
 * Get today's daily note, creating it if it doesn't exist
 */
export function getOrCreateTodaysDailyNote(store: ObjectStore): SkelenoteObject {
  return getOrCreateDailyNote(store, new Date());
}

/**
 * Get all daily notes from the store
 */
export function getAllDailyNotes(store: ObjectStore): SkelenoteObject[] {
  return store.getByType(BuiltInTypeIds.NOTE).filter(isDailyNote);
}

/**
 * Get all daily notes for a specific month
 * Returns a Map with date strings as keys (e.g., "2024-12-25")
 */
export function getDailyNotesForMonth(
  store: ObjectStore,
  year: number,
  month: number
): Map<string, SkelenoteObject> {
  const result = new Map<string, SkelenoteObject>();

  // Get all daily notes
  const dailyNotes = getAllDailyNotes(store);

  // Filter to the specified month
  for (const note of dailyNotes) {
    const dateTimestamp = note.properties.date as number | undefined;
    if (dateTimestamp === undefined) continue;

    const noteDate = new Date(dateTimestamp);
    if (noteDate.getFullYear() === year && noteDate.getMonth() === month) {
      const dateStr = formatDateId(noteDate);
      result.set(dateStr, note);
    }
  }

  return result;
}

/**
 * Navigate to an adjacent daily note (previous or next day)
 * Creates the note if it doesn't exist
 */
export function getAdjacentDailyNote(
  store: ObjectStore,
  currentDate: Date,
  offset: number
): SkelenoteObject {
  const targetDate = new Date(currentDate);
  targetDate.setDate(targetDate.getDate() + offset);
  return getOrCreateDailyNote(store, targetDate);
}
