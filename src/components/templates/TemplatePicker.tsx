/**
 * Template Picker Modal
 *
 * Modal for selecting a template to create an object from.
 * Features:
 * - Search/filter templates by name
 * - Filter by target type
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Template preview on hover/selection
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Modal,
  TextInput,
  Select,
  ScrollArea,
  UnstyledButton,
  Stack,
  Group,
  Text,
  Badge,
  Box,
  Kbd,
} from '@mantine/core';
import { useTemplates } from '@/hooks';
import { useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import type { Template } from '@/lib/templates';
import type { IconName } from '@/lib/icons';

export interface TemplatePickerProps {
  /** Whether the picker is open */
  isOpen: boolean;
  /** Called when the picker should close */
  onClose: () => void;
  /** Called when a template is selected */
  onSelect: (template: Template) => void;
  /** Optional filter to only show templates for specific type */
  targetTypeId?: string;
  /** Optional title override */
  title?: string;
}

export function TemplatePicker({
  isOpen,
  onClose,
  onSelect,
  targetTypeId,
  title = 'Create from Template',
}: TemplatePickerProps) {
  const { templates, getForType } = useTemplates();
  const typeRegistry = useTypeRegistry();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | null>(targetTypeId ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter templates based on query and type filter
  const filteredTemplates = useMemo(() => {
    let result = typeFilter ? getForType(typeFilter) : templates;

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }, [templates, getForType, typeFilter, query]);

  // Get unique target types for filter dropdown
  const availableTypes = useMemo(() => {
    const typeIds = new Set(templates.map((t) => t.targetTypeId));
    return Array.from(typeIds)
      .map((id) => {
        const typeDef = typeRegistry.get(id);
        return typeDef ? { id, name: typeDef.name, icon: typeDef.icon } : null;
      })
      .filter((t): t is { id: string; name: string; icon: string } => t !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, typeRegistry]);

  // Convert type select options
  const typeSelectData = useMemo(() => {
    return [
      { value: '', label: 'All Types' },
      ...availableTypes.map((type) => ({
        value: type.id,
        label: type.name,
      })),
    ];
  }, [availableTypes]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTypeFilter(targetTypeId ?? null);
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, targetTypeId]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTemplates.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedItem = listRef.current.querySelector('[data-selected="true"]');
    selectedItem?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredTemplates.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTemplates[selectedIndex]) {
            onSelect(filteredTemplates[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredTemplates, selectedIndex, onSelect, onClose]
  );

  // Handle template selection
  const handleSelectTemplate = useCallback(
    (template: Template) => {
      onSelect(template);
    },
    [onSelect]
  );

  // Get type icon
  const getTypeIcon = (typeId: string): IconName => {
    const typeDef = typeRegistry.get(typeId);
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  // Get type name
  const getTypeName = (typeId: string): string => {
    const typeDef = typeRegistry.get(typeId);
    return typeDef?.name ?? typeId;
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={title}
      centered
      size="md"
    >
      <Stack gap="sm" onKeyDown={handleKeyDown}>
        {/* Search and filter */}
        <Group gap="sm">
          <TextInput
            ref={inputRef}
            leftSection={<Icon name="search" size={16} />}
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          {!targetTypeId && availableTypes.length > 1 && (
            <Select
              data={typeSelectData}
              value={typeFilter ?? ''}
              onChange={(value) => setTypeFilter(value || null)}
              placeholder="All Types"
              w={150}
            />
          )}
        </Group>

        {/* Template list */}
        <ScrollArea.Autosize mah={350} ref={listRef}>
          {filteredTemplates.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {templates.length === 0
                ? 'No templates yet. Create one to get started.'
                : 'No templates match your search.'}
            </Text>
          ) : (
            <Stack gap={4}>
              {filteredTemplates.map((template, index) => {
                const isSelected = index === selectedIndex;
                const iconName = getTypeIcon(template.targetTypeId);
                const typeName = getTypeName(template.targetTypeId);

                return (
                  <UnstyledButton
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    data-selected={isSelected}
                    p="sm"
                    style={{
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor: isSelected
                        ? 'var(--mantine-color-slate-light)'
                        : 'transparent',
                    }}
                  >
                    <Stack gap={4}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm" fw={500}>
                          {template.name}
                        </Text>
                        {template.isDailyNoteTemplate && (
                          <Badge size="xs" variant="light" color="ember" radius="sm">
                            Daily
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        <Icon name={iconName} size={14} />
                        <Text size="xs" c="dimmed">
                          Creates: {typeName}
                        </Text>
                      </Group>
                      {template.description && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {template.description}
                        </Text>
                      )}
                    </Stack>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>

        {/* Footer with keyboard hints */}
        <Box
          p="xs"
          style={{
            borderTop: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Group justify="center" gap="md">
            <Group gap={4}>
              <Kbd size="xs">↑</Kbd>
              <Kbd size="xs">↓</Kbd>
              <Text size="xs" c="dimmed">Navigate</Text>
            </Group>
            <Group gap={4}>
              <Kbd size="xs">↵</Kbd>
              <Text size="xs" c="dimmed">Select</Text>
            </Group>
            <Group gap={4}>
              <Kbd size="xs">Esc</Kbd>
              <Text size="xs" c="dimmed">Cancel</Text>
            </Group>
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}
