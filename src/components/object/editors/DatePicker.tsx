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
  // Convert timestamp to date string for input
  const dateValue = useMemo(() => {
    if (!value) return '';
    const date = new Date(value);
    if (showTime) {
      // Format: YYYY-MM-DDTHH:mm
      return date.toISOString().slice(0, 16);
    }
    // Format: YYYY-MM-DD
    return date.toISOString().slice(0, 10);
  }, [value, showTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      onChange(null);
      return;
    }

    const date = new Date(inputValue);
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
