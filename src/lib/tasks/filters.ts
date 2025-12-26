/**
 * Task filtering and sorting functions for task views
 */

import type { EphemeraObject } from '../types';
import { isToday, isOverdue, isThisWeekAfterToday, isBeyondThisWeek } from '../utils/date';

/**
 * Task filter types matching sidebar navigation
 */
export type TaskFilter = 'today' | 'this-week' | 'overdue' | 'blocked' | 'eventually' | 'completed';

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
export function filterToday(task: EphemeraObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isToday(dueDate);
}

/**
 * Filter function for This Week view
 * Tasks due this week (after today) that are not done
 */
export function filterThisWeek(task: EphemeraObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isThisWeekAfterToday(dueDate);
}

/**
 * Filter function for Overdue view
 * Tasks with due date before today that are not done
 */
export function filterOverdue(task: EphemeraObject): boolean {
  const status = task.properties.status as string | null;
  const dueDate = task.properties.dueDate as number | null;

  if (status === 'done') return false;
  if (dueDate === null) return false;

  return isOverdue(dueDate);
}

/**
 * Filter function for Blocked view
 * Tasks with status = blocked (regardless of done status per PRD)
 */
export function filterBlocked(task: EphemeraObject): boolean {
  const status = task.properties.status as string | null;
  return status === 'blocked';
}

/**
 * Filter function for Eventually view
 * Tasks due beyond this week that are not done
 */
export function filterEventually(task: EphemeraObject): boolean {
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
export function filterCompleted(task: EphemeraObject): boolean {
  const status = task.properties.status as string | null;
  return status === 'done';
}

/**
 * Get the appropriate filter function for a task filter type
 */
export function getTaskFilter(filter: TaskFilter): (task: EphemeraObject) => boolean {
  switch (filter) {
    case 'today':
      return filterToday;
    case 'this-week':
      return filterThisWeek;
    case 'overdue':
      return filterOverdue;
    case 'blocked':
      return filterBlocked;
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
    case 'blocked':
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
export function sortTasks(tasks: EphemeraObject[], config: SortConfig): EphemeraObject[] {
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
        aValue = (a.properties.dueDate as number | null) ?? Number.MAX_SAFE_INTEGER;
        bValue = (b.properties.dueDate as number | null) ?? Number.MAX_SAFE_INTEGER;
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
  tasks: EphemeraObject[],
  filter: TaskFilter
): EphemeraObject[] {
  const filterFn = getTaskFilter(filter);
  const sortConfig = getDefaultSort(filter);

  const filtered = tasks.filter(filterFn);
  return sortTasks(filtered, sortConfig);
}

/**
 * Group tasks by a property value
 */
export function groupTasksBy(
  tasks: EphemeraObject[],
  property: 'status' | 'project'
): Map<string, EphemeraObject[]> {
  const groups = new Map<string, EphemeraObject[]>();

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
  blocked: 'Blocked',
  done: 'Done',
};

/**
 * Get ordered status list for kanban columns
 */
export function getStatusOrder(): string[] {
  return ['todo', 'in-progress', 'blocked', 'done'];
}
