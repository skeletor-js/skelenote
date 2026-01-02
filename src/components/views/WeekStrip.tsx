/**
 * WeekStrip - Horizontal 7-day week navigation for Daily Notes
 */

import { useMemo, useCallback } from 'react';
import { Group, Button, Text, ActionIcon, Box, Stack } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import styles from './WeekStrip.module.css';

interface WeekStripProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Callback when a date is selected */
  onDateSelect: (date: Date) => void;
  /** Check if a date has a note */
  hasNote: (date: Date) => boolean;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    // Same month: "Dec 23 - 29, 2024"
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${year}`;
  } else {
    // Different months: "Dec 30 - Jan 5, 2025"
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
  }
}

export function WeekStrip({ selectedDate, onDateSelect, hasNote }: WeekStripProps) {
  // Calculate week start (Monday) from selected date
  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);

  // Generate array of 7 dates for this week
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Week label for display
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    onDateSelect(prevWeek);
  }, [selectedDate, onDateSelect]);

  const goToNextWeek = useCallback(() => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateSelect(nextWeek);
  }, [selectedDate, onDateSelect]);

  const goToToday = useCallback(() => {
    onDateSelect(new Date());
  }, [onDateSelect]);

  const goToPreviousDay = useCallback(() => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    onDateSelect(prevDay);
  }, [selectedDate, onDateSelect]);

  const goToNextDay = useCallback(() => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateSelect(nextDay);
  }, [selectedDate, onDateSelect]);

  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        flexShrink: 0,
      }}
    >
      {/* Week label */}
      <Text size="sm" fw={500} c="dimmed" ta="center" mb="xs">
        {weekLabel}
      </Text>

      {/* Combined navigation row */}
      <Group justify="center" gap="xs">
        {/* Week back */}
        <ActionIcon
          variant="subtle"
          onClick={goToPreviousWeek}
          aria-label="Previous week"
        >
          <Icon name="chevrons-left" size={16} />
        </ActionIcon>

        {/* Day back */}
        <ActionIcon
          variant="subtle"
          onClick={goToPreviousDay}
          aria-label="Previous day"
        >
          <Icon name="chevron-left" size={14} />
        </ActionIcon>

        {weekDays.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const dateHasNote = hasNote(date);

          return (
            <Button
              key={date.toISOString()}
              variant={isSelected ? 'filled' : 'subtle'}
              color={isSelected ? 'ember' : 'gray'}
              onClick={() => onDateSelect(date)}
              h={48}
              w={48}
              p={0}
              className={styles.dayCell}
              aria-label={`${date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}${dateHasNote ? ', has note' : ''}`}
              aria-current={isTodayDate ? 'date' : undefined}
              aria-pressed={isSelected}
              style={{
                position: 'relative',
                border: isTodayDate && !isSelected ? '2px solid var(--mantine-color-ember-4)' : undefined,
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
              {dateHasNote && (
                <Box
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '50%',
                    maxWidth: 16,
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
          aria-label="Next day"
        >
          <Icon name="chevron-right" size={14} />
        </ActionIcon>

        {/* Week forward */}
        <ActionIcon
          variant="subtle"
          onClick={goToNextWeek}
          aria-label="Next week"
        >
          <Icon name="chevrons-right" size={16} />
        </ActionIcon>

        {/* Today button */}
        <Button
          variant="subtle"
          size="xs"
          onClick={goToToday}
          ml="xs"
        >
          Today
        </Button>
      </Group>
    </Box>
  );
}
