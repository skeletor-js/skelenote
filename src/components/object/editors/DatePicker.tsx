import { useMemo } from 'react';
import './editors.css';

interface DatePickerProps {
  id?: string;
  value: number | null; // Unix timestamp in milliseconds
  onChange: (value: number | null) => void;
  showTime?: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  showTime = false,
}: DatePickerProps) {
  // Convert timestamp to local date string for input
  const dateValue = useMemo(() => {
    if (!value) return '';
    const date = new Date(value);
    if (showTime) {
      // Format: YYYY-MM-DDTHH:mm in local time
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    // Format: YYYY-MM-DD in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [value, showTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      onChange(null);
      return;
    }

    // Parse as local time, not UTC
    // For date-only input like "2024-12-26", create date at local midnight
    let date: Date;
    if (showTime) {
      // datetime-local input: "2024-12-26T14:30"
      date = new Date(inputValue);
    } else {
      // date input: "2024-12-26" - parse as local date at midnight
      const [year, month, day] = inputValue.split('-').map(Number);
      date = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (!isNaN(date.getTime())) {
      onChange(date.getTime());
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className="editor-date">
      <input
        id={id}
        type={showTime ? 'datetime-local' : 'date'}
        className="editor-input editor-input--date"
        value={dateValue}
        onChange={handleChange}
      />
      {value && (
        <button
          type="button"
          className="editor-date__clear"
          onClick={handleClear}
          aria-label="Clear date"
        >
          ×
        </button>
      )}
    </div>
  );
}
