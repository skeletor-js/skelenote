/**
 * Semantic Index Sync Hook
 *
 * Automatically syncs object changes to the semantic search index.
 * Detects creates/updates/deletes via dataVersion changes.
 * Content changes are notified explicitly and flushed on editor blur.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useObjects } from '@/contexts';
import {
  getIndexableContentForObject,
  hashContent,
  SemanticEngine,
} from '@/lib/semantic';

interface PendingChange {
  objectId: string;
  type: 'upsert' | 'delete';
}

interface UseSemanticIndexSyncOptions {
  /** Get the current engine instance */
  getEngine: () => SemanticEngine | null;
  /** Whether semantic search is enabled */
  isEnabled: boolean;
  /** Current engine status (for detecting when engine becomes ready) */
  engineStatus: string;
}

/**
 * Hook that syncs object changes to the semantic search index.
 * Returns handlers for content change notifications.
 */
export function useSemanticIndexSync({
  getEngine,
  isEnabled,
  engineStatus,
}: UseSemanticIndexSyncOptions) {
  const { store, typeRegistry, dataVersion } = useObjects();

  // Track content hashes to detect changes
  const objectHashesRef = useRef<Map<string, string>>(new Map());

  // Track previous object IDs to detect deletions
  const previousObjectIdsRef = useRef<Set<string>>(new Set());

  // Queue of pending changes (for when engine not ready)
  const pendingChangesRef = useRef<Map<string, PendingChange>>(new Map());

  // Track objects with pending content changes (not yet flushed)
  const pendingContentChangesRef = useRef<Set<string>>(new Set());

  // Process a single change
  const processChange = useCallback(
    async (change: PendingChange) => {
      const engine = getEngine();
      if (!engine || !engine.isReady || !store) {
        return false; // Not ready, keep in queue
      }

      try {
        if (change.type === 'delete') {
          await engine.removeFromIndex(change.objectId);
          objectHashesRef.current.delete(change.objectId);
        } else {
          const indexable = getIndexableContentForObject(
            change.objectId,
            store,
            typeRegistry
          );
          if (indexable) {
            await engine.indexSingle(indexable);
            // Update tracked hash
            const newHash = hashContent(indexable.title + indexable.content);
            objectHashesRef.current.set(change.objectId, newHash);
          }
        }
        return true; // Successfully processed
      } catch (err) {
        console.warn(`Failed to index ${change.objectId}:`, err);
        return true; // Remove from queue even on error to prevent infinite retries
      }
    },
    [getEngine, store, typeRegistry]
  );

  // Process all pending changes
  const processPendingChanges = useCallback(async () => {
    const engine = getEngine();
    if (!engine || !engine.isReady) {
      return;
    }

    const pending = Array.from(pendingChangesRef.current.values());
    for (const change of pending) {
      const success = await processChange(change);
      if (success) {
        pendingChangesRef.current.delete(change.objectId);
      }
    }
  }, [getEngine, processChange]);

  // Queue a change for processing
  const queueChange = useCallback(
    (objectId: string, type: 'upsert' | 'delete') => {
      pendingChangesRef.current.set(objectId, { objectId, type });

      // Try to process immediately
      const engine = getEngine();
      if (engine?.isReady) {
        processChange({ objectId, type }).then((success) => {
          if (success) {
            pendingChangesRef.current.delete(objectId);
          }
        });
      }
    },
    [getEngine, processChange]
  );

  // Ref to track debounce timer for data version changes
  const dataVersionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Detect changes when dataVersion changes (create, update properties, delete)
  // Debounced to prevent O(n) rescans on rapid mutations
  useEffect(() => {
    if (!store || !isEnabled) return;

    // Clear existing debounce timer
    if (dataVersionDebounceRef.current) {
      clearTimeout(dataVersionDebounceRef.current);
    }

    // Debounce the rescan by 500ms to batch rapid mutations
    dataVersionDebounceRef.current = setTimeout(() => {
      const currentObjects = store.getAll({ includeArchived: true });
      const currentIds = new Set(currentObjects.map((o) => o.id));

      // Detect deletions
      for (const prevId of previousObjectIdsRef.current) {
        if (!currentIds.has(prevId)) {
          queueChange(prevId, 'delete');
        }
      }

      // Detect creates and property updates
      for (const obj of currentObjects) {
        const indexable = getIndexableContentForObject(
          obj.id,
          store,
          typeRegistry
        );
        if (!indexable) continue;

        const currentHash = hashContent(indexable.title + indexable.content);
        const previousHash = objectHashesRef.current.get(obj.id);

        // Skip if this object has a pending content change (will be handled on flush)
        if (pendingContentChangesRef.current.has(obj.id)) {
          continue;
        }

        if (previousHash !== currentHash) {
          queueChange(obj.id, 'upsert');
        }
      }

      // Update previous IDs for next comparison
      previousObjectIdsRef.current = currentIds;
    }, 500);

    // Cleanup on unmount or re-run
    return () => {
      if (dataVersionDebounceRef.current) {
        clearTimeout(dataVersionDebounceRef.current);
      }
    };
  }, [dataVersion, store, isEnabled, typeRegistry, queueChange]);

  // Process queue when engine becomes ready
  useEffect(() => {
    if (engineStatus === 'ready' && pendingChangesRef.current.size > 0) {
      processPendingChanges();
    }
  }, [engineStatus, processPendingChanges]);

  // Initialize hash tracking when semantic search is enabled
  useEffect(() => {
    if (!store || !isEnabled) return;

    // Build initial hash map from current objects
    const objects = store.getAll({ includeArchived: true });
    for (const obj of objects) {
      const indexable = getIndexableContentForObject(
        obj.id,
        store,
        typeRegistry
      );
      if (indexable) {
        const hash = hashContent(indexable.title + indexable.content);
        objectHashesRef.current.set(obj.id, hash);
      }
    }

    previousObjectIdsRef.current = new Set(objects.map((o) => o.id));
  }, [isEnabled, store, typeRegistry]);

  // Notify that an object's content changed (called while typing)
  const notifyContentChange = useCallback((objectId: string) => {
    pendingContentChangesRef.current.add(objectId);
  }, []);

  // Flush pending content changes immediately (called on blur/navigation)
  const flushContentChanges = useCallback(
    (objectId?: string) => {
      if (objectId) {
        if (pendingContentChangesRef.current.has(objectId)) {
          pendingContentChangesRef.current.delete(objectId);
          queueChange(objectId, 'upsert');
        }
      } else {
        // Flush all
        for (const id of pendingContentChangesRef.current) {
          queueChange(id, 'upsert');
        }
        pendingContentChangesRef.current.clear();
      }
    },
    [queueChange]
  );

  return {
    notifyContentChange,
    flushContentChanges,
  };
}
