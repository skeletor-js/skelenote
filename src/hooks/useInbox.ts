/**
 * Hook for querying inbox items (objects with inboxed: true)
 * Excludes tags and projects since they appear in sidebar and don't need decisioning
 */

import { useMemo, useCallback, useState } from 'react';
import { useObjects, useAnalyticsSafe } from '@/contexts';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { removeMentionsFromContent } from '@/lib/editor';
import { AnalyticsEvents } from '@/lib/analytics';

/** Default number of items to load per page */
const PAGE_SIZE = 50;

/** Types to exclude from inbox (they appear in sidebar and don't need decisioning) */
const EXCLUDED_INBOX_TYPES = [
  BuiltInTypeIds.TAG,
  BuiltInTypeIds.PROJECT,
  BuiltInTypeIds.AREA,
];

export interface UseInboxResult {
  /** Paginated inboxed items sorted by createdAt (newest first) */
  items: SkelenoteObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Number of currently loaded items */
  count: number;
  /** Total number of items in inbox (before pagination) */
  totalCount: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Load more items */
  loadMore: () => void;
  /** Mark an item as processed (sets inboxed: false) */
  processItem: (itemId: string) => void;
  /** Archive an inbox item (hides from default views) */
  archiveItem: (itemId: string) => void;
  /** Delete an inbox item and clean up mentions */
  deleteItem: (itemId: string) => void;
}

/**
 * Hook for querying inbox items
 *
 * @example
 * ```tsx
 * const { items, isLoading, count } = useInbox();
 *
 * return (
 *   <div>
 *     <h1>Inbox ({count})</h1>
 *     {items.map(item => (
 *       <InboxRow key={item.id} item={item} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useInbox(): UseInboxResult {
  const { store, isLoading, refreshData, dataVersion } = useObjects();
  const analytics = useAnalyticsSafe();
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Get all inboxed items, excluding tags and projects, sorted by createdAt descending
  const allItems = useMemo(() => {
    if (!store) return [];

    const inboxed = store.getInboxed();
    // Filter out excluded types (tags, projects) and sort by createdAt descending (newest first)
    return inboxed
      .filter(
        (item) =>
          !(EXCLUDED_INBOX_TYPES as readonly string[]).includes(item.typeId)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Paginate items
  const items = useMemo(() => allItems.slice(0, limit), [allItems, limit]);

  // Pagination helpers
  const totalCount = allItems.length;
  const hasMore = limit < totalCount;
  const loadMore = useCallback(() => {
    setLimit((prev) => prev + PAGE_SIZE);
  }, []);

  // Mark an item as processed (removes from inbox)
  const processItem = useCallback(
    (itemId: string) => {
      if (!store) return;
      store.markProcessed(itemId);
      refreshData();
    },
    [store, refreshData]
  );

  // Archive an inbox item
  const archiveItem = useCallback(
    (itemId: string) => {
      if (!store) return;
      const item = store.get(itemId);
      store.archive(itemId);
      refreshData();
      analytics?.track(AnalyticsEvents.OBJECT_ARCHIVED, {
        object_type: item?.typeId,
      });
    },
    [store, refreshData, analytics]
  );

  // Delete an inbox item and clean up mentions
  const deleteItem = useCallback(
    (itemId: string) => {
      if (!store) return;

      // Get item info before deleting for analytics
      const item = store.get(itemId);

      // Clean up mentions of this item in other objects' content
      const allObjects = store.getAll();
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
    totalCount,
    hasMore,
    loadMore,
    processItem,
    archiveItem,
    deleteItem,
  };
}
