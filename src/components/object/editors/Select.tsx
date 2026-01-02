import { Select as MantineSelect, ComboboxData } from '@mantine/core';

interface SelectProps {
  id?: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

/**
 * Format option value for display (e.g., "in-progress" -> "In Progress")
 */
function formatOptionLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Select dropdown using Mantine Select
 */
export function Select({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  allowEmpty = true,
}: SelectProps) {
  // Convert options to Mantine format
  const data: ComboboxData = options.map((option) => ({
    value: option,
    label: formatOptionLabel(option),
  }));

  return (
    <MantineSelect
      id={id}
      value={value}
      onChange={onChange}
      data={data}
      placeholder={placeholder}
      clearable={allowEmpty}
      size="sm"
      variant="filled"
      comboboxProps={{ withinPortal: false }}
    />
  );
}
