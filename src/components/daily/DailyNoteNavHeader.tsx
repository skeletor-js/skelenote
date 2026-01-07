/**
 * DailyNoteNavHeader - Navigation header for daily note detail view
 * Used when navigating to a daily note from another context
 */

import { useCallback, useMemo } from 'react';
import { Group, Button, Text } from '@mantine/core';
import { useNavigation, useObjects } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getAdjacentDailyNote, formatDateTitle } from '@/lib/daily';

interface DailyNoteNavHeaderProps {
  /** The timestamp of the current daily note's date */
  dateTimestamp: number;
}

export function DailyNoteNavHeader({ dateTimestamp }: DailyNoteNavHeaderProps) {
  const { store, refreshData } = useObjects();
  const { navigateToObject, navigateToView } = useNavigation();

  const currentDate = useMemo(() => new Date(dateTimestamp), [dateTimestamp]);
  const dateLabel = formatDateTitle(currentDate);

  const handlePreviousDay = useCallback(() => {
    if (!store) return;
    const prevNote = getAdjacentDailyNote(store, currentDate, -1);
    refreshData();
    navigateToObject(prevNote.id);
  }, [store, currentDate, refreshData, navigateToObject]);

  const handleNextDay = useCallback(() => {
    if (!store) return;
    const nextNote = getAdjacentDailyNote(store, currentDate, 1);
    refreshData();
    navigateToObject(nextNote.id);
  }, [store, currentDate, refreshData, navigateToObject]);

  const handleGoToCalendar = useCallback(() => {
    navigateToView('daily-notes');
  }, [navigateToView]);

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px="md"
      py="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        flexShrink: 0,
      }}
    >
      <Group gap="xs">
        <Button
          variant="subtle"
          size="xs"
          onClick={handlePreviousDay}
          leftSection={<Icon name="chevron-left" size={14} />}
          aria-label="Previous day"
        >
          Prev
        </Button>
        <Text fw={500} size="sm">
          {dateLabel}
        </Text>
        <Button
          variant="subtle"
          size="xs"
          onClick={handleNextDay}
          rightSection={<Icon name="chevron-right" size={14} />}
          aria-label="Next day"
        >
          Next
        </Button>
      </Group>
      <Button
        variant="subtle"
        size="xs"
        onClick={handleGoToCalendar}
        leftSection={<Icon name="calendar-days" size={14} />}
        aria-label="Back to calendar"
      >
        Calendar
      </Button>
    </Group>
  );
}
