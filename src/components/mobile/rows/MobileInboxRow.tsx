/**
 * Mobile-optimized inbox row with swipe actions
 */

import { useMemo, useCallback } from 'react';
import { Text, Group, Stack, Badge, Box } from '@mantine/core';
import { CheckCircle, Archive, Trash2, ChevronRight } from 'lucide-react';
import {
  SwipeableRow,
  AnimatedCheckbox,
  type SwipeAction,
} from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { useObjects, useTypeRegistry } from '@/contexts';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import type { TagColor } from '@/components/ui';
import { IOS_CHEVRON } from '@/lib/constants/ios-styles';

interface MobileInboxRowProps {
  item: SkelenoteObject;
  onPress: () => void;
  onLongPress?: () => void;
  onProcess: (itemId: string) => void;
  onArchive: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  /** Whether selection mode is active */
  selectionMode?: boolean;
  /** Whether this item is selected (in selection mode) */
  isSelected?: boolean;
  /** Called when selection should be toggled (in selection mode) */
  onToggleSelection?: (itemId: string) => void;
}

export function MobileInboxRow({
  item,
  onPress,
  onLongPress,
  onProcess,
  onArchive,
  onDelete,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
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

  // Handle press - different behavior in selection mode
  const handlePress = useCallback(() => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(item.id);
    } else {
      onPress();
    }
  }, [item.id, onPress, selectionMode, onToggleSelection]);

  // Handle checkbox toggle in selection mode
  const handleCheckboxToggle = useCallback(() => {
    if (onToggleSelection) {
      onToggleSelection(item.id);
    }
  }, [item.id, onToggleSelection]);

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
      leftActions={selectionMode ? [] : leftActions}
      rightActions={selectionMode ? [] : rightActions}
      onPress={handlePress}
      onLongPress={selectionMode ? undefined : onLongPress}
      style={{
        backgroundColor: isSelected
          ? 'var(--mantine-color-ember-0)'
          : undefined,
      }}
    >
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
        {/* Selection checkbox in selection mode, otherwise type icon */}
        {selectionMode ? (
          <AnimatedCheckbox
            checked={isSelected}
            onChange={handleCheckboxToggle}
            size={22}
            checkedColor="var(--mantine-color-ember-6)"
            aria-label={isSelected ? 'Deselect item' : 'Select item'}
          />
        ) : (
          <Box style={{ flexShrink: 0 }}>
            <Icon
              name={getTypeIcon()}
              size={20}
              style={{ color: 'var(--mantine-color-gray-5)' }}
            />
          </Box>
        )}

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
          size={IOS_CHEVRON.disclosure.size}
          strokeWidth={IOS_CHEVRON.disclosure.strokeWidth}
          style={{
            color: IOS_CHEVRON.disclosure.color,
            flexShrink: 0,
          }}
        />
      </Group>
    </SwipeableRow>
  );
}
