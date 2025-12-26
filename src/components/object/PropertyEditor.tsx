import type { PropertyDefinition, PropertyValue } from '@/lib/types';
import { TextInput, NumberInput, Checkbox, DatePicker, Select } from './editors';

interface PropertyEditorProps {
  id: string;
  definition: PropertyDefinition;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
}

/**
 * Routes to the appropriate editor component based on property type.
 */
export function PropertyEditor({
  id,
  definition,
  value,
  onChange,
}: PropertyEditorProps) {
  const { type, config } = definition;

  // Placeholder style for unimplemented editors
  const placeholderStyle: React.CSSProperties = {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    background: 'var(--bg-sunken)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  };

  const formatValue = (val: PropertyValue): string => {
    if (val === null || val === undefined) return '—';
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  };

  switch (type) {
    case 'text':
      return (
        <TextInput
          id={id}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );

    case 'number':
      return (
        <NumberInput
          id={id}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
        />
      );

    case 'checkbox':
      return (
        <Checkbox
          id={id}
          value={typeof value === 'boolean' ? value : null}
          onChange={onChange}
        />
      );

    case 'date':
      return (
        <DatePicker
          id={id}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
          showTime={config?.showTime}
        />
      );

    case 'select':
      return (
        <Select
          id={id}
          value={typeof value === 'string' ? value : null}
          options={config?.options ?? []}
          onChange={onChange}
        />
      );

    case 'relation':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)}{' '}
          <span style={{ opacity: 0.6 }}>
            (relation to: {config?.targetTypeIds?.join(', ') ?? 'any'})
          </span>
        </div>
      );

    case 'url':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(url editor)</span>
        </div>
      );

    case 'email':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(email editor)</span>
        </div>
      );

    case 'phone':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(phone editor)</span>
        </div>
      );

    case 'file':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(file picker - deferred)</span>
        </div>
      );

    default:
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(unknown type: {type})</span>
        </div>
      );
  }
}
