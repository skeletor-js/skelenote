/**
 * Mobile-optimized archive row with swipe actions
 */

import { useMemo } from 'react';
import { Text, Group, Stack, Badge, Box } from '@mantine/core';
import { ArchiveRestore, Trash2, ChevronRight } from 'lucide-react';
import { SwipeableRow, type SwipeAction } from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { useTypeRegistry } from '@/contexts';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';

interface MobileArchiveRowProps {
  item: SkelenoteObject;
  onPress: () => void;
  onLongPress?: () => void;
  onRestore: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}

export function MobileArchiveRow({
  item,
  onPress,
  onLongPress,
  onRestore,
  onDelete,
}: MobileArchiveRowProps) {
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

  // Get type label
  const typeLabel = typeDef?.name ?? 'Object';

  // Get archived date
  const archivedDate = useMemo(() => {
    return formatRelativeDate(item.updatedAt);
  }, [item.updatedAt]);

  // Get due date for tasks (might be of interest even when archived)
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
      id: 'restore',
      icon: ArchiveRestore,
      label: 'Restore',
      color: 'sage',
      onAction: () => onRestore(item.id),
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
            {/* Type badge */}
            <Badge size="xs" variant="light" color="gray">
              {typeLabel}
            </Badge>
            {/* Due date chip (for tasks) */}
            {dateLabel && (
              <Badge
                size="xs"
                variant="light"
                color={dateLabel.isOverdue ? 'brick' : 'gray'}
              >
                {dateLabel.text}
              </Badge>
            )}
            {/* Archived date */}
            <Text size="xs" c="dimmed">
              {archivedDate}
            </Text>
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
