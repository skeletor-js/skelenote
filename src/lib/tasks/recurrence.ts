/**
 * Recurring task logic - handles clone forward behavior
 *
 * When a recurring task is marked done:
 * 1. Current task → status: done
 * 2. New task is created with:
 *    - Same: title, priority, project, tags, note relations, recurrence
 *    - New: id, createdAt, updatedAt
 *    - Calculated: dueDate based on recurrence rule
 *    - Reset: status: todo, inboxed: false
 */

import type { EphemeraObject, PropertyValue } from '../types';
import { addDays, addMonths, addYears } from '../utils/date';

/**
 * Supported recurrence patterns
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Parsed recurrence configuration
 */
export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number;
}

/**
 * Parse a recurrence string into a configuration
 *
 * Supported formats:
 * - "daily" - every day
 * - "weekly" - every 7 days
 * - "monthly" - same day of month
 * - "yearly" - same day of year
 *
 * @param recurrence - The recurrence string to parse
 * @returns Parsed configuration or null if invalid
 */
export function parseRecurrence(recurrence: string | null | undefined): RecurrenceConfig | null {
  if (!recurrence) return null;

  const normalized = recurrence.toLowerCase().trim();

  switch (normalized) {
    case 'daily':
      return { pattern: 'daily', interval: 1 };
    case 'weekly':
      return { pattern: 'weekly', interval: 1 };
    case 'monthly':
      return { pattern: 'monthly', interval: 1 };
    case 'yearly':
      return { pattern: 'yearly', interval: 1 };
    default:
      // Could extend to support "every 2 days", "every 3 weeks", etc.
      return null;
  }
}

/**
 * Calculate the next due date based on recurrence pattern
 *
 * @param currentDueDate - The current due date timestamp (milliseconds)
 * @param config - The recurrence configuration
 * @returns The next due date timestamp (milliseconds)
 */
export function calculateNextDueDate(
  currentDueDate: number,
  config: RecurrenceConfig
): number {
  switch (config.pattern) {
    case 'daily':
      return addDays(currentDueDate, 1 * config.interval);
    case 'weekly':
      return addDays(currentDueDate, 7 * config.interval);
    case 'monthly':
      return addMonths(currentDueDate, 1 * config.interval);
    case 'yearly':
      return addYears(currentDueDate, 1 * config.interval);
  }
}

/**
 * Properties to copy from the original task to the new recurring instance
 */
const COPIED_PROPERTIES = ['title', 'priority', 'project', 'note', 'tags', 'recurrence'] as const;

/**
 * Create the properties for a new recurring task instance
 *
 * @param originalTask - The completed task to clone from
 * @param nextDueDate - The calculated next due date
 * @returns Properties for the new task
 */
export function createRecurringTaskProperties(
  originalTask: EphemeraObject,
  nextDueDate: number
): Record<string, PropertyValue> {
  const properties: Record<string, PropertyValue> = {
    status: 'todo',
    dueDate: nextDueDate,
  };

  // Copy relevant properties from original
  for (const prop of COPIED_PROPERTIES) {
    const value = originalTask.properties[prop];
    if (value !== undefined && value !== null) {
      properties[prop] = value;
    }
  }

  return properties;
}

/**
 * Check if a task is recurring
 */
export function isRecurringTask(task: EphemeraObject): boolean {
  const recurrence = task.properties.recurrence as string | null | undefined;
  return parseRecurrence(recurrence) !== null;
}

/**
 * Complete a recurring task and create the next instance
 *
 * This function:
 * 1. Validates the task has a valid recurrence pattern
 * 2. Validates the task has a due date
 * 3. Calculates the next due date
 * 4. Returns the properties for creating the new task
 *
 * The caller is responsible for:
 * - Marking the original task as done
 * - Creating the new task using store.create()
 *
 * @param task - The recurring task being completed
 * @returns Properties for the new task, or null if not a valid recurring task
 */
export function prepareNextRecurringTask(
  task: EphemeraObject
): Record<string, PropertyValue> | null {
  const recurrence = task.properties.recurrence as string | null | undefined;
  const config = parseRecurrence(recurrence);

  if (!config) {
    return null;
  }

  const currentDueDate = task.properties.dueDate as number | null;
  if (currentDueDate === null) {
    // No due date, can't calculate next occurrence
    return null;
  }

  const nextDueDate = calculateNextDueDate(currentDueDate, config);
  return createRecurringTaskProperties(task, nextDueDate);
}
