/**
 * Persistent Offline Queue
 *
 * IndexedDB-backed queue for storing sync updates that persists across
 * app restarts and crashes. Prevents data loss when the app closes
 * while offline with pending updates.
 */

import type { QueuedUpdate } from './types';

const DB_NAME = 'skelenote-sync';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';
const META_STORE_NAME = 'queue-metadata';

/**
 * Record stored in IndexedDB (Uint8Array converted to regular array).
 */
interface StoredQueuedUpdate {
  id: number;
  data: number[];
  timestamp: number;
}

/**
 * Open the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(
        new Error(
          `Failed to open sync queue database: ${request.error?.message}`
        )
      );
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create queue store with auto-increment ID
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create metadata store for nextId recovery
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Persistent offline queue backed by IndexedDB.
 *
 * Maintains a memory cache for synchronous access to length/peek,
 * while persisting all updates to IndexedDB for durability.
 */
export class PersistentOfflineQueue {
  private db: IDBDatabase | null = null;
  private memoryCache: QueuedUpdate[] = [];
  private nextId: number = 1;
  private isInitialized: boolean = false;

  /**
   * Initialize the queue (opens database, recovers existing items).
   * Must be called before using the queue.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.db = await openDatabase();

    // Recover any items from previous session
    const existingItems = await this.loadAll();
    this.memoryCache = existingItems;

    // Recover nextId from metadata or calculate from max existing ID
    const savedNextId = await this.getMetadata<number>('nextId');
    if (savedNextId !== null) {
      this.nextId = savedNextId;
    } else if (existingItems.length > 0) {
      this.nextId = Math.max(...existingItems.map((i) => i.id)) + 1;
    }

    this.isInitialized = true;

    if (existingItems.length > 0) {
      console.log(
        `[PersistentQueue] Recovered ${existingItems.length} pending updates`
      );
    }
  }

  /**
   * Ensure database is initialized.
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  /**
   * Ensure the queue is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'PersistentOfflineQueue not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Add an update to the queue.
   * @returns Promise resolving to the ID of the queued update
   */
  async enqueue(data: Uint8Array): Promise<number> {
    this.ensureInitialized();

    const id = this.nextId++;
    const update: QueuedUpdate = {
      id,
      data,
      timestamp: Date.now(),
    };

    // Persist to IndexedDB
    await this.persistUpdate(update);

    // Update memory cache
    this.memoryCache.push(update);

    // Save nextId for recovery
    await this.setMetadata('nextId', this.nextId);

    return id;
  }

  /**
   * Persist an update to IndexedDB.
   */
  private async persistUpdate(update: QueuedUpdate): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Convert Uint8Array to regular array for storage
      const record: StoredQueuedUpdate = {
        id: update.id,
        data: Array.from(update.data),
        timestamp: update.timestamp,
      };

      const request = store.put(record);

      request.onerror = () => {
        reject(new Error(`Enqueue failed: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Remove and return the oldest update from the queue.
   * Uses IndexedDB transaction to ensure atomicity.
   */
  async dequeue(): Promise<QueuedUpdate | undefined> {
    this.ensureInitialized();

    if (this.memoryCache.length === 0) {
      return undefined;
    }

    const update = this.memoryCache[0];

    // Remove from IndexedDB first (atomic)
    await this.removeUpdate(update.id);

    // Then update memory cache
    this.memoryCache.shift();

    return update;
  }

  /**
   * Remove an update from IndexedDB.
   */
  private async removeUpdate(id: number): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Remove failed: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Look at the oldest update without removing it.
   * Synchronous access from memory cache.
   */
  peek(): QueuedUpdate | undefined {
    return this.memoryCache[0];
  }

  /**
   * Get the number of queued updates.
   * Synchronous access from memory cache.
   */
  get length(): number {
    return this.memoryCache.length;
  }

  /**
   * Check if the queue is empty.
   * Synchronous access from memory cache.
   */
  get isEmpty(): boolean {
    return this.memoryCache.length === 0;
  }

  /**
   * Clear all queued updates.
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Clear failed: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.memoryCache = [];
        resolve();
      };
    });
  }

  /**
   * Get a copy of all queued updates.
   */
  getAll(): QueuedUpdate[] {
    return [...this.memoryCache];
  }

  /**
   * Flush all queued updates in a single transaction.
   * Returns updates that were successfully dequeued.
   * Use this for batch sending to ensure atomicity.
   */
  async flushAll(): Promise<QueuedUpdate[]> {
    this.ensureInitialized();

    if (this.memoryCache.length === 0) {
      return [];
    }

    const updates = [...this.memoryCache];
    const db = await this.ensureDb();

    // Clear all in single transaction
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.onerror = () => {
        reject(new Error(`Flush failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        this.memoryCache = [];
        resolve(updates);
      };

      store.clear();
    });
  }

  /**
   * Load all queued updates from IndexedDB.
   */
  private async loadAll(): Promise<QueuedUpdate[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to load queue: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const results = (request.result as StoredQueuedUpdate[])
          .map((record) => ({
            id: record.id,
            data: new Uint8Array(record.data),
            timestamp: record.timestamp,
          }))
          // Sort by ID to maintain FIFO order
          .sort((a, b) => a.id - b.id);
        resolve(results);
      };
    });
  }

  /**
   * Save metadata value.
   */
  private async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(META_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(META_STORE_NAME);
      const request = store.put({ key, value });

      request.onerror = () => {
        reject(new Error(`Failed to save metadata: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get metadata value.
   */
  private async getMetadata<T>(key: string): Promise<T | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(META_STORE_NAME, 'readonly');
      const store = transaction.objectStore(META_STORE_NAME);
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to get metadata: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result?.value ?? null);
      };
    });
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }

  /**
   * Delete the entire database (for cleanup/testing).
   */
  static async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onerror = () => {
        reject(
          new Error(`Failed to delete database: ${request.error?.message}`)
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

/**
 * Create a new PersistentOfflineQueue instance.
 */
export function createPersistentOfflineQueue(): PersistentOfflineQueue {
  return new PersistentOfflineQueue();
}
