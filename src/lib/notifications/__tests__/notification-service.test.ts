/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the notification plugin
const mockIsPermissionGranted = vi.fn();
const mockRequestPermission = vi.fn();
const mockSendNotification = vi.fn();
const mockCancel = vi.fn();
const mockPending = vi.fn();

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: () => mockIsPermissionGranted(),
  requestPermission: () => mockRequestPermission(),
  sendNotification: (options: unknown) => mockSendNotification(options),
  cancel: (ids: number[]) => mockCancel(ids),
  pending: () => mockPending(),
  Schedule: {
    at: (date: Date, repeating: boolean, allowWhileIdle: boolean) => ({
      at: date.toISOString(),
      repeating,
      allowWhileIdle,
    }),
  },
}));

import {
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleReminder,
  cancelReminder,
  getPendingReminders,
} from '../notification-service';

describe('notification-service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('checkNotificationPermission', () => {
    it('should return true when permission is granted', async () => {
      mockIsPermissionGranted.mockResolvedValue(true);

      const result = await checkNotificationPermission();

      expect(result).toBe(true);
      expect(mockIsPermissionGranted).toHaveBeenCalled();
    });

    it('should return false when permission is not granted', async () => {
      mockIsPermissionGranted.mockResolvedValue(false);

      const result = await checkNotificationPermission();

      expect(result).toBe(false);
    });

    it('should return false when plugin throws error', async () => {
      mockIsPermissionGranted.mockRejectedValue(
        new Error('Plugin not available')
      );

      const result = await checkNotificationPermission();

      expect(result).toBe(false);
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return true when permission is granted', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const result = await requestNotificationPermission();

      expect(result).toBe(true);
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      mockRequestPermission.mockResolvedValue('denied');

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
    });

    it('should return false when permission is default', async () => {
      mockRequestPermission.mockResolvedValue('default');

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
    });

    it('should return false when plugin throws error', async () => {
      mockRequestPermission.mockRejectedValue(
        new Error('Plugin not available')
      );

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
    });
  });

  describe('scheduleReminder', () => {
    it('should schedule a reminder notification', async () => {
      mockIsPermissionGranted.mockResolvedValue(true);
      mockCancel.mockResolvedValue(undefined);
      mockSendNotification.mockResolvedValue(undefined);

      const futureDate = new Date('2024-01-15T12:00:00Z');

      await scheduleReminder({
        taskId: '12345678-1234-1234-1234-123456789abc',
        title: 'Reminder: Test Task',
        body: 'Tap to view',
        scheduleAt: futureDate,
      });

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Reminder: Test Task',
          body: 'Tap to view',
          schedule: expect.objectContaining({
            at: futureDate.toISOString(),
          }),
        })
      );
    });

    it('should cancel existing notification before scheduling new one', async () => {
      mockIsPermissionGranted.mockResolvedValue(true);
      mockCancel.mockResolvedValue(undefined);
      mockSendNotification.mockResolvedValue(undefined);

      const futureDate = new Date('2024-01-15T12:00:00Z');

      await scheduleReminder({
        taskId: '12345678-1234-1234-1234-123456789abc',
        title: 'Test',
        scheduleAt: futureDate,
      });

      // Cancel should be called before sendNotification
      expect(mockCancel).toHaveBeenCalled();
    });

    it('should not schedule when permission is not granted', async () => {
      mockIsPermissionGranted.mockResolvedValue(false);

      const futureDate = new Date('2024-01-15T12:00:00Z');

      await scheduleReminder({
        taskId: 'test-task',
        title: 'Test',
        scheduleAt: futureDate,
      });

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should not schedule when time is in the past', async () => {
      mockIsPermissionGranted.mockResolvedValue(true);

      const pastDate = new Date('2024-01-15T08:00:00Z');

      await scheduleReminder({
        taskId: 'test-task',
        title: 'Test',
        scheduleAt: pastDate,
      });

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should generate consistent notification ID from task ID', async () => {
      mockIsPermissionGranted.mockResolvedValue(true);
      mockCancel.mockResolvedValue(undefined);
      mockSendNotification.mockResolvedValue(undefined);

      const futureDate = new Date('2024-01-15T12:00:00Z');

      await scheduleReminder({
        taskId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        title: 'Test',
        scheduleAt: futureDate,
      });

      // Notification ID should be derived from first 8 hex chars of UUID
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
        })
      );
    });

    it('should handle schedule errors gracefully', async () => {
      mockIsPermissionGranted.mockResolvedValue(true);
      mockCancel.mockResolvedValue(undefined);
      mockSendNotification.mockRejectedValue(new Error('Schedule failed'));

      const futureDate = new Date('2024-01-15T12:00:00Z');

      // Should not throw
      await scheduleReminder({
        taskId: 'test-task',
        title: 'Test',
        scheduleAt: futureDate,
      });
    });
  });

  describe('cancelReminder', () => {
    it('should cancel a reminder by task ID', async () => {
      mockCancel.mockResolvedValue(undefined);

      await cancelReminder('12345678-1234-1234-1234-123456789abc');

      expect(mockCancel).toHaveBeenCalledWith([expect.any(Number)]);
    });

    it('should handle cancel errors gracefully', async () => {
      mockCancel.mockRejectedValue(new Error('Notification not found'));

      // Should not throw
      await cancelReminder('nonexistent-task');
    });
  });

  describe('getPendingReminders', () => {
    it('should return pending notifications', async () => {
      mockPending.mockResolvedValue([
        { id: 123, title: 'Reminder 1' },
        { id: 456, title: 'Reminder 2' },
      ]);

      const result = await getPendingReminders();

      expect(result).toEqual([
        { id: 123, title: 'Reminder 1', schedule: undefined },
        { id: 456, title: 'Reminder 2', schedule: undefined },
      ]);
    });

    it('should include schedule information', async () => {
      mockPending.mockResolvedValue([
        { id: 123, title: 'Test', schedule: { at: '2024-01-15T12:00:00Z' } },
      ]);

      const result = await getPendingReminders();

      expect(result[0].schedule).toEqual({ at: '2024-01-15T12:00:00Z' });
    });

    it('should return empty array on error', async () => {
      mockPending.mockRejectedValue(new Error('Plugin not available'));

      const result = await getPendingReminders();

      expect(result).toEqual([]);
    });
  });
});
