/**
 * Mobile-optimized task row with swipe actions
 */

import { useMemo, useCallback } from 'react';
import { Text, Group, Stack, Badge } from '@mantine/core';
import { CheckCircle, Circle, Archive, Flag, Pin, PinOff } from 'lucide-react';
import {
  SwipeableRow,
  AnimatedCheckbox,
  type SwipeAction,
} from '../primitives';
import type { SkelenoteObject } from '@/lib/types';
import { useObjects } from '@/contexts';
import { usePinnedObjects } from '@/hooks';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';

interface MobileTaskRowProps {
  task: SkelenoteObject;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleComplete: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  /** Whether selection mode is active */
  selectionMode?: boolean;
  /** Whether this task is selected (in selection mode) */
  isSelected?: boolean;
  /** Called when selection should be toggled (in selection mode) */
  onToggleSelection?: (taskId: string) => void;
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
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}: MobileTaskRowProps) {
  const { store } = useObjects();
  const { isPinned, togglePin } = usePinnedObjects();

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

  // Handle checkbox toggle - different behavior in selection mode
  const handleCheckboxToggle = useCallback(() => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(task.id);
    } else {
      onToggleComplete(task.id);
    }
  }, [task.id, onToggleComplete, selectionMode, onToggleSelection]);

  // Handle row press - different behavior in selection mode
  const handlePress = useCallback(() => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(task.id);
    } else {
      onPress();
    }
  }, [task.id, onPress, selectionMode, onToggleSelection]);

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

  const taskIsPinned = isPinned(task.id);

  const rightActions: SwipeAction[] = [
    {
      id: 'pin',
      icon: taskIsPinned ? PinOff : Pin,
      label: taskIsPinned ? 'Unpin' : 'Pin',
      color: taskIsPinned ? 'gray' : 'ember',
      onAction: () => togglePin(task.id),
    },
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

  // Checkbox shows selection state in selection mode, completion state otherwise
  const checkboxChecked = selectionMode ? isSelected : isComplete;

  return (
    <SwipeableRow
      leftActions={selectionMode ? [] : leftActions}
      rightActions={selectionMode ? [] : rightActions}
      onPress={handlePress}
      onLongPress={selectionMode ? undefined : onLongPress}
      priority={priority as 'urgent' | 'high' | 'medium' | 'low' | null}
      style={{
        backgroundColor: isSelected
          ? 'var(--mantine-color-ember-0)'
          : undefined,
      }}
    >
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
        {/* Checkbox with animation + haptic feedback */}
        <AnimatedCheckbox
          checked={checkboxChecked}
          onChange={handleCheckboxToggle}
          size={22}
          checkedColor={
            selectionMode
              ? 'var(--mantine-color-ember-6)'
              : 'var(--mantine-color-sage-6)'
          }
          aria-label={
            selectionMode
              ? isSelected
                ? 'Deselect task'
                : 'Select task'
              : isComplete
                ? 'Mark task incomplete'
                : 'Mark task complete'
          }
        />

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
