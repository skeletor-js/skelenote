/**
 * PropertyBar - Compact property display with prominent status/priority badges
 * Uses tight spacing and wraps to multiple lines
 */

import { useMemo, useState } from 'react';
import { Group, Menu, Button, Tooltip } from '@mantine/core';
import { StatusBadge } from './StatusBadge';
import { PropertyChip } from './PropertyChip';
import { Icon } from '@/components/ui/Icon';
import type {
  SkelenoteObject,
  TypeDefinition,
  PropertyValue,
  PropertyDefinition,
} from '@/lib/types';
import styles from './PropertyBar.module.css';

interface PropertyBarProps {
  object: SkelenoteObject;
  typeDef: TypeDefinition;
  onPropertyChange: (propertyId: string, value: PropertyValue) => void;
}

/** Property IDs that should use StatusBadge instead of PropertyChip */
const PROMINENT_PROPERTY_IDS = ['status', 'priority'];

export function PropertyBar({
  object,
  typeDef,
  onPropertyChange,
}: PropertyBarProps) {
  // Track which properties were explicitly added via the + menu
  const [addedPropertyIds, setAddedPropertyIds] = useState<Set<string>>(
    new Set()
  );

  // Filter out title/name properties (handled by ObjectHeader) and hidden properties
  const editableProperties = typeDef.schema.filter(
    (prop) => prop.id !== 'title' && prop.id !== 'name' && !prop.hidden
  );

  // Separate properties into categories
  const { prominentProperties, standardProperties, emptyOptionalProperties } =
    useMemo(() => {
      const prominent: PropertyDefinition[] = [];
      const standard: PropertyDefinition[] = [];
      const empty: PropertyDefinition[] = [];

      for (const prop of editableProperties) {
        const value = object.properties[prop.id];
        const isEmpty =
          value === null ||
          value === undefined ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'string' && value.trim() === '');

        const isProminent =
          PROMINENT_PROPERTY_IDS.includes(prop.id) && prop.type === 'select';
        const shouldShow =
          prop.required || !isEmpty || addedPropertyIds.has(prop.id);

        if (shouldShow) {
          if (isProminent) {
            prominent.push(prop);
          } else {
            standard.push(prop);
          }
        } else if (!isProminent) {
          // Only non-prominent empty properties go in the add menu
          empty.push(prop);
        }
      }

      // Sort prominent properties: status first, then priority
      prominent.sort((a, b) => {
        if (a.id === 'status') return -1;
        if (b.id === 'status') return 1;
        return 0;
      });

      return {
        prominentProperties: prominent,
        standardProperties: standard,
        emptyOptionalProperties: empty,
      };
    }, [editableProperties, object.properties, addedPropertyIds]);

  if (editableProperties.length === 0) {
    return null;
  }

  const handleAddProperty = (propDef: PropertyDefinition) => {
    setAddedPropertyIds((prev) => new Set(prev).add(propDef.id));
  };

  return (
    <Group
      gap="xs"
      wrap="wrap"
      component="section"
      className={styles.propertyBar}
    >
      {/* Prominent properties (Status, Priority) as colored badges */}
      {prominentProperties.map((propDef) => (
        <StatusBadge
          key={propDef.id}
          definition={propDef}
          value={object.properties[propDef.id] ?? null}
          onChange={(value) => onPropertyChange(propDef.id, value)}
        />
      ))}

      {/* Standard properties as subtle chips */}
      {standardProperties.map((propDef) => (
        <PropertyChip
          key={propDef.id}
          definition={propDef}
          value={object.properties[propDef.id] ?? null}
          onChange={(value) => onPropertyChange(propDef.id, value)}
          cascadeContext={{ object, onPropertyChange }}
        />
      ))}

      {/* Add property menu for empty optional properties */}
      {emptyOptionalProperties.length > 0 && (
        <Menu position="bottom-start">
          <Menu.Target>
            <Tooltip label="Add a property" withArrow>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<Icon name="plus" size={12} />}
                className={styles.addButton}
              >
                Add
              </Button>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {emptyOptionalProperties.map((prop) => (
              <Menu.Item key={prop.id} onClick={() => handleAddProperty(prop)}>
                {prop.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
