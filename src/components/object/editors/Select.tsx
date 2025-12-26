import './editors.css';

interface SelectProps {
  id?: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

export function Select({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  allowEmpty = true,
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue === '' ? null : selectedValue);
  };

  return (
    <select
      id={id}
      className="editor-select"
      value={value ?? ''}
      onChange={handleChange}
    >
      {allowEmpty && (
        <option value="" className="editor-select__placeholder">
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option} value={option}>
          {formatOptionLabel(option)}
        </option>
      ))}
    </select>
  );
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
