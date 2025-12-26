import { useState, useCallback } from 'react';
import './editors.css';

interface NumberInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = 'Enter number...',
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(value?.toString() ?? '');

  const handleBlur = useCallback(() => {
    if (localValue === '') {
      if (value !== null) {
        onChange(null);
      }
      return;
    }

    const numValue = parseFloat(localValue);
    if (!isNaN(numValue) && numValue !== value) {
      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && constrainedValue < min) constrainedValue = min;
      if (max !== undefined && constrainedValue > max) constrainedValue = max;
      onChange(constrainedValue);
      setLocalValue(constrainedValue.toString());
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
    <input
      id={id}
      type="number"
      className="editor-input editor-input--number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
    />
  );
}
