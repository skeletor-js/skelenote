import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isToday,
  isOverdue,
  isThisWeekAfterToday,
  isBeyondThisWeek,
  addDays,
  addMonths,
  addYears,
  formatRelativeDate,
} from '../date';

describe('Date Utilities', () => {
  describe('startOfDay', () => {
    it('should return midnight of the given date', () => {
      const date = new Date('2024-12-25T14:30:45.123Z');
      const result = startOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should use current date when no date provided', () => {
      const result = startOfDay();
      const now = new Date();

      expect(result.getDate()).toBe(now.getDate());
      expect(result.getMonth()).toBe(now.getMonth());
      expect(result.getFullYear()).toBe(now.getFullYear());
    });
  });

  describe('endOfDay', () => {
    it('should return 23:59:59.999 of the given date', () => {
      const date = new Date('2024-12-25T14:30:45.123Z');
      const result = endOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('startOfWeek', () => {
    it('should return Sunday of the week', () => {
      // Wednesday Dec 25, 2024
      const date = new Date('2024-12-25T14:30:45.123Z');
      const result = startOfWeek(date);

      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBe(22); // Dec 22, 2024
      expect(result.getHours()).toBe(0);
    });

    it('should handle Sunday correctly', () => {
      // Sunday Dec 22, 2024
      const date = new Date('2024-12-22T14:30:45.123Z');
      const result = startOfWeek(date);

      expect(result.getDay()).toBe(0);
      expect(result.getDate()).toBe(22);
    });
  });

  describe('endOfWeek', () => {
    it('should return Saturday of the week', () => {
      // Wednesday Dec 25, 2024
      const date = new Date('2024-12-25T14:30:45.123Z');
      const result = endOfWeek(date);

      expect(result.getDay()).toBe(6); // Saturday
      expect(result.getDate()).toBe(28); // Dec 28, 2024
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const now = Date.now();
      expect(isToday(now)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(isOverdue(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      const now = Date.now();
      expect(isOverdue(now)).toBe(false);
    });

    it('should return false for future dates', () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      expect(isOverdue(tomorrow)).toBe(false);
    });
  });

  describe('isThisWeekAfterToday', () => {
    it('should return false for today', () => {
      const now = Date.now();
      expect(isThisWeekAfterToday(now)).toBe(false);
    });

    it('should return false for past dates', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(isThisWeekAfterToday(yesterday)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const timestamp = new Date('2024-12-25T12:00:00Z').getTime();
      const result = new Date(addDays(timestamp, 5));

      expect(result.getDate()).toBe(30);
      expect(result.getMonth()).toBe(11); // December
    });

    it('should handle month rollover', () => {
      const timestamp = new Date('2024-12-30T12:00:00Z').getTime();
      const result = new Date(addDays(timestamp, 5));

      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe('addMonths', () => {
    it('should add months correctly', () => {
      const timestamp = new Date('2024-12-25T12:00:00Z').getTime();
      const result = new Date(addMonths(timestamp, 1));

      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2025);
    });

    it('should handle end of month edge case', () => {
      // Jan 31 + 1 month should be Feb 28 (or 29 in leap year)
      const timestamp = new Date('2024-01-31T12:00:00Z').getTime();
      const result = new Date(addMonths(timestamp, 1));

      // 2024 is a leap year, so Feb has 29 days
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('addYears', () => {
    it('should add years correctly', () => {
      const timestamp = new Date('2024-12-25T12:00:00Z').getTime();
      const result = new Date(addYears(timestamp, 1));

      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe('formatRelativeDate', () => {
    let originalDate: typeof Date;

    beforeEach(() => {
      // Mock Date to control "today"
      originalDate = global.Date;
      const mockDate = new Date('2024-12-25T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Today" for today', () => {
      const today = new Date('2024-12-25T10:00:00Z').getTime();
      expect(formatRelativeDate(today)).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow', () => {
      const tomorrow = new Date('2024-12-26T10:00:00Z').getTime();
      expect(formatRelativeDate(tomorrow)).toBe('Tomorrow');
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date('2024-12-24T10:00:00Z').getTime();
      expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    });

    it('should return overdue days for past dates', () => {
      const pastDate = new Date('2024-12-20T10:00:00Z').getTime();
      expect(formatRelativeDate(pastDate)).toMatch(/\d+d overdue/);
    });
  });
});
