/**
 * ViewHeader - Consistent thin header bar for views
 * Provides a unified header pattern across all views with optional icon, count, and actions.
 * Design: Linear-inspired with increased presence and badge-style counts.
 */

import type { ReactNode } from 'react';
import { Group, Text, Button, Badge, Stack } from '@mantine/core';
import { Icon } from './Icon';

export interface ViewHeaderProps {
  /** Primary title text */
  title: string;
  /** Optional icon (emoji or lucide icon name) */
  icon?: string;
  /** Optional count to display as badge */
  count?: number;
  /** Optional subtitle for contextual info */
  subtitle?: string;
  /** Left-side content before icon (e.g., selection checkbox) */
  leftSection?: ReactNode;
  /** Right-side content (buttons, badges, etc.) */
  rightSection?: ReactNode;
  /** Content to show after title (badges, etc.) */
  afterTitle?: ReactNode;
  /** Back button configuration */
  backButton?: {
    label?: string;
    onClick: () => void;
  };
}

export function ViewHeader({
  title,
  count,
  subtitle,
  leftSection,
  rightSection,
  afterTitle,
  backButton,
}: ViewHeaderProps) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px="md"
      py="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        flexShrink: 0,
      }}
    >
      <Group gap="sm" wrap="nowrap">
        {backButton && (
          <Button
            variant="subtle"
            size="xs"
            onClick={backButton.onClick}
            leftSection={<Icon name="chevron-left" size={14} />}
          >
            {backButton.label ?? 'Back'}
          </Button>
        )}

        {leftSection}

        <Stack gap={0}>
          <Group gap="xs" wrap="nowrap">
            <Text size="md" fw={600}>
              {title}
            </Text>

            {typeof count === 'number' && (
              <Badge variant="light" color="gray" size="sm">
                {count}
              </Badge>
            )}

            {afterTitle}
          </Group>

          {subtitle && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Stack>
      </Group>

      {rightSection && (
        <Group gap="xs" wrap="nowrap">
          {rightSection}
        </Group>
      )}
    </Group>
  );
}
