import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EphemeraObject } from '../../types';
import {
  filterToday,
  filterThisWeek,
  filterOverdue,
  filterBlocked,
  filterEventually,
  filterCompleted,
  getTaskFilter,
  getDefaultSort,
  sortTasks,
  groupTasksBy,
  getPriorityValue,
} from '../filters';

// Helper to create mock task objects
function createMockTask(overrides: Partial<{
  id: string;
  status: string;
  dueDate: number | null;
  priority: string | null;
  project: string | null;
  updatedAt: number;
}>): EphemeraObject {
  return {
    id: overrides.id ?? 'task-1',
    typeId: 'task',
    properties: {
      title: 'Test Task',
      status: overrides.status ?? 'todo',
      dueDate: overrides.dueDate ?? null,
      priority: overrides.priority ?? null,
      project: overrides.project ?? null,
    },
    hasContent: true,
    inboxed: false,
    createdAt: Date.now(),
    updatedAt: overrides.updatedAt ?? Date.now(),
  };
}

describe('Task Filters', () => {
  beforeEach(() => {
    // Mock Date to control "today"
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('filterToday', () => {
    it('should include tasks due today with status not done', () => {
      const task = createMockTask({
        status: 'todo',
        dueDate: new Date('2024-12-25T10:00:00Z').getTime(),
      });
      expect(filterToday(task)).toBe(true);
    });

    it('should exclude done tasks', () => {
      const task = createMockTask({
        status: 'done',
        dueDate: new Date('2024-12-25T10:00:00Z').getTime(),
      });
      expect(filterToday(task)).toBe(false);
    });

    it('should exclude tasks with no due date', () => {
      const task = createMockTask({
        status: 'todo',
        dueDate: null,
      });
      expect(filterToday(task)).toBe(false);
    });

    it('should exclude tasks due tomorrow', () => {
      const task = createMockTask({
        status: 'todo',
        dueDate: new Date('2024-12-26T10:00:00Z').getTime(),
      });
      expect(filterToday(task)).toBe(false);
    });
  });

  describe('filterOverdue', () => {
    it('should include tasks due before today', () => {
      const task = createMockTask({
        status: 'todo',
        dueDate: new Date('2024-12-24T10:00:00Z').getTime(),
      });
      expect(filterOverdue(task)).toBe(true);
    });

    it('should exclude tasks due today', () => {
      const task = createMockTask({
        status: 'todo',
        dueDate: new Date('2024-12-25T10:00:00Z').getTime(),
      });
      expect(filterOverdue(task)).toBe(false);
    });

    it('should exclude done tasks', () => {
      const task = createMockTask({
        status: 'done',
        dueDate: new Date('2024-12-24T10:00:00Z').getTime(),
      });
      expect(filterOverdue(task)).toBe(false);
    });
  });

  describe('filterBlocked', () => {
    it('should include blocked tasks', () => {
      const task = createMockTask({ status: 'blocked' });
      expect(filterBlocked(task)).toBe(true);
    });

    it('should exclude non-blocked tasks', () => {
      const task = createMockTask({ status: 'todo' });
      expect(filterBlocked(task)).toBe(false);
    });
  });

  describe('filterCompleted', () => {
    it('should include done tasks', () => {
      const task = createMockTask({ status: 'done' });
      expect(filterCompleted(task)).toBe(true);
    });

    it('should exclude non-done tasks', () => {
      const task = createMockTask({ status: 'todo' });
      expect(filterCompleted(task)).toBe(false);
    });
  });

  describe('getTaskFilter', () => {
    it('should return correct filter for each type', () => {
      expect(getTaskFilter('today')).toBe(filterToday);
      expect(getTaskFilter('this-week')).toBe(filterThisWeek);
      expect(getTaskFilter('overdue')).toBe(filterOverdue);
      expect(getTaskFilter('blocked')).toBe(filterBlocked);
      expect(getTaskFilter('eventually')).toBe(filterEventually);
      expect(getTaskFilter('completed')).toBe(filterCompleted);
    });
  });

  describe('getDefaultSort', () => {
    it('should return priority desc for today', () => {
      const config = getDefaultSort('today');
      expect(config.field).toBe('priority');
      expect(config.direction).toBe('desc');
    });

    it('should return dueDate asc for this-week', () => {
      const config = getDefaultSort('this-week');
      expect(config.field).toBe('dueDate');
      expect(config.direction).toBe('asc');
    });

    it('should return updatedAt desc for completed', () => {
      const config = getDefaultSort('completed');
      expect(config.field).toBe('updatedAt');
      expect(config.direction).toBe('desc');
    });
  });

  describe('getPriorityValue', () => {
    it('should return correct numeric values', () => {
      expect(getPriorityValue('urgent')).toBe(4);
      expect(getPriorityValue('high')).toBe(3);
      expect(getPriorityValue('medium')).toBe(2);
      expect(getPriorityValue('low')).toBe(1);
    });

    it('should return 0 for null or undefined', () => {
      expect(getPriorityValue(null)).toBe(0);
      expect(getPriorityValue(undefined)).toBe(0);
    });
  });

  describe('sortTasks', () => {
    it('should sort by priority descending', () => {
      const tasks = [
        createMockTask({ id: '1', priority: 'low' }),
        createMockTask({ id: '2', priority: 'urgent' }),
        createMockTask({ id: '3', priority: 'medium' }),
      ];

      const sorted = sortTasks(tasks, { field: 'priority', direction: 'desc' });

      expect(sorted[0].id).toBe('2'); // urgent
      expect(sorted[1].id).toBe('3'); // medium
      expect(sorted[2].id).toBe('1'); // low
    });

    it('should sort by dueDate ascending', () => {
      const tasks = [
        createMockTask({ id: '1', dueDate: new Date('2024-12-30').getTime() }),
        createMockTask({ id: '2', dueDate: new Date('2024-12-25').getTime() }),
        createMockTask({ id: '3', dueDate: new Date('2024-12-27').getTime() }),
      ];

      const sorted = sortTasks(tasks, { field: 'dueDate', direction: 'asc' });

      expect(sorted[0].id).toBe('2'); // Dec 25
      expect(sorted[1].id).toBe('3'); // Dec 27
      expect(sorted[2].id).toBe('1'); // Dec 30
    });
  });

  describe('groupTasksBy', () => {
    it('should group by status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' }),
        createMockTask({ id: '2', status: 'done' }),
        createMockTask({ id: '3', status: 'todo' }),
      ];

      const groups = groupTasksBy(tasks, 'status');

      expect(groups.get('todo')?.length).toBe(2);
      expect(groups.get('done')?.length).toBe(1);
    });

    it('should group by project', () => {
      const tasks = [
        createMockTask({ id: '1', project: 'proj-1' }),
        createMockTask({ id: '2', project: 'proj-2' }),
        createMockTask({ id: '3', project: 'proj-1' }),
        createMockTask({ id: '4', project: null }),
      ];

      const groups = groupTasksBy(tasks, 'project');

      expect(groups.get('proj-1')?.length).toBe(2);
      expect(groups.get('proj-2')?.length).toBe(1);
      expect(groups.get('none')?.length).toBe(1);
    });
  });
});
