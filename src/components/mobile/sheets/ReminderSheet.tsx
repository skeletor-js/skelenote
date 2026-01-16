/**
 * Reminder Sheet
 * Bottom sheet for quick reminder time selection on mobile
 * Features quick presets (relative times) and a datetime picker
 */

import { useState, useMemo, useCallback } from 'react';
import { Stack, Text, UnstyledButton, Divider, Box } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  Check,
  Clock,
  Bell,
  BellOff,
  Sunrise,
  CalendarClock,
} from 'lucide-react';
import dayjs from 'dayjs';
import { BottomSheet } from '../primitives';

/**
 * Get quick reminder presets based on current time and optional due date
 */
function getReminderPresets(dueDate: number | null) {
  const now = dayjs();

  const presets = [
    {
      id: '15min',
      label: 'In 15 minutes',
      sublabel: now.add(15, 'minute').format('h:mm A'),
      value: now.add(15, 'minute').valueOf(),
      icon: Clock,
    },
    {
      id: '1hour',
      label: 'In 1 hour',
      sublabel: now.add(1, 'hour').format('h:mm A'),
      value: now.add(1, 'hour').valueOf(),
      icon: Clock,
    },
    {
      id: '3hours',
      label: 'In 3 hours',
      sublabel: now.add(3, 'hour').format('h:mm A'),
      value: now.add(3, 'hour').valueOf(),
      icon: Clock,
    },
    {
      id: 'tomorrow-9am',
      label: 'Tomorrow at 9 AM',
      sublabel: now.add(1, 'day').hour(9).minute(0).format('ddd, MMM D'),
      value: now.add(1, 'day').hour(9).minute(0).second(0).valueOf(),
      icon: Sunrise,
    },
  ];

  // Add smart presets if due date is set and in the future
  if (dueDate && dueDate > now.valueOf()) {
    const due = dayjs(dueDate);
    const dayBefore = due.subtract(1, 'day').hour(9).minute(0).second(0);
    const morningOf = due.hour(9).minute(0).second(0);

    // Only add if they're in the future
    if (dayBefore.isAfter(now)) {
      presets.push({
        id: 'day-before',
        label: 'Day before due',
        sublabel: dayBefore.format('ddd, MMM D [at] 9 AM'),
        value: dayBefore.valueOf(),
        icon: CalendarClock,
      });
    }

    if (morningOf.isAfter(now)) {
      presets.push({
        id: 'morning-of',
        label: 'Morning of due date',
        sublabel: morningOf.format('ddd, MMM D [at] 9 AM'),
        value: morningOf.valueOf(),
        icon: CalendarClock,
      });
    }
  }

  return presets;
}

interface ReminderSheetProps {
  opened: boolean;
  onClose: () => void;
  value: number | null;
  dueDate?: number | null;
  onSelect: (time: number | null) => void;
}

export function ReminderSheet({
  opened,
  onClose,
  value,
  dueDate,
  onSelect,
}: ReminderSheetProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState<Date | null>(null);
  const presets = useMemo(() => getReminderPresets(dueDate ?? null), [dueDate]);

  // Convert value to dayjs for comparison
  const selectedTime = useMemo(() => {
    return value ? dayjs(value) : null;
  }, [value]);

  // Check if value matches a preset (within 1 minute tolerance)
  const getMatchingPreset = useCallback(() => {
    if (!selectedTime) return null;
    return (
      presets.find((p) => {
        const diff = Math.abs(selectedTime.valueOf() - p.value);
        return diff < 60000; // 1 minute tolerance
      })?.id ?? null
    );
  }, [selectedTime, presets]);

  const handlePresetSelect = (preset: (typeof presets)[0]) => {
    onSelect(preset.value);
    onClose();
  };

  const handlePickerConfirm = () => {
    if (pickerValue) {
      onSelect(pickerValue.getTime());
    }
    onClose();
    setShowPicker(false);
    setPickerValue(null);
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  const handleClose = () => {
    setShowPicker(false);
    setPickerValue(null);
    onClose();
  };

  const handleShowPicker = () => {
    // Initialize picker with current value or default to tomorrow 9am
    const initial = selectedTime
      ? selectedTime.toDate()
      : dayjs().add(1, 'day').hour(9).minute(0).toDate();
    setPickerValue(initial);
    setShowPicker(true);
  };

  const matchingPreset = getMatchingPreset();

  // Format current value for display
  const currentValueDisplay = useMemo(() => {
    if (!value) return null;
    const time = dayjs(value);
    if (time.isBefore(dayjs())) {
      return `${time.format('MMM D [at] h:mm A')} (past)`;
    }
    return time.format('MMM D [at] h:mm A');
  }, [value]);

  const isPast = value ? dayjs(value).isBefore(dayjs()) : false;

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Reminder"
      size={showPicker ? 'lg' : 'auto'}
    >
      <Stack gap="md">
        {/* Current value display */}
        {value && !showPicker && (
          <Box
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              backgroundColor: isPast
                ? 'var(--mantine-color-gray-1)'
                : 'var(--mantine-color-ember-0)',
              border: isPast
                ? '1px solid var(--mantine-color-gray-3)'
                : '1px solid var(--mantine-color-ember-2)',
            }}
          >
            <Text size="sm" fw={500} c={isPast ? 'dimmed' : 'ember'}>
              Currently: {currentValueDisplay}
            </Text>
          </Box>
        )}

        {showPicker ? (
          /* DateTime picker view */
          <Stack gap="md">
            <DateTimePicker
              value={pickerValue}
              onChange={setPickerValue}
              minDate={new Date()}
              size="md"
              label="Pick date and time"
              placeholder="Select when to be reminded"
              valueFormat="MMM D, YYYY [at] h:mm A"
            />
            <UnstyledButton
              onClick={handlePickerConfirm}
              disabled={!pickerValue}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 16px',
                borderRadius: 8,
                backgroundColor: pickerValue
                  ? 'var(--mantine-color-ember-5)'
                  : 'var(--mantine-color-gray-3)',
                color: pickerValue ? 'white' : 'var(--mantine-color-gray-6)',
              }}
            >
              <Check size={18} />
              <Text size="sm" fw={500}>
                Set Reminder
              </Text>
            </UnstyledButton>
          </Stack>
        ) : (
          /* Quick presets */
          <Stack gap="xs">
            {presets.map((preset) => {
              const isSelected = matchingPreset === preset.id;
              const Icon = preset.icon;

              return (
                <UnstyledButton
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 8,
                    backgroundColor: isSelected
                      ? 'var(--mantine-color-ember-0)'
                      : 'var(--mantine-color-gray-0)',
                    border: isSelected
                      ? '1px solid var(--mantine-color-ember-3)'
                      : '1px solid transparent',
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      color: isSelected
                        ? 'var(--mantine-color-ember-5)'
                        : 'var(--mantine-color-gray-5)',
                    }}
                  />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Text size="sm" fw={isSelected ? 600 : 400}>
                      {preset.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {preset.sublabel}
                    </Text>
                  </Stack>
                  {isSelected && (
                    <Check
                      size={18}
                      style={{ color: 'var(--mantine-color-ember-5)' }}
                    />
                  )}
                </UnstyledButton>
              );
            })}

            <Divider my="xs" />

            {/* Pick custom time */}
            <UnstyledButton
              onClick={handleShowPicker}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Bell
                size={20}
                style={{ color: 'var(--mantine-color-gray-5)' }}
              />
              <Text size="sm">Pick a time...</Text>
            </UnstyledButton>

            {/* Clear reminder */}
            {value && (
              <UnstyledButton
                onClick={handleClear}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 16px',
                  borderRadius: 8,
                }}
              >
                <BellOff
                  size={18}
                  style={{ color: 'var(--mantine-color-gray-5)' }}
                />
                <Text size="sm" c="dimmed">
                  Remove reminder
                </Text>
              </UnstyledButton>
            )}
          </Stack>
        )}
      </Stack>
    </BottomSheet>
  );
}
