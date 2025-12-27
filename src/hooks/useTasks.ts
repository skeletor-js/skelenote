/**
 * Hook for querying and managing tasks with filtering and sorting
 */

import { useMemo, useCallback } from 'react';
import { useObjects } from '@/contexts';
import { BuiltInTypeIds, type SkelenoteObject, type PropertyValue } from '@/lib/types';
import {
  type TaskFilter,
  getTaskFilter,
  getDefaultSort,
  sortTasks,
} from '@/lib/tasks/filters';
import { prepareNextRecurringTask } from '@/lib/tasks/recurrence';
import { removeMentionsFromContent } from '@/lib/editor';

export interface UseTasksOptions {
  /** Which task view filter to apply */
  filter: TaskFilter;
}

export interface UseTasksResult {
  /** Filtered and sorted tasks */
  tasks: SkelenoteObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Toggle a task between todo and done status */
  toggleComplete: (taskId: string) => void;
  /** Update task properties */
  updateTask: (taskId: string, properties: Record<string, PropertyValue>) => void;
  /** Delete a task and clean up mentions */
  deleteTask: (taskId: string) => void;
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

  // Delete a task and clean up mentions
  const deleteTask = useCallback(
    (taskId: string) => {
      if (!store) return;

      // Clean up mentions of this task in other objects' content
      const allObjects = store.getAll();
      for (const obj of allObjects) {
        if (obj.id === taskId) continue;
        try {
          const content = store.getContent(obj.id);
          if (content) {
            const cleanedContent = removeMentionsFromContent(content, taskId);
            if (cleanedContent) {
              store.setContent(obj.id, cleanedContent);
            }
          }
        } catch {
          // Skip objects without content
        }
      }

      // Delete the task
      store.delete(taskId);
      refreshData();
    },
    [store, refreshData]
  );

  return {
    tasks,
    isLoading,
    toggleComplete,
    updateTask,
    deleteTask,
  };
}
