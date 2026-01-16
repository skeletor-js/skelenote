import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import {
  getDailyNoteId,
  extractDateFromId,
  isDailyNote,
  getDailyNoteByDate,
  getOrCreateDailyNote,
  getAllDailyNotes,
  getDailyNotesForMonth,
  getAdjacentDailyNote,
} from '../daily-notes';
import { ObjectStore } from '../../loro/objects';
import { createTypeRegistry, BuiltInTypeIds } from '../../types';
import { NoteType, TaskType } from '../../types/built-in-types';
import type { SkelenoteObject } from '../../types';

// Mock the template module to prevent side effects
vi.mock('../../templates', () => ({
  applyDailyNoteTemplate: vi.fn(),
}));

// Helper to create test store
function createTestStore(): ObjectStore {
  const doc = new LoroDoc();
  const registry = createTypeRegistry([NoteType, TaskType]);
  return new ObjectStore(doc, registry);
}

describe('Daily Notes', () => {
  describe('getDailyNoteId', () => {
    it('should generate deterministic ID for a date', () => {
      const date = new Date(2024, 11, 25); // December 25, 2024
      expect(getDailyNoteId(date)).toBe('note-2024-12-25');
    });

    it('should pad single digit month and day', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(getDailyNoteId(date)).toBe('note-2024-01-05');
    });

    it('should produce same ID for same date different times', () => {
      const morning = new Date(2024, 11, 25, 8, 0, 0);
      const evening = new Date(2024, 11, 25, 20, 0, 0);
      expect(getDailyNoteId(morning)).toBe(getDailyNoteId(evening));
    });

    it('should produce different IDs for different dates', () => {
      const date1 = new Date(2024, 11, 25);
      const date2 = new Date(2024, 11, 26);
      expect(getDailyNoteId(date1)).not.toBe(getDailyNoteId(date2));
    });
  });

  describe('extractDateFromId', () => {
    it('should extract date string from valid daily note ID', () => {
      expect(extractDateFromId('note-2024-12-25')).toBe('2024-12-25');
    });

    it('should return null for non-daily-note ID', () => {
      expect(extractDateFromId('note-abc123')).toBeNull();
      expect(extractDateFromId('task-2024-12-25')).toBeNull();
      expect(extractDateFromId('random-id')).toBeNull();
    });

    it('should return null for malformed date', () => {
      expect(extractDateFromId('note-24-12-25')).toBeNull();
      expect(extractDateFromId('note-2024-1-25')).toBeNull();
    });
  });

  describe('isDailyNote', () => {
    it('should return true for daily note object', () => {
      const dailyNote: SkelenoteObject = {
        id: 'note-2024-12-25',
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'December 25, 2024', isDailyNote: true },
        hasContent: true,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isDailyNote(dailyNote)).toBe(true);
    });

    it('should return false for regular note', () => {
      const regularNote: SkelenoteObject = {
        id: 'regular-note',
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Regular Note' },
        hasContent: true,
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isDailyNote(regularNote)).toBe(false);
    });

    it('should return false for non-note type', () => {
      const task: SkelenoteObject = {
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', isDailyNote: true }, // Even with flag
        hasContent: true,
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isDailyNote(task)).toBe(false);
    });
  });

  describe('getDailyNoteByDate', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should return undefined when daily note does not exist', () => {
      const result = getDailyNoteByDate(store, new Date(2024, 11, 25));
      expect(result).toBeUndefined();
    });

    it('should return daily note when it exists', () => {
      const date = new Date(2024, 11, 25);
      const id = getDailyNoteId(date);

      store.create({
        id,
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'December 25, 2024', isDailyNote: true },
        withContent: true,
        inboxed: false,
      });

      const result = getDailyNoteByDate(store, date);
      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it('should return undefined for a regular note with same ID format', () => {
      const date = new Date(2024, 11, 25);
      const id = getDailyNoteId(date);

      // Create a regular note (no isDailyNote flag)
      store.create({
        id,
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Some Note' },
        withContent: true,
      });

      const result = getDailyNoteByDate(store, date);
      expect(result).toBeUndefined();
    });
  });

  describe('getOrCreateDailyNote', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should create daily note with correct properties', () => {
      const date = new Date(2024, 11, 25);
      const result = getOrCreateDailyNote(store, date);

      expect(result.id).toBe('note-2024-12-25');
      expect(result.typeId).toBe(BuiltInTypeIds.NOTE);
      expect(result.properties.isDailyNote).toBe(true);
      expect(result.properties.title).toBe('December 25, 2024');
      expect(result.inboxed).toBe(false); // Daily notes skip inbox
    });

    it('should return existing daily note on second call', () => {
      const date = new Date(2024, 11, 25);

      const first = getOrCreateDailyNote(store, date);
      const second = getOrCreateDailyNote(store, date);

      expect(first.id).toBe(second.id);
      expect(first.createdAt).toBe(second.createdAt);
    });

    it('should create different notes for different dates', () => {
      const date1 = new Date(2024, 11, 25);
      const date2 = new Date(2024, 11, 26);

      const note1 = getOrCreateDailyNote(store, date1);
      const note2 = getOrCreateDailyNote(store, date2);

      expect(note1.id).not.toBe(note2.id);
    });

    it('should set hasContent to true', () => {
      const date = new Date(2024, 11, 25);
      const result = getOrCreateDailyNote(store, date);
      expect(result.hasContent).toBe(true);
    });

    it('should set date property as start of day timestamp', () => {
      const date = new Date(2024, 11, 25, 15, 30, 45);
      const result = getOrCreateDailyNote(store, date);

      const expectedTimestamp = new Date(2024, 11, 25, 0, 0, 0, 0).getTime();
      expect(result.properties.date).toBe(expectedTimestamp);
    });
  });

  describe('getAllDailyNotes', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should return empty array when no daily notes exist', () => {
      expect(getAllDailyNotes(store)).toEqual([]);
    });

    it('should return all daily notes', () => {
      getOrCreateDailyNote(store, new Date(2024, 11, 25));
      getOrCreateDailyNote(store, new Date(2024, 11, 26));
      getOrCreateDailyNote(store, new Date(2024, 11, 27));

      const result = getAllDailyNotes(store);
      expect(result).toHaveLength(3);
    });

    it('should not include regular notes', () => {
      getOrCreateDailyNote(store, new Date(2024, 11, 25));

      // Create a regular note
      store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Regular Note' },
      });

      const result = getAllDailyNotes(store);
      expect(result).toHaveLength(1);
    });
  });

  describe('getDailyNotesForMonth', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should return empty map when no notes in month', () => {
      const result = getDailyNotesForMonth(store, 2024, 11);
      expect(result.size).toBe(0);
    });

    it('should return notes only for specified month', () => {
      // Create notes in December 2024
      getOrCreateDailyNote(store, new Date(2024, 11, 25));
      getOrCreateDailyNote(store, new Date(2024, 11, 26));

      // Create note in January 2025
      getOrCreateDailyNote(store, new Date(2025, 0, 1));

      const december = getDailyNotesForMonth(store, 2024, 11);
      expect(december.size).toBe(2);
      expect(december.has('2024-12-25')).toBe(true);
      expect(december.has('2024-12-26')).toBe(true);

      const january = getDailyNotesForMonth(store, 2025, 0);
      expect(january.size).toBe(1);
    });
  });

  describe('getAdjacentDailyNote', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should get next day daily note', () => {
      const current = new Date(2024, 11, 25);
      const next = getAdjacentDailyNote(store, current, 1);

      expect(next.id).toBe('note-2024-12-26');
    });

    it('should get previous day daily note', () => {
      const current = new Date(2024, 11, 25);
      const prev = getAdjacentDailyNote(store, current, -1);

      expect(prev.id).toBe('note-2024-12-24');
    });

    it('should create note if it does not exist', () => {
      const current = new Date(2024, 11, 25);
      const next = getAdjacentDailyNote(store, current, 1);

      expect(store.exists(next.id)).toBe(true);
    });

    it('should handle month boundary', () => {
      const dec31 = new Date(2024, 11, 31);
      const jan1 = getAdjacentDailyNote(store, dec31, 1);

      expect(jan1.id).toBe('note-2025-01-01');
    });
  });
});
