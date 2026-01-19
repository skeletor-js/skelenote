/**
 * Hook for querying archived items
 */

import { useMemo, useCallback } from 'react';
import { useObjects, useAnalyticsSafe } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';
import { removeMentionsFromContent } from '@/lib/editor';
import { AnalyticsEvents } from '@/lib/analytics';

export interface UseArchiveResult {
  /** All archived items sorted by updatedAt (most recently archived first) */
  items: SkelenoteObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Number of archived items */
  count: number;
  /** Unarchive an item (restore to normal views) */
  unarchiveItem: (itemId: string) => void;
  /** Delete an archived item permanently and clean up mentions */
  deleteItem: (itemId: string) => void;
}

/**
 * Hook for querying archived items
 *
 * @example
 * ```tsx
 * const { items, isLoading, count, unarchiveItem, deleteItem } = useArchive();
 *
 * return (
 *   <div>
 *     <h1>Archive ({count})</h1>
 *     {items.map(item => (
 *       <ArchiveRow
 *         key={item.id}
 *         item={item}
 *         onUnarchive={() => unarchiveItem(item.id)}
 *         onDelete={() => deleteItem(item.id)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useArchive(): UseArchiveResult {
  const { store, isLoading, refreshData, dataVersion } = useObjects();
  const analytics = useAnalyticsSafe();

  // Get all archived items sorted by updatedAt descending (most recently archived first)
  const items = useMemo(() => {
    if (!store) return [];

    const archived = store.getArchived();
    // Sort by updatedAt descending (most recently archived first)
    return archived.sort((a, b) => b.updatedAt - a.updatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Unarchive an item (restore to normal views)
  const unarchiveItem = useCallback(
    (itemId: string) => {
      if (!store) return;
      store.unarchive(itemId);
      refreshData();
    },
    [store, refreshData]
  );

  // Delete an archived item permanently and clean up mentions
  const deleteItem = useCallback(
    (itemId: string) => {
      if (!store) return;

      // Get item info before deleting for analytics
      const item = store.get(itemId);

      // Clean up mentions of this item in other objects' content
      const allObjects = store.getAll({ includeArchived: true });
      for (const obj of allObjects) {
        if (obj.id === itemId) continue;
        try {
          const content = store.getContent(obj.id);
          if (content) {
            const cleanedContent = removeMentionsFromContent(content, itemId);
            if (cleanedContent) {
              store.setContent(obj.id, cleanedContent);
            }
          }
        } catch {
          // Skip objects without content
        }
      }

      // Delete the item
      store.delete(itemId);
      refreshData();
      analytics?.track(AnalyticsEvents.OBJECT_DELETED, {
        object_type: item?.typeId,
      });
    },
    [store, refreshData, analytics]
  );

  return {
    items,
    isLoading,
    count: items.length,
    unarchiveItem,
    deleteItem,
  };
}
