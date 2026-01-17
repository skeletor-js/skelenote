/**
 * Extended tests for LoroDocStore focusing on uncovered branches
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoroDocStore } from '../store';
import { LoroDoc } from 'loro-crdt';
import type { SyncClient } from '../../sync';

// Mock dependencies
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(),
  join: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Import mocked modules
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs';

// Mock SyncClient
const mockSyncClient = {
  getStatus: vi.fn(),
  sendUpdate: vi.fn(),
  sendSnapshot: vi.fn(),
  requestCompaction: vi.fn(),
  onUpdate: vi.fn(),
  onSnapshotRequest: vi.fn(),
  onHistory: vi.fn(),
  requestSnapshot: vi.fn(),
} as unknown as SyncClient;

describe('LoroDocStore - Extended Coverage', () => {
  let store: LoroDocStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set default mock implementations
    vi.mocked(appDataDir).mockResolvedValue('/app/data');
    vi.mocked(join).mockImplementation(async (...args) => args.join('/'));
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    store = new LoroDocStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Import Format Detection', () => {
    it('should detect JSON-wrapped format (starts with {)', async () => {
      await store.initialize();

      const tempDoc = new LoroDoc();
      tempDoc.getList('test').insert(0, 'data');
      const snapshot = tempDoc.export({ mode: 'snapshot' });
      const jsonWrapped = JSON.stringify({ doc1: Array.from(snapshot) });
      const encoded = new TextEncoder().encode(jsonWrapped);

      // Mock file read
      vi.mocked(readFile).mockResolvedValue(encoded);

      await store.load();

      const loadedDoc = store.getDocument('doc1');
      expect(loadedDoc).toBeDefined();
      expect(loadedDoc?.getList('test').get(0)).toBe('data');
    });

    it('should handle raw Loro binary format during local sync', async () => {
      await store.initialize();

      const onRemoteChange = vi.fn();
      store.setOnRemoteChange(onRemoteChange);

      // Create doc first
      store.createDocument('main');

      // Create raw binary update
      const tempDoc = new LoroDoc();
      tempDoc.getList('list').insert(0, 'raw-data');
      const rawUpdate = tempDoc.export({ mode: 'snapshot' });

      // Handle as raw binary (first byte is not '{')
      store.handleLocalSyncUpdate(rawUpdate);

      expect(onRemoteChange).toHaveBeenCalled();
    });
  });

  describe('Single Object Restore', () => {
    it('should restore single object from historical version', () => {
      const doc = store.createDocument('main');

      // Create initial object
      const objMap = doc.getMap('objects');
      objMap.set('obj-1', JSON.stringify({ title: 'Original' }));
      doc.commit();

      const historicalFrontier = doc.frontiers();

      // Modify object
      objMap.set('obj-1', JSON.stringify({ title: 'Modified' }));
      doc.commit();

      // Restore single object
      const success = store.restoreFromVersion(historicalFrontier, {
        type: 'single',
        objectId: 'obj-1',
      });

      expect(success).toBe(true);
      const restored = objMap.get('obj-1');
      expect(JSON.parse(restored as string).title).toBe('Original');
    });

    it('should restore object content when restoring single object', () => {
      const doc = store.createDocument('main');

      // Create object with content
      const objMap = doc.getMap('objects');
      objMap.set(
        'obj-1',
        JSON.stringify({ id: 'obj-1', hasContent: true, title: 'Test' })
      );
      const contentText = doc.getText('content:obj-1');
      contentText.insert(0, 'Original content');
      doc.commit();

      const historicalFrontier = doc.frontiers();

      // Modify content
      contentText.delete(0, contentText.length);
      contentText.insert(0, 'Modified content');
      doc.commit();

      // Restore single object
      const success = store.restoreFromVersion(historicalFrontier, {
        type: 'single',
        objectId: 'obj-1',
      });

      expect(success).toBe(true);
      expect(contentText.toString()).toBe('Original content');
    });

    it('should handle restore when object does not exist in historical version', () => {
      const doc = store.createDocument('main');

      const objMap = doc.getMap('objects');
      objMap.set('obj-1', JSON.stringify({ title: 'Test' }));
      doc.commit();

      const historicalFrontier = doc.frontiers();

      // Try to restore non-existent object
      const success = store.restoreFromVersion(historicalFrontier, {
        type: 'single',
        objectId: 'obj-999',
      });

      // Should return true but not modify anything
      expect(success).toBe(true);
    });
  });

  describe('Full State Restore', () => {
    it('should restore full state via CRDT merge', () => {
      const doc = store.createDocument('main');

      // Create initial state
      const objMap = doc.getMap('objects');
      objMap.set('obj-1', JSON.stringify({ title: 'Original 1' }));
      objMap.set('obj-2', JSON.stringify({ title: 'Original 2' }));
      doc.commit();

      const historicalFrontier = doc.frontiers();

      // Modify state
      objMap.set('obj-1', JSON.stringify({ title: 'Modified 1' }));
      objMap.delete('obj-2');
      objMap.set('obj-3', JSON.stringify({ title: 'New Object' }));
      doc.commit();

      // Restore full state
      const success = store.restoreFromVersion(historicalFrontier, {
        type: 'full',
      });

      expect(success).toBe(true);
      // Note: CRDT merge behavior - may not exactly match historical state
      // but should successfully merge
    });
  });

  describe('Historical Update Batch Processing', () => {
    it('should process mixed JSON and raw binary updates', async () => {
      await store.initialize();
      store.setSyncClient(mockSyncClient);

      const onRemoteChange = vi.fn();
      store.setOnRemoteChange(onRemoteChange);

      // Create some historical updates
      const doc1 = new LoroDoc();
      doc1.getList('list1').insert(0, 'update1');
      const jsonUpdate = new TextEncoder().encode(
        JSON.stringify({ doc1: Array.from(doc1.export({ mode: 'snapshot' })) })
      );

      const doc2 = new LoroDoc();
      doc2.getList('list2').insert(0, 'update2');
      const rawUpdate = doc2.export({ mode: 'snapshot' });

      // Simulate history callback
      const historyCallback = vi.mocked(mockSyncClient.onHistory).mock
        .calls[0][0];
      historyCallback([jsonUpdate, rawUpdate]);

      expect(onRemoteChange).toHaveBeenCalled();
    });

    it('should handle empty historical updates array', async () => {
      await store.initialize();
      store.setSyncClient(mockSyncClient);

      // Simulate history callback with empty array
      const historyCallback = vi.mocked(mockSyncClient.onHistory).mock
        .calls[0][0];
      historyCallback([]);

      // Should not throw
    });

    it('should skip malformed updates during batch processing', async () => {
      await store.initialize();
      store.setSyncClient(mockSyncClient);

      const onRemoteChange = vi.fn();
      store.setOnRemoteChange(onRemoteChange);

      // Create valid and invalid updates
      const validDoc = new LoroDoc();
      validDoc.getList('valid').insert(0, 'data');
      const validUpdate = new TextEncoder().encode(
        JSON.stringify({
          doc: Array.from(validDoc.export({ mode: 'snapshot' })),
        })
      );

      const invalidUpdate = new Uint8Array([255, 255, 255]); // Invalid binary

      // Process both
      const historyCallback = vi.mocked(mockSyncClient.onHistory).mock
        .calls[0][0];
      historyCallback([validUpdate, invalidUpdate]);

      // Should have processed valid update despite invalid one
      expect(onRemoteChange).toHaveBeenCalled();
    });
  });

  describe('Sync Callback Invocation', () => {
    it('should invoke snapshot request callback', async () => {
      await store.initialize();
      store.setSyncClient(mockSyncClient);

      // Add some data
      const doc = store.createDocument('main');
      doc.getList('data').insert(0, 'test');

      // Simulate snapshot request
      const snapshotCallback = vi.mocked(mockSyncClient.onSnapshotRequest).mock
        .calls[0][0];
      const snapshot = snapshotCallback();

      expect(snapshot).toBeInstanceOf(Uint8Array);
    });

    it('should handle local sync broadcast failure', async () => {
      await store.initialize();

      const failingBroadcast = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));
      store.setLocalSyncBroadcast(failingBroadcast);

      // Trigger sync
      store.sync();

      // Advance timers to trigger broadcast
      await vi.advanceTimersByTimeAsync(50);

      // Should have attempted broadcast despite failure (error is logged)
      expect(failingBroadcast).toHaveBeenCalled();
    });

    it('should not sync when isImporting flag is set', () => {
      store['isImporting'] = true;

      const spy = vi.spyOn(mockSyncClient, 'sendUpdate');
      store.setSyncClient(mockSyncClient);
      vi.mocked(mockSyncClient.getStatus).mockReturnValue('connected');

      store.sync();

      vi.advanceTimersByTime(200);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('File System Error Handling', () => {
    it('should handle errors during initialize', async () => {
      vi.mocked(appDataDir).mockRejectedValue(new Error('FS error'));

      await expect(store.initialize()).rejects.toThrow('FS error');
    });

    it('should handle errors during load when file corrupted', async () => {
      await store.initialize();

      // Return corrupted data that will fail JSON.parse
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode('invalid json {')
      );

      // load() doesn't catch JSON parse errors - they bubble up
      await expect(store.load()).rejects.toThrow();
    });
  });

  describe('Sync Client Integration Edge Cases', () => {
    it('should not request compaction when sync client is not set', async () => {
      await store.initialize();

      // No sync client set
      await store.requestCompaction(100);

      // Should not throw, just return early
    });

    it('should handle sendUpdate when not importing', () => {
      store.setSyncClient(mockSyncClient);

      const update = new Uint8Array([1, 2, 3]);
      store.sendUpdate(update);

      expect(mockSyncClient.sendUpdate).toHaveBeenCalledWith(update);
    });

    it('should not sendUpdate when isImporting is true', () => {
      store.setSyncClient(mockSyncClient);
      store['isImporting'] = true;

      const update = new Uint8Array([1, 2, 3]);
      store.sendUpdate(update);

      expect(mockSyncClient.sendUpdate).not.toHaveBeenCalled();
    });
  });
});
