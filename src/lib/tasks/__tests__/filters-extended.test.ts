import { describe, it, expect } from 'vitest';
import {
  getPriorityValue,
  filterToday,
  filterThisWeek,
  filterOverdue,
  filterWaiting,
  filterEventually,
  filterCompleted,
  getTaskFilter,
  getDefaultSort,
  sortTasks,
  getFilteredTasks,
  groupTasksBy,
  getStatusOrder,
  STATUS_LABELS,
} from '../filters';
import type { SkelenoteObject } from '../../types';

// Helper to create mock task
function createTask(overrides: Partial<SkelenoteObject> = {}): SkelenoteObject {
  return {
    id: 'task-1',
    typeId: 'built-in:task',
    properties: {
      title: 'Test Task',
      status: 'todo',
      ...overrides.properties,
    },
    hasContent: false,
    inboxed: false,
    pinned: false,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// Date helpers
function getToday(): Date {
  return new Date();
}

function getTodayTimestamp(): number {
  const d = getToday();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

function getYesterdayTimestamp(): number {
  const d = getToday();
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

function getNextWeekTimestamp(): number {
  const d = getToday();
  d.setDate(d.getDate() + 10);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

describe('task filters', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // getPriorityValue
  // ─────────────────────────────────────────────────────────────────────────

  describe('getPriorityValue', () => {
    it('should return 4 for urgent', () => {
      expect(getPriorityValue('urgent')).toBe(4);
    });

    it('should return 3 for high', () => {
      expect(getPriorityValue('high')).toBe(3);
    });

    it('should return 2 for medium', () => {
      expect(getPriorityValue('medium')).toBe(2);
    });

    it('should return 1 for low', () => {
      expect(getPriorityValue('low')).toBe(1);
    });

    it('should return 0 for null', () => {
      expect(getPriorityValue(null)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(getPriorityValue(undefined)).toBe(0);
    });

    it('should return 0 for unknown values', () => {
      expect(getPriorityValue('unknown')).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Filter functions
  // ─────────────────────────────────────────────────────────────────────────

  describe('filterToday', () => {
    it('should return true for tasks due today', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'todo',
          dueDate: getTodayTimestamp(),
        },
      });
      expect(filterToday(task)).toBe(true);
    });

    it('should return false for done tasks', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'done',
          dueDate: getTodayTimestamp(),
        },
      });
      expect(filterToday(task)).toBe(false);
    });

    it('should return false for tasks with no due date', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'todo', dueDate: null },
      });
      expect(filterToday(task)).toBe(false);
    });

    it('should return false for tasks due yesterday', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'todo',
          dueDate: getYesterdayTimestamp(),
        },
      });
      expect(filterToday(task)).toBe(false);
    });
  });

  describe('filterOverdue', () => {
    it('should return true for tasks with past due date', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'todo',
          dueDate: getYesterdayTimestamp(),
        },
      });
      expect(filterOverdue(task)).toBe(true);
    });

    it('should return false for done tasks', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'done',
          dueDate: getYesterdayTimestamp(),
        },
      });
      expect(filterOverdue(task)).toBe(false);
    });

    it('should return false for tasks with no due date', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'todo', dueDate: null },
      });
      expect(filterOverdue(task)).toBe(false);
    });
  });

  describe('filterWaiting', () => {
    it('should return true for waiting tasks', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'waiting' },
      });
      expect(filterWaiting(task)).toBe(true);
    });

    it('should return false for todo tasks', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'todo' },
      });
      expect(filterWaiting(task)).toBe(false);
    });
  });

  describe('filterEventually', () => {
    it('should return true for tasks due beyond this week', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'todo',
          dueDate: getNextWeekTimestamp(),
        },
      });
      expect(filterEventually(task)).toBe(true);
    });

    it('should return false for done tasks', () => {
      const task = createTask({
        properties: {
          title: 'Test',
          status: 'done',
          dueDate: getNextWeekTimestamp(),
        },
      });
      expect(filterEventually(task)).toBe(false);
    });

    it('should return false for tasks with no due date', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'todo', dueDate: null },
      });
      expect(filterEventually(task)).toBe(false);
    });
  });

  describe('filterCompleted', () => {
    it('should return true for done tasks', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'done' },
      });
      expect(filterCompleted(task)).toBe(true);
    });

    it('should return false for todo tasks', () => {
      const task = createTask({
        properties: { title: 'Test', status: 'todo' },
      });
      expect(filterCompleted(task)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getTaskFilter
  // ─────────────────────────────────────────────────────────────────────────

  describe('getTaskFilter', () => {
    it('should return filterToday for today', () => {
      expect(getTaskFilter('today')).toBe(filterToday);
    });

    it('should return filterThisWeek for this-week', () => {
      expect(getTaskFilter('this-week')).toBe(filterThisWeek);
    });

    it('should return filterOverdue for overdue', () => {
      expect(getTaskFilter('overdue')).toBe(filterOverdue);
    });

    it('should return filterWaiting for waiting', () => {
      expect(getTaskFilter('waiting')).toBe(filterWaiting);
    });

    it('should return filterEventually for eventually', () => {
      expect(getTaskFilter('eventually')).toBe(filterEventually);
    });

    it('should return filterCompleted for completed', () => {
      expect(getTaskFilter('completed')).toBe(filterCompleted);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDefaultSort
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDefaultSort', () => {
    it('should return priority desc for today', () => {
      expect(getDefaultSort('today')).toEqual({
        field: 'priority',
        direction: 'desc',
      });
    });

    it('should return dueDate asc for this-week', () => {
      expect(getDefaultSort('this-week')).toEqual({
        field: 'dueDate',
        direction: 'asc',
      });
    });

    it('should return dueDate asc for overdue', () => {
      expect(getDefaultSort('overdue')).toEqual({
        field: 'dueDate',
        direction: 'asc',
      });
    });

    it('should return updatedAt desc for waiting', () => {
      expect(getDefaultSort('waiting')).toEqual({
        field: 'updatedAt',
        direction: 'desc',
      });
    });

    it('should return dueDate asc for eventually', () => {
      expect(getDefaultSort('eventually')).toEqual({
        field: 'dueDate',
        direction: 'asc',
      });
    });

    it('should return updatedAt desc for completed', () => {
      expect(getDefaultSort('completed')).toEqual({
        field: 'updatedAt',
        direction: 'desc',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // sortTasks
  // ─────────────────────────────────────────────────────────────────────────

  describe('sortTasks', () => {
    it('should sort by priority descending', () => {
      const tasks = [
        createTask({ id: '1', properties: { title: 'Low', priority: 'low' } }),
        createTask({
          id: '2',
          properties: { title: 'Urgent', priority: 'urgent' },
        }),
        createTask({
          id: '3',
          properties: { title: 'High', priority: 'high' },
        }),
      ];

      const sorted = sortTasks(tasks, { field: 'priority', direction: 'desc' });

      expect(sorted[0].properties.priority).toBe('urgent');
      expect(sorted[1].properties.priority).toBe('high');
      expect(sorted[2].properties.priority).toBe('low');
    });

    it('should sort by dueDate ascending', () => {
      const now = Date.now();
      const tasks = [
        createTask({
          id: '1',
          properties: { title: 'Later', dueDate: now + 1000 },
        }),
        createTask({ id: '2', properties: { title: 'Soon', dueDate: now } }),
        createTask({
          id: '3',
          properties: { title: 'No date', dueDate: null },
        }),
      ];

      const sorted = sortTasks(tasks, { field: 'dueDate', direction: 'asc' });

      expect(sorted[0].properties.title).toBe('Soon');
      expect(sorted[1].properties.title).toBe('Later');
      expect(sorted[2].properties.title).toBe('No date');
    });

    it('should sort by updatedAt descending', () => {
      const tasks = [
        createTask({ id: '1', updatedAt: 100 }),
        createTask({ id: '2', updatedAt: 300 }),
        createTask({ id: '3', updatedAt: 200 }),
      ];

      const sorted = sortTasks(tasks, {
        field: 'updatedAt',
        direction: 'desc',
      });

      expect(sorted[0].updatedAt).toBe(300);
      expect(sorted[1].updatedAt).toBe(200);
      expect(sorted[2].updatedAt).toBe(100);
    });

    it('should not mutate original array', () => {
      const tasks = [
        createTask({ id: '1', properties: { title: 'B' } }),
        createTask({ id: '2', properties: { title: 'A' } }),
      ];
      const original = [...tasks];

      sortTasks(tasks, { field: 'priority', direction: 'desc' });

      expect(tasks[0].id).toBe(original[0].id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // groupTasksBy
  // ─────────────────────────────────────────────────────────────────────────

  describe('groupTasksBy', () => {
    it('should group by status', () => {
      const tasks = [
        createTask({ id: '1', properties: { title: 'A', status: 'todo' } }),
        createTask({ id: '2', properties: { title: 'B', status: 'done' } }),
        createTask({ id: '3', properties: { title: 'C', status: 'todo' } }),
      ];

      const groups = groupTasksBy(tasks, 'status');

      expect(groups.get('todo')?.length).toBe(2);
      expect(groups.get('done')?.length).toBe(1);
    });

    it('should group by project', () => {
      const tasks = [
        createTask({
          id: '1',
          properties: { title: 'A', project: ['proj-1'] },
        }),
        createTask({
          id: '2',
          properties: { title: 'B', project: ['proj-2'] },
        }),
        createTask({
          id: '3',
          properties: { title: 'C', project: ['proj-1'] },
        }),
      ];

      const groups = groupTasksBy(tasks, 'project');

      expect(groups.get('proj-1')?.length).toBe(2);
      expect(groups.get('proj-2')?.length).toBe(1);
    });

    it('should handle tasks with no project', () => {
      const tasks = [
        createTask({ id: '1', properties: { title: 'A', project: null } }),
        createTask({ id: '2', properties: { title: 'B', project: [] } }),
      ];

      const groups = groupTasksBy(tasks, 'project');

      expect(groups.get('none')?.length).toBe(2);
    });

    it('should default status to todo', () => {
      const tasks = [
        createTask({ id: '1', properties: { title: 'A', status: null } }),
      ];

      const groups = groupTasksBy(tasks, 'status');

      expect(groups.get('todo')?.length).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Constants
  // ─────────────────────────────────────────────────────────────────────────

  describe('STATUS_LABELS', () => {
    it('should have all status labels', () => {
      expect(STATUS_LABELS.todo).toBe('To Do');
      expect(STATUS_LABELS['in-progress']).toBe('In Progress');
      expect(STATUS_LABELS.waiting).toBe('Waiting');
      expect(STATUS_LABELS.done).toBe('Done');
    });
  });

  describe('getStatusOrder', () => {
    it('should return ordered status list', () => {
      expect(getStatusOrder()).toEqual([
        'todo',
        'in-progress',
        'waiting',
        'done',
      ]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getFilteredTasks
  // ─────────────────────────────────────────────────────────────────────────

  describe('getFilteredTasks', () => {
    it('should filter and sort tasks', () => {
      const tasks = [
        createTask({ id: '1', properties: { title: 'A', status: 'done' } }),
        createTask({ id: '2', properties: { title: 'B', status: 'waiting' } }),
        createTask({ id: '3', properties: { title: 'C', status: 'waiting' } }),
      ];

      const result = getFilteredTasks(tasks, 'waiting');

      expect(result.length).toBe(2);
      expect(result.every((t) => t.properties.status === 'waiting')).toBe(true);
    });
  });
});
