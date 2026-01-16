/**
 * Property Chip
 * Compact chip button for quick property selection in Quick Capture
 */

import { UnstyledButton, Text } from '@mantine/core';
import type { LucideIcon } from 'lucide-react';

interface PropertyChipProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress: () => void;
  color?: string;
}

export function PropertyChip({
  icon: Icon,
  label,
  value,
  onPress,
  color,
}: PropertyChipProps) {
  const hasValue = !!value;

  return (
    <UnstyledButton
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 6,
        backgroundColor: hasValue
          ? 'var(--mantine-color-gray-1)'
          : 'var(--mantine-color-gray-0)',
        border: hasValue
          ? '1px solid var(--mantine-color-gray-3)'
          : '1px solid var(--mantine-color-gray-2)',
        minHeight: 36,
        flexShrink: 0,
      }}
    >
      <Icon
        size={14}
        style={{ color: color ?? 'var(--mantine-color-gray-5)' }}
      />
      <Text
        size="xs"
        fw={hasValue ? 500 : 400}
        c={hasValue ? 'default' : 'dimmed'}
        style={{ whiteSpace: 'nowrap' }}
      >
        {value ?? label}
      </Text>
    </UnstyledButton>
  );
}
