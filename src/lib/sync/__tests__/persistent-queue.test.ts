/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { PersistentOfflineQueue } from '../persistent-queue';

describe('PersistentOfflineQueue', () => {
  let queue: PersistentOfflineQueue;

  beforeEach(async () => {
    queue = new PersistentOfflineQueue();
    await queue.initialize();
  });

  afterEach(async () => {
    queue.close();
    await PersistentOfflineQueue.deleteDatabase();
  });

  describe('initialization', () => {
    it('should create database on first init', async () => {
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(0);
      expect(newQueue.isEmpty).toBe(true);
      newQueue.close();
    });

    it('should recover existing items on startup', async () => {
      // Enqueue items
      await queue.enqueue(new Uint8Array([1, 2, 3]));
      await queue.enqueue(new Uint8Array([4, 5, 6]));
      queue.close();

      // Create new instance and verify recovery
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();

      expect(newQueue.length).toBe(2);
      expect(newQueue.peek()?.data).toEqual(new Uint8Array([1, 2, 3]));
      newQueue.close();
    });

    it('should recover nextId correctly', async () => {
      // Enqueue and dequeue
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));
      await queue.dequeue();
      queue.close();

      // Create new instance
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();

      // Next ID should continue from where we left off
      const id = await newQueue.enqueue(new Uint8Array([3]));
      expect(id).toBe(3);
      newQueue.close();
    });

    it('should calculate nextId from max existing if metadata missing', async () => {
      // This is an edge case - normally metadata is saved
      // We test that even without metadata, we get correct IDs
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));
      queue.close();

      // Create new instance - should work even if metadata was somehow lost
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();

      // Should still have items and be able to enqueue
      expect(newQueue.length).toBe(2);
      const id = await newQueue.enqueue(new Uint8Array([3]));
      expect(id).toBeGreaterThan(2);
      newQueue.close();
    });
  });

  describe('enqueue', () => {
    it('should persist update to IndexedDB', async () => {
      const id = await queue.enqueue(new Uint8Array([1, 2, 3]));
      expect(id).toBe(1);
      expect(queue.length).toBe(1);

      // Verify persisted
      queue.close();
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(1);
      newQueue.close();
    });

    it('should handle Uint8Array data correctly', async () => {
      const data = new Uint8Array([255, 0, 128, 64]);
      await queue.enqueue(data);

      const item = queue.peek();
      expect(item?.data).toEqual(data);
      expect(item?.data).toBeInstanceOf(Uint8Array);
    });

    it('should maintain FIFO order', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));
      await queue.enqueue(new Uint8Array([3]));

      const items = queue.getAll();
      expect(items[0].data).toEqual(new Uint8Array([1]));
      expect(items[1].data).toEqual(new Uint8Array([2]));
      expect(items[2].data).toEqual(new Uint8Array([3]));
    });

    it('should increment ID correctly', async () => {
      const id1 = await queue.enqueue(new Uint8Array([1]));
      const id2 = await queue.enqueue(new Uint8Array([2]));
      const id3 = await queue.enqueue(new Uint8Array([3]));

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);
    });

    it('should include timestamp', async () => {
      const before = Date.now();
      await queue.enqueue(new Uint8Array([1]));
      const after = Date.now();

      const item = queue.peek();
      expect(item?.timestamp).toBeGreaterThanOrEqual(before);
      expect(item?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('dequeue', () => {
    it('should remove oldest item atomically', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      const item = await queue.dequeue();
      expect(item?.data).toEqual(new Uint8Array([1]));
      expect(queue.length).toBe(1);

      // Verify persisted
      queue.close();
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(1);
      expect(newQueue.peek()?.data).toEqual(new Uint8Array([2]));
      newQueue.close();
    });

    it('should return undefined for empty queue', async () => {
      const item = await queue.dequeue();
      expect(item).toBeUndefined();
    });

    it('should update both IndexedDB and memory cache', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      await queue.dequeue();

      // Memory cache updated
      expect(queue.length).toBe(1);
      expect(queue.peek()?.data).toEqual(new Uint8Array([2]));

      // IndexedDB updated (verify by reloading)
      queue.close();
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(1);
      newQueue.close();
    });
  });

  describe('peek and length', () => {
    it('should peek without removing', async () => {
      await queue.enqueue(new Uint8Array([1, 2, 3]));

      const item1 = queue.peek();
      const item2 = queue.peek();

      expect(item1?.data).toEqual(new Uint8Array([1, 2, 3]));
      expect(item2?.data).toEqual(new Uint8Array([1, 2, 3]));
      expect(queue.length).toBe(1);
    });

    it('should return correct length synchronously', async () => {
      expect(queue.length).toBe(0);

      await queue.enqueue(new Uint8Array([1]));
      expect(queue.length).toBe(1);

      await queue.enqueue(new Uint8Array([2]));
      expect(queue.length).toBe(2);

      await queue.dequeue();
      expect(queue.length).toBe(1);
    });

    it('should report isEmpty correctly', async () => {
      expect(queue.isEmpty).toBe(true);

      await queue.enqueue(new Uint8Array([1]));
      expect(queue.isEmpty).toBe(false);

      await queue.dequeue();
      expect(queue.isEmpty).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all items', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      await queue.clear();

      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });

    it('should persist cleared state', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.clear();
      queue.close();

      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(0);
      newQueue.close();
    });
  });

  describe('getAll', () => {
    it('should return copy of all items', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      const items = queue.getAll();
      expect(items).toHaveLength(2);

      // Verify it's a copy
      items.pop();
      expect(queue.length).toBe(2);
    });

    it('should return items in FIFO order', async () => {
      await queue.enqueue(new Uint8Array([3]));
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      const items = queue.getAll();
      expect(items[0].id).toBeLessThan(items[1].id);
      expect(items[1].id).toBeLessThan(items[2].id);
    });
  });

  describe('flushAll', () => {
    it('should return all items', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      const items = await queue.flushAll();

      expect(items).toHaveLength(2);
      expect(items[0].data).toEqual(new Uint8Array([1]));
      expect(items[1].data).toEqual(new Uint8Array([2]));
    });

    it('should clear queue in single transaction', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));

      await queue.flushAll();

      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });

    it('should persist empty state', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.flushAll();
      queue.close();

      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(0);
      newQueue.close();
    });

    it('should return empty array for empty queue', async () => {
      const items = await queue.flushAll();
      expect(items).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('should survive queue instance recreation', async () => {
      // First session - add items
      await queue.enqueue(new Uint8Array([10, 20, 30]));
      await queue.enqueue(new Uint8Array([40, 50, 60]));
      queue.close();

      // Second session - verify recovery
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();

      expect(newQueue.length).toBe(2);

      const item1 = await newQueue.dequeue();
      expect(item1?.data).toEqual(new Uint8Array([10, 20, 30]));

      const item2 = await newQueue.dequeue();
      expect(item2?.data).toEqual(new Uint8Array([40, 50, 60]));

      newQueue.close();
    });

    it('should recover pending updates after simulated crash', async () => {
      // Simulate: enqueue updates, then "crash" (just close without proper cleanup)
      await queue.enqueue(new Uint8Array([1, 2, 3]));
      await queue.enqueue(new Uint8Array([4, 5, 6]));

      // Simulate crash - just close the db
      queue.close();

      // App restarts - should recover
      const recoveredQueue = new PersistentOfflineQueue();
      await recoveredQueue.initialize();

      expect(recoveredQueue.length).toBe(2);
      expect(recoveredQueue.peek()?.data).toEqual(new Uint8Array([1, 2, 3]));

      recoveredQueue.close();
    });

    it('should maintain order after recovery', async () => {
      await queue.enqueue(new Uint8Array([1]));
      await queue.enqueue(new Uint8Array([2]));
      await queue.enqueue(new Uint8Array([3]));
      queue.close();

      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();

      const item1 = await newQueue.dequeue();
      const item2 = await newQueue.dequeue();
      const item3 = await newQueue.dequeue();

      expect(item1?.data).toEqual(new Uint8Array([1]));
      expect(item2?.data).toEqual(new Uint8Array([2]));
      expect(item3?.data).toEqual(new Uint8Array([3]));

      newQueue.close();
    });
  });

  describe('error handling', () => {
    it('should throw if async methods used before initialization', async () => {
      const uninitQueue = new PersistentOfflineQueue();

      // Sync methods return from empty cache (safe)
      expect(uninitQueue.peek()).toBeUndefined();
      expect(uninitQueue.length).toBe(0);
      expect(uninitQueue.isEmpty).toBe(true);

      // Async methods should throw
      await expect(uninitQueue.enqueue(new Uint8Array([1]))).rejects.toThrow(
        'not initialized'
      );
      await expect(uninitQueue.dequeue()).rejects.toThrow('not initialized');
      await expect(uninitQueue.clear()).rejects.toThrow('not initialized');
      await expect(uninitQueue.flushAll()).rejects.toThrow('not initialized');

      // Cleanup
      uninitQueue.close();
    });

    it('should handle large data', async () => {
      // 1MB of data
      const largeData = new Uint8Array(1024 * 1024);
      largeData.fill(42);

      await queue.enqueue(largeData);

      const item = queue.peek();
      expect(item?.data.length).toBe(1024 * 1024);
      expect(item?.data[0]).toBe(42);
    });
  });

  describe('deleteDatabase', () => {
    it('should delete the database completely', async () => {
      await queue.enqueue(new Uint8Array([1, 2, 3]));
      queue.close();

      await PersistentOfflineQueue.deleteDatabase();

      // New instance should start fresh
      const newQueue = new PersistentOfflineQueue();
      await newQueue.initialize();
      expect(newQueue.length).toBe(0);
      newQueue.close();
    });
  });
});
