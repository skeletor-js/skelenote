/**
 * Task filtering and sorting functions for task views
 */

import type { SkelenoteObject } from '../types';
import {
  isToday,
  isOverdue,
  isThisWeek,
  isBeyondThisWeek,
  startOfDay,
  endOfDay,
} from '../utils/date';

/**
 * Task filter types matching sidebar navigation
 */
export type TaskFilter =
  | 'today'
  | 'this-week'
  | 'overdue'
  | 'waiting'
  | 'eventually'
  | 'completed';

/**
 * Priority order for sorting (higher number = higher priority)
 */
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Get the numeric priority value for sorting
 */
export function getPriorityValue(priority: string | null | undefined): number {
  if (!priority) return 0;
  return PRIORITY_ORDER[priority] ?? 0;
}

/**
 * Filter function for Today view
 * Tasks due today that are not done
 */
export function filterToday(task: SkelenoteObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isToday(dueDate);
}

/**
 * Filter function for This Week view
 * Tasks due this week (including today) that are not done
 */
export function filterThisWeek(task: SkelenoteObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isThisWeek(dueDate);
}

/**
 * Filter function for Overdue view
 * Tasks with due date before today that are not done
 */
export function filterOverdue(task: SkelenoteObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isOverdue(dueDate);
}

/**
 * Filter function for Waiting view
 * Tasks with status = waiting
 */
export function filterWaiting(task: SkelenoteObject): boolean {
  const status = task.properties.status as string | null;
  return status === 'waiting';
}

/**
 * Filter function for Eventually view
 * Tasks due beyond this week that are not done
 */
export function filterEventually(task: SkelenoteObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isBeyondThisWeek(dueDate);
}

/**
 * Filter function for Completed view
 * Tasks with status = done
 */
export function filterCompleted(task: SkelenoteObject): boolean {
  const status = task.properties.status as string | null;
  return status === 'done';
}

/**
 * Filter tasks by a specific date
 * Returns all tasks (including completed) with dueDate on the given day
 */
export function filterTasksByDate(
  tasks: SkelenoteObject[],
  date: Date
): SkelenoteObject[] {
  const dayStart = startOfDay(date).getTime();
  const dayEnd = endOfDay(date).getTime();

  return tasks.filter((task) => {
    const dueDate = task.properties.dueDate as number | null;
    if (dueDate === null) return false;
    return dueDate >= dayStart && dueDate <= dayEnd;
  });
}

/**
 * Get the appropriate filter function for a task filter type
 */
export function getTaskFilter(
  filter: TaskFilter
): (task: SkelenoteObject) => boolean {
  switch (filter) {
    case 'today':
      return filterToday;
    case 'this-week':
      return filterThisWeek;
    case 'overdue':
      return filterOverdue;
    case 'waiting':
      return filterWaiting;
    case 'eventually':
      return filterEventually;
    case 'completed':
      return filterCompleted;
  }
}

/**
 * Sort configuration for each task view
 */
export interface SortConfig {
  field: 'priority' | 'dueDate' | 'updatedAt';
  direction: 'asc' | 'desc';
}

/**
 * Get the default sort configuration for a task filter
 */
export function getDefaultSort(filter: TaskFilter): SortConfig {
  switch (filter) {
    case 'today':
      return { field: 'priority', direction: 'desc' };
    case 'this-week':
      return { field: 'dueDate', direction: 'asc' };
    case 'overdue':
      return { field: 'dueDate', direction: 'asc' };
    case 'waiting':
      return { field: 'updatedAt', direction: 'desc' };
    case 'eventually':
      return { field: 'dueDate', direction: 'asc' };
    case 'completed':
      return { field: 'updatedAt', direction: 'desc' };
  }
}

/**
 * Sort tasks by the specified configuration
 */
export function sortTasks(
  tasks: SkelenoteObject[],
  config: SortConfig
): SkelenoteObject[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (config.field) {
      case 'priority':
        aValue = getPriorityValue(a.properties.priority as string | null);
        bValue = getPriorityValue(b.properties.priority as string | null);
        break;
      case 'dueDate':
        aValue =
          (a.properties.dueDate as number | null) ?? Number.MAX_SAFE_INTEGER;
        bValue =
          (b.properties.dueDate as number | null) ?? Number.MAX_SAFE_INTEGER;
        break;
      case 'updatedAt':
        aValue = a.updatedAt;
        bValue = b.updatedAt;
        break;
    }

    if (config.direction === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  return sorted;
}

/**
 * Filter and sort tasks for a specific view
 */
export function getFilteredTasks(
  tasks: SkelenoteObject[],
  filter: TaskFilter
): SkelenoteObject[] {
  const filterFn = getTaskFilter(filter);
  const sortConfig = getDefaultSort(filter);

  const filtered = tasks.filter(filterFn);
  return sortTasks(filtered, sortConfig);
}

/**
 * Group tasks by a property value
 */
export function groupTasksBy(
  tasks: SkelenoteObject[],
  property: 'status' | 'project'
): Map<string, SkelenoteObject[]> {
  const groups = new Map<string, SkelenoteObject[]>();

  for (const task of tasks) {
    let key: string;

    if (property === 'status') {
      key = (task.properties.status as string) ?? 'todo';
    } else {
      // For project, use the first project ID or 'none'
      const projectIds = task.properties.project;
      if (Array.isArray(projectIds) && projectIds.length > 0) {
        key = projectIds[0];
      } else if (typeof projectIds === 'string') {
        key = projectIds;
      } else {
        key = 'none';
      }
    }

    const existing = groups.get(key) ?? [];
    existing.push(task);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Status display labels
 */
export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  waiting: 'Waiting',
  done: 'Done',
};

/**
 * Get ordered status list for kanban columns
 */
export function getStatusOrder(): string[] {
  return ['todo', 'in-progress', 'waiting', 'done'];
}
