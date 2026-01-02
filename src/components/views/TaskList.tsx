/**
 * TaskList - displays tasks in a list format
 */

import { Stack } from '@mantine/core';
import type { SkelenoteObject } from '@/lib/types';
import { useNavigation } from '@/contexts';
import { EmptyState } from '@/components/ui';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  /** Tasks to display */
  tasks: SkelenoteObject[];
  /** Callback when task completion is toggled */
  onToggleComplete: (taskId: string) => void;
  /** Callback when task is archived */
  onArchiveTask?: (taskId: string) => void;
  /** Message to show when list is empty */
  emptyMessage?: string;
  /** Check if a task is selected */
  isSelected?: (id: string) => boolean;
  /** Callback when selection changes */
  onSelectionChange?: (id: string, shiftKey: boolean) => void;
  /** Whether any item is selected (selecting mode) */
  hasSelection?: boolean;
}

export function TaskList({
  tasks,
  onToggleComplete,
  onArchiveTask,
  emptyMessage = 'No tasks',
  isSelected,
  onSelectionChange,
  hasSelection = false,
}: TaskListProps) {
  const { navigateToObject, openInSplit } = useNavigation();

  if (tasks.length === 0) {
    return <EmptyState message={emptyMessage} size="large" />;
  }

  return (
    <Stack gap={2}>
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onArchive={onArchiveTask}
          onClick={() => navigateToObject(task.id)}
          onOpenInSplit={() => openInSplit(task.id)}
          isSelected={isSelected?.(task.id)}
          onSelectionChange={onSelectionChange}
          isSelectingMode={hasSelection}
        />
      ))}
    </Stack>
  );
}
