/**
 * Calendar - Month grid component for browsing daily notes
 */

import { Box, Group, Button, Text, SimpleGrid, ActionIcon } from '@mantine/core';
import { useCalendar } from '@/hooks';
import { useNavigation } from '@/contexts';
import { getOrCreateDailyNote } from '@/lib/daily';
import { useObjects } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { CalendarDay } from './CalendarDay';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar() {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const {
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    daysInMonth,
    firstDayOffset,
    hasNote,
    getDate,
  } = useCalendar();

  const handleDayClick = (day: number) => {
    if (!store) return;

    const date = getDate(day);
    const dailyNote = getOrCreateDailyNote(store, date);
    refreshData();
    navigateToObject(dailyNote.id);
  };

  // Generate array of day numbers for the month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Generate empty cells for days before the first day of month
  const emptyDays = Array.from({ length: firstDayOffset }, (_, i) => i);

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
        <Text fw={600} size="md">
          {monthLabel}
        </Text>
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
        {days.map((day) => (
          <CalendarDay
            key={day}
            day={day}
            date={getDate(day)}
            hasNote={hasNote(day)}
            onClick={() => handleDayClick(day)}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
