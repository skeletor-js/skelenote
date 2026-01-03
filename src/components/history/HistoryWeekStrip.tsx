/**
 * HistoryWeekStrip - Horizontal 7-day week navigation for Time Machine
 *
 * Similar to Daily Notes WeekStrip but adapted for history navigation:
 * - Shows bar indicators for change density (not dots)
 * - Navigation skips to days with changes
 * - Days without changes are disabled
 */

import { useMemo, useCallback } from 'react';
import { Group, Button, Text, ActionIcon, Box, Stack } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { DayChanges } from '@/lib/loro/versions';
import styles from './HistoryWeekStrip.module.css';

interface HistoryWeekStripProps {
  /** Currently selected date (YYYY-MM-DD format) or null */
  selectedDate: string | null;
  /** Changes grouped by date */
  changesByDate: Map<string, DayChanges>;
  /** Callback when a date is selected */
  onDateSelect: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Format a Date as YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the Monday of the week containing the given date (ISO week start)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust: Sunday (0) becomes 6, Mon (1) becomes 0, etc.
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate array of 7 dates for the week starting from Monday
 */
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Check if two dates are the same day
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Format week range label (e.g., "Dec 23 - 29, 2024")
 */
function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const year = weekEnd.getFullYear();

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${year}`;
  } else {
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
  }
}

/**
 * Get relative week context (e.g., "This Week", "Last Week", "2 weeks ago")
 */
function getRelativeWeekContext(weekStart: Date): string | null {
  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  const diffTime = currentWeekStart.getTime() - weekStart.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.round(diffDays / 7);

  if (diffWeeks === 0) {
    return 'This Week';
  } else if (diffWeeks === 1) {
    return 'Last Week';
  } else if (diffWeeks === -1) {
    return 'Next Week';
  } else if (diffWeeks > 1) {
    return `${diffWeeks} weeks ago`;
  } else if (diffWeeks < -1) {
    return `In ${Math.abs(diffWeeks)} weeks`;
  }
  return null;
}

export function HistoryWeekStrip({
  selectedDate,
  changesByDate,
  onDateSelect,
}: HistoryWeekStripProps) {
  // Determine the week to display based on selected date or default to most recent changes
  const displayWeekStart = useMemo(() => {
    if (selectedDate) {
      return getWeekStart(parseDateKey(selectedDate));
    }
    // Default to week containing most recent change
    const dates = Array.from(changesByDate.keys()).sort().reverse();
    if (dates.length > 0) {
      return getWeekStart(parseDateKey(dates[0]));
    }
    return getWeekStart(new Date());
  }, [selectedDate, changesByDate]);

  // Generate array of 7 dates for this week
  const weekDays = useMemo(() => getWeekDays(displayWeekStart), [displayWeekStart]);

  // Week label for display
  const weekLabel = useMemo(() => formatWeekLabel(displayWeekStart), [displayWeekStart]);

  // Relative week context
  const relativeContext = useMemo(() => getRelativeWeekContext(displayWeekStart), [displayWeekStart]);

  // Calculate max changes in visible week for relative bar sizing
  const maxChangesInWeek = useMemo(() => {
    let max = 0;
    for (const date of weekDays) {
      const dateKey = formatDateKey(date);
      const dayChanges = changesByDate.get(dateKey);
      if (dayChanges && dayChanges.totalChanges > max) {
        max = dayChanges.totalChanges;
      }
    }
    return max;
  }, [weekDays, changesByDate]);

  // Calculate bar width as percentage based on relative density
  const getBarWidth = useCallback((totalChanges: number): number => {
    if (maxChangesInWeek === 0) return 0;
    const ratio = totalChanges / maxChangesInWeek;
    if (ratio <= 0.25) return 25;
    if (ratio <= 0.5) return 50;
    if (ratio <= 0.75) return 75;
    return 100;
  }, [maxChangesInWeek]);

  // Check if today has changes (for smart Today button)
  const todayKey = formatDateKey(new Date());
  const todayHasChanges = changesByDate.has(todayKey);
  const isOnTodaysWeek = isSameDay(displayWeekStart, getWeekStart(new Date()));

  // Find next/prev day with changes for navigation
  const findDayWithChanges = useCallback((
    startDate: Date,
    direction: 'forward' | 'backward'
  ): string | null => {
    const sortedDates = Array.from(changesByDate.keys()).sort();
    const startKey = formatDateKey(startDate);

    if (direction === 'forward') {
      return sortedDates.find(d => d > startKey) ?? null;
    } else {
      return [...sortedDates].reverse().find(d => d < startKey) ?? null;
    }
  }, [changesByDate]);

  // Find next/prev week with changes
  const findWeekWithChanges = useCallback((
    currentWeekStart: Date,
    direction: 'forward' | 'backward'
  ): string | null => {
    const offset = direction === 'forward' ? 7 : -7;
    const targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setDate(targetWeekStart.getDate() + offset);

    // Look for any day in the target week direction
    const sortedDates = Array.from(changesByDate.keys()).sort();

    if (direction === 'forward') {
      const targetStartKey = formatDateKey(targetWeekStart);
      return sortedDates.find(d => d >= targetStartKey) ?? null;
    } else {
      const currentStartKey = formatDateKey(currentWeekStart);
      return [...sortedDates].reverse().find(d => d < currentStartKey) ?? null;
    }
  }, [changesByDate]);

  // Navigation handlers
  const goToPreviousDay = useCallback(() => {
    const currentDate = selectedDate ? parseDateKey(selectedDate) : new Date();
    const prevDay = findDayWithChanges(currentDate, 'backward');
    if (prevDay) onDateSelect(prevDay);
  }, [selectedDate, findDayWithChanges, onDateSelect]);

  const goToNextDay = useCallback(() => {
    const currentDate = selectedDate ? parseDateKey(selectedDate) : new Date();
    const nextDay = findDayWithChanges(currentDate, 'forward');
    if (nextDay) onDateSelect(nextDay);
  }, [selectedDate, findDayWithChanges, onDateSelect]);

  const goToPreviousWeek = useCallback(() => {
    const prevWeekDay = findWeekWithChanges(displayWeekStart, 'backward');
    if (prevWeekDay) onDateSelect(prevWeekDay);
  }, [displayWeekStart, findWeekWithChanges, onDateSelect]);

  const goToNextWeek = useCallback(() => {
    const nextWeekDay = findWeekWithChanges(displayWeekStart, 'forward');
    if (nextWeekDay) onDateSelect(nextWeekDay);
  }, [displayWeekStart, findWeekWithChanges, onDateSelect]);

  const goToToday = useCallback(() => {
    if (todayHasChanges) {
      onDateSelect(todayKey);
    }
  }, [todayHasChanges, todayKey, onDateSelect]);

  // Check if there are changes before/after current position
  const hasPrevDay = useMemo(() => {
    const currentDate = selectedDate ? parseDateKey(selectedDate) : new Date();
    return findDayWithChanges(currentDate, 'backward') !== null;
  }, [selectedDate, findDayWithChanges]);

  const hasNextDay = useMemo(() => {
    const currentDate = selectedDate ? parseDateKey(selectedDate) : new Date();
    return findDayWithChanges(currentDate, 'forward') !== null;
  }, [selectedDate, findDayWithChanges]);

  const hasPrevWeek = useMemo(() => {
    return findWeekWithChanges(displayWeekStart, 'backward') !== null;
  }, [displayWeekStart, findWeekWithChanges]);

  const hasNextWeek = useMemo(() => {
    return findWeekWithChanges(displayWeekStart, 'forward') !== null;
  }, [displayWeekStart, findWeekWithChanges]);

  return (
    <Box
      px="md"
      py="sm"
      style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Week label with relative context */}
      <Text size="sm" fw={500} c="dimmed" ta="center" mb="xs">
        {relativeContext ? `${relativeContext} · ${weekLabel}` : weekLabel}
      </Text>

      {/* Combined navigation row */}
      <Group justify="center" gap="xs">
        {/* Week back */}
        <ActionIcon
          variant="subtle"
          onClick={goToPreviousWeek}
          disabled={!hasPrevWeek}
          aria-label="Previous week with changes"
        >
          <Icon name="chevrons-left" size={16} />
        </ActionIcon>

        {/* Day back */}
        <ActionIcon
          variant="subtle"
          onClick={goToPreviousDay}
          disabled={!hasPrevDay}
          aria-label="Previous day with changes"
        >
          <Icon name="chevron-left" size={14} />
        </ActionIcon>

        {weekDays.map((date, index) => {
          const dateKey = formatDateKey(date);
          const isSelected = selectedDate === dateKey;
          const isTodayDate = isToday(date);
          const dayChanges = changesByDate.get(dateKey);
          const hasChanges = dayChanges && dayChanges.totalChanges > 0;
          const barWidth = hasChanges ? getBarWidth(dayChanges.totalChanges) : 0;

          return (
            <Button
              key={dateKey}
              variant={isSelected ? 'filled' : 'subtle'}
              color={isSelected ? 'ember' : 'gray'}
              onClick={() => hasChanges && onDateSelect(dateKey)}
              disabled={!hasChanges}
              h={48}
              w={48}
              p={0}
              className={styles.dayCell}
              data-today={isTodayDate}
              aria-label={`${date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}${hasChanges ? `, ${dayChanges.totalChanges} changes` : ', no changes'}`}
              aria-current={isTodayDate ? 'date' : undefined}
              aria-pressed={isSelected}
              style={{
                position: 'relative',
              }}
            >
              <Stack gap={0} align="center">
                <Text size="xs" c={isSelected ? undefined : 'dimmed'}>
                  {WEEKDAY_LABELS[index]}
                </Text>
                <Text size="sm" fw={isTodayDate ? 600 : 400}>
                  {date.getDate()}
                </Text>
              </Stack>
              {/* Bar indicator for change density */}
              {hasChanges && (
                <Box
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${barWidth}%`,
                    maxWidth: 24,
                    height: 3,
                    borderRadius: 1,
                    backgroundColor: isSelected
                      ? 'var(--mantine-color-white)'
                      : 'var(--mantine-color-ember-5)',
                    opacity: isSelected ? 0.8 : 1,
                  }}
                />
              )}
            </Button>
          );
        })}

        {/* Day forward */}
        <ActionIcon
          variant="subtle"
          onClick={goToNextDay}
          disabled={!hasNextDay}
          aria-label="Next day with changes"
        >
          <Icon name="chevron-right" size={14} />
        </ActionIcon>

        {/* Week forward */}
        <ActionIcon
          variant="subtle"
          onClick={goToNextWeek}
          disabled={!hasNextWeek}
          aria-label="Next week with changes"
        >
          <Icon name="chevrons-right" size={16} />
        </ActionIcon>

        {/* Today button - only show if today has changes and not already on today's week */}
        {todayHasChanges && !isOnTodaysWeek && (
          <Button
            variant="subtle"
            size="xs"
            onClick={goToToday}
            ml="xs"
          >
            Today
          </Button>
        )}
      </Group>
    </Box>
  );
}
