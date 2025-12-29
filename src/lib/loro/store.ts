import { LoroDoc, type Frontiers } from 'loro-crdt';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs';
import type { SyncClient } from '../sync';
import {
  getVersionHistory as extractVersionHistory,
  type VersionHistory,
} from './versions';

/**
 * LoroDocStore manages Loro CRDT documents with persistence to the local file system.
 * Uses Tauri's app_data_dir for storage (~/.local/share/skelenote or ~/Library/Application Support/skelenote)
 */
export class LoroDocStore {
  private documents: Map<string, LoroDoc> = new Map();
  private dataPath: string | null = null;
  private initialized = false;
  private syncClient: SyncClient | null = null;
  private onRemoteChangeCallback: (() => void) | null = null;
  private isImporting = false; // Flag to prevent sync loops
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private localSyncBroadcast: ((data: Uint8Array) => Promise<number>) | null = null;
  private localSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
    // Enable automatic timestamp recording for Time Machine feature
    doc.setRecordTimestamp(true);
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
   * Check if data is JSON-wrapped (from exportAll) vs raw Loro binary
   * JSON-wrapped data starts with '{' (0x7B)
   */
  private isJsonWrapped(data: Uint8Array): boolean {
    return data.length > 0 && data[0] === 0x7b; // '{' character
  }

  /**
   * Import raw Loro binary data into all existing documents
   * Used for historical updates that aren't JSON-wrapped
   */
  private importRaw(data: Uint8Array): void {
    // Try to import into each document - Loro will ignore if not applicable
    for (const [, doc] of this.documents) {
      try {
        doc.import(data);
      } catch {
        // This update may not be for this document, which is fine
      }
    }
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
        // Enable automatic timestamp recording for Time Machine feature
        doc.setRecordTimestamp(true);
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
   * Broadcasts to both cloud sync and local network peers
   */
  sync(): void {
    if (this.isImporting) {
      console.log('[LoroDocStore] sync() skipped - isImporting');
      return;
    }

    // Cloud sync (debounced)
    if (this.syncClient && this.isSyncConnected()) {
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

    // Local network sync (debounced separately, faster)
    console.log('[LoroDocStore] sync() called, localSyncBroadcast =', !!this.localSyncBroadcast);
    if (this.localSyncBroadcast) {
      if (this.localSyncDebounceTimer) {
        clearTimeout(this.localSyncDebounceTimer);
      }

      this.localSyncDebounceTimer = setTimeout(() => {
        this.localSyncDebounceTimer = null;
        if (this.localSyncBroadcast && !this.isImporting) {
          const data = this.exportAll();
          console.log('[LoroDocStore] Broadcasting local sync, data size:', data.length);
          this.localSyncBroadcast(data).then((count) => {
            console.log('[LoroDocStore] Broadcast sent to', count, 'peers');
          }).catch((err) => {
            console.warn('[LoroDocStore] Local sync broadcast failed:', err);
          });
        }
      }, 50); // Faster debounce for local network (lower latency)
    }
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

    // Enable timestamp recording for all loaded documents
    // This ensures future changes will have timestamps even if historical data doesn't
    for (const [, doc] of this.documents) {
      doc.setRecordTimestamp(true);
    }
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
   * Set the sync client for cross-device synchronization (cloud relay)
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

    // Handle historical updates for catch-up
    client.onHistory((updates: Uint8Array[]) => {
      this.applyHistoricalUpdates(updates);
    });
  }

  /**
   * Set the local network sync broadcast function
   * This is called by LocalSyncContext to wire up local peer broadcasting
   */
  setLocalSyncBroadcast(broadcast: ((data: Uint8Array) => Promise<number>) | null): void {
    this.localSyncBroadcast = broadcast;
  }

  /**
   * Handle an update received from a local network peer
   * Uses the same CRDT merge logic as cloud sync
   */
  handleLocalSyncUpdate(data: Uint8Array): void {
    console.log('[LoroDocStore] Received local sync update, size:', data.length);
    this.isImporting = true;
    try {
      // Try to import as a full snapshot (JSON-wrapped)
      if (this.isJsonWrapped(data)) {
        this.importAll(data);
        console.log('[LoroDocStore] Local sync import successful');
      } else {
        // Raw Loro binary
        this.importRaw(data);
        console.log('[LoroDocStore] Local sync raw import successful');
      }

      // Notify listeners that data has changed
      if (this.onRemoteChangeCallback) {
        this.onRemoteChangeCallback();
      }
    } catch (err) {
      console.warn('[LoroDocStore] Failed to import local sync update:', err);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Apply a batch of historical updates received during catch-up
   * Handles both old format (raw Loro binary) and new format (JSON-wrapped)
   */
  applyHistoricalUpdates(updates: Uint8Array[]): void {
    if (updates.length === 0) return;

    console.log(`[LoroDocStore] Applying ${updates.length} historical updates`);

    this.isImporting = true;
    try {
      for (const update of updates) {
        try {
          if (this.isJsonWrapped(update)) {
            // New format: JSON-wrapped snapshot from exportAll()
            this.importAll(update);
          } else {
            // Old format: raw Loro binary
            this.importRaw(update);
          }
        } catch (err) {
          console.warn('[LoroDocStore] Failed to import historical update:', err);
        }
      }

      // Notify listeners that data has changed
      if (this.onRemoteChangeCallback) {
        this.onRemoteChangeCallback();
      }
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Request compaction of server-side updates
   *
   * Call this periodically to reduce server storage and improve catch-up times.
   * The current snapshot is sent to replace all updates up to the given sequence.
   */
  async requestCompaction(upToSequence: number): Promise<void> {
    if (!this.syncClient) return;

    const snapshot = this.exportAll();
    await this.syncClient.requestCompaction(upToSequence, snapshot);
    console.log(`[LoroDocStore] Requested compaction up to sequence ${upToSequence}`);
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
    console.log('[LoroDocStore] Received remote update, size:', data.length);
    this.isImporting = true;
    try {
      // Try to import as a full snapshot first (contains all documents)
      this.importAll(data);
      console.log('[LoroDocStore] Import successful');

      // Notify listeners that remote data has changed
      if (this.onRemoteChangeCallback) {
        console.log('[LoroDocStore] Calling onRemoteChangeCallback');
        this.onRemoteChangeCallback();
      } else {
        console.warn('[LoroDocStore] No onRemoteChangeCallback registered');
      }
    } catch (err) {
      // If it fails, it might be a single document update
      // For now, we only sync full snapshots
      console.warn('[LoroDocStore] Failed to import remote update:', err);
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

  // ============================================
  // Version History Methods (Time Machine)
  // ============================================

  /**
   * Get the complete version history from the main document.
   *
   * Returns all change points sorted by timestamp, grouped by date,
   * with earliest and latest timestamps.
   */
  getVersionHistory(): VersionHistory {
    const mainDoc = this.documents.get('main');
    if (!mainDoc) {
      return {
        changePoints: [],
        byDate: new Map(),
        earliest: null,
        latest: null,
      };
    }

    return extractVersionHistory(mainDoc);
  }

  /**
   * Create a forked document at a specific frontier for safe preview.
   *
   * This creates an independent copy of the document at the historical state,
   * which can be safely read without affecting the live document.
   *
   * @param frontier - The frontier to fork at
   * @returns A new LoroDoc at the historical state, or null if fork fails
   */
  forkAtVersion(frontier: Frontiers): LoroDoc | null {
    const mainDoc = this.documents.get('main');
    if (!mainDoc) {
      console.warn('[LoroDocStore] Cannot fork: no main document');
      return null;
    }

    try {
      return mainDoc.forkAt(frontier);
    } catch (error) {
      console.error('[LoroDocStore] Failed to fork at version:', error);
      return null;
    }
  }

  /**
   * Get all objects at a historical frontier.
   *
   * Creates a forked document at the frontier and extracts all objects.
   * Returns an empty array if the fork fails.
   *
   * @param frontier - The frontier to get objects at
   * @returns Array of objects at that historical state
   */
  getObjectsAtVersion(frontier: Frontiers): Array<{
    id: string;
    typeId: string;
    properties: Record<string, unknown>;
    hasContent: boolean;
    inboxed: boolean;
    createdAt: number;
    updatedAt: number;
  }> {
    const forkedDoc = this.forkAtVersion(frontier);
    if (!forkedDoc) {
      return [];
    }

    try {
      const objectsMap = forkedDoc.getMap('objects');
      const contentsMap = forkedDoc.getMap('contents');
      const entries = objectsMap.toJSON() as Record<string, string>;
      const contents = contentsMap.toJSON() as Record<string, string>;
      const objects: Array<{
        id: string;
        typeId: string;
        properties: Record<string, unknown>;
        hasContent: boolean;
        inboxed: boolean;
        createdAt: number;
        updatedAt: number;
      }> = [];

      for (const [id, data] of Object.entries(entries)) {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            // Include content in properties if it exists
            if (parsed.hasContent && contents[id]) {
              parsed.properties = {
                ...parsed.properties,
                content: contents[id],
              };
            }
            objects.push(parsed);
          } catch {
            // Skip malformed entries
          }
        }
      }

      return objects;
    } catch (error) {
      console.error('[LoroDocStore] Failed to get objects at version:', error);
      return [];
    }
  }

  /**
   * Restore from a historical version using CRDT merge.
   *
   * This operation is safe and preserves all history. The historical state
   * is merged into the current document, and the change syncs automatically
   * to connected devices.
   *
   * @param frontier - The frontier to restore from
   * @param scope - Whether to restore full state or a single object
   * @returns True if restore succeeded, false otherwise
   */
  restoreFromVersion(
    frontier: Frontiers,
    scope: { type: 'full' } | { type: 'single'; objectId: string }
  ): boolean {
    const mainDoc = this.documents.get('main');
    if (!mainDoc) {
      console.warn('[LoroDocStore] Cannot restore: no main document');
      return false;
    }

    try {
      // Fork at the historical version
      const forkedDoc = mainDoc.forkAt(frontier);
      if (!forkedDoc) {
        console.error('[LoroDocStore] Failed to fork for restore');
        return false;
      }

      if (scope.type === 'single') {
        // For single object restore, we need to get the historical object
        // and update it in the main document
        const objectsMap = forkedDoc.getMap('objects');
        const historicalData = objectsMap.get(scope.objectId);

        if (historicalData !== undefined) {
          // Update the object in the main document
          const mainObjectsMap = mainDoc.getMap('objects');
          mainObjectsMap.set(scope.objectId, historicalData);

          // Also restore content if it exists
          const contentKey = `content:${scope.objectId}`;
          const historicalContent = forkedDoc.getText(contentKey);
          if (historicalContent) {
            const mainContent = mainDoc.getText(contentKey);
            // Clear and restore content
            const contentStr = historicalContent.toString();
            const currentLength = mainContent.length;
            if (currentLength > 0) {
              mainContent.delete(0, currentLength);
            }
            mainContent.insert(0, contentStr);
          }
        }
      } else {
        // For full restore, export the forked state and import into main
        // This will merge via CRDT, preserving all history
        const snapshot = forkedDoc.export({ mode: 'snapshot' });
        mainDoc.import(snapshot);
      }

      // Trigger sync to connected devices
      this.sync();

      console.log(
        `[LoroDocStore] Restored ${scope.type === 'single' ? `object ${scope.objectId}` : 'full state'}`
      );
      return true;
    } catch (error) {
      console.error('[LoroDocStore] Failed to restore from version:', error);
      return false;
    }
  }
}
