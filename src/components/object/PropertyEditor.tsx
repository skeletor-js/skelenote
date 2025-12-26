import type { PropertyDefinition, PropertyValue } from '@/lib/types';

interface PropertyEditorProps {
  id: string;
  definition: PropertyDefinition;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
}

/**
 * Routes to the appropriate editor component based on property type.
 * Placeholder editors will be replaced with real implementations in subsequent commits.
 */
export function PropertyEditor({
  id,
  definition,
  value,
  onChange: _onChange, // Will be used when real editors are implemented
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
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(text editor)</span>
        </div>
      );

    case 'number':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(number editor)</span>
        </div>
      );

    case 'date':
      return (
        <div style={placeholderStyle} id={id}>
          {value ? new Date(value as number).toLocaleDateString() : '—'}{' '}
          <span style={{ opacity: 0.6 }}>(date picker)</span>
        </div>
      );

    case 'checkbox':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)} <span style={{ opacity: 0.6 }}>(checkbox)</span>
        </div>
      );

    case 'select':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)}{' '}
          <span style={{ opacity: 0.6 }}>
            (select: {config?.options?.join(', ') ?? 'no options'})
          </span>
        </div>
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
