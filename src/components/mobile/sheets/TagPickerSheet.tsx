/**
 * Tag Picker Sheet
 * Multi-select bottom sheet for adding tags to objects on mobile
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
import { Search, Check, Tag } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';

interface TagPickerSheetProps {
  opened: boolean;
  onClose: () => void;
  value: string[];
  onSave: (value: string[]) => void;
}

export function TagPickerSheet({
  opened,
  onClose,
  value,
  onSave,
}: TagPickerSheetProps) {
  const { store, isLoading } = useObjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(value);

  // Reset selection when opened with new value
  useMemo(() => {
    if (opened) {
      setSelectedTags(value);
    }
  }, [opened, value]);

  // Get all tags
  const availableTags = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.TAG);
  }, [store]);

  // Filter by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return availableTags;
    const query = searchQuery.toLowerCase();
    return availableTags.filter((tag) => {
      const name = (tag.properties.name ?? '') as string;
      return name.toLowerCase().includes(query);
    });
  }, [availableTags, searchQuery]);

  // Check if tag is selected
  const isSelected = useCallback(
    (tagId: string): boolean => {
      return selectedTags.includes(tagId);
    },
    [selectedTags]
  );

  // Handle selection toggle
  const handleToggle = useCallback((tagId: string) => {
    setSelectedTags((current) => {
      if (current.includes(tagId)) {
        return current.filter((id) => id !== tagId);
      }
      return [...current, tagId];
    });
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(selectedTags);
    setSearchQuery('');
    onClose();
  }, [selectedTags, onSave, onClose]);

  // Handle close without saving
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedTags(value);
    onClose();
  }, [value, onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Add Tags"
      size="lg"
    >
      <Stack gap="md">
        {/* Search input */}
        <TextInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          leftSection={<Search size={18} />}
          size="md"
        />

        {/* Results */}
        <Box style={{ maxHeight: 300, overflow: 'auto' }}>
          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" color="ember" />
            </Center>
          ) : filteredTags.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <Text c="dimmed">
                {searchQuery ? 'No matching tags' : 'No tags yet'}
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredTags.map((tag) => {
                const selected = isSelected(tag.id);
                const name = (tag.properties.name ?? 'Untitled') as string;

                return (
                  <UnstyledButton
                    key={tag.id}
                    onClick={() => handleToggle(tag.id)}
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
                      <Tag
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

        {/* Done button */}
        <UnstyledButton
          onClick={handleSave}
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
      </Stack>
    </BottomSheet>
  );
}
