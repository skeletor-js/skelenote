/**
 * CalendarView - Month grid with change indicators for Time Machine
 */

import { useMemo } from 'react';
import { Box, Group, Button, Text, SimpleGrid, ActionIcon } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { CalendarViewProps } from './types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a date as YYYY-MM-DD in local timezone
 */
function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayKey(): string {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function CalendarView({
  currentMonth,
  changesByDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: CalendarViewProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Format month label
  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate days in month and first day offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();

  // Generate day numbers
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Generate empty cells for offset
  const emptyDays = useMemo(
    () => Array.from({ length: firstDayOffset }, (_, i) => i),
    [firstDayOffset]
  );

  // Get today's date key
  const todayKey = useMemo(() => getTodayKey(), []);

  // Navigation handlers
  const goToPreviousMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Get changes info for a specific day
  const getChangesForDay = (day: number) => {
    const dateKey = formatDateKey(year, month, day);
    return changesByDate.get(dateKey);
  };

  // Calculate the maximum changes in any single day for relative scaling
  const maxChangesInMonth = useMemo(() => {
    let max = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const dayChanges = changesByDate.get(dateKey);
      if (dayChanges && dayChanges.totalChanges > max) {
        max = dayChanges.totalChanges;
      }
    }
    return max;
  }, [changesByDate, daysInMonth, year, month]);

  // Calculate bar width as percentage based on relative density
  const getBarWidth = (totalChanges: number): number => {
    if (maxChangesInMonth === 0) return 0;
    const ratio = totalChanges / maxChangesInMonth;
    // Map to discrete levels: 25%, 50%, 75%, 100%
    if (ratio <= 0.25) return 25;
    if (ratio <= 0.5) return 50;
    if (ratio <= 0.75) return 75;
    return 100;
  };

  return (
    <Box>
      {/* Header with month navigation */}
      <Group justify="space-between" mb="sm">
        <ActionIcon
          variant="subtle"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          <Icon name="chevron-left" size={18} />
        </ActionIcon>
        <Text size="md" fw={600}>{monthLabel}</Text>
        <ActionIcon
          variant="subtle"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          <Icon name="chevron-right" size={18} />
        </ActionIcon>
      </Group>

      {/* Today button */}
      <Group justify="center" mb="sm">
        <Button variant="subtle" size="xs" onClick={goToToday}>
          Today
        </Button>
      </Group>

      {/* Weekday labels */}
      <SimpleGrid cols={7} spacing={2} mb="xs">
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} size="xs" c="dimmed" ta="center">
            {label}
          </Text>
        ))}
      </SimpleGrid>

      {/* Day grid */}
      <SimpleGrid cols={7} spacing={2}>
        {/* Empty cells before first day */}
        {emptyDays.map((i) => (
          <Box key={`empty-${i}`} h={36} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = formatDateKey(year, month, day);
          const dayChanges = getChangesForDay(day);
          const hasChanges = dayChanges && dayChanges.totalChanges > 0;
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;
          const barWidth = hasChanges ? getBarWidth(dayChanges.totalChanges) : 0;

          return (
            <Button
              key={day}
              variant={isSelected ? 'filled' : 'subtle'}
              color={isSelected ? 'ember' : 'gray'}
              h={36}
              p={0}
              onClick={() => hasChanges && onDateSelect(dateKey)}
              disabled={!hasChanges}
              aria-label={`${monthLabel.split(' ')[0]} ${day}${
                hasChanges ? `, ${dayChanges.totalChanges} changes` : ', no changes'
              }${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}`}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              style={{
                position: 'relative',
                border: isToday ? '2px solid var(--mantine-color-ember-4)' : undefined,
              }}
            >
              <Text size="sm">{day}</Text>
              {hasChanges && (
                <Box
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
                  aria-hidden="true"
                />
              )}
            </Button>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
