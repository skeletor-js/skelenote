/**
 * Notification Service
 * Handles scheduling and canceling local notifications for task reminders
 * Uses @tauri-apps/plugin-notification for mobile platforms
 */

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  cancel,
  pending,
  Schedule,
} from '@tauri-apps/plugin-notification';

export interface ReminderNotification {
  /** Task ID - used for cancellation */
  taskId: string;
  /** Notification title (usually "Reminder: {task title}") */
  title: string;
  /** Optional body text */
  body?: string;
  /** When to fire the notification */
  scheduleAt: Date;
}

/**
 * Check if notification permission is granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    return await isPermissionGranted();
  } catch {
    // Plugin not available (desktop) or error
    return false;
  }
}

/**
 * Request notification permission from the user
 * @returns true if permission was granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await requestPermission();
    return permission === 'granted';
  } catch {
    // Plugin not available (desktop) or error
    return false;
  }
}

/**
 * Generate a numeric ID from a task UUID
 * Notification IDs must be numbers, so we hash the UUID
 */
function taskIdToNotificationId(taskId: string): number {
  // Use first 8 chars of UUID as hex, convert to number
  // This gives us a unique-enough ID for our purposes
  const hex = taskId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16) % 2147483647; // Keep within 32-bit signed int range
}

/**
 * Schedule a reminder notification
 * @param reminder The reminder details
 */
export async function scheduleReminder(
  reminder: ReminderNotification
): Promise<void> {
  try {
    // Check permission first
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.warn('[Notifications] No permission to send notifications');
      return;
    }

    // Don't schedule if the time is in the past
    if (reminder.scheduleAt.getTime() <= Date.now()) {
      console.warn('[Notifications] Cannot schedule notification in the past');
      return;
    }

    const notificationId = taskIdToNotificationId(reminder.taskId);

    // Cancel any existing notification for this task first
    await cancelReminder(reminder.taskId);

    // Schedule the new notification
    await sendNotification({
      id: notificationId,
      title: reminder.title,
      body: reminder.body,
      schedule: Schedule.at(reminder.scheduleAt, false, true), // not repeating, allow while idle
    });

    console.log(
      `[Notifications] Scheduled reminder for task ${reminder.taskId} at ${reminder.scheduleAt.toISOString()}`
    );
  } catch (error) {
    console.error('[Notifications] Failed to schedule reminder:', error);
  }
}

/**
 * Cancel a scheduled reminder notification
 * @param taskId The task ID to cancel notification for
 */
export async function cancelReminder(taskId: string): Promise<void> {
  try {
    const notificationId = taskIdToNotificationId(taskId);
    await cancel([notificationId]);
    console.log(`[Notifications] Cancelled reminder for task ${taskId}`);
  } catch (error) {
    // Notification may not exist - that's ok
    console.debug('[Notifications] Cancel failed (may not exist):', error);
  }
}

/**
 * Get all pending scheduled notifications
 */
export async function getPendingReminders(): Promise<
  Array<{ id: number; title?: string; schedule?: unknown }>
> {
  try {
    const pendingNotifications = await pending();
    return pendingNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      schedule: n.schedule,
    }));
  } catch {
    return [];
  }
}
