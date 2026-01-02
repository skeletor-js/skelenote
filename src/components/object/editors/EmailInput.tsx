import { useState, useCallback, useEffect } from 'react';
import { TextInput, ActionIcon, Tooltip } from '@mantine/core';
import { open } from '@tauri-apps/plugin-shell';
import { Mail } from 'lucide-react';

interface EmailInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

/**
 * Email input with validation and mailto button
 */
export function EmailInput({
  id,
  value,
  onChange,
  placeholder = 'email@example.com',
}: EmailInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [isValid, setIsValid] = useState(true);

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

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

  const showMailButton = value && validateEmail(value);

  return (
    <TextInput
      id={id}
      type="email"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size="sm"
      variant="filled"
      error={!isValid}
      rightSection={
        showMailButton && (
          <Tooltip label="Send email" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={handleOpenMailto}
            >
              <Mail size={14} />
            </ActionIcon>
          </Tooltip>
        )
      }
    />
  );
}
