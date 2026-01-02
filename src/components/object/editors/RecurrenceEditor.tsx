/**
 * RecurrenceEditor - A comprehensive recurrence selector
 *
 * Supports:
 * - Frequency: daily, weekly, monthly, quarterly, yearly
 * - Weekly: select days of the week
 * - Monthly: day of month or nth weekday (e.g., "first Monday")
 * - Quarterly: which quarter month + day
 * - Yearly: month + day
 */

import { useState, useCallback, useMemo } from 'react';
import { Select, Button, Stack, Group, Text, Collapse, Box } from '@mantine/core';

/**
 * Recurrence value structure
 */
export interface RecurrenceValue {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number; // 1-31
  weekOfMonth?: number; // 1=first, 2=second, 3=third, 4=fourth, 5=last
  dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat (for monthly nth weekday)
  month?: number; // 1-12
}

interface RecurrenceEditorProps {
  id?: string;
  value: string | null; // JSON stringified RecurrenceValue
  onChange: (value: string | null) => void;
}

const FREQUENCIES = [
  { value: 'none', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

const WEEK_OF_MONTH = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '5', label: 'Last' },
];

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate day options (1-31)
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

/**
 * Parse a JSON string to RecurrenceValue, handling legacy string formats
 */
function parseRecurrenceValue(value: string | null): RecurrenceValue {
  if (!value) {
    return { frequency: 'none' };
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'frequency' in parsed) {
      return parsed as RecurrenceValue;
    }
  } catch {
    // Handle legacy string formats like "daily", "weekly", etc.
    const normalized = value.toLowerCase().trim();
    if (normalized === 'daily') {
      return { frequency: 'daily' };
    }
    if (normalized === 'weekly') {
      return { frequency: 'weekly' };
    }
    if (normalized === 'monthly') {
      return { frequency: 'monthly' };
    }
    if (normalized === 'yearly') {
      return { frequency: 'yearly' };
    }
  }

  return { frequency: 'none' };
}

/**
 * Serialize RecurrenceValue to JSON string
 */
function serializeRecurrenceValue(value: RecurrenceValue): string | null {
  if (value.frequency === 'none') {
    return null;
  }
  return JSON.stringify(value);
}

export function RecurrenceEditor({
  id,
  value,
  onChange,
}: RecurrenceEditorProps) {
  const recurrence = useMemo(() => parseRecurrenceValue(value), [value]);
  const [isExpanded, setIsExpanded] = useState(recurrence.frequency !== 'none');

  // Determine if monthly mode is "day of month" or "nth weekday"
  const isNthWeekday = recurrence.weekOfMonth !== undefined && recurrence.dayOfWeek !== undefined;

  const handleFrequencyChange = useCallback(
    (newFrequency: string | null) => {
      if (!newFrequency) return;

      const freq = newFrequency as RecurrenceValue['frequency'];
      let newValue: RecurrenceValue = { frequency: freq };

      // Set sensible defaults for each frequency
      if (freq === 'weekly') {
        // Default to current day of week
        const today = new Date().getDay();
        newValue.daysOfWeek = [today];
      } else if (freq === 'monthly' || freq === 'quarterly') {
        // Default to current day of month
        const today = new Date().getDate();
        newValue.dayOfMonth = Math.min(today, 28); // Cap at 28 for safety
      } else if (freq === 'yearly') {
        // Default to current month and day
        const today = new Date();
        newValue.month = today.getMonth() + 1;
        newValue.dayOfMonth = today.getDate();
      }

      setIsExpanded(freq !== 'none');
      onChange(serializeRecurrenceValue(newValue));
    },
    [onChange]
  );

  const handleDaysOfWeekChange = useCallback(
    (day: number) => {
      const currentDays = recurrence.daysOfWeek ?? [];
      let newDays: number[];

      if (currentDays.includes(day)) {
        newDays = currentDays.filter((d) => d !== day);
        // Ensure at least one day is selected
        if (newDays.length === 0) {
          return;
        }
      } else {
        newDays = [...currentDays, day].sort((a, b) => a - b);
      }

      onChange(
        serializeRecurrenceValue({
          ...recurrence,
          daysOfWeek: newDays,
        })
      );
    },
    [recurrence, onChange]
  );

  const handleDayOfMonthChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      const day = parseInt(val, 10);
      // When switching to day of month mode, remove weekOfMonth and dayOfWeek
      const { weekOfMonth: _, dayOfWeek: __, ...rest } = recurrence;
      onChange(
        serializeRecurrenceValue({
          ...rest,
          dayOfMonth: day,
        })
      );
    },
    [recurrence, onChange]
  );

  const handleMonthlyModeChange = useCallback(
    (mode: string | null) => {
      if (!mode) return;
      if (mode === 'day') {
        // Switch to day of month mode
        const { weekOfMonth: _, dayOfWeek: __, ...rest } = recurrence;
        const today = new Date().getDate();
        onChange(
          serializeRecurrenceValue({
            ...rest,
            dayOfMonth: Math.min(today, 28),
          })
        );
      } else {
        // Switch to nth weekday mode
        const { dayOfMonth: _, ...rest } = recurrence;
        const today = new Date().getDay();
        onChange(
          serializeRecurrenceValue({
            ...rest,
            weekOfMonth: 1, // First
            dayOfWeek: today,
          })
        );
      }
    },
    [recurrence, onChange]
  );

  const handleWeekOfMonthChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      const week = parseInt(val, 10);
      onChange(
        serializeRecurrenceValue({
          ...recurrence,
          weekOfMonth: week,
        })
      );
    },
    [recurrence, onChange]
  );

  const handleDayOfWeekChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      const day = parseInt(val, 10);
      onChange(
        serializeRecurrenceValue({
          ...recurrence,
          dayOfWeek: day,
        })
      );
    },
    [recurrence, onChange]
  );

  const handleMonthChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      const month = parseInt(val, 10);
      onChange(
        serializeRecurrenceValue({
          ...recurrence,
          month,
        })
      );
    },
    [recurrence, onChange]
  );

  return (
    <Stack gap="sm" id={id}>
      {/* Frequency selector */}
      <Select
        data={FREQUENCIES}
        value={recurrence.frequency}
        onChange={handleFrequencyChange}
        aria-label="Recurrence frequency"
        size="sm"
      />

      {/* Additional options based on frequency */}
      <Collapse in={isExpanded && recurrence.frequency !== 'none'}>
        <Stack gap="sm">
          {/* Weekly: Day of week selector */}
          {recurrence.frequency === 'weekly' && (
            <Box>
              <Text size="sm" c="dimmed" mb="xs">Repeat on:</Text>
              <Group gap={4}>
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    size="xs"
                    variant={recurrence.daysOfWeek?.includes(day.value) ? 'filled' : 'light'}
                    onClick={() => handleDaysOfWeekChange(day.value)}
                    aria-pressed={recurrence.daysOfWeek?.includes(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </Group>
            </Box>
          )}

          {/* Monthly: Day of month or nth weekday selector */}
          {recurrence.frequency === 'monthly' && (
            <Stack gap="xs">
              <Select
                size="sm"
                data={[
                  { value: 'day', label: 'On day of month' },
                  { value: 'nth', label: 'On the nth weekday' },
                ]}
                value={isNthWeekday ? 'nth' : 'day'}
                onChange={handleMonthlyModeChange}
              />
              {isNthWeekday ? (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">On the:</Text>
                  <Select
                    size="sm"
                    data={WEEK_OF_MONTH}
                    value={String(recurrence.weekOfMonth ?? 1)}
                    onChange={handleWeekOfMonthChange}
                    style={{ width: 100 }}
                  />
                  <Select
                    size="sm"
                    data={DAYS_OF_WEEK.map((d) => ({ value: String(d.value), label: d.fullLabel }))}
                    value={String(recurrence.dayOfWeek ?? 1)}
                    onChange={handleDayOfWeekChange}
                    style={{ width: 120 }}
                  />
                </Group>
              ) : (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">On day:</Text>
                  <Select
                    size="sm"
                    data={DAY_OPTIONS}
                    value={String(recurrence.dayOfMonth ?? 1)}
                    onChange={handleDayOfMonthChange}
                    style={{ width: 80 }}
                  />
                </Group>
              )}
            </Stack>
          )}

          {/* Quarterly: Day of month (first month of quarter) */}
          {recurrence.frequency === 'quarterly' && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">On day:</Text>
              <Select
                size="sm"
                data={DAY_OPTIONS}
                value={String(recurrence.dayOfMonth ?? 1)}
                onChange={handleDayOfMonthChange}
                style={{ width: 80 }}
              />
              <Text size="sm" c="dimmed">of each quarter</Text>
            </Group>
          )}

          {/* Yearly: Month and day */}
          {recurrence.frequency === 'yearly' && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">On:</Text>
              <Select
                size="sm"
                data={MONTHS}
                value={String(recurrence.month ?? 1)}
                onChange={handleMonthChange}
                style={{ width: 120 }}
              />
              <Select
                size="sm"
                data={DAY_OPTIONS}
                value={String(recurrence.dayOfMonth ?? 1)}
                onChange={handleDayOfMonthChange}
                style={{ width: 80 }}
              />
            </Group>
          )}
        </Stack>
      </Collapse>
    </Stack>
  );
}

/**
 * Format a recurrence value for display
 */
export function formatRecurrenceDisplay(value: string | null): string {
  const recurrence = parseRecurrenceValue(value);

  switch (recurrence.frequency) {
    case 'none':
      return 'No recurrence';
    case 'daily':
      return 'Daily';
    case 'weekly': {
      const days = recurrence.daysOfWeek ?? [];
      if (days.length === 7) {
        return 'Every day';
      }
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
        return 'Weekdays';
      }
      if (days.length === 2 && days.includes(0) && days.includes(6)) {
        return 'Weekends';
      }
      const dayNames = days.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label);
      return `Weekly on ${dayNames.join(', ')}`;
    }
    case 'monthly': {
      if (recurrence.weekOfMonth !== undefined && recurrence.dayOfWeek !== undefined) {
        const weekLabel = WEEK_OF_MONTH.find((w) => w.value === String(recurrence.weekOfMonth))?.label ?? 'First';
        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === recurrence.dayOfWeek)?.fullLabel ?? 'Monday';
        return `Monthly on ${weekLabel} ${dayLabel}`;
      }
      return `Monthly on day ${recurrence.dayOfMonth ?? 1}`;
    }
    case 'quarterly':
      return `Quarterly on day ${recurrence.dayOfMonth ?? 1}`;
    case 'yearly': {
      const monthName = MONTHS.find((m) => m.value === String(recurrence.month))?.label ?? 'January';
      return `Yearly on ${monthName} ${recurrence.dayOfMonth ?? 1}`;
    }
    default:
      return 'Unknown';
  }
}

// Re-export the parse function for use in recurrence logic
export { parseRecurrenceValue };
