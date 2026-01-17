/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto'; // Automatically mocks global indexedDB

import { EmbeddingStorage, hashContent } from '../storage';
import { EmbeddingRecord } from '../types';

describe('EmbeddingStorage', () => {
  let storage: EmbeddingStorage;

  beforeEach(async () => {
    storage = new EmbeddingStorage();
    await storage.initialize();
  });

  afterEach(async () => {
    storage.close();
    await EmbeddingStorage.deleteDatabase();
  });

  const createMockRecord = (id: string): EmbeddingRecord => ({
    objectId: id,

    embedding: new Float32Array(384).fill(0.1),
    updatedAt: Date.now(),
    contentHash: 'hash123',
    modelVersion: 'v1',
  });

  describe('basic operations', () => {
    it('should save and get an embedding', async () => {
      const record = createMockRecord('test-1');
      await storage.save(record);

      const retrieved = await storage.get('test-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.objectId).toBe(record.objectId);

      expect(retrieved?.embedding).toBeInstanceOf(Float32Array);
    });

    it('should return null for non-existent embedding', async () => {
      const retrieved = await storage.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete an embedding', async () => {
      const record = createMockRecord('test-2');
      await storage.save(record);
      await storage.delete('test-2');
      const retrieved = await storage.get('test-2');
      expect(retrieved).toBeNull();
    });

    it('should count embeddings', async () => {
      await storage.save(createMockRecord('1'));
      await storage.save(createMockRecord('2'));
      const count = await storage.count();
      expect(count).toBe(2);
    });

    it('should clear all embeddings', async () => {
      await storage.save(createMockRecord('1'));
      await storage.clear();
      const count = await storage.count();
      expect(count).toBe(0);
    });
  });

  describe('batch operations', () => {
    it('should save batch of embeddings', async () => {
      const records = [
        createMockRecord('batch-1'),
        createMockRecord('batch-2'),
        createMockRecord('batch-3'),
      ];

      await storage.saveBatch(records);
      const count = await storage.count();
      expect(count).toBe(3);
    });

    it('should delete batch of embeddings', async () => {
      const records = [createMockRecord('del-1'), createMockRecord('del-2')];
      await storage.saveBatch(records);

      await storage.deleteBatch(['del-1', 'del-2']);
      const count = await storage.count();
      expect(count).toBe(0);
    });

    it('should handle empty batch save', async () => {
      await storage.saveBatch([]);
      expect(true).toBe(true); // Should not throw
    });
  });

  describe('query operations', () => {
    it('should get all embeddings', async () => {
      await storage.save(createMockRecord('a'));
      await storage.save(createMockRecord('b'));

      const all = await storage.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.objectId)).toContain('a');
      expect(all.map((r) => r.objectId)).toContain('b');
    });

    it('should get all object IDs', async () => {
      await storage.save(createMockRecord('x'));
      await storage.save(createMockRecord('y'));

      const ids = await storage.getAllObjectIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('x');
      expect(ids).toContain('y');
    });

    it('should identify outdated embeddings by model version', async () => {
      const oldRecord = createMockRecord('old');
      oldRecord.modelVersion = 'v0';

      const newRecord = createMockRecord('new');
      newRecord.modelVersion = 'v1';

      await storage.save(oldRecord);
      await storage.save(newRecord);

      const outdated = await storage.getOutdatedByModel('v1');
      expect(outdated).toHaveLength(1);
      expect(outdated[0]).toBe('old');
    });
  });

  describe('metadata', () => {
    it('should save and retrieve metadata', async () => {
      await storage.setMetadata('lastRun', 123456);
      const val = await storage.getMetadata<number>('lastRun');
      expect(val).toBe(123456);
    });

    it('should return null for missing metadata', async () => {
      const val = await storage.getMetadata('missing');
      expect(val).toBeNull();
    });
  });

  describe('hashContent', () => {
    it('should generate consistent hash', () => {
      const h1 = hashContent('hello world');
      const h2 = hashContent('hello world');
      const h3 = hashContent('other text');

      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
    });
  });
});
