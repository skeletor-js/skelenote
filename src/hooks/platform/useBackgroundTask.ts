/**
 * useBackgroundTask Hook
 * Manages iOS background task execution for completing sync when app is backgrounded
 *
 * iOS grants approximately 30 seconds for background execution after the app
 * enters the background. This hook wraps the native background task APIs.
 */

import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { usePlatform } from './usePlatform';

export interface UseBackgroundTaskResult {
  /** Begin a background task - returns task ID */
  beginTask: () => Promise<number | null>;
  /** End a background task by ID */
  endTask: (taskId?: number) => Promise<void>;
  /** Check if a background task is currently active */
  isTaskActive: () => boolean;
  /** Get the current task ID if active */
  getCurrentTaskId: () => number | null;
}

/**
 * Hook for managing iOS background tasks
 *
 * Use this hook to request background execution time when the app is backgrounded
 * while important operations (like sync) are in progress.
 *
 * @example
 * ```tsx
 * function SyncComponent() {
 *   const { beginTask, endTask, isTaskActive } = useBackgroundTask();
 *
 *   const handleVisibilityChange = async () => {
 *     if (document.visibilityState === 'hidden' && isSyncing) {
 *       await beginTask();
 *     } else if (document.visibilityState === 'visible') {
 *       // Task will auto-end when sync completes or on return to foreground
 *     }
 *   };
 *
 *   const handleSyncComplete = async () => {
 *     if (isTaskActive()) {
 *       await endTask(taskId);
 *     }
 *   };
 * }
 * ```
 */
export function useBackgroundTask(): UseBackgroundTaskResult {
  const { isMobile, isIOS } = usePlatform();
  const currentTaskId = useRef<number | null>(null);

  const beginTask = useCallback(async (): Promise<number | null> => {
    // Only run on iOS mobile
    if (!isMobile || !isIOS) {
      return null;
    }

    // Don't start a new task if one is already active
    if (currentTaskId.current !== null) {
      console.log(
        '[BackgroundTask] Task already active:',
        currentTaskId.current
      );
      return currentTaskId.current;
    }

    try {
      const taskId = await invoke<number>('begin_background_task');

      if (taskId === 0) {
        // UIBackgroundTaskInvalid
        console.warn('[BackgroundTask] Failed to begin task (invalid)');
        return null;
      }

      currentTaskId.current = taskId;
      console.log('[BackgroundTask] Started task:', taskId);
      return taskId;
    } catch (error) {
      console.error('[BackgroundTask] Failed to begin task:', error);
      return null;
    }
  }, [isMobile, isIOS]);

  const endTask = useCallback(
    async (taskId?: number): Promise<void> => {
      // Only run on iOS mobile
      if (!isMobile || !isIOS) {
        return;
      }

      const idToEnd = taskId ?? currentTaskId.current;

      if (idToEnd === null || idToEnd === 0) {
        console.log('[BackgroundTask] No active task to end');
        return;
      }

      try {
        await invoke('end_background_task', { taskId: idToEnd });
        console.log('[BackgroundTask] Ended task:', idToEnd);

        // Clear the ref if we ended the current task
        if (currentTaskId.current === idToEnd) {
          currentTaskId.current = null;
        }
      } catch (error) {
        console.error('[BackgroundTask] Failed to end task:', error);
        // Still clear the ref to avoid stale state
        if (currentTaskId.current === idToEnd) {
          currentTaskId.current = null;
        }
      }
    },
    [isMobile, isIOS]
  );

  const isTaskActive = useCallback((): boolean => {
    return currentTaskId.current !== null && currentTaskId.current !== 0;
  }, []);

  const getCurrentTaskId = useCallback((): number | null => {
    return currentTaskId.current;
  }, []);

  return {
    beginTask,
    endTask,
    isTaskActive,
    getCurrentTaskId,
  };
}
