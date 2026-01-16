import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateTitle,
  formatDateId,
  parseDate,
  getAdjacentDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  getFirstDayOfWeek,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  getMonthName,
  getShortMonthName,
  formatMonthYear,
} from '../date-utils';

describe('Date Utilities', () => {
  // Use fixed date for consistent testing
  const testDate = new Date(2024, 11, 25); // December 25, 2024 (Christmas)

  describe('formatDateTitle', () => {
    it('should format date as human-readable title', () => {
      expect(formatDateTitle(testDate)).toBe('December 25, 2024');
    });

    it('should handle January correctly', () => {
      const jan1 = new Date(2024, 0, 1);
      expect(formatDateTitle(jan1)).toBe('January 1, 2024');
    });

    it('should handle single digit days', () => {
      const date = new Date(2024, 5, 5);
      expect(formatDateTitle(date)).toBe('June 5, 2024');
    });
  });

  describe('formatDateId', () => {
    it('should format date as ISO string', () => {
      expect(formatDateId(testDate)).toBe('2024-12-25');
    });

    it('should pad single digit month', () => {
      const jan = new Date(2024, 0, 15);
      expect(formatDateId(jan)).toBe('2024-01-15');
    });

    it('should pad single digit day', () => {
      const date = new Date(2024, 11, 5);
      expect(formatDateId(date)).toBe('2024-12-05');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date string back to Date', () => {
      const parsed = parseDate('2024-12-25');
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(11); // 0-indexed
      expect(parsed.getDate()).toBe(25);
    });

    it('should parse first day of year', () => {
      const parsed = parseDate('2024-01-01');
      expect(parsed.getMonth()).toBe(0);
      expect(parsed.getDate()).toBe(1);
    });
  });

  describe('getAdjacentDate', () => {
    it('should get next day with positive offset', () => {
      const next = getAdjacentDate(testDate, 1);
      expect(next.getDate()).toBe(26);
    });

    it('should get previous day with negative offset', () => {
      const prev = getAdjacentDate(testDate, -1);
      expect(prev.getDate()).toBe(24);
    });

    it('should handle month boundary', () => {
      const dec31 = new Date(2024, 11, 31);
      const jan1 = getAdjacentDate(dec31, 1);
      expect(jan1.getMonth()).toBe(0); // January
      expect(jan1.getDate()).toBe(1);
      expect(jan1.getFullYear()).toBe(2025);
    });

    it('should handle year boundary backwards', () => {
      const jan1 = new Date(2024, 0, 1);
      const dec31 = getAdjacentDate(jan1, -1);
      expect(dec31.getMonth()).toBe(11); // December
      expect(dec31.getDate()).toBe(31);
      expect(dec31.getFullYear()).toBe(2023);
    });

    it('should handle larger offsets', () => {
      const week = getAdjacentDate(testDate, 7);
      expect(week.getMonth()).toBe(0); // January
      expect(week.getDate()).toBe(1);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return 31 for December', () => {
      expect(getDaysInMonth(2024, 11)).toBe(31);
    });

    it('should return 30 for November', () => {
      expect(getDaysInMonth(2024, 10)).toBe(30);
    });

    it('should return 29 for February in leap year', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29);
    });

    it('should return 28 for February in non-leap year', () => {
      expect(getDaysInMonth(2023, 1)).toBe(28);
    });
  });

  describe('getFirstDayOfMonth', () => {
    it('should return first day of the month', () => {
      const first = getFirstDayOfMonth(2024, 11);
      expect(first.getDate()).toBe(1);
      expect(first.getMonth()).toBe(11);
      expect(first.getFullYear()).toBe(2024);
    });
  });

  describe('getFirstDayOfWeek', () => {
    it('should return correct day of week', () => {
      // December 1, 2024 is a Sunday (0)
      expect(getFirstDayOfWeek(2024, 11)).toBe(0);
    });

    it('should return 1 for Monday start', () => {
      // January 1, 2024 is a Monday
      expect(getFirstDayOfWeek(2024, 0)).toBe(1);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2024, 11, 25, 10, 30);
      const date2 = new Date(2024, 11, 25, 22, 45);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2024, 11, 25);
      const date2 = new Date(2024, 11, 26);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2024, 10, 25);
      const date2 = new Date(2024, 11, 25);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date(2023, 11, 25);
      const date2 = new Date(2024, 11, 25);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 25, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for today', () => {
      const today = new Date(2024, 11, 25, 15, 30);
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(2024, 11, 24);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date(2024, 11, 26);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isPast', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 25, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for yesterday', () => {
      const yesterday = new Date(2024, 11, 24);
      expect(isPast(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date(2024, 11, 25);
      expect(isPast(today)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date(2024, 11, 26);
      expect(isPast(tomorrow)).toBe(false);
    });
  });

  describe('isFuture', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 25, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for tomorrow', () => {
      const tomorrow = new Date(2024, 11, 26);
      expect(isFuture(tomorrow)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date(2024, 11, 25);
      expect(isFuture(today)).toBe(false);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(2024, 11, 24);
      expect(isFuture(yesterday)).toBe(false);
    });
  });

  describe('getMonthName', () => {
    it('should return full month name', () => {
      expect(getMonthName(testDate)).toBe('December');
    });

    it('should return January for first month', () => {
      const jan = new Date(2024, 0, 15);
      expect(getMonthName(jan)).toBe('January');
    });
  });

  describe('getShortMonthName', () => {
    it('should return short month name', () => {
      expect(getShortMonthName(testDate)).toBe('Dec');
    });

    it('should return Jan for first month', () => {
      const jan = new Date(2024, 0, 15);
      expect(getShortMonthName(jan)).toBe('Jan');
    });
  });

  describe('formatMonthYear', () => {
    it('should format month and year', () => {
      expect(formatMonthYear(testDate)).toBe('December 2024');
    });

    it('should handle January', () => {
      const jan = new Date(2024, 0, 15);
      expect(formatMonthYear(jan)).toBe('January 2024');
    });
  });
});
