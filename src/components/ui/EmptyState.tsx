/**
 * EmptyState - Reusable empty state component
 * Displays a centered message when a list or view has no content
 */

import { Stack, Text } from '@mantine/core';
import { Icon } from './Icon';
import type { IconName } from '@/lib/icons';
import { EMOJI_TO_ICON } from '@/lib/icons';

interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional icon (emoji string or icon name) */
  icon?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Get icon size based on empty state size variant
 */
const ICON_SIZES: Record<string, number> = {
  small: 32,
  medium: 48,
  large: 64,
};

/**
 * Get text size based on empty state size variant
 */
const TEXT_SIZES: Record<string, string> = {
  small: 'xs',
  medium: 'sm',
  large: 'md',
};

/**
 * Get padding based on size variant
 */
const PADDING_SIZES: Record<string, string> = {
  small: 'md',
  medium: 'xl',
  large: '2rem',
};

/**
 * Render icon from emoji or icon name
 */
function EmptyStateIcon({ icon, size }: { icon: string; size: number }) {
  // Check if it's a known emoji, convert to icon name
  const iconName = EMOJI_TO_ICON[icon];
  if (iconName) {
    return (
      <Icon name={iconName} size={size} color="var(--mantine-color-gray-5)" />
    );
  }

  // Check if it's already a valid icon name (no emoji characters)
  const isIconName = /^[a-z0-9-]+$/.test(icon);
  if (isIconName) {
    return (
      <Icon
        name={icon as IconName}
        size={size}
        color="var(--mantine-color-gray-5)"
      />
    );
  }

  // Fallback: render as text (legacy emoji)
  return <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
}

export function EmptyState({
  message,
  icon,
  size = 'medium',
}: EmptyStateProps) {
  const iconSize = ICON_SIZES[size];
  const textSize = TEXT_SIZES[size];
  const padding = PADDING_SIZES[size];

  return (
    <Stack align="center" justify="center" gap="sm" py={padding}>
      {icon && <EmptyStateIcon icon={icon} size={iconSize} />}
      <Text size={textSize} c="dimmed" ta="center">
        {message}
      </Text>
    </Stack>
  );
}
