import { Select as MantineSelect, ComboboxData } from '@mantine/core';
import { MeetingDurationOptions } from '@/lib/types/built-in-types';

interface DurationSelectProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

/**
 * Maps duration values (in minutes) to user-friendly labels
 */
const DURATION_LABELS: Record<string, string> = {
  '15': '15 min',
  '30': '30 min',
  '45': '45 min',
  '60': '1 hour',
  '90': '1.5 hours',
  '120': '2 hours',
  '180': '3 hours',
  '240': '4 hours',
};

/**
 * Duration select dropdown for meetings
 * Displays user-friendly labels for minute values
 */
export function DurationSelect({
  id,
  value,
  onChange,
  placeholder = 'Select duration...',
}: DurationSelectProps) {
  const data: ComboboxData = MeetingDurationOptions.map((option) => ({
    value: option,
    label: DURATION_LABELS[option] || `${option} min`,
  }));

  return (
    <MantineSelect
      id={id}
      value={value}
      onChange={onChange}
      data={data}
      placeholder={placeholder}
      clearable
      size="sm"
      variant="filled"
      comboboxProps={{ withinPortal: false }}
    />
  );
}
