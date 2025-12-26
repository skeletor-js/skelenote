import { useState, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import './editors.css';

interface EmailInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function EmailInput({
  id,
  value,
  onChange,
  placeholder = 'email@example.com',
}: EmailInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [isValid, setIsValid] = useState(true);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleBlur = useCallback(() => {
    const trimmed = localValue.trim();
    if (trimmed === '') {
      if (value !== null) {
        onChange(null);
      }
      setIsValid(true);
      return;
    }

    const valid = validateEmail(trimmed);
    setIsValid(valid);

    if (valid && trimmed !== value) {
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

  const handleOpenMailto = async () => {
    if (value && validateEmail(value)) {
      await open(`mailto:${value}`);
    }
  };

  return (
    <div className="editor-email">
      <input
        id={id}
        type="email"
        className={`editor-email__input ${!isValid ? 'editor-email__input--invalid' : ''}`}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {value && validateEmail(value) && (
        <button
          type="button"
          className="editor-email__open"
          onClick={handleOpenMailto}
          title="Send email"
        >
          ✉
        </button>
      )}
    </div>
  );
}
