/**
 * DayTasksSection - Shows tasks due on a specific date
 * Used in DailyNotesView to display tasks for the selected day
 */

import { useState, useCallback } from 'react';
import { Collapse, Stack, Group, Text, Box } from '@mantine/core';
import { useTasks } from '@/hooks';
import { useNavigation } from '@/contexts/NavigationContext';
import { TaskRow } from '@/components/views/TaskRow';
import { EmptyState, Icon } from '@/components/ui';

interface DayTasksSectionProps {
  /** The date to show tasks for */
  date: Date;
}

export function DayTasksSection({ date }: DayTasksSectionProps) {
  const { navigateToObject, openInSplit } = useNavigation();
  const { tasks, toggleComplete, archiveTask } = useTasks({ date });
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default

  const taskCount = tasks.length;

  // Handle row click - navigate to task detail
  // Cmd+click handled within TaskRow via onOpenInSplit
  const handleTaskClick = useCallback(
    (taskId: string) => {
      navigateToObject(taskId);
    },
    [navigateToObject]
  );

  // Handle open in split pane
  const handleOpenInSplit = useCallback(
    (taskId: string) => {
      openInSplit(taskId);
    },
    [openInSplit]
  );

  return (
    <Box component="section">
      <Group
        gap="xs"
        py="xs"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <Icon
          name="chevron-right"
          size={14}
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <Text size="sm" c="dimmed" fw={500}>
          Tasks Due{taskCount > 0 && ` (${taskCount})`}
        </Text>
      </Group>

      <Collapse in={isExpanded}>
        <Stack gap={0} pl="md">
          {tasks.length === 0 ? (
            <EmptyState message="No tasks due this day" size="small" />
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleComplete={toggleComplete}
                onClick={() => handleTaskClick(task.id)}
                onOpenInSplit={() => handleOpenInSplit(task.id)}
                onArchive={archiveTask}
              />
            ))
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
