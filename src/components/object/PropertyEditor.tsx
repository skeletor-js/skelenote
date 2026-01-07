import type {
  PropertyDefinition,
  PropertyValue,
  SkelenoteObject,
} from '@/lib/types';
import {
  TextInput,
  NumberInput,
  Checkbox,
  DatePicker,
  Select,
  DurationSelect,
  UrlInput,
  EmailInput,
  PhoneInput,
  RelationPicker,
  RecurrenceEditor,
  CascadingRelationPicker,
} from './editors';

/** Types that support area/project cascading */
const CASCADING_TYPES = ['task', 'note', 'meeting', 'link', 'person'];

interface PropertyEditorProps {
  id: string;
  definition: PropertyDefinition;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
  /** Optional context for cascading relation logic */
  cascadeContext?: {
    object: SkelenoteObject;
    onPropertyChange: (propertyId: string, value: PropertyValue) => void;
  };
}

/**
 * Routes to the appropriate editor component based on property type.
 */
export function PropertyEditor({
  id,
  definition,
  value,
  onChange,
  cascadeContext,
}: PropertyEditorProps) {
  const { type, config } = definition;

  // Placeholder style for unimplemented editors
  const placeholderStyle: React.CSSProperties = {
    padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
    background: 'var(--mantine-color-gray-1)',
    border: '1px solid var(--mantine-color-default-border)',
    borderRadius: 'var(--mantine-radius-sm)',
    fontSize: 'var(--mantine-font-size-sm)',
    color: 'var(--mantine-color-gray-6)',
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
      // Use DurationSelect for meeting duration field
      if (definition.id === 'durationMinutes') {
        return (
          <DurationSelect
            id={id}
            value={typeof value === 'string' ? value : null}
            onChange={onChange}
          />
        );
      }
      return (
        <Select
          id={id}
          value={typeof value === 'string' ? value : null}
          options={config?.options ?? []}
          onChange={onChange}
        />
      );

    case 'relation': {
      // Check if this is an area/project relation that needs cascading
      const isCascadingProperty =
        cascadeContext &&
        (definition.id === 'area' || definition.id === 'project') &&
        CASCADING_TYPES.includes(cascadeContext.object.typeId);

      if (isCascadingProperty) {
        return (
          <CascadingRelationPicker
            propertyId={definition.id as 'area' | 'project'}
            value={
              Array.isArray(value)
                ? (value as string[])
                : typeof value === 'string'
                  ? value
                  : null
            }
            object={cascadeContext.object}
            onPropertyChange={cascadeContext.onPropertyChange}
          />
        );
      }

      return (
        <RelationPicker
          id={id}
          value={
            Array.isArray(value)
              ? (value as string[])
              : typeof value === 'string'
                ? value
                : null
          }
          targetTypeIds={config?.targetTypeIds}
          multiple={definition.multiple}
          onChange={onChange}
        />
      );
    }

    case 'url':
      return (
        <UrlInput
          id={id}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );

    case 'email':
      return (
        <EmailInput
          id={id}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );

    case 'phone':
      return (
        <PhoneInput
          id={id}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );

    case 'file':
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)}{' '}
          <span style={{ opacity: 0.6 }}>(file picker - deferred)</span>
        </div>
      );

    case 'recurrence':
      return (
        <RecurrenceEditor
          id={id}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );

    default:
      return (
        <div style={placeholderStyle} id={id}>
          {formatValue(value)}{' '}
          <span style={{ opacity: 0.6 }}>(unknown type: {type})</span>
        </div>
      );
  }
}
