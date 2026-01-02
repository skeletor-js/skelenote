/**
 * TypeSelector - Type picker for Quick Capture
 * Shows Task, Note, Link, and Template as selectable options
 * Supports left/right arrow key navigation
 */

import { useCallback, useEffect } from 'react';
import { Group, UnstyledButton, Text } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/lib/icons';

export type CaptureType = 'task' | 'note' | 'link' | 'template';

interface TypeOption {
  id: CaptureType;
  name: string;
  icon: IconName;
}

const typeOptions: TypeOption[] = [
  { id: 'task', name: 'Task', icon: 'circle-check' },
  { id: 'note', name: 'Note', icon: 'file-text' },
  { id: 'link', name: 'Link', icon: 'link' },
  { id: 'template', name: 'Template', icon: 'clipboard' },
];

interface TypeSelectorProps {
  selectedType: CaptureType;
  onSelectType: (type: CaptureType) => void;
  /** Hide the template option (e.g., when no templates exist) */
  hideTemplate?: boolean;
}

export function TypeSelector({ selectedType, onSelectType, hideTemplate }: TypeSelectorProps) {
  const visibleOptions = hideTemplate
    ? typeOptions.filter((opt) => opt.id !== 'template')
    : typeOptions;

  const currentIndex = visibleOptions.findIndex((opt) => opt.id === selectedType);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : visibleOptions.length - 1;
        onSelectType(visibleOptions[newIndex].id);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = currentIndex < visibleOptions.length - 1 ? currentIndex + 1 : 0;
        onSelectType(visibleOptions[newIndex].id);
      }
    },
    [currentIndex, onSelectType, visibleOptions]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Group gap="sm" role="radiogroup" aria-label="Select type">
      {visibleOptions.map((option) => {
        const isSelected = selectedType === option.id;
        return (
          <UnstyledButton
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectType(option.id)}
            py="xs"
            px="md"
            style={{
              borderRadius: 'var(--mantine-radius-md)',
              backgroundColor: isSelected
                ? 'var(--mantine-color-slate-light)'
                : 'var(--mantine-color-default-hover)',
              border: isSelected
                ? '2px solid var(--mantine-color-slate-6)'
                : '2px solid transparent',
              transition: 'all 150ms ease',
            }}
          >
            <Group gap="xs">
              <Icon name={option.icon} size={16} />
              <Text size="sm" fw={isSelected ? 600 : 400}>
                {option.name}
              </Text>
            </Group>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
