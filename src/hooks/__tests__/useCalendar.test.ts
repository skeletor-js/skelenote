/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendar } from '..';

// Mock contexts
vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: vi.fn(() => ({ store: mockStore })),
  };
});

// Mock lib/daily functions
vi.mock('@/lib/daily', () => ({
  getDaysInMonth: vi.fn((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }),
  getFirstDayOfWeek: vi.fn((year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  }),
  formatMonthYear: vi.fn((date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }),
  formatDateId: vi.fn((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
  getDailyNotesForMonth: vi.fn(() => new Map()),
}));

import { getDailyNotesForMonth } from '@/lib/daily';

// Mock store
const mockStore = {
  getAll: vi.fn(() => []),
};

describe('useCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset date mocking
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 15)); // December 15, 2024
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with current month', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.currentMonth.getFullYear()).toBe(2024);
      expect(result.current.currentMonth.getMonth()).toBe(11); // December
      expect(result.current.currentMonth.getDate()).toBe(1); // First day
    });

    it('should provide month label', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.monthLabel).toBe('December 2024');
    });

    it('should calculate days in month', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.daysInMonth).toBe(31); // December has 31 days
    });

    it('should calculate first day offset', () => {
      const { result } = renderHook(() => useCalendar());

      // December 1, 2024 is a Sunday (0)
      expect(typeof result.current.firstDayOffset).toBe('number');
      expect(result.current.firstDayOffset).toBeGreaterThanOrEqual(0);
      expect(result.current.firstDayOffset).toBeLessThanOrEqual(6);
    });
  });

  describe('month navigation', () => {
    it('should go to previous month', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.goToPreviousMonth();
      });

      expect(result.current.currentMonth.getMonth()).toBe(10); // November
      expect(result.current.currentMonth.getFullYear()).toBe(2024);
    });

    it('should go to next month', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.currentMonth.getMonth()).toBe(0); // January
      expect(result.current.currentMonth.getFullYear()).toBe(2025);
    });

    it('should handle year boundary going backwards', () => {
      // Set to January 2024
      vi.setSystemTime(new Date(2024, 0, 15));
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.goToPreviousMonth();
      });

      expect(result.current.currentMonth.getMonth()).toBe(11); // December
      expect(result.current.currentMonth.getFullYear()).toBe(2023);
    });

    it('should navigate to today', () => {
      const { result } = renderHook(() => useCalendar());

      // Navigate away first
      act(() => {
        result.current.goToNextMonth();
        result.current.goToNextMonth();
      });

      expect(result.current.currentMonth.getFullYear()).toBe(2025);
      expect(result.current.currentMonth.getMonth()).toBe(1); // February

      // Navigate back to today
      act(() => {
        result.current.goToToday();
      });

      expect(result.current.currentMonth.getFullYear()).toBe(2024);
      expect(result.current.currentMonth.getMonth()).toBe(11); // December
    });
  });

  describe('daily notes integration', () => {
    it('should return empty map when no daily notes exist', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.dailyNotesInMonth.size).toBe(0);
    });

    it('should check if day has note', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.hasNote(15)).toBe(false);
    });

    it('should return true for hasNote when daily note exists', () => {
      const mockNote = { id: 'note-2024-12-15', isDailyNote: true };
      vi.mocked(getDailyNotesForMonth).mockReturnValue(
        new Map([['2024-12-15', mockNote as any]])
      );

      const { result } = renderHook(() => useCalendar());

      expect(result.current.hasNote(15)).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should get date string for a day', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.getDateString(25)).toBe('2024-12-25');
    });

    it('should get Date object for a day', () => {
      const { result } = renderHook(() => useCalendar());

      const date = result.current.getDate(25);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(25);
    });

    it('should handle edge cases like day 1 and day 31', () => {
      const { result } = renderHook(() => useCalendar());

      const firstDay = result.current.getDate(1);
      const lastDay = result.current.getDate(31);

      expect(firstDay.getDate()).toBe(1);
      expect(lastDay.getDate()).toBe(31);
    });
  });

  describe('month updates', () => {
    it('should update days in month when navigating', () => {
      const { result } = renderHook(() => useCalendar());

      // December has 31 days
      expect(result.current.daysInMonth).toBe(31);

      // Navigate to February 2024 (leap year)
      act(() => {
        result.current.goToPreviousMonth(); // November
        result.current.goToPreviousMonth(); // October
        result.current.goToPreviousMonth(); // September
        result.current.goToPreviousMonth(); // August
        result.current.goToPreviousMonth(); // July
        result.current.goToPreviousMonth(); // June
        result.current.goToPreviousMonth(); // May
        result.current.goToPreviousMonth(); // April
        result.current.goToPreviousMonth(); // March
        result.current.goToPreviousMonth(); // February
      });

      // February 2024 has 29 days (leap year)
      expect(result.current.daysInMonth).toBe(29);
    });

    it('should update month label when navigating', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.monthLabel).toBe('December 2024');

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.monthLabel).toBe('January 2025');
    });
  });
});
