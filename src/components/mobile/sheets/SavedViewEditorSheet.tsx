/**
 * Saved View Editor Sheet
 * Bottom sheet for creating and editing saved views on mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Group,
  Button,
  Text,
  SimpleGrid,
  UnstyledButton,
  Box,
} from '@mantine/core';
import { BottomSheet } from '../primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { SavedView, CreateSavedViewInput } from '@/lib/types';

interface SavedViewEditorSheetProps {
  opened: boolean;
  onClose: () => void;
  /** View to edit, or null for creating a new view */
  view?: SavedView | null;
  /** Called when a view is created */
  onCreate?: (input: CreateSavedViewInput) => void;
  /** Called when a view is updated */
  onUpdate?: (id: string, name: string, icon: string) => void;
}

// Icons suitable for saved views
const VIEW_ICONS: IconName[] = [
  'clipboard',
  'list-checks',
  'filter',
  'folder',
  'inbox',
  'pin',
  'flag',
  'calendar',
  'clock',
  'tag',
  'layers',
  'archive',
  'check-circle',
  'alert-triangle',
  'sparkles',
  'zap',
];

export function SavedViewEditorSheet({
  opened,
  onClose,
  view,
  onCreate,
  onUpdate,
}: SavedViewEditorSheetProps) {
  const isEditing = !!view;
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<IconName>('clipboard');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when opened/closed or view changes
  useEffect(() => {
    if (opened) {
      if (view) {
        setName(view.name);
        // Check if the view icon is a valid IconName
        const iconValue = view.icon || 'clipboard';
        if (VIEW_ICONS.includes(iconValue as IconName)) {
          setSelectedIcon(iconValue as IconName);
        } else {
          setSelectedIcon('clipboard');
        }
      } else {
        setName('');
        setSelectedIcon('clipboard');
      }
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [opened, view]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    if (isEditing && view) {
      onUpdate?.(view.id, name.trim(), selectedIcon);
    } else {
      onCreate?.({
        name: name.trim(),
        icon: selectedIcon,
        filters: [], // Empty filters - user will add via main UI
      });
    }
    onClose();
  }, [name, selectedIcon, isEditing, view, onCreate, onUpdate, onClose]);

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit View' : 'New Saved View'}
      size="lg"
    >
      <Stack gap="md">
        {/* Name input */}
        <TextInput
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="View name"
          size="md"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              handleSave();
            }
          }}
        />

        {/* Icon picker */}
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Icon
          </Text>
          <SimpleGrid cols={8} spacing="xs">
            {VIEW_ICONS.map((iconName) => (
              <UnstyledButton
                key={iconName}
                onClick={() => setSelectedIcon(iconName)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor:
                    selectedIcon === iconName
                      ? 'var(--mantine-color-ember-1)'
                      : 'var(--surface-overlay)',
                  border:
                    selectedIcon === iconName
                      ? '2px solid var(--mantine-color-ember-5)'
                      : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon
                  name={iconName}
                  size={20}
                  style={{
                    color:
                      selectedIcon === iconName
                        ? 'var(--mantine-color-ember-7)'
                        : 'var(--mantine-color-gray-6)',
                  }}
                />
              </UnstyledButton>
            ))}
          </SimpleGrid>
        </Stack>

        {/* Info text for new views */}
        {!isEditing && (
          <Box
            p="sm"
            style={{
              backgroundColor: 'var(--surface-overlay)',
              borderRadius: 8,
            }}
          >
            <Text size="xs" c="dimmed">
              After creating, add filters from the Tasks or Search view to
              customize what this view shows.
            </Text>
          </Box>
        )}

        {/* Action buttons */}
        <Group gap="sm">
          <Button
            variant="subtle"
            color="gray"
            size="lg"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            color="ember"
            size="lg"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isEditing ? 'Save' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </BottomSheet>
  );
}
