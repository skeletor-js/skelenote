import { LoroDoc } from 'loro-crdt';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs';
import type { SyncClient } from '../sync';

/**
 * LoroDocStore manages Loro CRDT documents with persistence to the local file system.
 * Uses Tauri's app_data_dir for storage (~/.local/share/ephemera or ~/Library/Application Support/ephemera)
 */
export class LoroDocStore {
  private documents: Map<string, LoroDoc> = new Map();
  private dataPath: string | null = null;
  private initialized = false;
  private syncClient: SyncClient | null = null;
  private onRemoteChangeCallback: (() => void) | null = null;
  private isImporting = false; // Flag to prevent sync loops
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize the store by setting up the data directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get the app data directory path
      const appData = await appDataDir();
      this.dataPath = await join(appData, 'data');

      // Create data directory if it doesn't exist
      const dirExists = await exists(this.dataPath);
      if (!dirExists) {
        await mkdir(this.dataPath, { recursive: true });
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize LoroDocStore:', error);
      throw error;
    }
  }

  /**
   * Create a new Loro document with the given ID
   */
  createDocument(id: string): LoroDoc {
    const doc = new LoroDoc();
    this.documents.set(id, doc);
    return doc;
  }

  /**
   * Get an existing document by ID
   */
  getDocument(id: string): LoroDoc | undefined {
    return this.documents.get(id);
  }

  /**
   * Get or create a document with the given ID
   */
  getOrCreateDocument(id: string): LoroDoc {
    let doc = this.documents.get(id);
    if (!doc) {
      doc = this.createDocument(id);
    }
    return doc;
  }

  /**
   * Delete a document from the store
   */
  deleteDocument(id: string): boolean {
    return this.documents.delete(id);
  }

  /**
   * Export all documents to a single binary snapshot
   */
  exportAll(): Uint8Array {
    const exportData: Record<string, Uint8Array> = {};

    for (const [id, doc] of this.documents) {
      exportData[id] = doc.export({ mode: 'snapshot' });
    }

    // Encode the map as JSON with base64-encoded snapshots
    const jsonData = JSON.stringify(
      Object.fromEntries(
        Object.entries(exportData).map(([id, bytes]) => [
          id,
          Array.from(bytes),
        ])
      )
    );

    return new TextEncoder().encode(jsonData);
  }

  /**
   * Import documents from a binary snapshot
   * Merges into existing documents using CRDT, or creates new ones
   */
  importAll(data: Uint8Array): void {
    const jsonData = new TextDecoder().decode(data);
    const parsed = JSON.parse(jsonData) as Record<string, number[]>;

    for (const [id, bytesArray] of Object.entries(parsed)) {
      const bytes = new Uint8Array(bytesArray);
      // Get existing doc or create new one
      let doc = this.documents.get(id);
      if (doc) {
        // Import into existing doc (CRDT merge)
        doc.import(bytes);
      } else {
        // Create new doc for documents we don't have yet
        doc = new LoroDoc();
        doc.import(bytes);
        this.documents.set(id, doc);
      }
    }
  }

  /**
   * Save all documents to disk (does not broadcast)
   */
  async save(): Promise<void> {
    if (!this.initialized || !this.dataPath) {
      throw new Error('LoroDocStore not initialized');
    }

    const data = this.exportAll();
    const filePath = await join(this.dataPath, 'store.loro');

    await writeFile(filePath, data);
  }

  /**
   * Broadcast current state to connected devices (debounced, no disk write)
   * Call this frequently - it will debounce to avoid flooding
   */
  sync(): void {
    if (!this.syncClient || !this.isSyncConnected() || this.isImporting) {
      return;
    }

    // Debounce: wait 100ms before actually sending
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.syncDebounceTimer = null;
      if (this.syncClient && this.isSyncConnected() && !this.isImporting) {
        const data = this.exportAll();
        this.syncClient.sendUpdate(data);
      }
    }, 100);
  }

  /**
   * Check if sync client is connected
   */
  isSyncConnected(): boolean {
    return this.syncClient?.getStatus() === 'connected';
  }

  /**
   * Load documents from disk
   */
  async load(): Promise<void> {
    if (!this.initialized || !this.dataPath) {
      throw new Error('LoroDocStore not initialized');
    }

    const filePath = await join(this.dataPath, 'store.loro');
    const fileExists = await exists(filePath);

    if (!fileExists) {
      return; // No saved data yet
    }

    const data = await readFile(filePath);
    this.importAll(data);
  }

  /**
   * Get list of all document IDs
   */
  getDocumentIds(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Clear all documents from memory (does not delete from disk)
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Set the sync client for cross-device synchronization
   */
  setSyncClient(client: SyncClient): void {
    this.syncClient = client;

    // Handle incoming updates from other devices
    client.onUpdate((data: Uint8Array) => {
      this.handleRemoteUpdate(data);
    });

    // Handle snapshot requests from other devices
    client.onSnapshotRequest(() => {
      return this.exportAll();
    });
  }

  /**
   * Set callback for when remote changes are received
   */
  setOnRemoteChange(callback: () => void): void {
    this.onRemoteChangeCallback = callback;
  }

  /**
   * Send a local update to other connected devices
   */
  sendUpdate(update: Uint8Array): void {
    if (this.syncClient && !this.isImporting) {
      this.syncClient.sendUpdate(update);
    }
  }

  /**
   * Handle an update received from another device
   */
  private handleRemoteUpdate(data: Uint8Array): void {
    this.isImporting = true;
    try {
      // Try to import as a full snapshot first (contains all documents)
      this.importAll(data);

      // Notify listeners that remote data has changed
      if (this.onRemoteChangeCallback) {
        this.onRemoteChangeCallback();
      }
    } catch {
      // If it fails, it might be a single document update
      // For now, we only sync full snapshots
      console.warn('[LoroDocStore] Failed to import remote update');
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Request a full snapshot from another connected device
   */
  requestSnapshot(): void {
    this.syncClient?.requestSnapshot();
  }

  /**
   * Broadcast current state to all connected devices
   */
  broadcastSnapshot(): void {
    if (this.syncClient) {
      const snapshot = this.exportAll();
      this.syncClient.sendSnapshot(snapshot);
    }
  }
}
