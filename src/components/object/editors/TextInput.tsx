import { useState, useCallback } from 'react';
import './editors.css';

interface TextInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder = 'Enter text...',
}: TextInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');

  const handleBlur = useCallback(() => {
    if (localValue !== (value ?? '')) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onChange(localValue);
        (e.target as HTMLInputElement).blur();
      }
    },
    [localValue, onChange]
  );

  return (
    <input
      id={id}
      type="text"
      className="editor-input editor-input--text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
    />
  );
}
