/**
 * useNotifications Hook
 * React hook for managing task reminder notifications
 * Wraps the notification service with React lifecycle integration
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { usePlatform } from './usePlatform';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  syncTaskReminder,
  rescheduleAllReminders,
  cancelReminder,
} from '@/lib/notifications';
import type { SkelenoteObject } from '@/lib/types';

export interface UseNotificationsResult {
  /** Whether notifications are available (mobile only) */
  isAvailable: boolean;
  /** Whether we have permission to send notifications */
  hasPermission: boolean;
  /** Request notification permission from user */
  requestPermission: () => Promise<boolean>;
  /** Sync a task's reminder to OS notifications */
  syncReminder: (task: SkelenoteObject) => Promise<void>;
  /** Cancel a task's scheduled notification */
  cancelReminder: (taskId: string) => Promise<void>;
}

/**
 * Hook for managing task reminder notifications
 *
 * Features:
 * - Reschedules all reminders on mount (handles app restarts)
 * - Provides methods to sync/cancel individual task reminders
 * - Only active on mobile platforms
 *
 * @example
 * ```tsx
 * const { syncReminder, cancelReminder, requestPermission } = useNotifications();
 *
 * // When reminderTime changes
 * await syncReminder(task);
 *
 * // When task is completed
 * await cancelReminder(task.id);
 * ```
 */
export function useNotifications(): UseNotificationsResult {
  const { isMobile } = usePlatform();
  const { store, dataVersion } = useObjects();
  const [hasPermission, setHasPermission] = useState(false);
  const hasScheduledInitial = useRef(false);

  // Check permission on mount
  useEffect(() => {
    if (!isMobile) return;

    checkNotificationPermission().then(setHasPermission);
  }, [isMobile]);

  // Reschedule all reminders on mount (once)
  useEffect(() => {
    if (!isMobile || !store || hasScheduledInitial.current) return;

    const reschedule = async () => {
      const permission = await checkNotificationPermission();
      if (!permission) return;

      const tasks = store.getByType(BuiltInTypeIds.TASK);
      await rescheduleAllReminders(tasks);
      hasScheduledInitial.current = true;
    };

    reschedule();
  }, [isMobile, store]);

  // Request permission from user
  const handleRequestPermission = useCallback(async () => {
    if (!isMobile) return false;

    const granted = await requestNotificationPermission();
    setHasPermission(granted);

    // If granted, schedule any pending reminders
    if (granted && store) {
      const tasks = store.getByType(BuiltInTypeIds.TASK);
      await rescheduleAllReminders(tasks);
    }

    return granted;
  }, [isMobile, store]);

  // Sync a task's reminder
  const handleSyncReminder = useCallback(
    async (task: SkelenoteObject) => {
      if (!isMobile) return;
      await syncTaskReminder(task);
    },
    [isMobile]
  );

  // Cancel a task's reminder
  const handleCancelReminder = useCallback(
    async (taskId: string) => {
      if (!isMobile) return;
      await cancelReminder(taskId);
    },
    [isMobile]
  );

  return {
    isAvailable: isMobile,
    hasPermission,
    requestPermission: handleRequestPermission,
    syncReminder: handleSyncReminder,
    cancelReminder: handleCancelReminder,
  };
}
