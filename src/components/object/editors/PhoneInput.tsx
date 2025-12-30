import { useState, useCallback, useEffect } from 'react';
import { TextInput, ActionIcon, Tooltip } from '@mantine/core';
import { open } from '@tauri-apps/plugin-shell';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

/**
 * Phone input with call button
 */
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
    <TextInput
      id={id}
      type="tel"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size="sm"
      variant="filled"
      rightSection={
        value && (
          <Tooltip label="Call number" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={handleCall}
            >
              <Phone size={14} />
            </ActionIcon>
          </Tooltip>
        )
      }
    />
  );
}
