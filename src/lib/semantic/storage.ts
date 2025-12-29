/**
 * Embedding Storage
 *
 * Persists embeddings in IndexedDB for durability across sessions.
 * Supports bulk operations for efficient startup loading.
 */

import { EmbeddingRecord } from './types';

const DB_NAME = 'skelenote-semantic';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';
const META_STORE_NAME = 'metadata';

/**
 * Open the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create embeddings store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'objectId' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('modelVersion', 'modelVersion', { unique: false });
      }

      // Create metadata store for config
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Embedding storage using IndexedDB.
 */
export class EmbeddingStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the storage (opens database).
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }
    this.db = await openDatabase();
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
   * Save an embedding record.
   */
  async save(record: EmbeddingRecord): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Convert Float32Array to regular array for storage
      const storableRecord = {
        ...record,
        embedding: Array.from(record.embedding),
      };

      const request = store.put(storableRecord);

      request.onerror = () => {
        reject(new Error(`Failed to save embedding: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Save multiple embedding records in a single transaction.
   */
  async saveBatch(records: EmbeddingRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.onerror = () => {
        reject(new Error(`Batch save failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      for (const record of records) {
        const storableRecord = {
          ...record,
          embedding: Array.from(record.embedding),
        };
        store.put(storableRecord);
      }
    });
  }

  /**
   * Get an embedding record by object ID.
   */
  async get(objectId: string): Promise<EmbeddingRecord | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(objectId);

      request.onerror = () => {
        reject(new Error(`Failed to get embedding: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Convert array back to Float32Array
        resolve({
          ...result,
          embedding: new Float32Array(result.embedding),
        });
      };
    });
  }

  /**
   * Delete an embedding record.
   */
  async delete(objectId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(objectId);

      request.onerror = () => {
        reject(new Error(`Failed to delete embedding: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete multiple embedding records.
   */
  async deleteBatch(objectIds: string[]): Promise<void> {
    if (objectIds.length === 0) {
      return;
    }

    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.onerror = () => {
        reject(new Error(`Batch delete failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      for (const objectId of objectIds) {
        store.delete(objectId);
      }
    });
  }

  /**
   * Get all embedding records.
   */
  async getAll(): Promise<EmbeddingRecord[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get all embeddings: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const results = request.result.map((record) => ({
          ...record,
          embedding: new Float32Array(record.embedding),
        }));
        resolve(results);
      };
    });
  }

  /**
   * Get all object IDs that have embeddings.
   */
  async getAllObjectIds(): Promise<string[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => {
        reject(new Error(`Failed to get object IDs: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  /**
   * Get the count of stored embeddings.
   */
  async count(): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onerror = () => {
        reject(new Error(`Failed to count embeddings: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Clear all embeddings.
   */
  async clear(): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear embeddings: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get embeddings with outdated model version.
   */
  async getOutdatedByModel(currentModelVersion: string): Promise<string[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get outdated embeddings: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const outdated = request.result
          .filter((record) => record.modelVersion !== currentModelVersion)
          .map((record) => record.objectId);
        resolve(outdated);
      };
    });
  }

  /**
   * Save metadata value.
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
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
  async getMetadata<T>(key: string): Promise<T | null> {
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
  }

  /**
   * Delete the entire database (for cleanup when disabling feature).
   */
  static async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

/**
 * Create a new EmbeddingStorage instance.
 */
export function createEmbeddingStorage(): EmbeddingStorage {
  return new EmbeddingStorage();
}

/**
 * Generate a content hash for change detection.
 * Uses a simple hash function suitable for change detection (not cryptographic).
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}
