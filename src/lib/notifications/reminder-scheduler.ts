/**
 * Reminder Scheduler
 * Syncs task reminder times to OS notifications
 * Call syncTaskReminder whenever a task's reminderTime changes
 */

import { scheduleReminder, cancelReminder } from './notification-service';
import type { SkelenoteObject } from '@/lib/types';

/**
 * Sync a task's reminder to the OS notification system
 *
 * Call this when:
 * - Task created with reminderTime
 * - Task reminderTime updated
 * - Task completed/deleted (to cancel)
 *
 * @param task The task object to sync
 */
export async function syncTaskReminder(task: SkelenoteObject): Promise<void> {
  const reminderTime = task.properties.reminderTime as number | null;
  const title = (task.properties.title as string) || 'Untitled Task';
  const status = task.properties.status as string;

  // Cancel if no reminder, task is completed, or reminder is in the past
  if (!reminderTime || status === 'done' || reminderTime < Date.now()) {
    await cancelReminder(task.id);
    return;
  }

  // Schedule the notification
  await scheduleReminder({
    taskId: task.id,
    title: `Reminder: ${title}`,
    body: 'Tap to view task',
    scheduleAt: new Date(reminderTime),
  });
}

/**
 * Reschedule all pending reminders
 *
 * Call on app launch to handle:
 * - Timezone changes
 * - OS restarts that clear scheduled notifications
 * - App updates
 *
 * @param tasks All tasks that may have reminders
 */
export async function rescheduleAllReminders(
  tasks: SkelenoteObject[]
): Promise<void> {
  const now = Date.now();
  let scheduled = 0;

  for (const task of tasks) {
    const reminderTime = task.properties.reminderTime as number | null;
    const status = task.properties.status as string;

    // Only sync tasks with future reminders that aren't done
    if (reminderTime && reminderTime > now && status !== 'done') {
      await syncTaskReminder(task);
      scheduled++;
    }
  }

  if (scheduled > 0) {
    console.log(`[ReminderScheduler] Rescheduled ${scheduled} reminders`);
  }
}

/**
 * Cancel all reminders for a list of task IDs
 * Useful when bulk-completing or deleting tasks
 *
 * @param taskIds Array of task IDs to cancel reminders for
 */
export async function cancelReminders(taskIds: string[]): Promise<void> {
  for (const taskId of taskIds) {
    await cancelReminder(taskId);
  }
}
