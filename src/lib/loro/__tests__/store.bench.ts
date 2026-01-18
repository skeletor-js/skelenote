/**
 * Performance benchmarks for ObjectStore operations
 *
 * Run with: pnpm vitest bench src/lib/loro/__tests__/store.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore, type CreateObjectInput } from '../objects';
import { registerBuiltInTypes, BuiltInTypeIds } from '@/lib/types';

// Test fixtures
function createMockObject(i: number): CreateObjectInput {
  return {
    typeId: BuiltInTypeIds.NOTE,
    properties: {
      title: `Note ${i}`,
      description: `This is note number ${i} with some content.`,
    },
  };
}

function createMockTask(i: number): CreateObjectInput {
  return {
    typeId: BuiltInTypeIds.TASK,
    properties: {
      title: `Task ${i}`,
      status: i % 3 === 0 ? 'done' : i % 2 === 0 ? 'in-progress' : 'todo',
      priority: (i % 4) + 1,
      dueDate: Date.now() + i * 86400000,
    },
  };
}

describe('ObjectStore Performance', () => {
  let store: ObjectStore;

  beforeAll(() => {
    const doc = new LoroDoc();
    store = new ObjectStore(doc);
    registerBuiltInTypes(store);
  });

  // Benchmark: Create single objects
  bench('create single note', () => {
    store.create(createMockObject(Math.random() * 1000));
  });

  bench('create single task', () => {
    store.create(createMockTask(Math.random() * 1000));
  });
});

describe('ObjectStore Stress Tests', () => {
  // Benchmark: Bulk object creation
  bench(
    'create 100 objects',
    () => {
      const doc = new LoroDoc();
      const testStore = new ObjectStore(doc);
      registerBuiltInTypes(testStore);

      for (let i = 0; i < 100; i++) {
        testStore.create(createMockObject(i));
      }
    },
    { iterations: 10 }
  );

  bench(
    'create 500 objects',
    () => {
      const doc = new LoroDoc();
      const testStore = new ObjectStore(doc);
      registerBuiltInTypes(testStore);

      for (let i = 0; i < 500; i++) {
        testStore.create(createMockObject(i));
      }
    },
    { iterations: 5 }
  );

  bench(
    'create 1000 objects',
    () => {
      const doc = new LoroDoc();
      const testStore = new ObjectStore(doc);
      registerBuiltInTypes(testStore);

      for (let i = 0; i < 1000; i++) {
        testStore.create(createMockObject(i));
      }
    },
    { iterations: 3 }
  );
});

describe('Loro CRDT Merge Performance', () => {
  bench(
    'merge two docs with 100 objects each',
    () => {
      // Create two independent docs
      const doc1 = new LoroDoc();
      const doc2 = new LoroDoc();

      const store1 = new ObjectStore(doc1);
      const store2 = new ObjectStore(doc2);
      registerBuiltInTypes(store1);
      registerBuiltInTypes(store2);

      // Add objects to each
      for (let i = 0; i < 100; i++) {
        store1.create(createMockObject(i));
        store2.create(createMockTask(i));
      }

      // Export and merge
      const snapshot1 = doc1.export({ mode: 'snapshot' });
      doc2.import(snapshot1);
    },
    { iterations: 10 }
  );

  bench(
    'merge docs with 500 objects each',
    () => {
      const doc1 = new LoroDoc();
      const doc2 = new LoroDoc();

      const store1 = new ObjectStore(doc1);
      const store2 = new ObjectStore(doc2);
      registerBuiltInTypes(store1);
      registerBuiltInTypes(store2);

      for (let i = 0; i < 500; i++) {
        store1.create(createMockObject(i));
        store2.create(createMockTask(i));
      }

      const snapshot1 = doc1.export({ mode: 'snapshot' });
      doc2.import(snapshot1);
    },
    { iterations: 5 }
  );
});

describe('ObjectStore Query Performance', () => {
  let queryStore: ObjectStore;

  beforeAll(() => {
    const doc = new LoroDoc();
    queryStore = new ObjectStore(doc);
    registerBuiltInTypes(queryStore);

    // Pre-populate with 500 objects
    for (let i = 0; i < 250; i++) {
      queryStore.create(createMockObject(i));
      queryStore.create(createMockTask(i));
    }
  });

  bench('getAll (500 objects)', () => {
    queryStore.getAll();
  });

  bench('getByType - notes', () => {
    queryStore.getByType(BuiltInTypeIds.NOTE);
  });

  bench('getByType - tasks', () => {
    queryStore.getByType(BuiltInTypeIds.TASK);
  });
});
