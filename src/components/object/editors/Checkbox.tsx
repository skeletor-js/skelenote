import { Checkbox as MantineCheckbox } from '@mantine/core';

interface CheckboxProps {
  id?: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  label?: string;
}

/**
 * Checkbox using Mantine Checkbox
 */
export function Checkbox({ id, value, onChange, label }: CheckboxProps) {
  const isChecked = value === true;

  return (
    <MantineCheckbox
      id={id}
      checked={isChecked}
      onChange={(e) => onChange(e.currentTarget.checked)}
      label={label}
      size="sm"
    />
  );
}
