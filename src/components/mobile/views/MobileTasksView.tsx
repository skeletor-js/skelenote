/**
 * Mobile-optimized Tasks View
 * Features: horizontal filter tabs, swipeable task rows, pull-to-refresh, FAB for new task
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  Box,
  Button,
  Group,
  Badge,
  ScrollArea,
  Center,
  Loader,
  Text,
} from '@mantine/core';
import { Plus, CheckCircle } from 'lucide-react';
import { useTasks } from '@/hooks';
import { useNavigation } from '@/contexts';
import {
  MobileViewHeader,
  PullToRefresh,
  FAB,
  ActionSheet,
  type ActionSheetItem,
} from '../primitives';
import { MobileTaskRow } from '../rows';
import type { SkelenoteObject } from '@/lib/types';
import type { TaskFilter } from '@/lib/tasks/filters';
import { Archive, Trash2, Calendar, Flag, Folder } from 'lucide-react';

interface FilterTab {
  id: TaskFilter;
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This Week' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'eventually', label: 'Eventually' },
  { id: 'completed', label: 'Done' },
];

const EMPTY_MESSAGES: Record<TaskFilter, string> = {
  today: 'No tasks due today. Enjoy your day!',
  'this-week': 'No tasks due this week.',
  overdue: 'No overdue tasks. Great job!',
  waiting: 'No waiting tasks.',
  eventually: 'No tasks scheduled for later.',
  completed: 'No completed tasks yet.',
};

export function MobileTasksView() {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('today');
  const { tasks, isLoading, toggleComplete, archiveTask, deleteTask } =
    useTasks({ filter: activeFilter });
  const { navigateToObject } = useNavigation();

  // Action sheet state for long-press menu
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SkelenoteObject | null>(
    null
  );

  // Get task counts for each filter
  const { tasks: todayTasks } = useTasks({ filter: 'today' });
  const { tasks: weekTasks } = useTasks({ filter: 'this-week' });
  const { tasks: overdueTasks } = useTasks({ filter: 'overdue' });
  const { tasks: waitingTasks } = useTasks({ filter: 'waiting' });

  const filterCounts: Record<TaskFilter, number> = useMemo(
    () => ({
      today: todayTasks.length,
      'this-week': weekTasks.length,
      overdue: overdueTasks.length,
      waiting: waitingTasks.length,
      eventually: 0, // Not shown
      completed: 0, // Not shown
    }),
    [
      todayTasks.length,
      weekTasks.length,
      overdueTasks.length,
      waitingTasks.length,
    ]
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Long press handler
  const handleLongPress = useCallback((task: SkelenoteObject) => {
    setSelectedTask(task);
    setActionSheetOpen(true);
  }, []);

  // New task handler
  const handleNewTask = useCallback(() => {
    // TODO: Open quick add task sheet
    console.log('New task');
  }, []);

  // Action sheet items
  const actionSheetItems: ActionSheetItem[] = selectedTask
    ? [
        {
          id: 'complete',
          label:
            selectedTask.properties.status === 'done'
              ? 'Mark Incomplete'
              : 'Mark Complete',
          icon: CheckCircle,
          onAction: () => toggleComplete(selectedTask.id),
        },
        {
          id: 'reschedule',
          label: 'Reschedule',
          icon: Calendar,
          onAction: () => {
            // TODO: Open date picker
          },
        },
        {
          id: 'priority',
          label: 'Set Priority',
          icon: Flag,
          onAction: () => {
            // TODO: Open priority picker
          },
        },
        {
          id: 'project',
          label: 'Move to Project',
          icon: Folder,
          onAction: () => {
            // TODO: Open project picker
          },
        },
        {
          id: 'archive',
          label: 'Archive',
          icon: Archive,
          onAction: () => archiveTask(selectedTask.id),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'danger',
          onAction: () => deleteTask(selectedTask.id),
        },
      ]
    : [];

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Tasks" showSync />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Tasks" showSync />

      {/* Filter tabs */}
      <Box
        px="sm"
        py="sm"
        style={{
          backgroundColor: 'var(--surface-paper)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <ScrollArea scrollbarSize={0} type="scroll" offsetScrollbars={false}>
          <Group gap="xs" wrap="nowrap">
            {FILTER_TABS.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = filterCounts[filter.id];
              const showCount =
                count > 0 &&
                ['today', 'this-week', 'overdue', 'waiting'].includes(
                  filter.id
                );

              return (
                <Button
                  key={filter.id}
                  variant={isActive ? 'filled' : 'subtle'}
                  color={isActive ? 'ember' : 'gray'}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  styles={{
                    root: {
                      flexShrink: 0,
                      paddingLeft: 12,
                      paddingRight: showCount ? 8 : 12,
                    },
                  }}
                >
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm">{filter.label}</Text>
                    {showCount && (
                      <Badge
                        size="xs"
                        variant={isActive ? 'white' : 'light'}
                        color={isActive ? undefined : 'gray'}
                      >
                        {count}
                      </Badge>
                    )}
                  </Group>
                </Button>
              );
            })}
          </Group>
        </ScrollArea>
      </Box>

      {/* Task list */}
      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {tasks.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <CheckCircle
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {EMPTY_MESSAGES[activeFilter]}
              </Text>
            </Stack>
          ) : (
            // Task list
            <Stack gap={0}>
              {tasks.map((task) => (
                <MobileTaskRow
                  key={task.id}
                  task={task}
                  onPress={() => navigateToObject(task.id)}
                  onLongPress={() => handleLongPress(task)}
                  onToggleComplete={toggleComplete}
                  onArchive={archiveTask}
                />
              ))}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* FAB for new task */}
      <FAB icon={Plus} label="New task" onClick={handleNewTask} />

      {/* Action sheet */}
      <ActionSheet
        opened={actionSheetOpen}
        onClose={() => {
          setActionSheetOpen(false);
          setSelectedTask(null);
        }}
        title={selectedTask?.properties.title as string | undefined}
        actions={actionSheetItems}
      />
    </Stack>
  );
}
