import { type ReactNode } from 'react';
import { Box, Group, Text, ActionIcon, Badge } from '@mantine/core';
import { ChevronLeft } from 'lucide-react';
import { MobileSyncIndicator } from './MobileSyncIndicator';

interface MobileViewHeaderProps {
  /** View title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Show back button */
  showBack?: boolean;
  /** Back button callback */
  onBack?: () => void;
  /** Badge count next to title */
  count?: number;
  /** Right side actions */
  rightSection?: ReactNode;
  /** Header variant */
  variant?: 'default' | 'large' | 'compact';
  /** Show sync status indicator */
  showSync?: boolean;
}

const heightMap = {
  default: 56,
  large: 72,
  compact: 48,
};

/**
 * Consistent header component for mobile views.
 * Includes back navigation, title, badge, and right actions.
 */
export function MobileViewHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  count,
  rightSection,
  variant = 'default',
  showSync = false,
}: MobileViewHeaderProps) {
  const height = heightMap[variant];
  const titleSize =
    variant === 'large' ? 'lg' : variant === 'compact' ? 'sm' : 'md';

  return (
    <Box
      px="md"
      style={{
        // Use plugin's CSS variable for safe area (injected by tauri-plugin-edge-to-edge)
        minHeight: height,
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'var(--surface-paper)',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}
    >
      {/* Back button */}
      {showBack && (
        <ActionIcon
          variant="subtle"
          color="gray"
          size={44}
          onClick={onBack}
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </ActionIcon>
      )}

      {/* Title and subtitle */}
      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Box style={{ minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text
              size={titleSize}
              fw={600}
              truncate
              style={{ lineHeight: 1.2 }}
            >
              {title}
            </Text>
            {count !== undefined && count > 0 && (
              <Badge variant="light" color="gray" size="sm">
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Group>
          {subtitle && (
            <Text size="xs" c="dimmed" truncate>
              {subtitle}
            </Text>
          )}
        </Box>
      </Group>

      {/* Right section */}
      <Group gap="xs" wrap="nowrap">
        {showSync && <MobileSyncIndicator />}
        {rightSection}
      </Group>
    </Box>
  );
}
