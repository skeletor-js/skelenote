/**
 * Mobile-optimized inbox row with swipe actions
 */

import { useMemo } from 'react';
import { Text, Group, Stack, Badge, Box } from '@mantine/core';
import { CheckCircle, Archive, Trash2, ChevronRight } from 'lucide-react';
import { SwipeableRow, type SwipeAction } from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { useObjects, useTypeRegistry } from '@/contexts';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import type { TagColor } from '@/components/ui';

interface MobileInboxRowProps {
  item: SkelenoteObject;
  onPress: () => void;
  onLongPress?: () => void;
  onProcess: (itemId: string) => void;
  onArchive: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}

export function MobileInboxRow({
  item,
  onPress,
  onLongPress,
  onProcess,
  onArchive,
  onDelete,
}: MobileInboxRowProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();

  // Get type info
  const typeDef = typeRegistry.get(item.typeId);

  // Get icon
  const getTypeIcon = (): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  // Get title
  const title = (item.properties.title ??
    item.properties.name ??
    'Untitled') as string;

  // Get first tag for preview
  const tagIds = item.properties.tags as string[] | null;
  const tagInfo = useMemo(() => {
    const firstTagId = tagIds?.[0];
    if (!firstTagId || !store) return null;
    const firstTag = store.get(firstTagId);
    if (!firstTag) return null;
    return {
      name: firstTag.properties.name as string,
      color: firstTag.properties.color as TagColor | undefined,
    };
  }, [tagIds, store]);

  // Get due date for tasks
  const dateLabel = useMemo(() => {
    if (item.typeId === BuiltInTypeIds.TASK) {
      const dueDate = item.properties.dueDate as number | null;
      if (dueDate) {
        return {
          text: formatRelativeDate(dueDate),
          isOverdue: isOverdue(dueDate),
        };
      }
    }
    return null;
  }, [item.typeId, item.properties.dueDate]);

  // Swipe actions
  const leftActions: SwipeAction[] = [
    {
      id: 'process',
      icon: CheckCircle,
      label: 'Process',
      color: 'sage',
      onAction: () => onProcess(item.id),
    },
    {
      id: 'archive',
      icon: Archive,
      label: 'Archive',
      color: 'gray',
      onAction: () => onArchive(item.id),
    },
  ];

  const rightActions: SwipeAction[] = [
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      color: 'brick',
      onAction: () => onDelete(item.id),
    },
  ];

  return (
    <SwipeableRow
      leftActions={leftActions}
      rightActions={rightActions}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
        {/* Type icon */}
        <Box style={{ flexShrink: 0 }}>
          <Icon
            name={getTypeIcon()}
            size={20}
            style={{ color: 'var(--mantine-color-gray-5)' }}
          />
        </Box>

        {/* Title and metadata */}
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>
            {title}
          </Text>
          <Group gap="xs" wrap="nowrap">
            {/* Due date chip */}
            {dateLabel && (
              <Badge
                size="xs"
                variant="light"
                color={dateLabel.isOverdue ? 'brick' : 'gray'}
              >
                {dateLabel.text}
              </Badge>
            )}
            {/* First tag */}
            {tagInfo && (
              <Badge size="xs" variant="light" color={tagInfo.color || 'gray'}>
                {tagInfo.name}
              </Badge>
            )}
          </Group>
        </Stack>

        {/* Chevron indicator */}
        <ChevronRight
          size={16}
          style={{
            color: 'var(--mantine-color-gray-4)',
            flexShrink: 0,
          }}
        />
      </Group>
    </SwipeableRow>
  );
}
