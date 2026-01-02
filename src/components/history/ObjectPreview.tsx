/**
 * ObjectPreview - Shows a single object's details at a historical point
 * Redesigned to hide empty properties and simplify visual presentation
 */

import { useMemo } from 'react';
import { Stack, Group, Text, Button, Box, ActionIcon, Badge, ScrollArea, SimpleGrid } from '@mantine/core';
import { useTypeRegistry, useObjects } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import { extractPlainTextFromContent } from '@/lib/search';
import type { ObjectPreviewProps } from './types';
import classes from './ObjectPreview.module.css';

/**
 * Get a display title for an object
 */
function getObjectTitle(obj: { properties: Record<string, unknown> }): string {
  const titleProps = ['title', 'name', 'url'];
  for (const prop of titleProps) {
    const value = obj.properties[prop];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'Untitled';
}

/**
 * Format a property value for display
 * Returns null for empty/null values (these will be filtered out)
 */
function formatPropertyValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    // Check if it looks like a timestamp (ms since epoch)
    if (value > 1000000000000 && value < 2000000000000) {
      return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return value.toLocaleString();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  const strValue = String(value).trim();
  return strValue || null;
}

export function ObjectPreview({
  object,
  timestamp,
  onRestore,
  onCompareWithCurrent,
  onClose,
}: ObjectPreviewProps) {
  const typeRegistry = useTypeRegistry();
  const { docStore } = useObjects();

  const typeDef = typeRegistry.get(object.typeId);
  const title = getObjectTitle(object);

  // Get icon - could be an emoji or already an icon name
  const rawIcon = typeDef?.icon ?? '📄';
  // If it's a short string (1-2 chars), it's likely an emoji, so convert it
  // Otherwise it's already an icon name
  const icon = rawIcon.length <= 2 ? getIconFromEmoji(rawIcon) : rawIcon;

  // Get content - it's stored as a property in the historical object (BlockNote JSON)
  const content = useMemo(() => {
    if (!object.hasContent) return null;
    // Content is stored in properties.content for historical objects as BlockNote JSON
    const contentValue = object.properties.content;
    if (typeof contentValue === 'string') {
      // Parse BlockNote JSON to plain text
      return extractPlainTextFromContent(contentValue);
    }
    return null;
  }, [object.hasContent, object.properties.content]);

  // Get property definitions for display, filtering out empty values
  const visibleProperties = useMemo(() => {
    const properties: Array<{ id: string; label: string; value: string }> = [];

    if (!typeDef) {
      // If no type def, show all properties except content (shown separately)
      Object.entries(object.properties).forEach(([key, value]) => {
        if (key === 'content') return;
        const formatted = formatPropertyValue(value);
        if (formatted) {
          properties.push({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            value: formatted,
          });
        }
      });
    } else {
      // Use schema to get proper labels
      typeDef.schema.forEach((propDef) => {
        const formatted = formatPropertyValue(object.properties[propDef.id]);
        if (formatted) {
          properties.push({
            id: propDef.id,
            label: propDef.name,
            value: formatted,
          });
        }
      });
    }

    return properties;
  }, [typeDef, object.properties]);

  const formattedTimestamp = useMemo(() => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [timestamp]);

  // Check if this object still exists in the current state
  const existsInCurrent = useMemo(() => {
    return docStore.getDocument('main') !== undefined;
  }, [docStore]);

  return (
    <Stack gap={0} h="100%" className={classes.previewContainer}>
      {/* Header */}
      <Group justify="space-between" wrap="nowrap" px="sm" py="xs" className={classes.header}>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            onClick={onClose}
            title="Back to object list"
            size="sm"
            className={classes.backButton}
          >
            <Icon name="chevron-left" size={16} />
          </ActionIcon>

          <Icon name={icon as any} size={18} style={{ color: 'var(--mantine-color-gray-6)' }} />

          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={600}>{title}</Text>
            <Badge size="xs" variant="light" color="ember" radius="sm">
              {formattedTimestamp}
            </Badge>
          </Group>
        </Group>

        <Group gap={4}>
          {existsInCurrent && (
            <Button
              variant="subtle"
              size="xs"
              onClick={onCompareWithCurrent}
              leftSection={<Icon name="git-compare" size={14} />}
              title="Open side-by-side comparison with current version"
              className={classes.actionButton}
            >
              Compare
            </Button>
          )}
          <Button
            size="xs"
            onClick={onRestore}
            leftSection={<Icon name="rotate-ccw" size={14} />}
            title="Restore this object to this historical state"
            className={classes.actionButton}
          >
            Restore
          </Button>
        </Group>
      </Group>

      <ScrollArea style={{ flex: 1 }} px="sm">
        <Stack gap={0}>
          {/* Properties section - only show if there are visible properties */}
          {visibleProperties.length > 0 && (
            <Box py="sm" className={classes.section}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="xs">
                Properties
              </Text>
              <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                {visibleProperties.map(({ id, label, value }) => (
                  <Group key={id} gap="xs" wrap="nowrap" className={classes.propertyRow}>
                    <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>{label}</Text>
                    <Text size="sm">{value}</Text>
                  </Group>
                ))}
              </SimpleGrid>
            </Box>
          )}

          {/* Content section (if applicable) */}
          {object.hasContent && content && (
            <Box py="sm" className={classes.section}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="xs">
                Content
              </Text>
              <Box
                p="xs"
                className={classes.contentBox}
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: 'var(--mantine-radius-sm)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <Text size="sm">{content}</Text>
              </Box>
            </Box>
          )}

          {/* Minimal metadata - only show what's useful */}
          <Box py="sm" className={classes.section}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="xs">
              Details
            </Text>
            <Stack gap={4}>
              <Group gap="xs" wrap="nowrap" className={classes.propertyRow}>
                <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>Created</Text>
                <Text size="sm">
                  {new Date(object.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </Group>
              <Group gap="xs" wrap="nowrap" className={classes.propertyRow}>
                <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>Modified</Text>
                <Text size="sm">
                  {new Date(object.updatedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </Group>
              {object.inboxed && (
                <Group gap="xs" wrap="nowrap" className={classes.propertyRow}>
                  <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>Status</Text>
                  <Text size="sm">In Inbox</Text>
                </Group>
              )}
              <Group gap="xs" wrap="nowrap" className={classes.propertyRow}>
                <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>ID</Text>
                <Text size="xs" c="dimmed" ff="monospace" className={classes.objectId}>
                  {object.id}
                </Text>
              </Group>
            </Stack>
          </Box>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
