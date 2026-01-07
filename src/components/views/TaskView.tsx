/**
 * TaskView - main container for task views
 * Displays tasks in a list format
 */

import { useMemo, useCallback, useEffect } from 'react';
import { Stack, Text, Box, Loader, Center } from '@mantine/core';
import { useTasks, useSelection } from '@/hooks';
import { useObjects } from '@/contexts';
import type { TaskFilter } from '@/lib/tasks/filters';
import { BulkActions } from '@/components/actions';
import { ViewHeader } from '@/components/ui';
import { TaskList } from './TaskList';

interface TaskViewProps {
  /** Which filter to apply */
  filter: TaskFilter;
  /** View title to display */
  title: string;
}

/** Empty state messages for each filter */
const EMPTY_MESSAGES: Record<TaskFilter, string> = {
  today: 'No tasks due today.',
  'this-week': 'No tasks due this week.',
  overdue: 'Nothing overdue. Nice!',
  waiting: 'No tasks waiting on others.',
  eventually: 'No future tasks scheduled.',
  completed: 'No completed tasks yet.',
};

export function TaskView({ filter, title }: TaskViewProps) {
  const { tasks, isLoading, toggleComplete, archiveTask } = useTasks({
    filter,
  });
  const { refreshData } = useObjects();

  // Get task IDs for selection hook
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  // Initialize selection
  const selection = useSelection({ allItems: taskIds });

  // Handle selection change (toggle or range)
  const handleSelectionChange = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey) {
        selection.selectRange(id);
      } else {
        selection.toggle(id);
      }
    },
    [selection]
  );

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Only handle if focus is in the task view area
        const activeElement = document.activeElement;
        if (activeElement?.closest('[data-task-view]')) {
          e.preventDefault();
          selection.selectAll();
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape' && selection.hasSelection) {
        e.preventDefault();
        selection.clear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection]);

  if (isLoading) {
    return (
      <Center p="xl">
        <Loader size="sm" />
        <Text ml="sm" c="dimmed">
          Loading...
        </Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }} data-task-view>
      <ViewHeader
        title={title}
        icon="list-checks"
        count={tasks.length > 0 ? tasks.length : undefined}
      />
      <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
        <TaskList
          tasks={tasks}
          onToggleComplete={toggleComplete}
          onArchiveTask={archiveTask}
          emptyMessage={EMPTY_MESSAGES[filter]}
          isSelected={selection.isSelected}
          onSelectionChange={handleSelectionChange}
          hasSelection={selection.hasSelection}
        />
      </Box>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedIds={selection.selectedArray}
        onClearSelection={selection.clear}
        onActionComplete={refreshData}
        viewType="tasks"
      />
    </Stack>
  );
}
