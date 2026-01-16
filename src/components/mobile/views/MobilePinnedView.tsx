/**
 * MobilePinnedView - Display and manage pinned items
 *
 * Features:
 * - Shows all pinned objects in display order
 * - Swipe left to unpin
 * - Tap to navigate to object detail
 * - Empty state when no pinned items
 */

import { useMemo, useCallback } from 'react';
import { Stack, Text, Group, Badge, Box, ScrollArea } from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';
import { PinOff, ChevronRight, Pin } from 'lucide-react';
import {
  MobileViewHeader,
  SwipeableRow,
  EmptyState,
  type SwipeAction,
} from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { usePinnedObjects, useHaptics, useReducedMotion } from '@/hooks';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import type { TagColor } from '@/components/ui';
import { IOS_CHEVRON } from '@/lib/constants/ios-styles';

/**
 * Individual pinned item row
 */
function PinnedItemRow({
  item,
  onPress,
  onUnpin,
}: {
  item: SkelenoteObject;
  onPress: () => void;
  onUnpin: () => void;
}) {
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

  // Swipe actions - left swipe reveals unpin
  const leftActions: SwipeAction[] = [
    {
      id: 'unpin',
      icon: PinOff,
      label: 'Unpin',
      color: 'gray',
      onAction: onUnpin,
    },
  ];

  return (
    <SwipeableRow leftActions={leftActions} onPress={onPress}>
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

/**
 * MobilePinnedView - View for displaying pinned objects
 */
export function MobilePinnedView() {
  const { navigateToObject } = useNavigation();
  const { pinnedObjects, unpin, count } = usePinnedObjects();
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();

  const handleUnpin = useCallback(
    (objectId: string) => {
      haptics.notification('success');
      unpin(objectId);
    },
    [unpin, haptics]
  );

  const handlePress = useCallback(
    (objectId: string) => {
      navigateToObject(objectId);
    },
    [navigateToObject]
  );

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Pinned" count={count} showBack="auto" />

      <ScrollArea style={{ flex: 1 }}>
        {pinnedObjects.length === 0 ? (
          <EmptyState
            icon={Pin}
            title="No pinned items"
            description="Pin your favorite objects for quick access. Swipe right on any item and tap Pin."
          />
        ) : (
          <AnimatePresence mode="popLayout">
            {pinnedObjects.map((item) => (
              <motion.div
                key={item.id}
                layout={!reduceMotion}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
              >
                <PinnedItemRow
                  item={item}
                  onPress={() => handlePress(item.id)}
                  onUnpin={() => handleUnpin(item.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </ScrollArea>
    </Stack>
  );
}
