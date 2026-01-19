/**
 * Hook for managing pinned objects in the sidebar
 */

import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';

export interface UsePinnedObjectsResult {
  /** Pinned objects in display order */
  pinnedObjects: SkelenoteObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Number of pinned items */
  count: number;
  /** Pin an object to the sidebar */
  pin: (objectId: string) => void;
  /** Unpin an object from the sidebar */
  unpin: (objectId: string) => void;
  /** Toggle pin state for an object */
  togglePin: (objectId: string) => void;
  /** Reorder pinned objects */
  reorder: (objectIds: string[]) => void;
  /** Check if an object is pinned */
  isPinned: (objectId: string) => boolean;
}

/**
 * Hook for managing pinned objects
 *
 * @example
 * ```tsx
 * const { pinnedObjects, pin, unpin, reorder } = usePinnedObjects();
 *
 * return (
 *   <div>
 *     {pinnedObjects.map(obj => (
 *       <PinnedItem key={obj.id} object={obj} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function usePinnedObjects(): UsePinnedObjectsResult {
  const { store, isLoading, refreshData, dataVersion } = useObjects();

  // Get all pinned objects in order
  const pinnedObjects = useMemo(() => {
    if (!store) return [];
    return store.getPinnedObjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Pin an object
  const pin = useCallback(
    (objectId: string) => {
      if (!store) return;
      store.pin(objectId);
      refreshData();
    },
    [store, refreshData]
  );

  // Unpin an object
  const unpin = useCallback(
    (objectId: string) => {
      if (!store) return;
      store.unpin(objectId);
      refreshData();
    },
    [store, refreshData]
  );

  // Toggle pin state
  const togglePin = useCallback(
    (objectId: string) => {
      if (!store) return;
      const obj = store.get(objectId);
      if (!obj) return;

      if (obj.pinned) {
        store.unpin(objectId);
      } else {
        store.pin(objectId);
      }
      refreshData();
    },
    [store, refreshData]
  );

  // Reorder pinned objects
  const reorder = useCallback(
    (objectIds: string[]) => {
      if (!store) return;
      store.reorderPinned(objectIds);
      refreshData();
    },
    [store, refreshData]
  );

  // Check if an object is pinned
  const isPinned = useCallback(
    (objectId: string): boolean => {
      if (!store) return false;
      const obj = store.get(objectId);
      return obj?.pinned ?? false;
    },
    [store]
  );

  return {
    pinnedObjects,
    isLoading,
    count: pinnedObjects.length,
    pin,
    unpin,
    togglePin,
    reorder,
    isPinned,
  };
}
