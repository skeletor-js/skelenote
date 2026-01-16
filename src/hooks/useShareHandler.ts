/**
 * useShareHandler Hook
 * Processes content shared from other apps via iOS Share Extension or Android Share Intent
 * Creates Link or Note objects in the Inbox when content is received
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePlatform } from './usePlatform';
import { useObjects, useToast } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import {
  getPendingShares,
  clearPendingShares,
  isUrl,
  extractTitleFromUrl,
  type PendingShare,
} from '@/lib/share';

export interface UseShareHandlerResult {
  /** Manually check for pending shares */
  checkPendingShares: () => Promise<void>;
}

/**
 * Hook for handling content shared from other apps
 *
 * Features:
 * - Checks for pending shares on mount
 * - Checks again when app becomes visible (returns from background)
 * - Creates Link objects for URLs
 * - Creates Note objects for text
 * - Shows toast notification on success
 *
 * @example
 * ```tsx
 * // In App.tsx or a provider component
 * function App() {
 *   useShareHandler(); // Automatically processes shares
 *   return <AppContent />;
 * }
 * ```
 */
export function useShareHandler(): UseShareHandlerResult {
  const { isMobile } = usePlatform();
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();
  const isProcessing = useRef(false);

  // Process a single share item
  const processShare = useCallback(
    async (share: PendingShare): Promise<boolean> => {
      if (!store) return false;

      try {
        if (share.type === 'url' && share.url) {
          // Create Link object
          const title = share.text || extractTitleFromUrl(share.url);
          store.create({
            typeId: BuiltInTypeIds.LINK,
            properties: {
              url: share.url,
              title: title,
            },
            inboxed: true,
          });
          return true;
        } else if (share.type === 'text' && share.text) {
          // Check if text is actually a URL
          if (isUrl(share.text)) {
            store.create({
              typeId: BuiltInTypeIds.LINK,
              properties: {
                url: share.text,
                title: extractTitleFromUrl(share.text),
              },
              inboxed: true,
            });
          } else {
            // Create Note object
            // Use first line or first 100 chars as title
            const title =
              share.text.split('\n')[0].slice(0, 100) || 'Shared Note';
            store.create({
              typeId: BuiltInTypeIds.NOTE,
              properties: {
                title: title,
              },
              hasContent: true,
              inboxed: true,
            });
            // Note: Full text could be set as content if needed
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('[ShareHandler] Failed to process share:', error);
        return false;
      }
    },
    [store]
  );

  // Check for and process pending shares
  const checkPendingShares = useCallback(async () => {
    if (!isMobile || !store || isProcessing.current) return;

    isProcessing.current = true;

    try {
      const pending = await getPendingShares();

      if (pending.length > 0) {
        console.log(
          `[ShareHandler] Processing ${pending.length} pending shares`
        );

        let successCount = 0;
        for (const share of pending) {
          const success = await processShare(share);
          if (success) successCount++;
        }

        // Clear all pending shares
        await clearPendingShares();

        // Refresh data to show new items
        refreshData();

        // Show toast
        if (successCount > 0) {
          addToast({
            type: 'success',
            message: `Added ${successCount} item${successCount !== 1 ? 's' : ''} to Inbox`,
          });
        }
      }
    } catch (error) {
      console.error('[ShareHandler] Failed to check pending shares:', error);
    } finally {
      isProcessing.current = false;
    }
  }, [isMobile, store, processShare, refreshData, addToast]);

  // Check on mount
  useEffect(() => {
    if (!isMobile) return;

    // Small delay to ensure store is ready
    const timer = setTimeout(checkPendingShares, 500);
    return () => clearTimeout(timer);
  }, [isMobile, checkPendingShares]);

  // Check when app returns from background
  useEffect(() => {
    if (!isMobile) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPendingShares();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMobile, checkPendingShares]);

  return { checkPendingShares };
}
