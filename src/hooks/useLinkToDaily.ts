/**
 * useLinkToDaily hook - Links objects to today's daily note
 */

import { useCallback } from 'react';
import { useObjects } from '@/contexts';
import { linkObjectToDaily, isLinkedToToday } from '@/lib/daily';
import type { SkelenoteObject } from '@/lib/types';

interface UseLinkToDailyResult {
  /**
   * Link an object to today's daily note
   * Sets the dailyNote relation and appends a mention to the daily note content
   */
  linkToDaily: (object: SkelenoteObject) => SkelenoteObject | null;

  /**
   * Check if an object is already linked to today's daily note
   */
  isLinkedToToday: (object: SkelenoteObject) => boolean;
}

/**
 * Hook for linking objects to today's daily note
 *
 * Usage:
 * ```tsx
 * const { linkToDaily } = useLinkToDaily();
 *
 * const handleCreate = () => {
 *   const newObject = store.create({ ... });
 *   linkToDaily(newObject);
 *   refreshData();
 * };
 * ```
 */
export function useLinkToDaily(): UseLinkToDailyResult {
  const { store, refreshData } = useObjects();

  const linkToDaily = useCallback(
    (object: SkelenoteObject): SkelenoteObject | null => {
      if (!store) return null;
      const dailyNote = linkObjectToDaily(store, object);
      refreshData();
      return dailyNote;
    },
    [store, refreshData]
  );

  const checkIsLinkedToToday = useCallback((object: SkelenoteObject): boolean => {
    return isLinkedToToday(object);
  }, []);

  return {
    linkToDaily,
    isLinkedToToday: checkIsLinkedToToday,
  };
}
