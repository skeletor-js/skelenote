/**
 * Area Picker Sheet
 * Single-select bottom sheet for assigning an area to objects on mobile
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
import { Search, Check, Layers, X } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';

interface AreaPickerSheetProps {
  opened: boolean;
  onClose: () => void;
  value: string | null;
  onSave: (value: string | null) => void;
}

export function AreaPickerSheet({
  opened,
  onClose,
  value,
  onSave,
}: AreaPickerSheetProps) {
  const { store, isLoading } = useObjects();
  const [searchQuery, setSearchQuery] = useState('');

  // Get all areas
  const availableAreas = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.AREA);
  }, [store]);

  // Filter by search query
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return availableAreas;
    const query = searchQuery.toLowerCase();
    return availableAreas.filter((area) => {
      const name = (area.properties.name ?? '') as string;
      return name.toLowerCase().includes(query);
    });
  }, [availableAreas, searchQuery]);

  // Handle selection
  const handleSelect = useCallback(
    (areaId: string) => {
      // Toggle: if already selected, deselect
      if (value === areaId) {
        onSave(null);
      } else {
        onSave(areaId);
      }
      setSearchQuery('');
      onClose();
    },
    [value, onSave, onClose]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onSave(null);
    setSearchQuery('');
    onClose();
  }, [onSave, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Assign Area"
      size="lg"
    >
      <Stack gap="md">
        {/* Search input */}
        <TextInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search areas..."
          leftSection={<Search size={18} />}
          size="md"
        />

        {/* Results */}
        <Box style={{ maxHeight: 300, overflow: 'auto' }}>
          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" color="ember" />
            </Center>
          ) : filteredAreas.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <Text c="dimmed">
                {searchQuery ? 'No matching areas' : 'No areas yet'}
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredAreas.map((area) => {
                const selected = value === area.id;
                const name = (area.properties.name ?? 'Untitled') as string;

                return (
                  <UnstyledButton
                    key={area.id}
                    onClick={() => handleSelect(area.id)}
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
                    {selected ? (
                      <Check
                        size={18}
                        style={{ color: 'var(--mantine-color-ember-5)' }}
                      />
                    ) : (
                      <Layers
                        size={18}
                        style={{ color: 'var(--mantine-color-gray-5)' }}
                      />
                    )}
                    <Text size="sm" style={{ flex: 1 }} truncate>
                      {name}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Clear button if area is assigned */}
        {value && (
          <UnstyledButton
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 8,
            }}
          >
            <X size={18} style={{ color: 'var(--mantine-color-gray-5)' }} />
            <Text size="sm" c="dimmed">
              Remove area
            </Text>
          </UnstyledButton>
        )}
      </Stack>
    </BottomSheet>
  );
}
