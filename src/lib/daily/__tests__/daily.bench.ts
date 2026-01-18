/**
 * Performance benchmarks for Daily Note operations
 *
 * Run with: pnpm vitest bench src/lib/daily/__tests__/daily.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '@/lib/loro/objects';
import { createTypeRegistry, builtInTypes } from '@/lib/types';
import {
  getDailyNoteId,
  getOrCreateDailyNote,
  getDailyNoteByDate,
  getAllDailyNotes,
} from '../daily-notes';
import { formatDateTitle } from '../date-utils';

describe('Daily Note ID Generation', () => {
  bench('generate daily note ID', () => {
    getDailyNoteId(new Date());
  });

  bench('generate 100 daily note IDs', () => {
    const baseDate = new Date();
    for (let i = 0; i < 100; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      getDailyNoteId(date);
    }
  });
});

describe('Daily Note Title Formatting', () => {
  bench('format title', () => {
    formatDateTitle(new Date());
  });

  bench('format 365 titles', () => {
    const baseDate = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      formatDateTitle(date);
    }
  });
});

describe('Daily Note Creation', () => {
  bench(
    'create daily note',
    () => {
      const doc = new LoroDoc();
      const typeRegistry = createTypeRegistry(builtInTypes);
      const store = new ObjectStore(doc, typeRegistry);

      getOrCreateDailyNote(store, new Date());
    },
    { iterations: 20 }
  );
});

describe('Daily Note Retrieval', () => {
  let store: ObjectStore;

  beforeAll(() => {
    const doc = new LoroDoc();
    const typeRegistry = createTypeRegistry(builtInTypes);
    store = new ObjectStore(doc, typeRegistry);

    // Create 30 days of daily notes
    const baseDate = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      getOrCreateDailyNote(store, date);
    }
  });

  bench('get daily note by date', () => {
    getDailyNoteByDate(store, new Date());
  });

  bench('get all daily notes (30)', () => {
    getAllDailyNotes(store);
  });
});

describe('Daily Note Stress Test', () => {
  bench(
    'create 100 daily notes',
    () => {
      const doc = new LoroDoc();
      const typeRegistry = createTypeRegistry(builtInTypes);
      const store = new ObjectStore(doc, typeRegistry);

      const baseDate = new Date();
      for (let i = 0; i < 100; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        getOrCreateDailyNote(store, date);
      }
    },
    { iterations: 3 }
  );
});
