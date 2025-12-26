/**
 * useGlobalShortcut - Hook to listen for global shortcut events from Tauri
 */

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

/**
 * Listen for the quick capture global shortcut (Cmd+Shift+Space)
 * @param callback Function to call when the shortcut is triggered
 */
export function useQuickCaptureShortcut(callback: () => void) {
  useEffect(() => {
    const unlisten = listen('quick-capture-shortcut', () => {
      callback();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [callback]);
}
