/**
 * CalendarDay - Individual day cell in the calendar grid
 */

import { Button, Text, Box } from '@mantine/core';
import { isToday } from '@/lib/daily';
import styles from './CalendarDay.module.css';

interface CalendarDayProps {
  /** Day number (1-31) */
  day: number;
  /** Date object for this day */
  date: Date;
  /** Whether this day has a daily note */
  hasNote: boolean;
  /** Click handler */
  onClick: () => void;
}

export function CalendarDay({ day, date, hasNote, onClick }: CalendarDayProps) {
  const today = isToday(date);

  return (
    <Button
      variant="subtle"
      color="gray"
      onClick={onClick}
      aria-label={`${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${hasNote ? ', has note' : ''}`}
      h={36}
      p={0}
      className={styles.day}
      data-today={today || undefined}
      style={{
        position: 'relative',
        border: today ? '2px solid var(--mantine-color-ember-4)' : undefined,
      }}
    >
      <Text size="sm" fw={today ? 600 : 400} c={today ? 'ember' : undefined}>
        {day}
      </Text>
      {hasNote && (
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
            backgroundColor: 'var(--mantine-color-ember-5)',
          }}
        />
      )}
    </Button>
  );
}
