/**
 * Deep Link Handler
 * Handles skelenote:// URLs to navigate to specific objects
 *
 * URL formats supported:
 * - skelenote://task/{id} - Navigate to task
 * - skelenote://note/{id} - Navigate to note
 * - skelenote://object/{id} - Navigate to any object
 * - skelenote://inbox - Navigate to inbox
 * - skelenote://tasks - Navigate to tasks view
 * - skelenote://daily - Navigate to daily notes
 */

import { useEffect } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useNavigation, useObjects } from '@/contexts';
import { usePlatform } from '@/hooks';

export function useDeepLinks() {
  const { navigateToObject, navigateToView } = useNavigation();
  const { store } = useObjects();
  const { isMobile } = usePlatform();

  useEffect(() => {
    // Only handle deep links on mobile
    if (!isMobile) return;

    const handleUrl = (urls: string[]) => {
      for (const urlString of urls) {
        try {
          // Parse the URL - skelenote://path becomes skelenote:path after parsing
          // We need to handle the custom scheme
          const url = new URL(urlString);

          if (url.protocol !== 'skelenote:') continue;

          // Combine host and pathname to handle various URL formats:
          // skelenote://task/123 -> host=task, pathname=/123
          // skelenote:///task/123 -> host="", pathname=/task/123
          // skelenote:task/123 -> host="", pathname=task/123
          const segments = [
            url.host,
            ...url.pathname.split('/').filter(Boolean),
          ].filter(Boolean);

          if (segments.length === 0) continue;

          const [type, id] = segments;

          // Handle view navigation
          if (!id) {
            switch (type) {
              case 'inbox':
                navigateToView('inbox');
                break;
              case 'tasks':
                navigateToView('tasks');
                break;
              case 'daily':
              case 'daily-notes':
                navigateToView('daily-notes');
                break;
              case 'settings':
                navigateToView('settings');
                break;
              case 'archive':
                navigateToView('archive');
                break;
            }
            continue;
          }

          // Handle object navigation
          if (store) {
            const obj = store.get(id);
            if (obj) {
              navigateToObject(id);
            } else {
              console.warn(`[DeepLink] Object not found: ${id}`);
            }
          }
        } catch (error) {
          console.error('[DeepLink] Failed to parse URL:', urlString, error);
        }
      }
    };

    // Set up the listener
    const unlisten = onOpenUrl(handleUrl);

    return () => {
      unlisten.then((fn: () => void) => fn());
    };
  }, [isMobile, navigateToObject, navigateToView, store]);
}
