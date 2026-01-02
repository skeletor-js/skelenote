import { useState, useCallback, useEffect } from 'react';
import { TextInput as MantineTextInput } from '@mantine/core';

interface TextInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Text input that commits value on blur or Enter key
 */
export function TextInput({
  id,
  value,
  onChange,
  placeholder = 'Enter text...',
}: TextInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

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
    <MantineTextInput
      id={id}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size="sm"
      variant="filled"
    />
  );
}
