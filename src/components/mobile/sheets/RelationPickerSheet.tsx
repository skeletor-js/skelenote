/**
 * Relation Picker Sheet
 * Bottom sheet for selecting related objects on mobile
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  TextInput,
  Text,
  UnstyledButton,
  Loader,
  Center,
  Box,
} from '@mantine/core';
import { Search, Check, Plus } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { useObjects, useTypeRegistry } from '@/contexts';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type { PropertyDefinition } from '@/lib/types';

interface RelationPickerSheetProps {
  opened: boolean;
  onClose: () => void;
  property: PropertyDefinition | null;
  value: string | string[] | null;
  onSave: (value: string | string[] | null) => void;
}

export function RelationPickerSheet({
  opened,
  onClose,
  property,
  value,
  onSave,
}: RelationPickerSheetProps) {
  const { store, isLoading } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [searchQuery, setSearchQuery] = useState('');

  // Get target type ID from property config
  const targetTypeId = property?.config?.targetTypeIds?.[0];

  // Get all objects of target type
  const availableObjects = useMemo(() => {
    if (!store || !targetTypeId) return [];
    return store.getByType(targetTypeId);
  }, [store, targetTypeId]);

  // Filter by search query
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return availableObjects;
    const query = searchQuery.toLowerCase();
    return availableObjects.filter((obj) => {
      const title = (obj.properties.title ??
        obj.properties.name ??
        '') as string;
      return title.toLowerCase().includes(query);
    });
  }, [availableObjects, searchQuery]);

  // Get type icon
  const getTypeIcon = useCallback(
    (typeId: string): IconName => {
      const typeDef = typeRegistry.get(typeId);
      if (!typeDef?.icon) return 'file';
      if (typeDef.icon.length <= 2) {
        return getIconFromEmoji(typeDef.icon);
      }
      return typeDef.icon as IconName;
    },
    [typeRegistry]
  );

  // Check if object is selected
  const isSelected = useCallback(
    (objectId: string): boolean => {
      if (Array.isArray(value)) {
        return value.includes(objectId);
      }
      return value === objectId;
    },
    [value]
  );

  // Handle selection
  const handleSelect = useCallback(
    (objectId: string) => {
      if (property?.multiple) {
        // Multi-select
        const currentValues = (value as string[]) ?? [];
        if (currentValues.includes(objectId)) {
          onSave(currentValues.filter((id) => id !== objectId));
        } else {
          onSave([...currentValues, objectId]);
        }
      } else {
        // Single select
        if (value === objectId) {
          onSave(null);
        } else {
          onSave(objectId);
        }
        onClose();
      }
    },
    [property, value, onSave, onClose]
  );

  // Reset search when closed
  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  if (!property) return null;

  const typeDef = targetTypeId ? typeRegistry.get(targetTypeId) : null;
  const typeName = typeDef?.name ?? 'items';

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title={`Select ${property.name}`}
      size="lg"
    >
      <Stack gap="md">
        {/* Search input */}
        <TextInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${typeName}...`}
          leftSection={<Search size={18} />}
          size="md"
        />

        {/* Results */}
        <Box style={{ maxHeight: 300, overflow: 'auto' }}>
          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" color="ember" />
            </Center>
          ) : filteredObjects.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <Text c="dimmed">No {typeName} found</Text>
              <UnstyledButton
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: 'var(--mantine-color-ember-0)',
                }}
              >
                <Plus
                  size={18}
                  style={{ color: 'var(--mantine-color-ember-5)' }}
                />
                <Text size="sm" c="ember">
                  Create new {typeDef?.name ?? 'item'}
                </Text>
              </UnstyledButton>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredObjects.map((obj) => {
                const selected = isSelected(obj.id);
                const title = (obj.properties.title ??
                  obj.properties.name ??
                  'Untitled') as string;

                return (
                  <UnstyledButton
                    key={obj.id}
                    onClick={() => handleSelect(obj.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 8,
                      backgroundColor: selected
                        ? 'var(--mantine-color-ember-0)'
                        : 'transparent',
                    }}
                  >
                    {selected && (
                      <Check
                        size={18}
                        style={{ color: 'var(--mantine-color-ember-5)' }}
                      />
                    )}
                    <Icon
                      name={getTypeIcon(obj.typeId)}
                      size={18}
                      style={{
                        color: 'var(--mantine-color-gray-5)',
                        marginLeft: selected ? 0 : 30,
                      }}
                    />
                    <Text size="sm" style={{ flex: 1 }} truncate>
                      {title}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Done button for multi-select */}
        {property?.multiple && (
          <UnstyledButton
            onClick={handleClose}
            style={{
              padding: '16px',
              borderRadius: 8,
              backgroundColor: 'var(--mantine-color-ember-5)',
              textAlign: 'center',
            }}
          >
            <Text size="md" fw={600} c="white">
              Done
            </Text>
          </UnstyledButton>
        )}
      </Stack>
    </BottomSheet>
  );
}
