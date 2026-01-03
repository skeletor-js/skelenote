/**
 * SnapshotPreview - Shows list of objects at a historical point in time
 * Flat list with hover-reveal Compare + Restore actions
 * Click opens Compare view directly
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  UnstyledButton,
  Box,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Badge,
} from '@mantine/core';
import { useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji } from '@/lib/icons';
import type { SkelenoteObject } from '@/lib/types';
import type { SnapshotPreviewProps } from './types';
import classes from './SnapshotPreview.module.css';

/**
 * Get a display title for an object
 */
function getObjectTitle(obj: SkelenoteObject): string {
  const titleProps = ['title', 'name', 'url'];
  for (const prop of titleProps) {
    const value = obj.properties[prop];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'Untitled';
}

export function SnapshotPreview({
  timestamp,
  frontier: _frontier,
  objects,
  onObjectSelect: _onObjectSelect,
  onRestore,
  onRestoreObject,
  onCompareWithCurrent,
  currentObjectIds,
}: SnapshotPreviewProps) {
  const typeRegistry = useTypeRegistry();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort objects by updatedAt descending (most recently modified first)
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [objects]);

  // Handle row click - open Compare view directly
  const handleItemClick = useCallback(
    (objectId: string) => {
      onCompareWithCurrent(objectId);
    },
    [onCompareWithCurrent]
  );

  // Handle compare action (for action button)
  const handleCompare = useCallback(
    (e: React.MouseEvent, objectId: string) => {
      e.stopPropagation();
      onCompareWithCurrent(objectId);
    },
    [onCompareWithCurrent]
  );

  // Handle restore action
  const handleRestore = useCallback(
    (e: React.MouseEvent, objectId: string) => {
      e.stopPropagation();
      onRestoreObject?.(objectId);
    },
    [onRestoreObject]
  );

  // Check if object exists in current state
  const objectExistsInCurrent = useCallback(
    (objectId: string): boolean => {
      if (!currentObjectIds) return true; // Assume exists if not provided
      return currentObjectIds.has(objectId);
    },
    [currentObjectIds]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this component is focused or contains focus
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body) {
        return;
      }

      const objectIds = sortedObjects.map((o) => o.id);
      if (objectIds.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, objectIds.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          // Open Compare view for focused row
          onCompareWithCurrent(objectIds[focusedIndex]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedObjects, focusedIndex, onCompareWithCurrent]);

  const formattedTimestamp = useMemo(() => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [timestamp]);

  return (
    <Stack gap="sm" h="100%" ref={containerRef}>
      {/* Minimal header */}
      <Group justify="space-between" wrap="nowrap" px="xs">
        <Text size="sm" c="dimmed">
          {formattedTimestamp}
        </Text>
        <Button
          size="xs"
          variant="subtle"
          onClick={onRestore}
          leftSection={<Icon name="rotate-ccw" size={14} />}
          title="Restore all objects to this point in time"
        >
          Restore All
        </Button>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={2}>
          {sortedObjects.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No objects found at this point in time
            </Text>
          ) : (
            sortedObjects.map((obj, index) => {
              const typeDef = typeRegistry.get(obj.typeId);
              const rawIcon = typeDef?.icon ?? '📄';
              const iconName = rawIcon.length <= 2 ? getIconFromEmoji(rawIcon) : rawIcon;
              const title = getObjectTitle(obj);
              const isFocused = focusedIndex >= 0 && focusedIndex === index;
              const existsInCurrent = objectExistsInCurrent(obj.id);

              return (
                <UnstyledButton
                  key={obj.id}
                  onClick={() => handleItemClick(obj.id)}
                  className={classes.snapshotRow}
                  data-focused={isFocused}
                  px="sm"
                  py="xs"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--mantine-spacing-sm)',
                    width: '100%',
                    borderRadius: 'var(--mantine-radius-sm)',
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    gap="sm"
                    style={{ flex: 1 }}
                  >
                    <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                      <Icon
                        name={iconName as any}
                        size={16}
                        style={{
                          flexShrink: 0,
                          color: 'var(--mantine-color-gray-6)',
                        }}
                      />
                      <Text size="sm" truncate style={{ flex: 1 }}>
                        {title}
                      </Text>
                      {!existsInCurrent && (
                        <Badge size="xs" color="brick" variant="light">
                          Deleted
                        </Badge>
                      )}
                    </Group>
                    <Group gap={4} className={classes.actions} wrap="nowrap">
                      {existsInCurrent && (
                        <Tooltip
                          label="Compare with current"
                          position="top"
                          withArrow
                        >
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={(e) => handleCompare(e, obj.id)}
                            aria-label="Compare with current version"
                          >
                            <Icon name="git-compare" size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip
                        label="Restore to this version"
                        position="top"
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={(e) => handleRestore(e, obj.id)}
                          aria-label="Restore to this version"
                        >
                          <Icon name="rotate-ccw" size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </UnstyledButton>
              );
            })
          )}
        </Stack>
      </ScrollArea>

      {/* Minimal footer with object count and keyboard hints */}
      <Box px="xs">
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {objects.length} object{objects.length !== 1 ? 's' : ''}
          </Text>
          <Text size="xs" c="dimmed">
            ↑↓ navigate • Enter compare
          </Text>
        </Group>
      </Box>
    </Stack>
  );
}
