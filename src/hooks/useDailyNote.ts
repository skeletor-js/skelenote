/**
 * Hook for accessing daily notes
 */

import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import type { SkelenoteObject } from '@/lib/types';
import { getOrCreateDailyNote, getDailyNoteByDate } from '@/lib/daily';

export interface UseDailyNoteResult {
  /** The daily note for the specified date (or today if no date provided) */
  dailyNote: SkelenoteObject | null;
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Ensure the daily note exists (creates if needed) and returns it */
  ensureExists: () => SkelenoteObject | null;
  /** Navigate to the daily note (ensures it exists first) */
  getOrCreate: () => SkelenoteObject | null;
}

/**
 * Hook for accessing a daily note by date
 *
 * @param date - The date to get the daily note for (defaults to today)
 *
 * @example
 * ```tsx
 * // Get today's daily note
 * const { dailyNote, ensureExists } = useDailyNote();
 *
 * // Get a specific date's daily note
 * const { dailyNote } = useDailyNote(new Date(2024, 11, 25));
 * ```
 */
export function useDailyNote(date?: Date): UseDailyNoteResult {
  const { store, isLoading, refreshData } = useObjects();

  // Get the target date (default to today)
  const targetDate = useMemo(() => date ?? new Date(), [date]);

  // Get the daily note if it exists (don't create automatically)
  const dailyNote = useMemo(() => {
    if (!store) return null;
    return getDailyNoteByDate(store, targetDate) ?? null;
  }, [store, targetDate]);

  // Ensure the daily note exists (creates if needed)
  const ensureExists = useCallback(() => {
    if (!store) return null;
    const note = getOrCreateDailyNote(store, targetDate);
    refreshData();
    return note;
  }, [store, targetDate, refreshData]);

  // Alias for ensureExists
  const getOrCreate = ensureExists;

  return {
    dailyNote,
    isLoading,
    ensureExists,
    getOrCreate,
  };
}

/**
 * Hook specifically for today's daily note
 *
 * @example
 * ```tsx
 * const { dailyNote, ensureExists } = useTodaysDailyNote();
 *
 * // On app launch or before creating objects
 * useEffect(() => {
 *   ensureExists();
 * }, [ensureExists]);
 * ```
 */
export function useTodaysDailyNote(): UseDailyNoteResult {
  return useDailyNote(new Date());
}
