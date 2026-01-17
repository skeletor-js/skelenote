/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the notification-service module
vi.mock('../notification-service', () => ({
  scheduleReminder: vi.fn(),
  cancelReminder: vi.fn(),
}));

import { scheduleReminder, cancelReminder } from '../notification-service';
import {
  syncTaskReminder,
  rescheduleAllReminders,
  cancelReminders,
} from '../reminder-scheduler';
import type { SkelenoteObject } from '@/lib/types';

describe('reminder-scheduler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // Helper to create a mock task
  const createMockTask = (
    overrides: Partial<{
      id: string;
      title: string;
      reminderTime: number | null;
      status: string;
    }> = {}
  ): SkelenoteObject => ({
    id: overrides.id ?? 'test-task-123',
    typeId: 'built-in:task',
    properties: {
      title: overrides.title ?? 'Test Task',
      reminderTime: overrides.reminderTime ?? null,
      status: overrides.status ?? 'todo',
    },
    hasContent: false,
    inboxed: false,
    archived: false,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  describe('syncTaskReminder', () => {
    it('should schedule reminder for task with future reminder time', async () => {
      const futureTime = new Date('2024-01-15T12:00:00Z').getTime();
      const task = createMockTask({ reminderTime: futureTime });

      await syncTaskReminder(task);

      expect(scheduleReminder).toHaveBeenCalledWith({
        taskId: 'test-task-123',
        title: 'Reminder: Test Task',
        body: 'Tap to view task',
        scheduleAt: new Date(futureTime),
      });
    });

    it('should cancel reminder when no reminder time is set', async () => {
      const task = createMockTask({ reminderTime: null });

      await syncTaskReminder(task);

      expect(cancelReminder).toHaveBeenCalledWith('test-task-123');
      expect(scheduleReminder).not.toHaveBeenCalled();
    });

    it('should cancel reminder when task is done', async () => {
      const futureTime = new Date('2024-01-15T12:00:00Z').getTime();
      const task = createMockTask({ reminderTime: futureTime, status: 'done' });

      await syncTaskReminder(task);

      expect(cancelReminder).toHaveBeenCalledWith('test-task-123');
      expect(scheduleReminder).not.toHaveBeenCalled();
    });

    it('should cancel reminder when reminder time is in the past', async () => {
      const pastTime = new Date('2024-01-15T08:00:00Z').getTime();
      const task = createMockTask({ reminderTime: pastTime });

      await syncTaskReminder(task);

      expect(cancelReminder).toHaveBeenCalledWith('test-task-123');
      expect(scheduleReminder).not.toHaveBeenCalled();
    });

    it('should use "Untitled Task" for tasks without title', async () => {
      const futureTime = new Date('2024-01-15T12:00:00Z').getTime();
      const task = createMockTask({ reminderTime: futureTime });

      (task.properties as any).title = '';

      await syncTaskReminder(task);

      expect(scheduleReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Reminder: Untitled Task',
        })
      );
    });
  });

  describe('rescheduleAllReminders', () => {
    it('should reschedule tasks with future reminders', async () => {
      const futureTime1 = new Date('2024-01-15T12:00:00Z').getTime();
      const futureTime2 = new Date('2024-01-15T14:00:00Z').getTime();

      const tasks = [
        createMockTask({ id: 'task-1', reminderTime: futureTime1 }),
        createMockTask({ id: 'task-2', reminderTime: futureTime2 }),
      ];

      await rescheduleAllReminders(tasks);

      expect(scheduleReminder).toHaveBeenCalledTimes(2);
    });

    it('should skip tasks with past reminders', async () => {
      const pastTime = new Date('2024-01-15T08:00:00Z').getTime();
      const futureTime = new Date('2024-01-15T12:00:00Z').getTime();

      const tasks = [
        createMockTask({ id: 'task-past', reminderTime: pastTime }),
        createMockTask({ id: 'task-future', reminderTime: futureTime }),
      ];

      await rescheduleAllReminders(tasks);

      // Only the future one should be scheduled
      expect(scheduleReminder).toHaveBeenCalledTimes(1);
      expect(scheduleReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-future',
        })
      );
    });

    it('should skip completed tasks', async () => {
      const futureTime = new Date('2024-01-15T12:00:00Z').getTime();

      const tasks = [
        createMockTask({
          id: 'task-done',
          reminderTime: futureTime,
          status: 'done',
        }),
        createMockTask({
          id: 'task-todo',
          reminderTime: futureTime,
          status: 'todo',
        }),
      ];

      await rescheduleAllReminders(tasks);

      expect(scheduleReminder).toHaveBeenCalledTimes(1);
      expect(scheduleReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-todo',
        })
      );
    });

    it('should skip tasks without reminder time', async () => {
      const futureTime = new Date('2024-01-15T12:00:00Z').getTime();

      const tasks = [
        createMockTask({ id: 'task-no-reminder', reminderTime: null }),
        createMockTask({ id: 'task-with-reminder', reminderTime: futureTime }),
      ];

      await rescheduleAllReminders(tasks);

      expect(scheduleReminder).toHaveBeenCalledTimes(1);
    });

    it('should handle empty task list', async () => {
      await rescheduleAllReminders([]);

      expect(scheduleReminder).not.toHaveBeenCalled();
    });
  });

  describe('cancelReminders', () => {
    it('should cancel reminders for all provided task IDs', async () => {
      await cancelReminders(['task-1', 'task-2', 'task-3']);

      expect(cancelReminder).toHaveBeenCalledTimes(3);
      expect(cancelReminder).toHaveBeenCalledWith('task-1');
      expect(cancelReminder).toHaveBeenCalledWith('task-2');
      expect(cancelReminder).toHaveBeenCalledWith('task-3');
    });

    it('should handle empty task ID list', async () => {
      await cancelReminders([]);

      expect(cancelReminder).not.toHaveBeenCalled();
    });
  });
});
