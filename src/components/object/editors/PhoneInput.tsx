import { useState, useCallback, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import './editors.css';

interface PhoneInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = '+1 (555) 123-4567',
}: PhoneInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleBlur = useCallback(() => {
    const trimmed = localValue.trim();
    if (trimmed === '') {
      if (value !== null) {
        onChange(null);
      }
      return;
    }

    if (trimmed !== value) {
      onChange(trimmed);
    }
  }, [localValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBlur();
        (e.target as HTMLInputElement).blur();
      }
    },
    [handleBlur]
  );

  const handleCall = async () => {
    if (value) {
      // Remove non-numeric characters except +
      const phoneNumber = value.replace(/[^\d+]/g, '');
      await open(`tel:${phoneNumber}`);
    }
  };

  return (
    <div className="editor-phone">
      <input
        id={id}
        type="tel"
        className="editor-phone__input"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="editor-phone__call"
          onClick={handleCall}
          title="Call number"
        >
          ☎
        </button>
      )}
    </div>
  );
}
