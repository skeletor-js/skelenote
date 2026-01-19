/**
 * Hook for querying and managing tasks with filtering and sorting
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useObjects, useAnalyticsSafe } from '@/contexts';
import {
  BuiltInTypeIds,
  type SkelenoteObject,
  type PropertyValue,
} from '@/lib/types';
import {
  type TaskFilter,
  getTaskFilter,
  getDefaultSort,
  sortTasks,
  filterTasksByDate,
} from '@/lib/tasks/filters';
import { prepareNextRecurringTask } from '@/lib/tasks/recurrence';
import { removeMentionsFromContent } from '@/lib/editor';
import { cancelReminder } from '@/lib/notifications';
import { AnalyticsEvents } from '@/lib/analytics';

/** Default number of items to load per page */
const PAGE_SIZE = 50;

export interface UseTasksOptions {
  /** Which task view filter to apply (mutually exclusive with date) */
  filter?: TaskFilter;
  /** Filter by specific date (mutually exclusive with filter) */
  date?: Date;
}

export interface UseTasksResult {
  /** Paginated filtered and sorted tasks */
  tasks: SkelenoteObject[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Total number of tasks matching the filter (before pagination) */
  totalCount: number;
  /** Whether there are more tasks to load */
  hasMore: boolean;
  /** Load more tasks */
  loadMore: () => void;
  /** Toggle a task between todo and done status */
  toggleComplete: (taskId: string) => void;
  /** Update task properties */
  updateTask: (
    taskId: string,
    properties: Record<string, PropertyValue>
  ) => void;
  /** Archive a task (hide from default views) */
  archiveTask: (taskId: string) => void;
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
export function useTasks(options: UseTasksOptions = {}): UseTasksResult {
  const { store, isLoading, refreshData, dataVersion } = useObjects();
  const analytics = useAnalyticsSafe();
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Reset pagination when filter or date changes
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [options.filter, options.date]);

  // Get all tasks and filter/sort them
  const allTasks = useMemo(() => {
    if (!store) return [];

    const tasks = store.getByType(BuiltInTypeIds.TASK);

    // If filtering by specific date
    if (options.date) {
      const filtered = filterTasksByDate(tasks, options.date);
      // Sort by priority (like today view)
      return sortTasks(filtered, { field: 'priority', direction: 'desc' });
    }

    // If filtering by task filter type
    if (options.filter) {
      const filterFn = getTaskFilter(options.filter);
      const sortConfig = getDefaultSort(options.filter);
      const filtered = tasks.filter(filterFn);
      return sortTasks(filtered, sortConfig);
    }

    // No filter specified - return all tasks
    return tasks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, options.filter, options.date, dataVersion]);

  // Paginate tasks
  const tasks = useMemo(() => allTasks.slice(0, limit), [allTasks, limit]);

  // Pagination helpers
  const totalCount = allTasks.length;
  const hasMore = limit < totalCount;
  const loadMore = useCallback(() => {
    setLimit((prev) => prev + PAGE_SIZE);
  }, []);

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

        // Cancel any pending reminder for this task
        cancelReminder(taskId);

        // Track task completion
        const dueDate = task.properties.dueDate as number | undefined;
        const now = Date.now();
        const daysOverdue = dueDate
          ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
          : undefined;

        analytics?.track(AnalyticsEvents.TASK_COMPLETED, {
          had_recurrence: !!nextTaskProperties,
          days_overdue: daysOverdue,
        });
      }

      // Update the current task's status
      store.setProperty(taskId, 'status', newStatus);
      refreshData();
    },
    [store, refreshData, analytics]
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

  // Archive a task
  const archiveTask = useCallback(
    (taskId: string) => {
      if (!store) return;
      store.archive(taskId);
      refreshData();
      analytics?.track(AnalyticsEvents.OBJECT_ARCHIVED, {
        object_type: BuiltInTypeIds.TASK,
      });
    },
    [store, refreshData, analytics]
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

      // Cancel any pending reminder for this task
      cancelReminder(taskId);

      // Delete the task
      store.delete(taskId);
      refreshData();
      analytics?.track(AnalyticsEvents.OBJECT_DELETED, {
        object_type: BuiltInTypeIds.TASK,
      });
    },
    [store, refreshData, analytics]
  );

  return {
    tasks,
    isLoading,
    totalCount,
    hasMore,
    loadMore,
    toggleComplete,
    updateTask,
    archiveTask,
    deleteTask,
  };
}
