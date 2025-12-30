import { useMemo } from 'react';
import { DatePickerInput, DateTimePicker } from '@mantine/dates';
import dayjs from 'dayjs';

interface DatePickerProps {
  id?: string;
  value: number | null; // Unix timestamp in milliseconds
  onChange: (value: number | null) => void;
  showTime?: boolean;
}

/**
 * Date picker using Mantine DatePickerInput or DateTimePicker
 * Mantine 8 uses string values in YYYY-MM-DD format
 */
export function DatePicker({
  id,
  value,
  onChange,
  showTime = false,
}: DatePickerProps) {
  // Convert timestamp to string for Mantine (YYYY-MM-DD or YYYY-MM-DD HH:mm)
  const dateValue = useMemo(() => {
    if (!value) return null;
    const format = showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
    return dayjs(value).format(format);
  }, [value, showTime]);

  const handleChange = (dateString: string | null) => {
    if (!dateString) {
      onChange(null);
      return;
    }

    const parsed = dayjs(dateString);
    if (!parsed.isValid()) {
      onChange(null);
      return;
    }

    // For date-only, set to midnight local time
    if (!showTime) {
      const localDate = parsed.startOf('day');
      onChange(localDate.valueOf());
    } else {
      onChange(parsed.valueOf());
    }
  };

  if (showTime) {
    return (
      <DateTimePicker
        id={id}
        value={dateValue}
        onChange={handleChange}
        clearable
        size="sm"
        variant="filled"
        valueFormat="MMM D, YYYY h:mm A"
        placeholder="Select date & time..."
      />
    );
  }

  return (
    <DatePickerInput
      id={id}
      value={dateValue}
      onChange={handleChange}
      clearable
      size="sm"
      variant="filled"
      valueFormat="MMM D, YYYY"
      placeholder="Select date..."
    />
  );
}
