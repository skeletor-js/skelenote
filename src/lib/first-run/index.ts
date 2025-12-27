/**
 * First-run detection and seed data
 *
 * Handles detection of first app launch and creates welcome content.
 */

import type { ObjectStore } from '@/lib/loro';
import { serializeBlockNoteDocument } from '@/lib/editor';
import { getWelcomeNoteBlocks } from './welcome-content';

const FIRST_RUN_KEY = 'ephemera:firstRunComplete';

/**
 * Check if this is the first time the app is running
 */
export function isFirstRun(): boolean {
  return localStorage.getItem(FIRST_RUN_KEY) !== 'true';
}

/**
 * Mark first run as complete
 */
export function markFirstRunComplete(): void {
  localStorage.setItem(FIRST_RUN_KEY, 'true');
}

/**
 * Create welcome note with seed content
 * Links to today's daily note which should already exist
 */
export function createWelcomeNote(
  store: ObjectStore,
  dailyNoteId: string,
  dailyNoteName: string
): string {
  // Create the welcome note
  const welcomeNote = store.create({
    typeId: 'note',
    properties: {
      title: 'Welcome to Ephemera',
      isDailyNote: false,
    },
    withContent: true,
    inboxed: true, // Add to inbox so user processes it
  });

  // Set the welcome content with link to daily note
  const blocks = getWelcomeNoteBlocks(dailyNoteId, dailyNoteName);
  const content = serializeBlockNoteDocument(blocks);
  store.setContent(welcomeNote.id, content);

  return welcomeNote.id;
}

/**
 * Run first-run setup if needed
 * Returns the welcome note ID if created, null otherwise
 */
export function runFirstRunSetup(
  store: ObjectStore,
  dailyNoteId: string,
  dailyNoteName: string
): string | null {
  if (!isFirstRun()) {
    return null;
  }

  const welcomeNoteId = createWelcomeNote(store, dailyNoteId, dailyNoteName);
  markFirstRunComplete();

  return welcomeNoteId;
}
