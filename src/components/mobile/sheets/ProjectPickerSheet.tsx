/**
 * Project Picker Sheet
 * Single-select bottom sheet for assigning a project to objects on mobile
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
import { Search, Check, Folder, X } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';

interface ProjectPickerSheetProps {
  opened: boolean;
  onClose: () => void;
  value: string | null;
  onSave: (value: string | null) => void;
}

export function ProjectPickerSheet({
  opened,
  onClose,
  value,
  onSave,
}: ProjectPickerSheetProps) {
  const { store, isLoading } = useObjects();
  const [searchQuery, setSearchQuery] = useState('');

  // Get all projects
  const availableProjects = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.PROJECT);
  }, [store]);

  // Filter by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return availableProjects;
    const query = searchQuery.toLowerCase();
    return availableProjects.filter((project) => {
      const name = (project.properties.name ?? '') as string;
      return name.toLowerCase().includes(query);
    });
  }, [availableProjects, searchQuery]);

  // Handle selection
  const handleSelect = useCallback(
    (projectId: string) => {
      // Toggle: if already selected, deselect
      if (value === projectId) {
        onSave(null);
      } else {
        onSave(projectId);
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
      title="Assign Project"
      size="lg"
    >
      <Stack gap="md">
        {/* Search input */}
        <TextInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          leftSection={<Search size={18} />}
          size="md"
        />

        {/* Results */}
        <Box style={{ maxHeight: 300, overflow: 'auto' }}>
          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" color="ember" />
            </Center>
          ) : filteredProjects.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <Text c="dimmed">
                {searchQuery ? 'No matching projects' : 'No projects yet'}
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredProjects.map((project) => {
                const selected = value === project.id;
                const name = (project.properties.name ?? 'Untitled') as string;

                return (
                  <UnstyledButton
                    key={project.id}
                    onClick={() => handleSelect(project.id)}
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
                      <Folder
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

        {/* Clear button if project is assigned */}
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
              Remove project
            </Text>
          </UnstyledButton>
        )}
      </Stack>
    </BottomSheet>
  );
}
