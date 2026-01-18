/**
 * Loro Store Lifecycle Integration Tests (P0)
 *
 * Tests real Loro CRDT behavior with actual data persistence cycles.
 * Mocks only Tauri path/fs APIs to redirect to in-memory storage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoroDocStore } from '../store';
import { LoroDoc } from 'loro-crdt';

// In-memory file storage for testing
let memoryFs: Map<string, Uint8Array>;

// Mock Tauri APIs with in-memory file system
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/app/data'),
  join: vi.fn().mockImplementation(async (...args) => args.join('/')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi
    .fn()
    .mockImplementation(async (path: string) => memoryFs.has(path)),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockImplementation(async (path: string) => {
    const data = memoryFs.get(path);
    if (!data) throw new Error('File not found');
    return data;
  }),
  writeFile: vi
    .fn()
    .mockImplementation(async (path: string, data: Uint8Array) => {
      memoryFs.set(path, data);
    }),
}));

describe('LoroDocStore Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryFs = new Map();
  });

  afterEach(() => {
    memoryFs.clear();
  });

  describe('persistence lifecycle', () => {
    it('persists objects across store instances', async () => {
      // 1. Create store and initialize
      const store1 = new LoroDocStore();
      await store1.initialize();

      // 2. Create multiple objects of different types
      const doc1 = store1.createDocument('main');
      const objectsMap = doc1.getMap('objects');

      const task1 = {
        id: 'task-1',
        typeId: 'task',
        properties: { title: 'Test Task', status: 'todo' },
        hasContent: true,
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const note1 = {
        id: 'note-1',
        typeId: 'note',
        properties: { title: 'Test Note' },
        hasContent: true,
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      objectsMap.set('task-1', JSON.stringify(task1));
      objectsMap.set('note-1', JSON.stringify(note1));

      // Add content for objects
      doc1.getText('content:task-1').insert(0, 'Task content here');
      doc1.getText('content:note-1').insert(0, 'Note content here');

      doc1.commit();

      // 3. Force immediate save
      await store1.save();

      // 4. Verify data was written
      expect(memoryFs.has('/app/data/data/store.loro')).toBe(true);

      // 5. Create NEW store instance
      const store2 = new LoroDocStore();
      await store2.initialize();
      await store2.load();

      // 6. Verify all objects loaded with correct data
      const loadedDoc = store2.getDocument('main');
      expect(loadedDoc).toBeDefined();

      const loadedObjectsMap = loadedDoc!.getMap('objects');
      const loadedTask = JSON.parse(loadedObjectsMap.get('task-1') as string);
      const loadedNote = JSON.parse(loadedObjectsMap.get('note-1') as string);

      expect(loadedTask.id).toBe('task-1');
      expect(loadedTask.properties.title).toBe('Test Task');
      expect(loadedTask.properties.status).toBe('todo');

      expect(loadedNote.id).toBe('note-1');
      expect(loadedNote.properties.title).toBe('Test Note');

      // Verify content persisted
      expect(loadedDoc!.getText('content:task-1').toString()).toBe(
        'Task content here'
      );
      expect(loadedDoc!.getText('content:note-1').toString()).toBe(
        'Note content here'
      );
    });

    it('handles concurrent rapid saves via debouncing', async () => {
      vi.useFakeTimers();

      const store = new LoroDocStore();
      await store.initialize();

      const doc = store.createDocument('main');
      const objectsMap = doc.getMap('objects');

      // Create 100 objects in rapid succession
      for (let i = 0; i < 100; i++) {
        objectsMap.set(
          `obj-${i}`,
          JSON.stringify({
            id: `obj-${i}`,
            typeId: 'note',
            properties: { title: `Note ${i}` },
            hasContent: false,
            inboxed: true,
            pinned: false,
            archived: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );
        doc.commit();
        // Trigger sync (which debounces saves)
        store.sync();
      }

      // Wait for debounce to complete
      await vi.advanceTimersByTimeAsync(500);

      // Force final save
      await store.save();

      // Reload and verify all 100 objects exist
      const store2 = new LoroDocStore();
      await store2.initialize();
      await store2.load();

      const loadedDoc = store2.getDocument('main');
      expect(loadedDoc).toBeDefined();

      const loadedObjectsMap = loadedDoc!.getMap('objects');
      const entries = loadedObjectsMap.toJSON() as Record<string, string>;
      expect(Object.keys(entries)).toHaveLength(100);

      vi.useRealTimers();
    });

    it('maintains data integrity across multiple save/load cycles', async () => {
      const store1 = new LoroDocStore();
      await store1.initialize();

      // Cycle 1: Create initial data
      const doc1 = store1.createDocument('main');
      doc1
        .getMap('objects')
        .set('obj-1', JSON.stringify({ id: 'obj-1', title: 'V1' }));
      doc1.commit();
      await store1.save();

      // Cycle 2: Modify data
      const store2 = new LoroDocStore();
      await store2.initialize();
      await store2.load();
      const doc2 = store2.getDocument('main')!;
      doc2
        .getMap('objects')
        .set('obj-1', JSON.stringify({ id: 'obj-1', title: 'V2' }));
      doc2
        .getMap('objects')
        .set('obj-2', JSON.stringify({ id: 'obj-2', title: 'New' }));
      doc2.commit();
      await store2.save();

      // Cycle 3: Verify final state
      const store3 = new LoroDocStore();
      await store3.initialize();
      await store3.load();
      const doc3 = store3.getDocument('main')!;
      const objectsMap = doc3.getMap('objects');

      expect(JSON.parse(objectsMap.get('obj-1') as string).title).toBe('V2');
      expect(JSON.parse(objectsMap.get('obj-2') as string).title).toBe('New');
    });
  });

  describe('CRDT operations', () => {
    it('merges concurrent modifications correctly', async () => {
      // 1. Create initial store with an object
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');
      docA.getMap('objects').set(
        'obj-x',
        JSON.stringify({
          id: 'obj-x',
          title: 'Original',
          status: 'todo',
        })
      );
      docA.commit();

      // 2. Export initial state
      const initialSnapshot = docA.export({ mode: 'snapshot' });

      // 3. Create store B from same initial state
      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');
      docB.import(initialSnapshot);

      // 4. Store A modifies 'title' property
      const objA = JSON.parse(docA.getMap('objects').get('obj-x') as string);
      objA.title = 'Modified by A';
      docA.getMap('objects').set('obj-x', JSON.stringify(objA));
      docA.commit();

      // 5. Store B modifies 'status' property
      const objB = JSON.parse(docB.getMap('objects').get('obj-x') as string);
      objB.status = 'done';
      docB.getMap('objects').set('obj-x', JSON.stringify(objB));
      docB.commit();

      // 6. Export updates from both
      const updateA = docA.export({ mode: 'update', from: docB.version() });
      const updateB = docB.export({ mode: 'update', from: docA.version() });

      // 7. Import updates to both stores
      docA.import(updateB);
      docB.import(updateA);

      // 8. Verify both stores converge to same state
      const finalA = JSON.parse(docA.getMap('objects').get('obj-x') as string);
      const finalB = JSON.parse(docB.getMap('objects').get('obj-x') as string);

      // CRDT uses last-writer-wins, so final state depends on operation timestamps
      // Both should have the same final value
      expect(finalA).toEqual(finalB);
    });

    it('resolves conflicting edits to same field deterministically', async () => {
      // Create two stores from same initial state
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');
      docA
        .getMap('objects')
        .set(
          'obj-conflict',
          JSON.stringify({ id: 'obj-conflict', title: 'Original' })
        );
      docA.commit();

      const snapshot = docA.export({ mode: 'snapshot' });

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');
      docB.import(snapshot);

      // Both modify the same field
      docA
        .getMap('objects')
        .set(
          'obj-conflict',
          JSON.stringify({ id: 'obj-conflict', title: 'Value A' })
        );
      docA.commit();

      docB
        .getMap('objects')
        .set(
          'obj-conflict',
          JSON.stringify({ id: 'obj-conflict', title: 'Value B' })
        );
      docB.commit();

      // Merge updates
      const updateA = docA.export({ mode: 'update', from: docB.version() });
      const updateB = docB.export({ mode: 'update', from: docA.version() });

      docA.import(updateB);
      docB.import(updateA);

      // Verify deterministic winner (both have same value)
      const resultA = JSON.parse(
        docA.getMap('objects').get('obj-conflict') as string
      );
      const resultB = JSON.parse(
        docB.getMap('objects').get('obj-conflict') as string
      );

      expect(resultA.title).toBe(resultB.title);
      // Value is determined by Loro's LWW semantics
      expect(['Value A', 'Value B']).toContain(resultA.title);
    });

    it('handles three-way merge scenario', async () => {
      // Store A creates initial state
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      // Initial objects
      docA
        .getMap('objects')
        .set('shared', JSON.stringify({ id: 'shared', value: 0 }));
      docA.commit();

      const initialSnapshot = docA.export({ mode: 'snapshot' });

      // Stores B and C start from same state
      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');
      docB.import(initialSnapshot);

      const storeC = new LoroDocStore();
      await storeC.initialize();
      const docC = storeC.createDocument('main');
      docC.import(initialSnapshot);

      // Each store makes different changes
      docA
        .getMap('objects')
        .set('only-a', JSON.stringify({ id: 'only-a', source: 'A' }));
      docA.commit();

      docB
        .getMap('objects')
        .set('only-b', JSON.stringify({ id: 'only-b', source: 'B' }));
      docB.commit();

      docC
        .getMap('objects')
        .set('only-c', JSON.stringify({ id: 'only-c', source: 'C' }));
      docC.commit();

      // Export all updates
      const exportA = docA.export({ mode: 'snapshot' });
      const exportB = docB.export({ mode: 'snapshot' });
      const exportC = docC.export({ mode: 'snapshot' });

      // Create a new store D and merge all
      const storeD = new LoroDocStore();
      await storeD.initialize();
      const docD = storeD.createDocument('main');
      docD.import(exportA);
      docD.import(exportB);
      docD.import(exportC);

      // Verify D has all changes
      const objectsD = docD.getMap('objects');
      expect(objectsD.get('shared')).toBeDefined();
      expect(objectsD.get('only-a')).toBeDefined();
      expect(objectsD.get('only-b')).toBeDefined();
      expect(objectsD.get('only-c')).toBeDefined();

      expect(JSON.parse(objectsD.get('only-a') as string).source).toBe('A');
      expect(JSON.parse(objectsD.get('only-b') as string).source).toBe('B');
      expect(JSON.parse(objectsD.get('only-c') as string).source).toBe('C');
    });
  });

  describe('content storage', () => {
    it('persists rich text content separately from properties', async () => {
      const store1 = new LoroDocStore();
      await store1.initialize();

      const doc1 = store1.createDocument('main');
      const objectsMap = doc1.getMap('objects');

      // Create object with hasContent: true
      objectsMap.set(
        'obj-with-content',
        JSON.stringify({
          id: 'obj-with-content',
          typeId: 'note',
          properties: { title: 'Note with Content' },
          hasContent: true,
        })
      );

      // Set content via getText()
      const contentText = doc1.getText('content:obj-with-content');
      contentText.insert(0, 'This is the rich text content of the note.');
      doc1.commit();

      // Save and reload
      await store1.save();

      const store2 = new LoroDocStore();
      await store2.initialize();
      await store2.load();

      const doc2 = store2.getDocument('main')!;

      // Verify content retrieved correctly
      const loadedContent = doc2.getText('content:obj-with-content').toString();
      expect(loadedContent).toBe('This is the rich text content of the note.');

      // Verify object properties are separate
      const loadedObj = JSON.parse(
        doc2.getMap('objects').get('obj-with-content') as string
      );
      expect(loadedObj.properties.title).toBe('Note with Content');
    });

    it('handles content edits with CRDT character-level sync', async () => {
      const store1 = new LoroDocStore();
      await store1.initialize();
      const doc1 = store1.createDocument('main');

      // Create content
      const text1 = doc1.getText('content:note-1');
      text1.insert(0, 'Hello World');
      doc1.commit();

      const snapshot = doc1.export({ mode: 'snapshot' });

      // Second store imports and edits
      const store2 = new LoroDocStore();
      await store2.initialize();
      const doc2 = store2.createDocument('main');
      doc2.import(snapshot);

      // Store 1 inserts at position 5
      text1.insert(5, ' Beautiful');
      doc1.commit();

      // Store 2 appends at end
      const text2 = doc2.getText('content:note-1');
      text2.insert(11, '!');
      doc2.commit();

      // Merge
      const update1 = doc1.export({ mode: 'update', from: doc2.version() });
      const update2 = doc2.export({ mode: 'update', from: doc1.version() });

      doc1.import(update2);
      doc2.import(update1);

      // Both should have merged content
      expect(text1.toString()).toBe(text2.toString());
      // The exact merge result depends on Loro's CRDT semantics
      expect(text1.toString()).toContain('Hello');
      expect(text1.toString()).toContain('Beautiful');
      expect(text1.toString()).toContain('World');
    });

    it('handles large content documents', async () => {
      const store1 = new LoroDocStore();
      await store1.initialize();

      const doc1 = store1.createDocument('main');
      const objectsMap = doc1.getMap('objects');

      objectsMap.set(
        'large-doc',
        JSON.stringify({
          id: 'large-doc',
          typeId: 'note',
          hasContent: true,
        })
      );

      // Create 1MB of content (approx 1 million characters)
      const largeContent = 'A'.repeat(1_000_000);
      const text = doc1.getText('content:large-doc');
      text.insert(0, largeContent);
      doc1.commit();

      // Save and reload
      await store1.save();

      const store2 = new LoroDocStore();
      await store2.initialize();
      await store2.load();

      const doc2 = store2.getDocument('main')!;
      const loadedContent = doc2.getText('content:large-doc').toString();

      expect(loadedContent.length).toBe(1_000_000);
      expect(loadedContent).toBe(largeContent);
    });
  });

  describe('export/import operations', () => {
    it('exports full snapshot for backup', async () => {
      const store = new LoroDocStore();
      await store.initialize();

      const doc = store.createDocument('main');
      doc.getMap('objects').set('obj-1', JSON.stringify({ id: 'obj-1' }));
      doc.getMap('objects').set('obj-2', JSON.stringify({ id: 'obj-2' }));
      doc.getText('content:obj-1').insert(0, 'Content 1');
      doc.commit();

      // Export full snapshot
      const snapshot = store.exportAll();
      expect(snapshot).toBeInstanceOf(Uint8Array);
      expect(snapshot.length).toBeGreaterThan(0);

      // Import into fresh store
      const store2 = new LoroDocStore();
      await store2.initialize();
      store2.importAll(snapshot);

      const doc2 = store2.getDocument('main')!;
      expect(doc2.getMap('objects').get('obj-1')).toBeDefined();
      expect(doc2.getMap('objects').get('obj-2')).toBeDefined();
      expect(doc2.getText('content:obj-1').toString()).toBe('Content 1');
    });

    it('clear removes all documents', async () => {
      const store = new LoroDocStore();
      await store.initialize();

      store.createDocument('doc1');
      store.createDocument('doc2');
      store.createDocument('doc3');

      expect(store.getDocumentIds()).toHaveLength(3);

      store.clear();

      expect(store.getDocumentIds()).toHaveLength(0);
      expect(store.getDocument('doc1')).toBeUndefined();
    });
  });

  describe('version history', () => {
    it('tracks frontiers across commits', async () => {
      const store = new LoroDocStore();
      await store.initialize();

      const doc = store.createDocument('main');
      const objectsMap = doc.getMap('objects');

      // V1
      objectsMap.set('obj', JSON.stringify({ version: 1 }));
      doc.commit();
      const frontierV1 = doc.frontiers();

      // V2
      objectsMap.set('obj', JSON.stringify({ version: 2 }));
      doc.commit();
      const frontierV2 = doc.frontiers();

      // V3
      objectsMap.set('obj', JSON.stringify({ version: 3 }));
      doc.commit();
      const frontierV3 = doc.frontiers();

      // Frontiers should be different
      expect(frontierV1).not.toEqual(frontierV2);
      expect(frontierV2).not.toEqual(frontierV3);

      // Can fork at previous version
      const forkedDoc = doc.forkAt(frontierV1);
      const forkedValue = JSON.parse(
        forkedDoc.getMap('objects').get('obj') as string
      );
      expect(forkedValue.version).toBe(1);
    });

    it('forkAtVersion returns correct historical state', async () => {
      const store = new LoroDocStore();
      await store.initialize();

      const doc = store.createDocument('main');
      const objectsMap = doc.getMap('objects');

      objectsMap.set('obj', JSON.stringify({ title: 'V1' }));
      doc.commit();
      const frontierV1 = doc.frontiers();

      objectsMap.set('obj', JSON.stringify({ title: 'V2' }));
      doc.commit();

      objectsMap.set('obj', JSON.stringify({ title: 'V3' }));
      doc.commit();

      // Fork at V1
      const forked = store.forkAtVersion(frontierV1);
      expect(forked).not.toBeNull();

      const forkedObj = JSON.parse(
        forked!.getMap('objects').get('obj') as string
      );
      expect(forkedObj.title).toBe('V1');

      // Original unchanged
      const currentObj = JSON.parse(objectsMap.get('obj') as string);
      expect(currentObj.title).toBe('V3');
    });
  });
});
