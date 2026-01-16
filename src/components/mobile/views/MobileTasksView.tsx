/**
 * Mobile-optimized Tasks View
 * Features: horizontal filter tabs, swipeable task rows, pull-to-refresh, header button for new task
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stack,
  Box,
  Group,
  Badge,
  ScrollArea,
  Center,
  Loader,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { CheckCircle, Tag, Layers, Repeat, Copy, Bell } from 'lucide-react';
import { useTasks, useSelection, useDuplicate } from '@/hooks';
import {
  useNavigation,
  useObjects,
  useTypeRegistry,
  useToast,
} from '@/contexts';
import {
  MobileViewHeader,
  PullToRefresh,
  ActionSheet,
  ConfirmDialog,
  SelectionToolbar,
  type ActionSheetItem,
} from '../primitives';
import { MobileTaskRow } from '../rows';
import {
  DueDateSheet,
  ReminderSheet,
  PriorityPickerSheet,
  RelationPickerSheet,
  BulkActionsSheet,
  TagPickerSheet,
  AreaPickerSheet,
  RecurrenceSheet,
  type BulkActionType,
} from '../sheets';
import type { SkelenoteObject } from '@/lib/types';
import { BuiltInTypeIds } from '@/lib/types';
import type { TaskFilter } from '@/lib/tasks/filters';
import { Archive, Trash2, Calendar, Flag, Folder } from 'lucide-react';
import { useHaptics, useReducedMotion, useUndoToast } from '@/hooks';
import { springs, listItem } from '@/lib/animations';

interface FilterTab {
  id: TaskFilter;
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
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
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { notification, selection: selectionHaptic } = useHaptics();
  const reduceMotion = useReducedMotion();
  const { showArchiveUndo, showDeleteUndo } = useUndoToast();
  const { addToast } = useToast();
  const { duplicate } = useDuplicate();

  // Selection mode state
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const selection = useSelection({ allItems: taskIds });
  const [bulkActionsSheetOpen, setBulkActionsSheetOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Action sheet state for long-press menu
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SkelenoteObject | null>(
    null
  );

  // Sheet states
  const [dueDateSheetOpen, setDueDateSheetOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [prioritySheetOpen, setPrioritySheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);
  const [recurrenceSheetOpen, setRecurrenceSheetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Get task counts for each filter (only for tabs we show)
  const { tasks: todayTasks } = useTasks({ filter: 'today' });
  const { tasks: weekTasks } = useTasks({ filter: 'this-week' });
  const { tasks: overdueTasks } = useTasks({ filter: 'overdue' });

  const filterCounts: Partial<Record<TaskFilter, number>> = useMemo(
    () => ({
      today: todayTasks.length,
      'this-week': weekTasks.length,
      overdue: overdueTasks.length,
    }),
    [todayTasks.length, weekTasks.length, overdueTasks.length]
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    // Small delay for animation feel
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

  // Long press handler - enters selection mode or shows action sheet
  const handleLongPress = useCallback(
    async (task: SkelenoteObject) => {
      if (!selection.hasSelection) {
        // Enter selection mode with haptic feedback
        await notification('success');
        selection.toggle(task.id);
      } else {
        // Already in selection mode, show action sheet
        setSelectedTask(task);
        setActionSheetOpen(true);
      }
    },
    [selection, notification]
  );

  // Archive task with undo toast
  const handleArchiveTask = useCallback(
    (task: SkelenoteObject) => {
      archiveTask(task.id);
      showArchiveUndo(task);
    },
    [archiveTask, showArchiveUndo]
  );

  // Archive task by ID (for MobileTaskRow)
  const handleArchiveTaskById = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        handleArchiveTask(task);
      }
    },
    [tasks, handleArchiveTask]
  );

  // Delete confirmation handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedTask) return;
    await notification('warning');
    showDeleteUndo(selectedTask);
    deleteTask(selectedTask.id);
    setDeleteConfirmOpen(false);
    setSelectedTask(null);
  }, [selectedTask, deleteTask, notification, showDeleteUndo]);

  // Due date change handler
  const handleDueDateChange = useCallback(
    (date: number | null) => {
      if (!selectedTask || !store) return;
      store.update(selectedTask.id, { properties: { dueDate: date } });
      refreshData();
      setDueDateSheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Reminder time change handler
  const handleReminderChange = useCallback(
    (time: number | null) => {
      if (!selectedTask || !store) return;
      store.update(selectedTask.id, { properties: { reminderTime: time } });
      refreshData();
      setReminderSheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Priority change handler
  const handlePriorityChange = useCallback(
    (priority: string | null) => {
      if (!selectedTask || !store) return;
      store.update(selectedTask.id, {
        properties: { priority: priority ?? 'none' },
      });
      refreshData();
      setPrioritySheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Project change handler
  const handleProjectChange = useCallback(
    (value: string | string[] | null) => {
      if (!selectedTask || !store) return;
      const projectId = Array.isArray(value) ? value[0] : value;
      store.update(selectedTask.id, { properties: { project: projectId } });
      refreshData();
      setProjectSheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Tags change handler
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      if (!selectedTask || !store) return;
      store.setProperty(selectedTask.id, 'tags', tags);
      refreshData();
      setTagSheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Area change handler
  const handleAreaChange = useCallback(
    (area: string | null) => {
      if (!selectedTask || !store) return;
      store.setProperty(selectedTask.id, 'area', area);
      refreshData();
      setAreaSheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Recurrence change handler
  const handleRecurrenceChange = useCallback(
    (recurrence: string | null) => {
      if (!selectedTask || !store) return;
      store.setProperty(selectedTask.id, 'recurrence', recurrence);
      refreshData();
      setRecurrenceSheetOpen(false);
    },
    [selectedTask, store, refreshData]
  );

  // Duplicate handler
  const handleDuplicate = useCallback(
    (task: SkelenoteObject) => {
      const duplicated = duplicate(task.id);
      if (duplicated) {
        addToast({ message: 'Task duplicated', type: 'success' });
      }
      setActionSheetOpen(false);
    },
    [duplicate, addToast]
  );

  // Get project property definition for RelationPickerSheet
  const projectProperty = useMemo(() => {
    const taskType = typeRegistry.get(BuiltInTypeIds.TASK);
    return taskType?.schema.find((p) => p.id === 'project') ?? null;
  }, [typeRegistry]);

  // Bulk action handler
  const handleBulkAction = useCallback(
    async (action: BulkActionType) => {
      if (!store || selection.selectedCount === 0) return;

      setBulkActionLoading(true);

      try {
        const selectedIds = selection.selectedArray;

        switch (action) {
          case 'archive':
            for (const id of selectedIds) {
              archiveTask(id);
            }
            addToast({
              type: 'success',
              message: `Archived ${selectedIds.length} task${selectedIds.length !== 1 ? 's' : ''}`,
            });
            break;

          case 'delete':
            // Show confirmation dialog
            setBulkActionsSheetOpen(false);
            setTimeout(() => setBulkDeleteConfirmOpen(true), 200);
            setBulkActionLoading(false);
            return; // Don't clear selection yet

          case 'priority-high':
          case 'priority-medium':
          case 'priority-low':
          case 'priority-none': {
            const priority = action.replace('priority-', '');
            for (const id of selectedIds) {
              store.update(id, { properties: { priority } });
            }
            refreshData();
            addToast({
              type: 'success',
              message: `Updated priority for ${selectedIds.length} task${selectedIds.length !== 1 ? 's' : ''}`,
            });
            break;
          }

          case 'project':
          case 'tag':
            // TODO: Open sub-sheet for project/tag selection
            addToast({
              type: 'info',
              message: 'Coming soon',
            });
            break;

          default:
            break;
        }

        // Clear selection and close sheet
        selection.clear();
        setBulkActionsSheetOpen(false);
      } finally {
        setBulkActionLoading(false);
      }
    },
    [store, selection, archiveTask, refreshData, addToast]
  );

  // Bulk delete confirmation handler
  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!store || selection.selectedCount === 0) return;

    await notification('warning');

    const selectedIds = selection.selectedArray;
    for (const id of selectedIds) {
      deleteTask(id);
    }

    addToast({
      type: 'success',
      message: `Deleted ${selectedIds.length} task${selectedIds.length !== 1 ? 's' : ''}`,
    });

    selection.clear();
    setBulkDeleteConfirmOpen(false);
  }, [store, selection, deleteTask, notification, addToast]);

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
            setActionSheetOpen(false);
            setTimeout(() => setDueDateSheetOpen(true), 200);
          },
        },
        {
          id: 'reminder',
          label: 'Set Reminder',
          icon: Bell,
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setReminderSheetOpen(true), 200);
          },
        },
        {
          id: 'priority',
          label: 'Set Priority',
          icon: Flag,
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setPrioritySheetOpen(true), 200);
          },
        },
        {
          id: 'project',
          label: 'Move to Project',
          icon: Folder,
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setProjectSheetOpen(true), 200);
          },
        },
        {
          id: 'tags',
          label: 'Add Tags',
          icon: Tag,
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setTagSheetOpen(true), 200);
          },
        },
        {
          id: 'area',
          label: 'Assign Area',
          icon: Layers,
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setAreaSheetOpen(true), 200);
          },
        },
        {
          id: 'recurrence',
          label: 'Set Recurrence',
          icon: Repeat,
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setRecurrenceSheetOpen(true), 200);
          },
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: Copy,
          onAction: () => handleDuplicate(selectedTask),
        },
        {
          id: 'archive',
          label: 'Archive',
          icon: Archive,
          onAction: () => handleArchiveTask(selectedTask),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'danger',
          onAction: () => {
            setActionSheetOpen(false);
            setTimeout(() => setDeleteConfirmOpen(true), 200);
          },
        },
      ]
    : [];

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Tasks" showSync showBack={false} />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Tasks" showSync showSearch showBack={false} />

      {/* Filter tabs with animated indicator */}
      <Box
        px="sm"
        py="sm"
        style={{
          backgroundColor: 'var(--surface-paper)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <ScrollArea scrollbarSize={0} type="scroll" offsetScrollbars={false}>
          <Group gap={4} wrap="nowrap">
            {FILTER_TABS.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = filterCounts[filter.id] ?? 0;
              const showCount =
                count > 0 &&
                ['today', 'this-week', 'overdue'].includes(filter.id);

              return (
                <UnstyledButton
                  key={filter.id}
                  onClick={async () => {
                    if (!isActive) {
                      await selectionHaptic();
                      setActiveFilter(filter.id);
                    }
                  }}
                  aria-selected={isActive}
                  role="tab"
                  style={{
                    position: 'relative',
                    padding: '8px 12px',
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                >
                  {/* Animated background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="task-tab-indicator"
                      transition={
                        reduceMotion ? { duration: 0 } : springs.snappy
                      }
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'var(--mantine-color-ember-5)',
                        borderRadius: 8,
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Tab content */}
                  <Group
                    gap={6}
                    wrap="nowrap"
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <Text
                      size="sm"
                      fw={isActive ? 500 : 400}
                      c={isActive ? 'white' : 'dimmed'}
                    >
                      {filter.label}
                    </Text>
                    {showCount && (
                      <Badge
                        size="xs"
                        variant={isActive ? 'white' : 'light'}
                        color={isActive ? undefined : 'gray'}
                        styles={{
                          root: {
                            color: isActive
                              ? 'var(--mantine-color-ember-5)'
                              : undefined,
                          },
                        }}
                      >
                        {count}
                      </Badge>
                    )}
                  </Group>
                </UnstyledButton>
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
            // Task list with AnimatePresence for smooth add/remove
            <Stack gap={0}>
              <AnimatePresence initial={false}>
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    variants={reduceMotion ? undefined : listItem}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ overflow: 'hidden' }}
                  >
                    <MobileTaskRow
                      task={task}
                      onPress={() => navigateToObject(task.id)}
                      onLongPress={() => handleLongPress(task)}
                      onToggleComplete={toggleComplete}
                      onArchive={handleArchiveTaskById}
                      selectionMode={selection.hasSelection}
                      isSelected={selection.isSelected(task.id)}
                      onToggleSelection={selection.toggle}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* Selection toolbar */}
      <SelectionToolbar
        count={selection.selectedCount}
        visible={selection.hasSelection}
        onClear={selection.clear}
        onActionsPress={() => setBulkActionsSheetOpen(true)}
      />

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

      {/* Due Date Sheet */}
      <DueDateSheet
        opened={dueDateSheetOpen}
        onClose={() => setDueDateSheetOpen(false)}
        value={(selectedTask?.properties.dueDate as number | null) ?? null}
        onSelect={handleDueDateChange}
      />

      {/* Reminder Sheet */}
      <ReminderSheet
        opened={reminderSheetOpen}
        onClose={() => setReminderSheetOpen(false)}
        value={(selectedTask?.properties.reminderTime as number | null) ?? null}
        dueDate={(selectedTask?.properties.dueDate as number | null) ?? null}
        onSelect={handleReminderChange}
      />

      {/* Priority Sheet */}
      <PriorityPickerSheet
        opened={prioritySheetOpen}
        onClose={() => setPrioritySheetOpen(false)}
        value={(selectedTask?.properties.priority as string | null) ?? null}
        onSelect={handlePriorityChange}
      />

      {/* Project Sheet */}
      <RelationPickerSheet
        opened={projectSheetOpen}
        onClose={() => setProjectSheetOpen(false)}
        property={projectProperty}
        value={(selectedTask?.properties.project as string | null) ?? null}
        onSave={handleProjectChange}
      />

      {/* Tag Picker Sheet */}
      <TagPickerSheet
        opened={tagSheetOpen}
        onClose={() => setTagSheetOpen(false)}
        value={(selectedTask?.properties.tags as string[]) ?? []}
        onSave={handleTagsChange}
      />

      {/* Area Picker Sheet */}
      <AreaPickerSheet
        opened={areaSheetOpen}
        onClose={() => setAreaSheetOpen(false)}
        value={(selectedTask?.properties.area as string) ?? null}
        onSave={handleAreaChange}
      />

      {/* Recurrence Sheet */}
      <RecurrenceSheet
        opened={recurrenceSheetOpen}
        onClose={() => setRecurrenceSheetOpen(false)}
        value={(selectedTask?.properties.recurrence as string) ?? null}
        onSave={handleRecurrenceChange}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        opened={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedTask(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        destructive
      />

      {/* Bulk Actions Sheet */}
      <BulkActionsSheet
        opened={bulkActionsSheetOpen}
        onClose={() => setBulkActionsSheetOpen(false)}
        count={selection.selectedCount}
        onAction={handleBulkAction}
        isLoading={bulkActionLoading}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        opened={bulkDeleteConfirmOpen}
        onClose={() => {
          setBulkDeleteConfirmOpen(false);
        }}
        onConfirm={handleBulkDeleteConfirm}
        title={`Delete ${selection.selectedCount} Task${selection.selectedCount !== 1 ? 's' : ''}`}
        message={`Are you sure you want to delete ${selection.selectedCount} task${selection.selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        destructive
      />
    </Stack>
  );
}
