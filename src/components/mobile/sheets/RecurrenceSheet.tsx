/**
 * Recurrence Sheet
 * Mobile-friendly recurrence editor with touch-optimized controls
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Stack,
  Text,
  UnstyledButton,
  Group,
  Select,
  Divider,
  Box,
} from '@mantine/core';
import { Repeat, X } from 'lucide-react';
import { BottomSheet } from '../primitives';
import {
  parseRecurrenceValue,
  formatRecurrenceDisplay,
  type RecurrenceValue,
} from '@/components/object/editors/RecurrenceEditor';

// Frequency options
const FREQUENCIES = [
  { value: 'none', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

// Days of week
const DAYS_OF_WEEK = [
  { value: 0, label: 'S', fullLabel: 'Sunday' },
  { value: 1, label: 'M', fullLabel: 'Monday' },
  { value: 2, label: 'T', fullLabel: 'Tuesday' },
  { value: 3, label: 'W', fullLabel: 'Wednesday' },
  { value: 4, label: 'T', fullLabel: 'Thursday' },
  { value: 5, label: 'F', fullLabel: 'Friday' },
  { value: 6, label: 'S', fullLabel: 'Saturday' },
];

// Week of month options
const WEEK_OF_MONTH = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '5', label: 'Last' },
];

// Month options
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

// Day options (1-31)
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

/**
 * Serialize RecurrenceValue to JSON string
 */
function serializeRecurrenceValue(value: RecurrenceValue): string | null {
  if (value.frequency === 'none') {
    return null;
  }
  return JSON.stringify(value);
}

interface RecurrenceSheetProps {
  opened: boolean;
  onClose: () => void;
  value: string | null;
  onSave: (value: string | null) => void;
}

export function RecurrenceSheet({
  opened,
  onClose,
  value,
  onSave,
}: RecurrenceSheetProps) {
  // Parse the initial value
  const initialRecurrence = useMemo(() => parseRecurrenceValue(value), [value]);

  // Local state for editing
  const [recurrence, setRecurrence] =
    useState<RecurrenceValue>(initialRecurrence);
  const [monthlyMode, setMonthlyMode] = useState<'day' | 'nth'>(
    initialRecurrence.weekOfMonth !== undefined ? 'nth' : 'day'
  );

  // Reset when opened with new value
  useEffect(() => {
    const parsed = parseRecurrenceValue(value);
    setRecurrence(parsed);
    setMonthlyMode(parsed.weekOfMonth !== undefined ? 'nth' : 'day');
  }, [value, opened]);

  // Handle frequency change
  const handleFrequencyChange = useCallback((freq: string | null) => {
    if (!freq) return;

    const newRecurrence: RecurrenceValue = {
      frequency: freq as RecurrenceValue['frequency'],
    };

    // Set sensible defaults for each frequency
    if (freq === 'weekly') {
      const today = new Date().getDay();
      newRecurrence.daysOfWeek = [today];
    } else if (freq === 'monthly' || freq === 'quarterly') {
      const today = new Date().getDate();
      newRecurrence.dayOfMonth = Math.min(today, 28);
      setMonthlyMode('day');
    } else if (freq === 'yearly') {
      const today = new Date();
      newRecurrence.month = today.getMonth() + 1;
      newRecurrence.dayOfMonth = today.getDate();
    }

    setRecurrence(newRecurrence);
  }, []);

  // Handle day of week toggle (for weekly)
  const handleDayOfWeekToggle = useCallback(
    (day: number) => {
      const currentDays = recurrence.daysOfWeek ?? [];
      let newDays: number[];

      if (currentDays.includes(day)) {
        newDays = currentDays.filter((d) => d !== day);
        // Ensure at least one day is selected
        if (newDays.length === 0) return;
      } else {
        newDays = [...currentDays, day].sort((a, b) => a - b);
      }

      setRecurrence({
        ...recurrence,
        daysOfWeek: newDays,
      });
    },
    [recurrence]
  );

  // Handle monthly mode change
  const handleMonthlyModeChange = useCallback(
    (mode: 'day' | 'nth') => {
      setMonthlyMode(mode);

      if (mode === 'day') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { weekOfMonth: _wom, dayOfWeek: _dow, ...rest } = recurrence;
        const today = new Date().getDate();
        setRecurrence({
          ...rest,
          dayOfMonth: Math.min(today, 28),
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { dayOfMonth: _dom, ...rest } = recurrence;
        const today = new Date().getDay();
        setRecurrence({
          ...rest,
          weekOfMonth: 1,
          dayOfWeek: today,
        });
      }
    },
    [recurrence]
  );

  // Handle day of month change
  const handleDayOfMonthChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      setRecurrence({
        ...recurrence,
        dayOfMonth: parseInt(val, 10),
      });
    },
    [recurrence]
  );

  // Handle week of month change
  const handleWeekOfMonthChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      setRecurrence({
        ...recurrence,
        weekOfMonth: parseInt(val, 10),
      });
    },
    [recurrence]
  );

  // Handle day of week change (for monthly nth weekday)
  const handleNthDayOfWeekChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      setRecurrence({
        ...recurrence,
        dayOfWeek: parseInt(val, 10),
      });
    },
    [recurrence]
  );

  // Handle month change (for yearly)
  const handleMonthChange = useCallback(
    (val: string | null) => {
      if (!val) return;
      setRecurrence({
        ...recurrence,
        month: parseInt(val, 10),
      });
    },
    [recurrence]
  );

  // Handle save
  const handleSave = useCallback(() => {
    onSave(serializeRecurrenceValue(recurrence));
    onClose();
  }, [recurrence, onSave, onClose]);

  // Handle clear
  const handleClear = useCallback(() => {
    onSave(null);
    onClose();
  }, [onSave, onClose]);

  // Preview text
  const previewText = formatRecurrenceDisplay(
    serializeRecurrenceValue(recurrence)
  );

  return (
    <BottomSheet opened={opened} onClose={onClose} title="Recurrence" size="lg">
      <Stack gap="md">
        {/* Frequency selector */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Repeat
          </Text>
          <Select
            data={FREQUENCIES}
            value={recurrence.frequency}
            onChange={handleFrequencyChange}
            size="md"
          />
        </Stack>

        {/* Weekly: Day of week selector */}
        {recurrence.frequency === 'weekly' && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              On days
            </Text>
            <Group gap={6}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = recurrence.daysOfWeek?.includes(day.value);
                return (
                  <UnstyledButton
                    key={day.value}
                    onClick={() => handleDayOfWeekToggle(day.value)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected
                        ? 'var(--mantine-color-ember-5)'
                        : 'var(--mantine-color-gray-1)',
                    }}
                  >
                    <Text
                      size="sm"
                      fw={isSelected ? 600 : 400}
                      c={isSelected ? 'white' : undefined}
                    >
                      {day.label}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Group>
          </Stack>
        )}

        {/* Monthly: Day of month or nth weekday */}
        {recurrence.frequency === 'monthly' && (
          <Stack gap="md">
            {/* Mode toggle */}
            <Group gap="xs">
              <UnstyledButton
                onClick={() => handleMonthlyModeChange('day')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor:
                    monthlyMode === 'day'
                      ? 'var(--mantine-color-ember-0)'
                      : 'var(--mantine-color-gray-0)',
                  border:
                    monthlyMode === 'day'
                      ? '1px solid var(--mantine-color-ember-3)'
                      : '1px solid transparent',
                  textAlign: 'center',
                }}
              >
                <Text size="sm" fw={monthlyMode === 'day' ? 600 : 400}>
                  Day of month
                </Text>
              </UnstyledButton>
              <UnstyledButton
                onClick={() => handleMonthlyModeChange('nth')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor:
                    monthlyMode === 'nth'
                      ? 'var(--mantine-color-ember-0)'
                      : 'var(--mantine-color-gray-0)',
                  border:
                    monthlyMode === 'nth'
                      ? '1px solid var(--mantine-color-ember-3)'
                      : '1px solid transparent',
                  textAlign: 'center',
                }}
              >
                <Text size="sm" fw={monthlyMode === 'nth' ? 600 : 400}>
                  Nth weekday
                </Text>
              </UnstyledButton>
            </Group>

            {monthlyMode === 'day' ? (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  On day
                </Text>
                <Select
                  data={DAY_OPTIONS}
                  value={String(recurrence.dayOfMonth ?? 1)}
                  onChange={handleDayOfMonthChange}
                  size="md"
                />
              </Stack>
            ) : (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  On the
                </Text>
                <Group gap="xs">
                  <Select
                    data={WEEK_OF_MONTH}
                    value={String(recurrence.weekOfMonth ?? 1)}
                    onChange={handleWeekOfMonthChange}
                    size="md"
                    style={{ flex: 1 }}
                  />
                  <Select
                    data={DAYS_OF_WEEK.map((d) => ({
                      value: String(d.value),
                      label: d.fullLabel,
                    }))}
                    value={String(recurrence.dayOfWeek ?? 1)}
                    onChange={handleNthDayOfWeekChange}
                    size="md"
                    style={{ flex: 1 }}
                  />
                </Group>
              </Stack>
            )}
          </Stack>
        )}

        {/* Quarterly: Day of first month */}
        {recurrence.frequency === 'quarterly' && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              On day
            </Text>
            <Select
              data={DAY_OPTIONS}
              value={String(recurrence.dayOfMonth ?? 1)}
              onChange={handleDayOfMonthChange}
              size="md"
            />
            <Text size="xs" c="dimmed">
              First month of each quarter
            </Text>
          </Stack>
        )}

        {/* Yearly: Month and day */}
        {recurrence.frequency === 'yearly' && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              On
            </Text>
            <Group gap="xs">
              <Select
                data={MONTHS}
                value={String(recurrence.month ?? 1)}
                onChange={handleMonthChange}
                size="md"
                style={{ flex: 1 }}
              />
              <Select
                data={DAY_OPTIONS}
                value={String(recurrence.dayOfMonth ?? 1)}
                onChange={handleDayOfMonthChange}
                size="md"
                style={{ width: 100 }}
              />
            </Group>
          </Stack>
        )}

        {/* Preview */}
        {recurrence.frequency !== 'none' && (
          <>
            <Divider />
            <Box
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Group gap="xs">
                <Repeat
                  size={16}
                  style={{ color: 'var(--mantine-color-gray-5)' }}
                />
                <Text size="sm">{previewText}</Text>
              </Group>
            </Box>
          </>
        )}

        <Divider />

        {/* Save button */}
        <UnstyledButton
          onClick={handleSave}
          style={{
            padding: '16px',
            borderRadius: 8,
            backgroundColor: 'var(--mantine-color-ember-5)',
            textAlign: 'center',
          }}
        >
          <Text size="md" fw={600} c="white">
            Save
          </Text>
        </UnstyledButton>

        {/* Clear button */}
        {value && (
          <UnstyledButton
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 8,
            }}
          >
            <X size={18} style={{ color: 'var(--mantine-color-gray-5)' }} />
            <Text size="sm" c="dimmed">
              Remove recurrence
            </Text>
          </UnstyledButton>
        )}
      </Stack>
    </BottomSheet>
  );
}
