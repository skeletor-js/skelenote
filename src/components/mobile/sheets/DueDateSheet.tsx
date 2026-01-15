/**
 * Due Date Sheet
 * Bottom sheet for quick due date selection on mobile
 * Features quick presets and a calendar picker
 */

import { useState, useMemo, useCallback } from 'react';
import { Stack, Text, UnstyledButton, Divider, Box } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import {
  Check,
  Sun,
  Calendar,
  CalendarDays,
  CalendarRange,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { BottomSheet } from '../primitives';

/**
 * Get quick date presets
 */
function getDatePresets() {
  const today = dayjs().startOf('day');
  const tomorrow = today.add(1, 'day');
  const thisWeekend = today.day(6); // Saturday
  const nextWeek = today.add(1, 'week').startOf('week').add(1, 'day'); // Next Monday

  return [
    {
      id: 'today',
      label: 'Today',
      sublabel: today.format('ddd'),
      value: today.valueOf(),
      icon: Sun,
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      sublabel: tomorrow.format('ddd'),
      value: tomorrow.valueOf(),
      icon: Calendar,
    },
    {
      id: 'weekend',
      label: 'This Weekend',
      sublabel: thisWeekend.format('MMM D'),
      value: thisWeekend.valueOf(),
      icon: CalendarDays,
    },
    {
      id: 'next-week',
      label: 'Next Week',
      sublabel: nextWeek.format('MMM D'),
      value: nextWeek.valueOf(),
      icon: CalendarRange,
    },
  ];
}

interface DueDateSheetProps {
  opened: boolean;
  onClose: () => void;
  value: number | null;
  onSelect: (date: number | null) => void;
}

export function DueDateSheet({
  opened,
  onClose,
  value,
  onSelect,
}: DueDateSheetProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const presets = useMemo(() => getDatePresets(), []);

  // Convert value to dayjs for comparison
  const selectedDate = useMemo(() => {
    return value ? dayjs(value).startOf('day') : null;
  }, [value]);

  // Check if value matches a preset
  const getMatchingPreset = useCallback(() => {
    if (!selectedDate) return null;
    return (
      presets.find((p) => dayjs(p.value).isSame(selectedDate, 'day'))?.id ??
      null
    );
  }, [selectedDate, presets]);

  const handlePresetSelect = (preset: (typeof presets)[0]) => {
    onSelect(preset.value);
    onClose();
  };

  const handleCalendarSelect = (dateString: string | null) => {
    if (!dateString) {
      onSelect(null);
    } else {
      const parsed = dayjs(dateString);
      if (parsed.isValid()) {
        onSelect(parsed.startOf('day').valueOf());
      }
    }
    onClose();
    setShowCalendar(false);
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  const handleClose = () => {
    setShowCalendar(false);
    onClose();
  };

  const matchingPreset = getMatchingPreset();

  // Format current value for display
  const currentValueDisplay = useMemo(() => {
    if (!value) return null;
    return dayjs(value).format('MMM D, YYYY');
  }, [value]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Due Date"
      size={showCalendar ? 'lg' : 'auto'}
    >
      <Stack gap="md">
        {/* Current value display */}
        {value && !showCalendar && (
          <Box
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              backgroundColor: 'var(--mantine-color-ember-0)',
              border: '1px solid var(--mantine-color-ember-2)',
            }}
          >
            <Text size="sm" fw={500} c="ember">
              Currently: {currentValueDisplay}
            </Text>
          </Box>
        )}

        {showCalendar ? (
          /* Calendar view */
          <Box>
            <DatePicker
              value={selectedDate ? selectedDate.format('YYYY-MM-DD') : null}
              onChange={handleCalendarSelect}
              size="md"
              styles={{
                calendarHeader: {
                  maxWidth: '100%',
                },
              }}
            />
          </Box>
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

            {/* Pick custom date */}
            <UnstyledButton
              onClick={() => setShowCalendar(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Calendar
                size={20}
                style={{ color: 'var(--mantine-color-gray-5)' }}
              />
              <Text size="sm">Pick a date...</Text>
            </UnstyledButton>

            {/* Clear date */}
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
                <X size={18} style={{ color: 'var(--mantine-color-gray-5)' }} />
                <Text size="sm" c="dimmed">
                  Remove due date
                </Text>
              </UnstyledButton>
            )}
          </Stack>
        )}
      </Stack>
    </BottomSheet>
  );
}
