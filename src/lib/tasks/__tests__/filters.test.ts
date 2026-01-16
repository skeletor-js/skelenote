import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filterToday,
  filterOverdue,
  filterWaiting,
  filterCompleted,
  sortTasks,
  getFilteredTasks,
  groupTasksBy,
  getPriorityValue,
} from '../filters';
import type { SkelenoteObject } from '../../types';
import { BuiltInTypeIds } from '../../types/type-definition';

// Mock date utils for consistent time testing
// We must mock '../utils/date' because filters.ts imports from it
vi.mock('../../utils/date', () => {
  return {
    isToday: vi.fn(),
    isOverdue: vi.fn(),
    isThisWeek: vi.fn(),
    isBeyondThisWeek: vi.fn(),
    startOfDay: vi.fn(),
    endOfDay: vi.fn(),
  };
});

import * as dateUtils from '../../utils/date';

describe('Task Filters', () => {
  const createTask = (
    id: string,
    status: string,
    dueDate: number | null = null,
    priority: string | null = null,
    project: string | string[] | null = null
  ): SkelenoteObject => ({
    id,
    typeId: BuiltInTypeIds.TASK,
    properties: {
      status,
      dueDate,
      priority,
      project,
      title: 'Task ' + id,
    },
    updatedAt: Date.now(),
    createdAt: Date.now(),
    hasContent: false,
    inboxed: false,
    pinned: false,
    archived: false,
  });

  describe('Priority', () => {
    it('returns correct priority values', () => {
      expect(getPriorityValue('urgent')).toBe(4);
      expect(getPriorityValue('high')).toBe(3);
      expect(getPriorityValue('medium')).toBe(2);
      expect(getPriorityValue('low')).toBe(1);
      expect(getPriorityValue(null)).toBe(0);
      expect(getPriorityValue('unknown')).toBe(0);
    });
  });

  describe('Filter Functions', () => {
    // Reset mocks before each test
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('filterToday accepts due tasks not done', () => {
      vi.mocked(dateUtils.isToday).mockReturnValue(true);
      const task = createTask('1', 'todo', 100);
      expect(filterToday(task)).toBe(true);
    });

    it('filterToday rejects done tasks', () => {
      vi.mocked(dateUtils.isToday).mockReturnValue(true);
      const task = createTask('1', 'done', 100);
      expect(filterToday(task)).toBe(false);
    });

    it('filterToday rejects tasks without due date', () => {
      const task = createTask('1', 'todo', null);
      expect(filterToday(task)).toBe(false);
    });

    it('filterOverdue delegates to isOverdue', () => {
      vi.mocked(dateUtils.isOverdue).mockReturnValue(true);
      const task = createTask('1', 'todo', 100);
      expect(filterOverdue(task)).toBe(true);
    });

    it('filterWaiting checks status', () => {
      expect(filterWaiting(createTask('1', 'waiting'))).toBe(true);
      expect(filterWaiting(createTask('2', 'todo'))).toBe(false);
    });

    it('filterCompleted checks status', () => {
      expect(filterCompleted(createTask('1', 'done'))).toBe(true);
      expect(filterCompleted(createTask('2', 'todo'))).toBe(false);
    });

    it('getFilteredTasks integrates filter and sort', () => {
      // Setup mock for "today"
      vi.mocked(dateUtils.isToday).mockImplementation((date) => date === 100);

      const t1 = createTask('1', 'todo', 100, 'low'); // Today
      const t2 = createTask('2', 'todo', 200, 'high'); // Not today
      const t3 = createTask('3', 'todo', 100, 'urgent'); // Today

      const result = getFilteredTasks([t1, t2, t3], 'today');

      expect(result).toHaveLength(2);
      // Today sorts by priority desc: urgent(3) -> low(1)
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('1');
    });
  });

  describe('Sorting', () => {
    const t1 = createTask('1', 'todo', 100, 'low');
    const t2 = createTask('2', 'todo', 200, 'high');
    const t3 = createTask('3', 'todo', 150, 'urgent');

    it('sorts by priority desc', () => {
      const sorted = sortTasks([t1, t2, t3], {
        field: 'priority',
        direction: 'desc',
      });
      // urgent(4) > high(3) > low(1)
      expect(sorted.map((t) => t.id)).toEqual(['3', '2', '1']);
    });

    it('sorts by priority asc', () => {
      const sorted = sortTasks([t1, t2, t3], {
        field: 'priority',
        direction: 'asc',
      });
      // low(1) < high(3) < urgent(4)
      expect(sorted.map((t) => t.id)).toEqual(['1', '2', '3']);
    });

    it('sorts by dueDate asc', () => {
      const sorted = sortTasks([t1, t2, t3], {
        field: 'dueDate',
        direction: 'asc',
      });
      // 100 < 150 < 200
      expect(sorted.map((t) => t.id)).toEqual(['1', '3', '2']);
    });
  });

  describe('Grouping', () => {
    it('groups by status', () => {
      const tasks = [
        createTask('1', 'todo'),
        createTask('2', 'done'),
        createTask('3', 'todo'),
      ];
      const groups = groupTasksBy(tasks, 'status');
      expect(groups.get('todo')?.length).toBe(2);
      expect(groups.get('done')?.length).toBe(1);
    });

    it('groups by project (string)', () => {
      const tasks = [
        createTask('1', 'todo', null, null, 'p1'),
        createTask('2', 'todo', null, null, 'p2'),
        createTask('3', 'todo', null, null, 'p1'),
        createTask('4', 'todo', null, null, null), // none
      ];
      const groups = groupTasksBy(tasks, 'project');
      expect(groups.get('p1')?.length).toBe(2);
      expect(groups.get('p2')?.length).toBe(1);
      expect(groups.get('none')?.length).toBe(1);
    });

    it('groups by project (array)', () => {
      const tasks = [
        createTask('1', 'todo', null, null, ['p1']),
        createTask('2', 'todo', null, null, ['p2', 'p1']), // Should use first: p2
      ];
      const groups = groupTasksBy(tasks, 'project');
      expect(groups.get('p1')?.length).toBe(1);
      expect(groups.get('p1')?.[0].id).toBe('1');

      expect(groups.get('p2')?.length).toBe(1);
      expect(groups.get('p2')?.[0].id).toBe('2');
    });
  });
});
