/**
 * Hook for calendar state management
 */

import { useState, useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';
import {
  getDaysInMonth,
  getFirstDayOfWeek,
  formatMonthYear,
  formatDateId,
} from '@/lib/daily';
import { getDailyNotesForMonth } from '@/lib/daily';

export interface UseCalendarResult {
  /** The current month being displayed */
  currentMonth: Date;
  /** Formatted month/year string (e.g., "December 2024") */
  monthLabel: string;
  /** Navigate to the previous month */
  goToPreviousMonth: () => void;
  /** Navigate to the next month */
  goToNextMonth: () => void;
  /** Navigate to today's month */
  goToToday: () => void;
  /** Number of days in the current month */
  daysInMonth: number;
  /** Day of week offset for the first day (0 = Sunday) */
  firstDayOffset: number;
  /** Map of date strings to daily notes for the current month */
  dailyNotesInMonth: Map<string, SkelenoteObject>;
  /** Check if a specific day has a daily note */
  hasNote: (day: number) => boolean;
  /** Get the date string for a day in the current month */
  getDateString: (day: number) => string;
  /** Get a Date object for a day in the current month */
  getDate: (day: number) => Date;
}

/**
 * Hook for managing calendar state and navigation
 *
 * @example
 * ```tsx
 * const {
 *   currentMonth,
 *   monthLabel,
 *   goToPreviousMonth,
 *   goToNextMonth,
 *   daysInMonth,
 *   firstDayOffset,
 *   dailyNotesInMonth,
 * } = useCalendar();
 * ```
 */
export function useCalendar(): UseCalendarResult {
  const { store } = useObjects();

  // Current month state (set to first day of month)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Month navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  // Derived values
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthLabel = useMemo(() => formatMonthYear(currentMonth), [currentMonth]);
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const firstDayOffset = useMemo(() => getFirstDayOfWeek(year, month), [year, month]);

  // Get daily notes for the current month
  const dailyNotesInMonth = useMemo(() => {
    if (!store) return new Map<string, SkelenoteObject>();
    return getDailyNotesForMonth(store, year, month);
  }, [store, year, month]);

  // Helper to check if a day has a note
  const hasNote = useCallback(
    (day: number) => {
      const dateStr = formatDateId(new Date(year, month, day));
      return dailyNotesInMonth.has(dateStr);
    },
    [dailyNotesInMonth, year, month]
  );

  // Helper to get date string for a day
  const getDateString = useCallback(
    (day: number) => {
      return formatDateId(new Date(year, month, day));
    },
    [year, month]
  );

  // Helper to get Date object for a day
  const getDate = useCallback(
    (day: number) => {
      return new Date(year, month, day);
    },
    [year, month]
  );

  return {
    currentMonth,
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    daysInMonth,
    firstDayOffset,
    dailyNotesInMonth,
    hasNote,
    getDateString,
    getDate,
  };
}
