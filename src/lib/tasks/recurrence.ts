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
 * Recurrence value structure (matches RecurrenceEditor)
 */
export interface RecurrenceValue {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number; // 1-31
  month?: number; // 1-12
}

/**
 * Supported recurrence patterns (for backwards compatibility)
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Parsed recurrence configuration
 */
export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
}

/**
 * Parse a recurrence string into a configuration
 *
 * Supports both legacy string formats and new JSON format:
 * - Legacy: "daily", "weekly", "monthly", "yearly"
 * - JSON: { frequency: "weekly", daysOfWeek: [1, 3, 5] }
 *
 * @param recurrence - The recurrence string to parse
 * @returns Parsed configuration or null if invalid
 */
export function parseRecurrence(recurrence: string | null | undefined): RecurrenceConfig | null {
  if (!recurrence) return null;

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(recurrence);
    if (parsed && typeof parsed === 'object' && 'frequency' in parsed) {
      const value = parsed as RecurrenceValue;
      if (value.frequency === 'none') {
        return null;
      }
      return {
        pattern: value.frequency,
        interval: value.interval ?? 1,
        daysOfWeek: value.daysOfWeek,
        dayOfMonth: value.dayOfMonth,
        month: value.month,
      };
    }
  } catch {
    // Not JSON, try legacy string format
  }

  // Handle legacy string formats
  const normalized = recurrence.toLowerCase().trim();

  switch (normalized) {
    case 'daily':
      return { pattern: 'daily', interval: 1 };
    case 'weekly':
      return { pattern: 'weekly', interval: 1 };
    case 'monthly':
      return { pattern: 'monthly', interval: 1 };
    case 'quarterly':
      return { pattern: 'quarterly', interval: 1 };
    case 'yearly':
      return { pattern: 'yearly', interval: 1 };
    default:
      return null;
  }
}

/**
 * Find the next occurrence of a specific day of week
 *
 * @param fromDate - Starting date
 * @param targetDay - Target day of week (0=Sun, 6=Sat)
 * @returns Date of next occurrence
 */
function getNextDayOfWeek(fromDate: Date, targetDay: number): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Move to next week
  }
  result.setDate(result.getDate() + daysToAdd);
  return result;
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
  const currentDate = new Date(currentDueDate);

  switch (config.pattern) {
    case 'daily':
      return addDays(currentDueDate, 1 * config.interval);

    case 'weekly': {
      // If specific days are set, find the next occurrence
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        const currentDay = currentDate.getDay();
        const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);

        // Find the next day in this week
        const nextDayThisWeek = sortedDays.find((d) => d > currentDay);
        if (nextDayThisWeek !== undefined) {
          return getNextDayOfWeek(currentDate, nextDayThisWeek).getTime();
        }

        // Otherwise, go to first day of next week
        const nextWeek = addDays(currentDueDate, 7);
        const nextWeekDate = new Date(nextWeek);
        return getNextDayOfWeek(nextWeekDate, sortedDays[0]).getTime();
      }
      // Default: add 7 days
      return addDays(currentDueDate, 7 * config.interval);
    }

    case 'monthly': {
      const nextMonth = addMonths(currentDueDate, 1 * config.interval);
      if (config.dayOfMonth) {
        const nextDate = new Date(nextMonth);
        // Handle edge cases like day 31 in a 30-day month
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        nextDate.setDate(Math.min(config.dayOfMonth, lastDayOfMonth));
        return nextDate.getTime();
      }
      return nextMonth;
    }

    case 'quarterly': {
      // Add 3 months
      const nextQuarter = addMonths(currentDueDate, 3 * config.interval);
      if (config.dayOfMonth) {
        const nextDate = new Date(nextQuarter);
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        nextDate.setDate(Math.min(config.dayOfMonth, lastDayOfMonth));
        return nextDate.getTime();
      }
      return nextQuarter;
    }

    case 'yearly': {
      const nextYear = addYears(currentDueDate, 1 * config.interval);
      if (config.month && config.dayOfMonth) {
        const nextDate = new Date(nextYear);
        nextDate.setMonth(config.month - 1); // month is 1-indexed
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        nextDate.setDate(Math.min(config.dayOfMonth, lastDayOfMonth));
        return nextDate.getTime();
      }
      return nextYear;
    }
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
