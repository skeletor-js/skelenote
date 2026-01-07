/**
 * TasksView - Consolidated tasks view with tabbed filtering
 * Promotes Tasks to a primary navigation item with tabs for:
 * Today, This Week, Overdue, Waiting, Eventually, Completed
 *
 * Design: "Study with a Fireplace" - warm palette, high density, no cold blues
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Stack, Box, Tabs, Badge, Text, Center, Button } from '@mantine/core';
import { useTasks, useSelection } from '@/hooks';
import { useObjects } from '@/contexts';
import { type TaskFilter, getTaskFilter } from '@/lib/tasks/filters';
import { BulkActions } from '@/components/actions';
import { ViewHeader, Icon } from '@/components/ui';
import type { IconName } from '@/lib/icons';
import { TaskList } from './TaskList';
import classes from './TasksView.module.css';

/** Tab configuration with display labels */
const TASK_TABS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'eventually', label: 'Eventually' },
  { value: 'completed', label: 'Completed' },
];

/** Empty state configuration for each filter */
interface EmptyStateConfig {
  icon: IconName;
  title: string;
  message: string;
  action?: {
    label: string;
    targetTab: TaskFilter;
  };
}

const EMPTY_STATES: Record<TaskFilter, EmptyStateConfig> = {
  today: {
    icon: 'calendar-check',
    title: 'All clear for today',
    message: 'No tasks due today. Great work!',
    action: { label: 'View This Week', targetTab: 'this-week' },
  },
  'this-week': {
    icon: 'calendar-days',
    title: 'Nothing due this week',
    message: 'Your week is wide open.',
  },
  overdue: {
    icon: 'check-circle',
    title: 'Nothing overdue',
    message: "You're on top of everything. Nice!",
  },
  waiting: {
    icon: 'unlock',
    title: 'Nothing waiting',
    message: 'All systems go.',
  },
  eventually: {
    icon: 'inbox',
    title: 'No future tasks',
    message: 'Tasks without immediate due dates will appear here.',
  },
  completed: {
    icon: 'archive',
    title: 'No completed tasks yet',
    message: 'Completed tasks will appear here.',
  },
};

/** Tabs that should show count badges */
const TABS_WITH_COUNTS: Set<TaskFilter> = new Set([
  'today',
  'this-week',
  'overdue',
  'waiting',
]);

export function TasksView() {
  const [activeTab, setActiveTab] = useState<TaskFilter>('today');
  const { tasks, isLoading, toggleComplete, archiveTask } = useTasks({
    filter: activeTab,
  });
  const { refreshData, store } = useObjects();

  // Get counts for badge display
  const { countToday, countThisWeek, countOverdue, countWaiting } =
    useMemo(() => {
      if (!store) {
        return {
          countToday: 0,
          countThisWeek: 0,
          countOverdue: 0,
          countWaiting: 0,
        };
      }
      const allTasks = store.getByType('built-in:task');

      return {
        countToday: allTasks.filter(getTaskFilter('today')).length,
        countThisWeek: allTasks.filter(getTaskFilter('this-week')).length,
        countOverdue: allTasks.filter(getTaskFilter('overdue')).length,
        countWaiting: allTasks.filter(getTaskFilter('waiting')).length,
      };
    }, [store]);

  const getCountForTab = (tab: TaskFilter): number | undefined => {
    if (!TABS_WITH_COUNTS.has(tab)) return undefined;
    switch (tab) {
      case 'today':
        return countToday || undefined;
      case 'this-week':
        return countThisWeek || undefined;
      case 'overdue':
        return countOverdue || undefined;
      case 'waiting':
        return countWaiting || undefined;
      default:
        return undefined;
    }
  };

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

  // Handle tab change
  const handleTabChange = useCallback((value: string | null) => {
    if (value) {
      setActiveTab(value as TaskFilter);
    }
  }, []);

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const activeElement = document.activeElement;
        if (activeElement?.closest('[data-tasks-view]')) {
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

  // Total task count for header
  const totalCount = countToday + countThisWeek + countOverdue + countWaiting;

  // Empty state for current tab
  const emptyState = EMPTY_STATES[activeTab];

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }} data-tasks-view>
      <ViewHeader
        title="Tasks"
        count={totalCount > 0 ? totalCount : undefined}
      />

      {/* Sticky Tab Bar */}
      <Box className={classes.tabsContainer}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          classNames={{
            root: classes.tabsRoot,
            list: classes.tabsList,
            tab: classes.tab,
            panel: classes.tabPanel,
          }}
        >
          <Tabs.List aria-label="Task filters">
            {TASK_TABS.map(({ value, label }) => {
              const count = getCountForTab(value);
              const isOverdue = value === 'overdue' && count && count > 0;

              return (
                <Tabs.Tab
                  key={value}
                  value={value}
                  aria-label={count ? `${label}, ${count} tasks` : label}
                  rightSection={
                    count ? (
                      <Badge
                        size="xs"
                        variant="light"
                        color={isOverdue ? 'ochre' : 'gray'}
                        className={classes.badge}
                      >
                        {count}
                      </Badge>
                    ) : null
                  }
                >
                  {label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
      </Box>

      {/* Task List Content */}
      <Box className={classes.content}>
        {isLoading ? (
          <Center p="xl">
            <Text c="dimmed" size="sm">
              Loading tasks...
            </Text>
          </Center>
        ) : tasks.length === 0 ? (
          /* Empty State */
          <Center p="xl" style={{ minHeight: '300px' }}>
            <Stack align="center" gap="md">
              <Icon
                name={emptyState.icon}
                size={32}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Box style={{ textAlign: 'center' }}>
                <Text size="md" fw={600} mb="xs">
                  {emptyState.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {emptyState.message}
                </Text>
              </Box>
              {emptyState.action && (
                <Button
                  variant="subtle"
                  color="ember"
                  size="sm"
                  onClick={() => setActiveTab(emptyState.action!.targetTab)}
                >
                  {emptyState.action.label}
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onArchiveTask={archiveTask}
            emptyMessage={EMPTY_STATES[activeTab].message}
            isSelected={selection.isSelected}
            onSelectionChange={handleSelectionChange}
            hasSelection={selection.hasSelection}
          />
        )}
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
