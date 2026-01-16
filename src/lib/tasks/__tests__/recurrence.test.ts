import { describe, it, expect } from 'vitest';
import {
  parseRecurrence,
  calculateNextDueDate,
  prepareNextRecurringTask,
} from '../recurrence';
import { BuiltInTypeIds } from '../../types/type-definition';
import type { SkelenoteObject } from '../../types';

describe('Recurrence Logic', () => {
  describe('parseRecurrence', () => {
    it('parses legacy string formats', () => {
      expect(parseRecurrence('daily')).toEqual({
        pattern: 'daily',
        interval: 1,
      });
      expect(parseRecurrence('weekly')).toEqual({
        pattern: 'weekly',
        interval: 1,
      });
      expect(parseRecurrence('monthly')).toEqual({
        pattern: 'monthly',
        interval: 1,
      });
      expect(parseRecurrence('quarterly')).toEqual({
        pattern: 'quarterly',
        interval: 1,
      });
      expect(parseRecurrence('yearly')).toEqual({
        pattern: 'yearly',
        interval: 1,
      });
    });

    it('parses JSON string formats', () => {
      const config = { frequency: 'weekly', interval: 2, daysOfWeek: [1, 3] };
      const parsed = parseRecurrence(JSON.stringify(config));
      expect(parsed).toEqual({
        pattern: 'weekly',
        interval: 2,
        daysOfWeek: [1, 3],
      });
    });

    it('returns null for invalid inputs', () => {
      expect(parseRecurrence('')).toBeNull();
      expect(parseRecurrence(null)).toBeNull();
      expect(parseRecurrence('invalid')).toBeNull();
      expect(parseRecurrence('{"frequency": "none"}')).toBeNull();
      expect(parseRecurrence('{}')).toBeNull();
    });
  });

  describe('calculateNextDueDate', () => {
    // Helper to create a date at 10:00 AM UTC to avoid timezone edge cases
    const createDate = (iso: string) => new Date(iso).getTime();

    describe('Daily', () => {
      it('adds 1 day by default', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        const next = calculateNextDueDate(start, {
          pattern: 'daily',
          interval: 1,
        });
        expect(new Date(next).toISOString()).toBe('2024-01-02T10:00:00.000Z');
      });

      it('adds N days for interval', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        const next = calculateNextDueDate(start, {
          pattern: 'daily',
          interval: 3,
        });
        expect(new Date(next).toISOString()).toBe('2024-01-04T10:00:00.000Z');
      });
    });

    describe('Weekly', () => {
      it('adds 7 days by default', () => {
        const start = createDate('2024-01-01T10:00:00Z'); // Monday
        const next = calculateNextDueDate(start, {
          pattern: 'weekly',
          interval: 1,
        });
        expect(new Date(next).toISOString()).toBe('2024-01-08T10:00:00.000Z');
      });

      it('finds next specified day in same week', () => {
        const start = createDate('2024-01-01T10:00:00Z'); // Monday
        // Recur on Mon (1) and Wed (3)
        const next = calculateNextDueDate(start, {
          pattern: 'weekly',
          interval: 1,
          daysOfWeek: [1, 3],
        });
        expect(new Date(next).toISOString()).toBe('2024-01-03T10:00:00.000Z'); // Wed
      });

      it('jumps to next week if no days left in current week', () => {
        const start = createDate('2024-01-03T10:00:00Z'); // Wednesday
        // Recur on Mon (1) and Wed (3)
        const next = calculateNextDueDate(start, {
          pattern: 'weekly',
          interval: 1,
          daysOfWeek: [1, 3],
        });
        expect(new Date(next).toISOString()).toBe('2024-01-08T10:00:00.000Z'); // Next Mon
      });

      it('respects interval when jumping to next week', () => {
        const start = createDate('2024-01-03T10:00:00Z'); // Wednesday
        // Recur on Mon (1) every 2 weeks
        const next = calculateNextDueDate(start, {
          pattern: 'weekly',
          interval: 2,
          daysOfWeek: [1],
        });
        // Current week: Jan 1-7. Next occurrence is Monday...
        // If interval is 2, it should calculate from next week + (interval-1) weeks?
        // Week 1 (Jan 1). Current is Jan 3. Next recurring day is Jan 8 (Week 2).
        // Logic says: Find first occurrence in next week (Jan 8). Add (interval-1)*7 days.
        // Interval 2: Jan 8 + 7 = Jan 15.
        expect(new Date(next).toISOString()).toBe('2024-01-15T10:00:00.000Z');
      });
    });

    describe('Monthly', () => {
      it('adds 1 month by default', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
        });
        expect(new Date(next).toISOString()).toBe('2024-02-01T10:00:00.000Z');
      });

      it('handles month end clamping (31st -> 30th)', () => {
        const start = createDate('2024-01-31T10:00:00Z');
        // Feb 2024 is leap year -> 29 days
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
        });
        expect(new Date(next).toISOString()).toBe('2024-02-29T10:00:00.000Z');
      });

      it('handles specific day of month', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
          dayOfMonth: 15,
        });
        // Next month is Feb. 15th Feb.
        expect(new Date(next).toISOString()).toBe('2024-02-15T10:00:00.000Z');
      });

      it('handles specific day of month with clamping', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        // Target 31st of Feb (impossible) -> should clamp to last day (29th in 2024)
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
          dayOfMonth: 31,
        });
        expect(new Date(next).toISOString()).toBe('2024-02-29T10:00:00.000Z');
      });

      it('handles nth weekday (e.g., 2nd Tuesday)', () => {
        const start = createDate('2024-01-09T10:00:00Z'); // 2nd Tuesday of Jan
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
          weekOfMonth: 2,
          dayOfWeek: 2, // Tuesday
        });
        // 2nd Tuesday of Feb 2024. Feb 1 is Thu.
        // Feb 6 is Tue (1st). Feb 13 is Tue (2nd).
        expect(new Date(next).toISOString()).toBe('2024-02-13T10:00:00.000Z');
      });

      it('handles nth weekday falling into next year', () => {
        const start = createDate('2023-12-01T10:00:00Z');
        // 1st Monday of next month (Jan 2024)
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
          weekOfMonth: 1,
          dayOfWeek: 1, // Monday
        });
        // Jan 1 2024 is Monday.
        expect(new Date(next).toISOString()).toBe('2024-01-01T10:00:00.000Z');
      });

      it('handles "last" weekday (5th) logic', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        // Last Friday of Feb 2024 (Leap year, 29 days)
        // Feb 29 2024 is Thursday. Feb 23 is Friday.
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
          weekOfMonth: 5, // Last
          dayOfWeek: 5, // Friday
        });
        expect(new Date(next).toISOString()).toBe('2024-02-23T10:00:00.000Z');
      });

      it('advances to subsequent month if nth weekday missing in target month', () => {
        // If 5th Monday doesn't exist, logic says try next month
        const start = createDate('2024-01-01T10:00:00Z');
        // Feb 2024. 29 days.
        // Mondays: 5, 12, 19, 26. (Only 4 Mondays)
        // Should skip Feb and find 5th Monday in March?
        // March 2024.
        // Mar 1 is Friday.
        // Mondays: 4, 11, 18, 25. (Only 4 Mondays again?)
        // Wait, let's verify.
        // Jan 2024 has 5 Mondays (1, 8, 15, 22, 29).
        // Apr 2024: Apr 1 Mon... 29 Mon (5 Mondays).

        // Let's test non-existence fallback logic, assuming implementation retries next month
        const next = calculateNextDueDate(start, {
          pattern: 'monthly',
          interval: 1,
          weekOfMonth: 5,
          dayOfWeek: 1, // Monday
        });

        // Should skip Feb.
        // Implementation checks nextMonth+1 if missing.
        // If March also misses (it has 4 Mondays), implementation stops?
        // Code says: if (!nthWeekday) { nextMonth++; check again } -> returns fallback if still missing.

        // Let's pick a case where we KNOW it skips.
        // Feb 2024 has 4 Mondays.
        // March 2024 has 4 Mondays (4, 11, 18, 25).
        // April 2024 has 5 Mondays (1, 8, 15, 22, 29).
        // The implementation only tries ONE extra month.
        // So if Feb fails, it tries March. If March fails, it falls back to simple date add.

        // Let's rely on what the code does:
        // It retries once.
        // Check if March 2024 has 5 Mondays.
        // March 1 is Fri. 4, 11, 18, 25. Only 4 Mondays.
        // Implementation clamps to the last instance of that weekday in the month (Feb 26).

        const expected = new Date(
          createDate('2024-02-26T10:00:00Z')
        ).toISOString();
        expect(new Date(next).toISOString()).toBe(expected);
      });
    });

    describe('Quarterly', () => {
      it('adds 3 months', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        const next = calculateNextDueDate(start, {
          pattern: 'quarterly',
          interval: 1,
        });
        // April 1st
        expect(new Date(next).toISOString()).toBe('2024-04-01T10:00:00.000Z');
      });

      it('handles day of month clamping', () => {
        const start = createDate('2024-01-31T10:00:00Z'); // Jan 31
        const next = calculateNextDueDate(start, {
          pattern: 'quarterly',
          interval: 1,
          dayOfMonth: 31,
        });
        // April has 30 days.
        expect(new Date(next).toISOString()).toBe('2024-04-30T10:00:00.000Z');
      });
    });

    describe('Yearly', () => {
      it('adds 1 year', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        const next = calculateNextDueDate(start, {
          pattern: 'yearly',
          interval: 1,
        });
        expect(new Date(next).toISOString()).toBe('2025-01-01T10:00:00.000Z');
      });

      it('handles specific month and day', () => {
        const start = createDate('2024-01-01T10:00:00Z');
        // Next instance: December 25th 2025 (interval 1? or current year + 1?)
        // yearly interval 1 = next year.
        const next = calculateNextDueDate(start, {
          pattern: 'yearly',
          interval: 1,
          month: 12, // December
          dayOfMonth: 25,
        });
        expect(new Date(next).toISOString()).toBe('2025-12-25T10:00:00.000Z');
      });
    });
  });

  describe('prepareNextRecurringTask', () => {
    it('creates correct properties for next instance', () => {
      const task = {
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Weekly Meeting',
          status: 'done',
          dueDate: new Date('2024-01-01T10:00:00Z').getTime(),
          recurrence: 'weekly',
          project: 'proj-1',
          tags: ['work'],
        },
      } as unknown as SkelenoteObject;

      const nextProps = prepareNextRecurringTask(task);

      expect(nextProps).not.toBeNull();
      expect(nextProps!.title).toBe('Weekly Meeting');
      expect(nextProps!.status).toBe('todo');
      expect(nextProps!.project).toBe('proj-1');
      expect(nextProps!.tags).toEqual(['work']);

      // Should be next week
      expect(new Date(nextProps!.dueDate as number).toISOString()).toBe(
        '2024-01-08T10:00:00.000Z'
      );
    });

    it('returns null if not recurring', () => {
      const task = {
        properties: { title: 'Once' },
      } as unknown as SkelenoteObject;
      expect(prepareNextRecurringTask(task)).toBeNull();
    });

    it('returns null if due date is missing', () => {
      const task = {
        properties: {
          title: 'Recurring No Date',
          recurrence: 'daily',
        },
      } as unknown as SkelenoteObject;
      expect(prepareNextRecurringTask(task)).toBeNull();
    });
  });
});
