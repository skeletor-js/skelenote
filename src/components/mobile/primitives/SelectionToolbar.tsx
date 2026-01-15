/**
 * Selection Toolbar
 * Floating toolbar that appears at the bottom when items are selected
 */

import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import { X, MoreHorizontal } from 'lucide-react';

interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Whether to show the toolbar */
  visible: boolean;
  /** Callback when clear selection is pressed */
  onClear: () => void;
  /** Callback when actions menu is pressed */
  onActionsPress: () => void;
}

export function SelectionToolbar({
  count,
  visible,
  onClear,
  onActionsPress,
}: SelectionToolbarProps) {
  if (!visible || count === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 'calc(var(--safe-area-inset-bottom, 0px) + 80px)', // Above tab bar
        left: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'var(--mantine-color-dark-7)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        {/* Clear button */}
        <UnstyledButton
          onClick={onClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <X size={16} color="white" />
          <Text size="sm" c="white">
            Clear
          </Text>
        </UnstyledButton>

        {/* Count */}
        <Text size="sm" fw={600} c="white">
          {count} selected
        </Text>

        {/* Actions button */}
        <UnstyledButton
          onClick={onActionsPress}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: 'var(--mantine-color-ember-6)',
          }}
        >
          <MoreHorizontal size={16} color="white" />
          <Text size="sm" c="white" fw={500}>
            Actions
          </Text>
        </UnstyledButton>
      </Group>
    </Box>
  );
}
