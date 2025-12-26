/**
 * Hook for querying and managing tasks with filtering and sorting
 */

import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds, type EphemeraObject, type PropertyValue } from '@/lib/types';
import {
  type TaskFilter,
  getTaskFilter,
  getDefaultSort,
  sortTasks,
} from '@/lib/tasks/filters';
import { prepareNextRecurringTask } from '@/lib/tasks/recurrence';

export interface UseTasksOptions {
  /** Which task view filter to apply */
  filter: TaskFilter;
}

export interface UseTasksResult {
  /** Filtered and sorted tasks */
  tasks: EphemeraObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Toggle a task between todo and done status */
  toggleComplete: (taskId: string) => void;
  /** Update task properties */
  updateTask: (taskId: string, properties: Record<string, PropertyValue>) => void;
  /** Reorder a task relative to another task */
  reorderTask: (taskId: string, targetId: string, position: 'above' | 'below') => void;
}

/**
 * Hook for querying and managing tasks
 *
 * @example
 * ```tsx
 * const { tasks, toggleComplete } = useTasks({ filter: 'today' });
 *
 * return (
 *   <ul>
 *     {tasks.map(task => (
 *       <li key={task.id}>
 *         <input
 *           type="checkbox"
 *           checked={task.properties.status === 'done'}
 *           onChange={() => toggleComplete(task.id)}
 *         />
 *         {task.properties.title}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useTasks(options: UseTasksOptions): UseTasksResult {
  const { store, isLoading, refreshData } = useObjects();

  // Get all tasks and filter/sort them
  const tasks = useMemo(() => {
    if (!store) return [];

    const allTasks = store.getByType(BuiltInTypeIds.TASK);
    const filterFn = getTaskFilter(options.filter);
    const sortConfig = getDefaultSort(options.filter);

    const filtered = allTasks.filter(filterFn);
    let sorted = sortTasks(filtered, sortConfig);

    // Apply secondary sort by sortOrder if present
    // Tasks with sortOrder come first (in order), then unsorted tasks
    sorted = sorted.sort((a, b) => {
      const orderA = a.properties.sortOrder as number | null;
      const orderB = b.properties.sortOrder as number | null;

      // If both have sortOrder, sort by it
      if (orderA !== null && orderB !== null) {
        return orderA - orderB;
      }
      // If only one has sortOrder, it comes first
      if (orderA !== null) return -1;
      if (orderB !== null) return 1;
      // Neither has sortOrder, keep original order
      return 0;
    });

    return sorted;
  }, [store, options.filter]);

  // Toggle task completion
  const toggleComplete = useCallback(
    (taskId: string) => {
      if (!store) return;

      const task = store.get(taskId);
      if (!task) return;

      const currentStatus = task.properties.status as string;
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';

      if (newStatus === 'done') {
        // Check if this is a recurring task
        const nextTaskProperties = prepareNextRecurringTask(task);

        if (nextTaskProperties) {
          // This is a recurring task - create the next instance
          store.create({
            typeId: BuiltInTypeIds.TASK,
            properties: nextTaskProperties,
            inboxed: false,
          });
        }
      }

      // Update the current task's status
      store.setProperty(taskId, 'status', newStatus);
      refreshData();
    },
    [store, refreshData]
  );

  // Update task properties
  const updateTask = useCallback(
    (taskId: string, properties: Record<string, PropertyValue>) => {
      if (!store) return;

      const task = store.get(taskId);
      if (!task) return;

      store.update(taskId, { properties });
      refreshData();
    },
    [store, refreshData]
  );

  // Reorder task relative to another task
  const reorderTask = useCallback(
    (taskId: string, targetId: string, position: 'above' | 'below') => {
      if (!store) return;
      if (taskId === targetId) return;

      // Find current task order in the list
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      const targetIndex = tasks.findIndex((t) => t.id === targetId);

      if (taskIndex === -1 || targetIndex === -1) return;

      // Calculate new sort orders
      // We'll assign sort orders to all visible tasks to ensure consistent ordering
      const newOrder: { id: string; sortOrder: number }[] = [];
      let insertIndex = position === 'above' ? targetIndex : targetIndex + 1;

      // Adjust insert index if moving forward (account for removal of task)
      if (taskIndex < insertIndex) {
        insertIndex -= 1;
      }

      // Build new order by removing task and inserting at new position
      const tasksWithoutDragged = tasks.filter((t) => t.id !== taskId);
      tasksWithoutDragged.splice(insertIndex, 0, tasks[taskIndex]);

      // Assign new sort orders (use index * 1000 to leave room for future insertions)
      tasksWithoutDragged.forEach((task, index) => {
        newOrder.push({ id: task.id, sortOrder: (index + 1) * 1000 });
      });

      // Update all tasks with new sort orders
      for (const item of newOrder) {
        store.setProperty(item.id, 'sortOrder', item.sortOrder);
      }

      refreshData();
    },
    [store, tasks, refreshData]
  );

  return {
    tasks,
    isLoading,
    toggleComplete,
    updateTask,
    reorderTask,
  };
}
