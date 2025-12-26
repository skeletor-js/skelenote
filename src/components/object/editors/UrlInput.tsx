import { useState, useCallback } from 'react';
import './editors.css';

interface UrlInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function UrlInput({
  id,
  value,
  onChange,
  placeholder = 'https://...',
}: UrlInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [isValid, setIsValid] = useState(true);

  const validateUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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

    const valid = validateUrl(trimmed);
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

  const handleOpenUrl = () => {
    if (value && validateUrl(value)) {
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="editor-url">
      <input
        id={id}
        type="url"
        className={`editor-url__input ${!isValid ? 'editor-url__input--invalid' : ''}`}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {value && validateUrl(value) && (
        <button
          type="button"
          className="editor-url__open"
          onClick={handleOpenUrl}
          title="Open URL in browser"
        >
          ↗
        </button>
      )}
    </div>
  );
}
