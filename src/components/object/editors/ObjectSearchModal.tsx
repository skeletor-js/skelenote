/**
 * ObjectSearchModal - Modal for searching and selecting objects
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Modal,
  TextInput,
  ScrollArea,
  UnstyledButton,
  Group,
  Text,
  Stack,
  Badge,
} from '@mantine/core';
import { useObjects, useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import type { SkelenoteObject } from '@/lib/types';
import type { IconName } from '@/lib/icons';

interface ObjectSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (objectId: string) => void;
  targetTypeIds?: string[];
  excludeIds?: string[];
  title?: string;
  /** Optional custom filter function for additional filtering */
  filterFn?: (object: SkelenoteObject) => boolean;
}

export function ObjectSearchModal({
  isOpen,
  onClose,
  onSelect,
  targetTypeIds,
  excludeIds = [],
  title = 'Select Object',
  filterFn,
}: ObjectSearchModalProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter objects based on query and constraints
  const filteredObjects = useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const lowerQuery = query.toLowerCase();

    return allObjects.filter((obj: SkelenoteObject) => {
      // Filter by target types if specified
      if (targetTypeIds && targetTypeIds.length > 0) {
        if (!targetTypeIds.includes(obj.typeId)) return false;
      }

      // Exclude already selected objects
      if (excludeIds.includes(obj.id)) return false;

      // Apply custom filter if provided
      if (filterFn && !filterFn(obj)) return false;

      // Filter by name/title
      const name = (obj.properties.title ?? obj.properties.name ?? '') as string;
      return name.toLowerCase().includes(lowerQuery);
    });
  }, [store, query, targetTypeIds, excludeIds, filterFn]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredObjects.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredObjects.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredObjects[selectedIndex]) {
            onSelect(filteredObjects[selectedIndex].id);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredObjects, selectedIndex, onSelect, onClose]
  );

  // Get icon for object type
  const getTypeIcon = (typeId: string): IconName => {
    const typeDef = typeRegistry.get(typeId);
    if (!typeDef?.icon) return 'file';
    // If it's already a valid icon name, use it; otherwise convert from emoji
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={title}
      centered
      size="md"
    >
      <Stack gap="sm">
        <TextInput
          ref={inputRef}
          leftSection={<Icon name="search" size={16} />}
          placeholder="Search objects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <ScrollArea.Autosize mah={300}>
          {filteredObjects.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              No objects found
            </Text>
          ) : (
            <Stack gap={2}>
              {filteredObjects.slice(0, 20).map((obj, index) => {
                const iconName = getTypeIcon(obj.typeId);
                const name = (obj.properties.title ?? obj.properties.name ?? 'Untitled') as string;
                const isSelected = index === selectedIndex;

                return (
                  <UnstyledButton
                    key={obj.id}
                    onClick={() => {
                      onSelect(obj.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    p="xs"
                    style={{
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor: isSelected
                        ? 'var(--mantine-color-slate-light)'
                        : 'transparent',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Icon name={iconName} size={16} />
                      <Text size="sm" truncate style={{ flex: 1 }}>
                        {name}
                      </Text>
                      <Badge size="xs" variant="light" color="gray" radius="sm">
                        {obj.typeId}
                      </Badge>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
}
