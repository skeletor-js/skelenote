import { describe, it, expect } from 'vitest';
import type { SkelenoteObject } from '../../types';
import {
  parseRecurrence,
  calculateNextDueDate,
  createRecurringTaskProperties,
  isRecurringTask,
  prepareNextRecurringTask,
} from '../recurrence';

// Helper to create mock task objects
function createMockTask(overrides: Partial<{
  id: string;
  status: string;
  dueDate: number | null;
  priority: string | null;
  project: string | null;
  tags: string[];
  recurrence: string | null;
}>): SkelenoteObject {
  return {
    id: overrides.id ?? 'task-1',
    typeId: 'task',
    properties: {
      title: 'Test Task',
      status: overrides.status ?? 'todo',
      dueDate: overrides.dueDate ?? null,
      priority: overrides.priority ?? null,
      project: overrides.project ?? null,
      tags: overrides.tags ?? [],
      recurrence: overrides.recurrence ?? null,
    },
    hasContent: true,
    inboxed: false,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('Recurrence Logic', () => {
  describe('parseRecurrence', () => {
    it('should parse "daily" pattern', () => {
      const config = parseRecurrence('daily');
      expect(config).toEqual({ pattern: 'daily', interval: 1 });
    });

    it('should parse "weekly" pattern', () => {
      const config = parseRecurrence('weekly');
      expect(config).toEqual({ pattern: 'weekly', interval: 1 });
    });

    it('should parse "monthly" pattern', () => {
      const config = parseRecurrence('monthly');
      expect(config).toEqual({ pattern: 'monthly', interval: 1 });
    });

    it('should parse "yearly" pattern', () => {
      const config = parseRecurrence('yearly');
      expect(config).toEqual({ pattern: 'yearly', interval: 1 });
    });

    it('should be case-insensitive', () => {
      expect(parseRecurrence('DAILY')).toEqual({ pattern: 'daily', interval: 1 });
      expect(parseRecurrence('Weekly')).toEqual({ pattern: 'weekly', interval: 1 });
    });

    it('should trim whitespace', () => {
      expect(parseRecurrence('  daily  ')).toEqual({ pattern: 'daily', interval: 1 });
    });

    it('should return null for invalid patterns', () => {
      expect(parseRecurrence('invalid')).toBeNull();
      expect(parseRecurrence('')).toBeNull();
      expect(parseRecurrence(null)).toBeNull();
      expect(parseRecurrence(undefined)).toBeNull();
    });
  });

  describe('calculateNextDueDate', () => {
    const baseDateMs = new Date('2024-12-25T12:00:00Z').getTime();

    it('should add 1 day for daily recurrence', () => {
      const nextDate = calculateNextDueDate(baseDateMs, { pattern: 'daily', interval: 1 });
      const result = new Date(nextDate);

      expect(result.getUTCDate()).toBe(26);
      expect(result.getUTCMonth()).toBe(11); // December
    });

    it('should add 7 days for weekly recurrence', () => {
      const nextDate = calculateNextDueDate(baseDateMs, { pattern: 'weekly', interval: 1 });
      const result = new Date(nextDate);

      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCFullYear()).toBe(2025);
    });

    it('should add 1 month for monthly recurrence', () => {
      const nextDate = calculateNextDueDate(baseDateMs, { pattern: 'monthly', interval: 1 });
      const result = new Date(nextDate);

      expect(result.getUTCDate()).toBe(25);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCFullYear()).toBe(2025);
    });

    it('should add 1 year for yearly recurrence', () => {
      const nextDate = calculateNextDueDate(baseDateMs, { pattern: 'yearly', interval: 1 });
      const result = new Date(nextDate);

      expect(result.getUTCDate()).toBe(25);
      expect(result.getUTCMonth()).toBe(11); // December
      expect(result.getUTCFullYear()).toBe(2025);
    });

    it('should handle month end edge case (Jan 31 + 1 month)', () => {
      const jan31 = new Date('2024-01-31T12:00:00Z').getTime();
      const nextDate = calculateNextDueDate(jan31, { pattern: 'monthly', interval: 1 });
      const result = new Date(nextDate);

      // Should be last day of February (leap year 2024 = Feb 29)
      expect(result.getUTCDate()).toBe(29);
      expect(result.getUTCMonth()).toBe(1); // February
    });
  });

  describe('createRecurringTaskProperties', () => {
    it('should copy relevant properties', () => {
      const task = createMockTask({
        priority: 'high',
        project: 'proj-1',
        tags: ['tag-1', 'tag-2'],
        recurrence: 'weekly',
        dueDate: Date.now(),
      });

      const nextDueDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const props = createRecurringTaskProperties(task, nextDueDate);

      expect(props.status).toBe('todo');
      expect(props.dueDate).toBe(nextDueDate);
      expect(props.priority).toBe('high');
      expect(props.project).toBe('proj-1');
      expect(props.tags).toEqual(['tag-1', 'tag-2']);
      expect(props.recurrence).toBe('weekly');
      expect(props.title).toBe('Test Task');
    });

    it('should reset status to todo', () => {
      const task = createMockTask({
        status: 'done',
        recurrence: 'daily',
        dueDate: Date.now(),
      });

      const props = createRecurringTaskProperties(task, Date.now());
      expect(props.status).toBe('todo');
    });
  });

  describe('isRecurringTask', () => {
    it('should return true for tasks with valid recurrence', () => {
      expect(isRecurringTask(createMockTask({ recurrence: 'daily' }))).toBe(true);
      expect(isRecurringTask(createMockTask({ recurrence: 'weekly' }))).toBe(true);
    });

    it('should return false for tasks without recurrence', () => {
      expect(isRecurringTask(createMockTask({ recurrence: null }))).toBe(false);
    });

    it('should return false for tasks with invalid recurrence', () => {
      expect(isRecurringTask(createMockTask({ recurrence: 'invalid' }))).toBe(false);
    });
  });

  describe('prepareNextRecurringTask', () => {
    it('should return properties for recurring task', () => {
      const dueDate = new Date('2024-12-25T12:00:00Z').getTime();
      const task = createMockTask({
        recurrence: 'daily',
        dueDate,
        priority: 'high',
      });

      const props = prepareNextRecurringTask(task);

      expect(props).not.toBeNull();
      expect(props?.status).toBe('todo');
      expect(props?.priority).toBe('high');
      // Due date should be Dec 26
      const nextDueDate = new Date(props?.dueDate as number);
      expect(nextDueDate.getUTCDate()).toBe(26);
    });

    it('should return null for non-recurring task', () => {
      const task = createMockTask({
        recurrence: null,
        dueDate: Date.now(),
      });

      expect(prepareNextRecurringTask(task)).toBeNull();
    });

    it('should return null if task has no due date', () => {
      const task = createMockTask({
        recurrence: 'daily',
        dueDate: null,
      });

      expect(prepareNextRecurringTask(task)).toBeNull();
    });
  });
});
