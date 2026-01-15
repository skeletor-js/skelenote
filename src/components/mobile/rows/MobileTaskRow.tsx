/**
 * Mobile-optimized task row with swipe actions
 */

import { useMemo, useCallback } from 'react';
import { Text, Group, Stack, Badge, Box, Checkbox } from '@mantine/core';
import { CheckCircle, Circle, Archive, Flag } from 'lucide-react';
import { SwipeableRow, type SwipeAction } from '../primitives';
import type { SkelenoteObject } from '@/lib/types';
import { useObjects } from '@/contexts';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';

interface MobileTaskRowProps {
  task: SkelenoteObject;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleComplete: (taskId: string) => void;
  onArchive: (taskId: string) => void;
}

// Priority colors
const priorityColors: Record<string, string> = {
  urgent: 'var(--mantine-color-brick-5, #9B3D3D)',
  high: 'var(--mantine-color-ember-5, #B85C50)',
  medium: 'var(--mantine-color-ochre-5, #B8860B)',
  low: 'var(--mantine-color-slate-5, #64748B)',
};

export function MobileTaskRow({
  task,
  onPress,
  onLongPress,
  onToggleComplete,
  onArchive,
}: MobileTaskRowProps) {
  const { store } = useObjects();

  const status = task.properties.status as string | undefined;
  const isComplete = status === 'done';
  const title = (task.properties.title ?? 'Untitled') as string;
  const priority = task.properties.priority as string | undefined;
  const dueDate = task.properties.dueDate as number | null;
  const projectId = task.properties.project as string | null;

  // Get project name
  const projectName = useMemo(() => {
    if (!projectId || !store) return null;
    const project = store.get(projectId);
    return project?.properties.name as string | null;
  }, [projectId, store]);

  // Format due date
  const dateInfo = useMemo(() => {
    if (!dueDate) return null;
    return {
      text: formatRelativeDate(dueDate),
      isOverdue: isOverdue(dueDate) && !isComplete,
    };
  }, [dueDate, isComplete]);

  // Handle checkbox click (prevent row tap)
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComplete(task.id);
    },
    [task.id, onToggleComplete]
  );

  // Swipe actions
  const leftActions: SwipeAction[] = [
    {
      id: 'complete',
      icon: isComplete ? Circle : CheckCircle,
      label: isComplete ? 'Undo' : 'Done',
      color: 'sage',
      onAction: () => onToggleComplete(task.id),
    },
  ];

  const rightActions: SwipeAction[] = [
    {
      id: 'archive',
      icon: Archive,
      label: 'Archive',
      color: 'gray',
      onAction: () => onArchive(task.id),
    },
  ];

  const priorityColor = priority ? priorityColors[priority] : undefined;
  const showPriority = priority && priority !== 'none';

  return (
    <SwipeableRow
      leftActions={leftActions}
      rightActions={rightActions}
      onPress={onPress}
      onLongPress={onLongPress}
      priority={priority as 'urgent' | 'high' | 'medium' | 'low' | null}
    >
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
        {/* Checkbox */}
        <Box onClick={handleCheckboxClick} style={{ flexShrink: 0 }}>
          <Checkbox
            checked={isComplete}
            onChange={() => {}}
            size="md"
            radius="xl"
            styles={{
              input: {
                cursor: 'pointer',
              },
            }}
          />
        </Box>

        {/* Title and metadata */}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text
            size="sm"
            fw={500}
            truncate
            style={{
              textDecoration: isComplete ? 'line-through' : 'none',
              opacity: isComplete ? 0.6 : 1,
            }}
          >
            {title}
          </Text>
          <Group gap="xs" wrap="nowrap">
            {/* Project badge */}
            {projectName && (
              <Badge size="xs" variant="light" color="gray">
                {projectName}
              </Badge>
            )}
            {/* Due date */}
            {dateInfo && (
              <Text size="xs" c={dateInfo.isOverdue ? 'brick' : 'dimmed'}>
                {dateInfo.text}
              </Text>
            )}
          </Group>
        </Stack>

        {/* Priority indicator */}
        {showPriority && (
          <Flag
            size={14}
            fill={priorityColor}
            style={{
              color: priorityColor,
              flexShrink: 0,
            }}
          />
        )}
      </Group>
    </SwipeableRow>
  );
}
