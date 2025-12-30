import { useState, useCallback, useEffect } from 'react';
import { NumberInput as MantineNumberInput } from '@mantine/core';

interface NumberInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/**
 * Number input that commits value on blur or Enter key
 */
export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = 'Enter number...',
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState<number | string>(value ?? '');

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleBlur = useCallback(() => {
    if (localValue === '' || localValue === undefined) {
      if (value !== null) {
        onChange(null);
      }
      return;
    }

    const numValue = typeof localValue === 'string' ? parseFloat(localValue) : localValue;
    if (!isNaN(numValue) && numValue !== value) {
      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && constrainedValue < min) constrainedValue = min;
      if (max !== undefined && constrainedValue > max) constrainedValue = max;
      onChange(constrainedValue);
      setLocalValue(constrainedValue);
    }
  }, [localValue, value, onChange, min, max]);

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

  return (
    <MantineNumberInput
      id={id}
      value={localValue}
      onChange={setLocalValue}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      size="sm"
      variant="filled"
      allowDecimal
      hideControls
    />
  );
}
