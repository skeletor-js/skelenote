import { Box, UnstyledButton, Text, Badge, Group } from '@mantine/core';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface BrowseItemProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Label text */
  label: string;
  /** Optional count badge */
  count?: number;
  /** Click handler */
  onPress: () => void;
  /** Whether the item is disabled */
  disabled?: boolean;
}

/**
 * A row item for the mobile Browse view.
 * Displays an icon, label, optional count badge, and chevron.
 */
export function BrowseItem({
  icon: Icon,
  label,
  count,
  onPress,
  disabled = false,
}: BrowseItemProps) {
  return (
    <UnstyledButton
      onClick={onPress}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minHeight: 44,
        padding: '12px 16px',
        backgroundColor: disabled
          ? 'var(--surface-muted)'
          : 'var(--surface-paper)',
        borderBottom: '1px solid var(--border-default)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Box
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            backgroundColor: 'var(--surface-overlay)',
            flexShrink: 0,
          }}
        >
          <Icon size={18} style={{ color: 'var(--mantine-color-gray-7)' }} />
        </Box>
        <Text
          size="sm"
          fw={500}
          truncate
          style={{ color: 'var(--mantine-color-text)' }}
        >
          {label}
        </Text>
      </Group>

      <Group gap="xs" wrap="nowrap">
        {count !== undefined && count > 0 && (
          <Badge variant="light" color="gray" size="sm">
            {count > 999 ? '999+' : count}
          </Badge>
        )}
        <ChevronRight
          size={18}
          style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }}
        />
      </Group>
    </UnstyledButton>
  );
}
