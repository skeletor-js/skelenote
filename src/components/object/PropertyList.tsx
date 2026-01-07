/**
 * PropertyList - Displays editable properties as inline chips
 */

import { useMemo, useState } from 'react';
import { Group, Menu, Button, Tooltip } from '@mantine/core';
import { PropertyChip } from './PropertyChip';
import { Icon } from '@/components/ui/Icon';
import type {
  SkelenoteObject,
  TypeDefinition,
  PropertyValue,
  PropertyDefinition,
} from '@/lib/types';

interface PropertyListProps {
  object: SkelenoteObject;
  typeDef: TypeDefinition;
  onPropertyChange: (propertyId: string, value: PropertyValue) => void;
}

export function PropertyList({
  object,
  typeDef,
  onPropertyChange,
}: PropertyListProps) {
  // Track which properties were explicitly added via the + menu
  // These should be shown even if they have empty values
  const [addedPropertyIds, setAddedPropertyIds] = useState<Set<string>>(
    new Set()
  );

  // Filter out title/name properties (handled by ObjectHeader) and hidden properties
  const editableProperties = typeDef.schema.filter(
    (prop) => prop.id !== 'title' && prop.id !== 'name' && !prop.hidden
  );

  // Separate properties with values from empty optional properties
  const { propertiesWithValues, emptyOptionalProperties } = useMemo(() => {
    const withValues: PropertyDefinition[] = [];
    const empty: PropertyDefinition[] = [];

    for (const prop of editableProperties) {
      const value = object.properties[prop.id];
      const isEmpty =
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'string' && value.trim() === '');

      // Show required properties, properties with values, or explicitly added properties
      if (prop.required || !isEmpty || addedPropertyIds.has(prop.id)) {
        withValues.push(prop);
      } else {
        empty.push(prop);
      }
    }

    return { propertiesWithValues: withValues, emptyOptionalProperties: empty };
  }, [editableProperties, object.properties, addedPropertyIds]);

  if (editableProperties.length === 0) {
    return null;
  }

  // When user selects a property from the + menu, mark it as added
  // so it will appear as a chip that they can click to edit
  const handleAddProperty = (propDef: PropertyDefinition) => {
    setAddedPropertyIds((prev) => new Set(prev).add(propDef.id));
  };

  return (
    <Group gap="xs" wrap="wrap" component="section">
      {propertiesWithValues.map((propDef) => (
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
                styles={{
                  root: {
                    padding: '2px 8px',
                    height: 'auto',
                    fontWeight: 400,
                    color: 'var(--mantine-color-gray-5)',
                    '&:hover': {
                      color: 'var(--mantine-color-gray-7)',
                      backgroundColor: 'var(--mantine-color-gray-0)',
                    },
                  },
                }}
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
