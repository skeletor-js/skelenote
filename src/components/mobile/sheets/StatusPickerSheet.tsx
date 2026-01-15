/**
 * Status Picker Sheet
 * Bottom sheet for quick task status selection on mobile
 */

import { Stack, Text, UnstyledButton } from '@mantine/core';
import { Check, Circle, Loader, Clock, CheckCircle2 } from 'lucide-react';
import { BottomSheet } from '../primitives';

// Status options with colors matching desktop StatusBadge
const STATUS_OPTIONS = [
  {
    value: 'todo',
    label: 'To Do',
    icon: Circle,
    color: 'var(--mantine-color-gray-5)',
    bgColor: 'var(--mantine-color-gray-0)',
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    icon: Loader,
    color: 'var(--mantine-color-slate-5)',
    bgColor: 'var(--mantine-color-slate-0)',
  },
  {
    value: 'waiting',
    label: 'Waiting',
    icon: Clock,
    color: 'var(--mantine-color-ochre-5)',
    bgColor: 'var(--mantine-color-ochre-0)',
  },
  {
    value: 'done',
    label: 'Done',
    icon: CheckCircle2,
    color: 'var(--mantine-color-sage-5)',
    bgColor: 'var(--mantine-color-sage-0)',
  },
];

interface StatusPickerSheetProps {
  opened: boolean;
  onClose: () => void;
  value: string | null;
  onSelect: (status: string) => void;
}

export function StatusPickerSheet({
  opened,
  onClose,
  value,
  onSelect,
}: StatusPickerSheetProps) {
  const handleSelect = (status: string) => {
    onSelect(status);
    onClose();
  };

  return (
    <BottomSheet opened={opened} onClose={onClose} title="Status" size="auto">
      <Stack gap="xs">
        {STATUS_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <UnstyledButton
              key={option.value}
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
 * Get status display info (for use in other components)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getStatusInfo(status: string | null) {
  return STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
}
