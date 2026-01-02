import { useState, useCallback, useEffect } from 'react';
import { TextInput, ActionIcon, Tooltip } from '@mantine/core';
import { open } from '@tauri-apps/plugin-shell';
import { Icon } from '@/components/ui/Icon';

interface UrlInputProps {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

/**
 * URL input with validation and open in browser button
 */
export function UrlInput({
  id,
  value,
  onChange,
  placeholder = 'https://...',
}: UrlInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [isValid, setIsValid] = useState(true);

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

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

  const handleOpenUrl = async () => {
    if (value && validateUrl(value)) {
      await open(value);
    }
  };

  const showOpenButton = value && validateUrl(value);

  return (
    <TextInput
      id={id}
      type="url"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size="sm"
      variant="filled"
      error={!isValid}
      rightSection={
        showOpenButton && (
          <Tooltip label="Open URL in browser" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={handleOpenUrl}
            >
              <Icon name="external-link" size={14} />
            </ActionIcon>
          </Tooltip>
        )
      }
    />
  );
}
