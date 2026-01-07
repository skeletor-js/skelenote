/**
 * PropertyChip - Compact badge display of a property with popover editing
 * Click to expand into a popover with the appropriate editor
 */

import { useState, useMemo } from 'react';
import { Popover, Text, UnstyledButton, Group, Box } from '@mantine/core';
import dayjs from 'dayjs';
import { PropertyEditor } from './PropertyEditor';
import { Icon } from '@/components/ui/Icon';
import { useObjects } from '@/contexts';
import type {
  PropertyDefinition,
  PropertyValue,
  SkelenoteObject,
} from '@/lib/types';
import type { IconName } from '@/lib/icons';
import styles from './PropertyBar.module.css';

interface PropertyChipProps {
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
 * Format select option labels from kebab-case to Title Case
 */
function formatOptionLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get icon name for property type
 */
function getPropertyIcon(type: string, value: PropertyValue): IconName | null {
  switch (type) {
    case 'date':
      return 'calendar';
    case 'checkbox':
      return value ? 'check-circle' : 'circle';
    case 'relation':
      return 'link';
    case 'select':
      return 'chevron-down';
    case 'url':
      return 'external-link';
    case 'recurrence':
      return 'refresh-cw';
    default:
      return null;
  }
}

export function PropertyChip({
  definition,
  value,
  onChange,
  cascadeContext,
}: PropertyChipProps) {
  const [opened, setOpened] = useState(false);
  const { store } = useObjects();

  // Check if value is empty/null
  const isEmpty = useMemo(() => {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  }, [value]);

  // Format value for display based on property type
  const displayValue = useMemo(() => {
    if (isEmpty) return 'Not set';

    switch (definition.type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';

      case 'date': {
        const timestamp = value as number;
        const showTime = definition.config?.showTime;
        return dayjs(timestamp).format(showTime ? 'MMM D, h:mm A' : 'MMM D');
      }

      case 'select':
        return formatOptionLabel(value as string);

      case 'relation': {
        const ids = Array.isArray(value) ? value : [value];
        const validIds = ids.filter((id) => store?.get(id as string));
        if (validIds.length === 0) return 'Not set';
        if (validIds.length === 1 && store) {
          const obj = store.get(validIds[0] as string);
          if (obj) {
            return (obj.properties.title ??
              obj.properties.name ??
              'Untitled') as string;
          }
        }
        return `${validIds.length} linked`;
      }

      case 'recurrence': {
        try {
          const recurrence = JSON.parse(value as string);
          if (recurrence.frequency === 'none') return 'Not set';
          const freq = recurrence.frequency;
          const interval = recurrence.interval || 1;
          if (interval === 1) {
            return freq.charAt(0).toUpperCase() + freq.slice(1);
          }
          return `Every ${interval} ${freq}`;
        } catch {
          return 'Not set';
        }
      }

      case 'number':
        return String(value);

      case 'url':
      case 'email':
      case 'phone':
      case 'text':
      default: {
        const str = String(value);
        // Truncate long values
        return str.length > 20 ? str.slice(0, 20) + '...' : str;
      }
    }
  }, [value, definition, isEmpty, store]);

  // Get icon for this property type
  const propertyIcon = getPropertyIcon(definition.type, value);

  // Determine if we should close popover after change
  const shouldCloseOnChange = !['relation', 'recurrence'].includes(
    definition.type
  );

  const handleChange = (newValue: PropertyValue) => {
    onChange(newValue);
    if (shouldCloseOnChange) {
      setOpened(false);
    }
  };

  // Get color for checkbox values
  const getCheckboxColor = () => {
    if (definition.type === 'checkbox') {
      return value ? 'sage' : undefined;
    }
    return undefined;
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      trapFocus
      shadow="md"
    >
      <Popover.Target>
        <UnstyledButton onClick={() => setOpened(true)} className={styles.chip}>
          <Group gap={4} wrap="nowrap">
            {propertyIcon && (
              <Icon name={propertyIcon} size={12} className={styles.chipIcon} />
            )}
            <Text size="xs" className={styles.chipLabel}>
              {definition.name}:
            </Text>
            <Text
              size="xs"
              className={isEmpty ? styles.chipEmpty : styles.chipValue}
              c={getCheckboxColor()}
            >
              {displayValue}
            </Text>
            <Icon name="edit-2" size={10} className={styles.editIcon} />
          </Group>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown p="sm" style={{ minWidth: 220, maxWidth: 320 }}>
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb="xs">
            {definition.name}
            {definition.required && (
              <Text component="span" c="red" ml={2}>
                *
              </Text>
            )}
          </Text>
          <PropertyEditor
            id={`chip-${definition.id}`}
            definition={definition}
            value={value}
            onChange={handleChange}
            cascadeContext={cascadeContext}
          />
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
