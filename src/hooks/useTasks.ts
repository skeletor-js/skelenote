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
  groupTasksBy,
} from '@/lib/tasks/filters';

export interface UseTasksOptions {
  /** Which task view filter to apply */
  filter: TaskFilter;
  /** Optional grouping for kanban view */
  groupBy?: 'status' | 'project';
}

export interface UseTasksResult {
  /** Filtered and sorted tasks */
  tasks: EphemeraObject[];
  /** Tasks grouped by status or project (for kanban view) */
  groupedTasks: Map<string, EphemeraObject[]> | null;
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Toggle a task between todo and done status */
  toggleComplete: (taskId: string) => void;
  /** Update task properties */
  updateTask: (taskId: string, properties: Record<string, PropertyValue>) => void;
  /** Update task status (for drag and drop) */
  updateStatus: (taskId: string, status: string) => void;
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
    return sortTasks(filtered, sortConfig);
  }, [store, options.filter]);

  // Group tasks if requested
  const groupedTasks = useMemo(() => {
    if (!options.groupBy) return null;
    return groupTasksBy(tasks, options.groupBy);
  }, [tasks, options.groupBy]);

  // Toggle task completion
  const toggleComplete = useCallback(
    (taskId: string) => {
      if (!store) return;

      const task = store.get(taskId);
      if (!task) return;

      const currentStatus = task.properties.status as string;
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';

      // Check if task has recurrence
      const recurrence = task.properties.recurrence as string | null;

      if (newStatus === 'done' && recurrence) {
        // TODO: Handle recurring task completion in Commit 4
        // For now, just mark as done
        store.setProperty(taskId, 'status', newStatus);
      } else {
        store.setProperty(taskId, 'status', newStatus);
      }

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

  // Update task status (for drag and drop in kanban)
  const updateStatus = useCallback(
    (taskId: string, status: string) => {
      if (!store) return;

      store.setProperty(taskId, 'status', status);
      refreshData();
    },
    [store, refreshData]
  );

  return {
    tasks,
    groupedTasks,
    isLoading,
    toggleComplete,
    updateTask,
    updateStatus,
  };
}
