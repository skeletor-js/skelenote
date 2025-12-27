/**
 * Hook for querying inbox items (objects with inboxed: true)
 */

import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';
import { removeMentionsFromContent } from '@/lib/editor';

export interface UseInboxResult {
  /** All inboxed items sorted by createdAt (newest first) */
  items: SkelenoteObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Number of items in inbox */
  count: number;
  /** Mark an item as processed (sets inboxed: false) */
  processItem: (itemId: string) => void;
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
  const { store, isLoading, refreshData } = useObjects();

  // Get all inboxed items, sorted by createdAt descending
  const items = useMemo(() => {
    if (!store) return [];

    const inboxed = store.getInboxed();
    // Sort by createdAt descending (newest first)
    return inboxed.sort((a, b) => b.createdAt - a.createdAt);
  }, [store]);

  // Mark an item as processed (removes from inbox)
  const processItem = useCallback(
    (itemId: string) => {
      if (!store) return;
      store.markProcessed(itemId);
      refreshData();
    },
    [store, refreshData]
  );

  // Delete an inbox item and clean up mentions
  const deleteItem = useCallback(
    (itemId: string) => {
      if (!store) return;

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
    },
    [store, refreshData]
  );

  return {
    items,
    isLoading,
    count: items.length,
    processItem,
    deleteItem,
  };
}
