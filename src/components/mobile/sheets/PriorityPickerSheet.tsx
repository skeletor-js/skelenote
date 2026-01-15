/**
 * Priority Picker Sheet
 * Bottom sheet for quick task priority selection on mobile
 */

import { Stack, Text, UnstyledButton } from '@mantine/core';
import { Check, AlertTriangle, ChevronUp, Flag, Minus } from 'lucide-react';
import { BottomSheet } from '../primitives';

// Priority options with colors matching desktop StatusBadge
const PRIORITY_OPTIONS = [
  {
    value: 'urgent',
    label: 'Urgent',
    icon: AlertTriangle,
    color: 'var(--mantine-color-brick-5)',
    bgColor: 'var(--mantine-color-brick-0)',
  },
  {
    value: 'high',
    label: 'High',
    icon: ChevronUp,
    color: 'var(--mantine-color-ochre-5)',
    bgColor: 'var(--mantine-color-ochre-0)',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: Flag,
    color: 'var(--mantine-color-clay-5)',
    bgColor: 'var(--mantine-color-clay-0)',
  },
  {
    value: 'low',
    label: 'Low',
    icon: Minus,
    color: 'var(--mantine-color-gray-5)',
    bgColor: 'var(--mantine-color-gray-0)',
  },
  {
    value: null,
    label: 'No Priority',
    icon: Minus,
    color: 'var(--mantine-color-gray-4)',
    bgColor: 'transparent',
  },
];

interface PriorityPickerSheetProps {
  opened: boolean;
  onClose: () => void;
  value: string | null;
  onSelect: (priority: string | null) => void;
}

export function PriorityPickerSheet({
  opened,
  onClose,
  value,
  onSelect,
}: PriorityPickerSheetProps) {
  const handleSelect = (priority: string | null) => {
    onSelect(priority);
    onClose();
  };

  return (
    <BottomSheet opened={opened} onClose={onClose} title="Priority" size="auto">
      <Stack gap="xs">
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <UnstyledButton
              key={option.value ?? 'none'}
              onClick={() => handleSelect(option.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                backgroundColor: isSelected
                  ? option.bgColor
                  : 'var(--mantine-color-gray-0)',
                border: isSelected
                  ? `1px solid ${option.color}`
                  : '1px solid transparent',
              }}
            >
              <Icon
                size={20}
                style={{
                  color: option.color,
                }}
              />
              <Text size="sm" fw={isSelected ? 600 : 400} style={{ flex: 1 }}>
                {option.label}
              </Text>
              {isSelected && (
                <Check
                  size={18}
                  style={{ color: 'var(--mantine-color-ember-5)' }}
                />
              )}
            </UnstyledButton>
          );
        })}
      </Stack>
    </BottomSheet>
  );
}

/**
 * Get priority display info (for use in other components)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getPriorityInfo(priority: string | null) {
  return (
    PRIORITY_OPTIONS.find((o) => o.value === priority) ?? PRIORITY_OPTIONS[4]
  );
}
