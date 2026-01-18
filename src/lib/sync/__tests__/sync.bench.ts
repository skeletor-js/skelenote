/**
 * Performance benchmarks for Sync operations
 *
 * Run with: pnpm vitest bench src/lib/sync/__tests__/sync.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '@/lib/loro/objects';
import { registerBuiltInTypes, BuiltInTypeIds } from '@/lib/types';

// Generate objects for sync testing
function createTestStore(objectCount: number): { doc: LoroDoc; store: ObjectStore } {
    const doc = new LoroDoc();
    const store = new ObjectStore(doc);
    registerBuiltInTypes(store);

    for (let i = 0; i < objectCount; i++) {
        store.create({
            typeId: i % 2 === 0 ? BuiltInTypeIds.NOTE : BuiltInTypeIds.TASK,
            properties: {
                title: `Object ${i}`,
                description: `Description for object ${i} with some longer text content.`,
            },
        });
    }

    return { doc, store };
}

describe('CRDT Export Performance', () => {
    let small: ReturnType<typeof createTestStore>;
    let medium: ReturnType<typeof createTestStore>;
    let large: ReturnType<typeof createTestStore>;

    beforeAll(() => {
        small = createTestStore(50);
        medium = createTestStore(200);
        large = createTestStore(1000);
    });

    bench('export snapshot (50 objects)', () => {
        small.doc.export({ mode: 'snapshot' });
    });

    bench('export snapshot (200 objects)', () => {
        medium.doc.export({ mode: 'snapshot' });
    });

    bench('export snapshot (1000 objects)', () => {
        large.doc.export({ mode: 'snapshot' });
    });
});

describe('CRDT Import Performance', () => {
    let smallSnapshot: Uint8Array;
    let mediumSnapshot: Uint8Array;
    let largeSnapshot: Uint8Array;

    beforeAll(() => {
        smallSnapshot = createTestStore(50).doc.export({ mode: 'snapshot' });
        mediumSnapshot = createTestStore(200).doc.export({ mode: 'snapshot' });
        largeSnapshot = createTestStore(1000).doc.export({ mode: 'snapshot' });
    });

    bench('import snapshot (50 objects)', () => {
        const doc = new LoroDoc();
        doc.import(smallSnapshot);
    });

    bench('import snapshot (200 objects)', () => {
        const doc = new LoroDoc();
        doc.import(mediumSnapshot);
    });

    bench('import snapshot (1000 objects)', () => {
        const doc = new LoroDoc();
        doc.import(largeSnapshot);
    });
});

describe('CRDT Merge Performance', () => {
    bench(
        'merge two 100-object docs',
        () => {
            const { doc: doc1 } = createTestStore(100);
            const { doc: doc2 } = createTestStore(100);

            const snapshot1 = doc1.export({ mode: 'snapshot' });
            doc2.import(snapshot1);
        },
        { iterations: 10 }
    );

    bench(
        'concurrent edits merge',
        () => {
            // Simulate two devices making concurrent edits
            const doc1 = new LoroDoc();
            const doc2 = new LoroDoc();

            const store1 = new ObjectStore(doc1);
            const store2 = new ObjectStore(doc2);
            registerBuiltInTypes(store1);
            registerBuiltInTypes(store2);

            // Each creates 50 objects
            for (let i = 0; i < 50; i++) {
                store1.create({
                    typeId: BuiltInTypeIds.NOTE,
                    properties: { title: `Device1 Note ${i}` },
                });
                store2.create({
                    typeId: BuiltInTypeIds.TASK,
                    properties: { title: `Device2 Task ${i}` },
                });
            }

            // Exchange and merge
            const snapshot1 = doc1.export({ mode: 'snapshot' });
            const snapshot2 = doc2.export({ mode: 'snapshot' });
            doc1.import(snapshot2);
            doc2.import(snapshot1);
        },
        { iterations: 5 }
    );
});

describe('Incremental Sync', () => {
    bench(
        'export updates only',
        () => {
            const doc = new LoroDoc();
            const store = new ObjectStore(doc);
            registerBuiltInTypes(store);

            // Initial state
            for (let i = 0; i < 100; i++) {
                store.create({
                    typeId: BuiltInTypeIds.NOTE,
                    properties: { title: `Note ${i}` },
                });
            }

            // Capture version
            const versionBefore = doc.version();

            // Make some changes
            for (let i = 0; i < 10; i++) {
                store.create({
                    typeId: BuiltInTypeIds.TASK,
                    properties: { title: `New Task ${i}` },
                });
            }

            // Export only the changes
            doc.export({ mode: 'updates', from: versionBefore });
        },
        { iterations: 10 }
    );
});
