import './editors.css';

interface CheckboxProps {
  id?: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  label?: string;
}

export function Checkbox({
  id,
  value,
  onChange,
  label,
}: CheckboxProps) {
  const isChecked = value === true;

  const handleChange = () => {
    onChange(!isChecked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(!isChecked);
    }
  };

  return (
    <label className="editor-checkbox" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="editor-checkbox__input"
        checked={isChecked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <span className="editor-checkbox__box" aria-hidden="true">
        {isChecked && '✓'}
      </span>
      {label && <span className="editor-checkbox__label">{label}</span>}
    </label>
  );
}
