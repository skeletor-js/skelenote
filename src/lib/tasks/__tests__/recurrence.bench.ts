/**
 * Performance benchmarks for Task Recurrence calculations
 *
 * Run with: pnpm vitest bench src/lib/tasks/__tests__/recurrence.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import {
    parseRecurrence,
    calculateNextDueDate,
    prepareNextRecurringTask,
    type RecurrenceConfig,
} from '../recurrence';
import type { SkelenoteObject } from '@/lib/types';
import { BuiltInTypeIds } from '@/lib/types';

// Create a mock recurring task
function createMockRecurringTask(
    recurrence: string,
    dueDate: number
): SkelenoteObject {
    return {
        id: `task-${Math.random()}`,
        typeId: BuiltInTypeIds.TASK,
        properties: {
            title: 'Recurring Task',
            status: 'done',
            recurrence,
            dueDate,
            priority: 2,
        },
        hasContent: false,
        inboxed: false,
        pinned: false,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
    };
}

describe('Recurrence Parsing Performance', () => {
    bench('parse simple recurrence (daily)', () => {
        parseRecurrence('daily');
    });

    bench('parse simple recurrence (weekly)', () => {
        parseRecurrence('weekly');
    });

    bench(
        'parse JSON recurrence (weekly with days)',
        () => {
            parseRecurrence(JSON.stringify({ frequency: 'weekly', daysOfWeek: [1, 3, 5] }));
        }
    );

    bench(
        'parse JSON recurrence (monthly nth weekday)',
        () => {
            parseRecurrence(
                JSON.stringify({ frequency: 'monthly', weekOfMonth: 2, dayOfWeek: 1 })
            );
        }
    );
});

describe('Next Due Date Calculation', () => {
    let dailyConfig: RecurrenceConfig;
    let weeklyConfig: RecurrenceConfig;
    let monthlyConfig: RecurrenceConfig;
    let complexWeeklyConfig: RecurrenceConfig;
    const baseDue = Date.now();

    beforeAll(() => {
        dailyConfig = parseRecurrence('daily')!;
        weeklyConfig = parseRecurrence('weekly')!;
        monthlyConfig = parseRecurrence('monthly')!;
        complexWeeklyConfig = parseRecurrence(
            JSON.stringify({ frequency: 'weekly', daysOfWeek: [1, 3, 5], interval: 2 })
        )!;
    });

    bench('calculate next daily', () => {
        calculateNextDueDate(baseDue, dailyConfig);
    });

    bench('calculate next weekly', () => {
        calculateNextDueDate(baseDue, weeklyConfig);
    });

    bench('calculate next monthly', () => {
        calculateNextDueDate(baseDue, monthlyConfig);
    });

    bench('calculate complex weekly (MWF every 2 weeks)', () => {
        calculateNextDueDate(baseDue, complexWeeklyConfig);
    });
});

describe('Full Recurring Task Preparation', () => {
    let dailyTask: SkelenoteObject;
    let weeklyTask: SkelenoteObject;
    let complexTask: SkelenoteObject;

    beforeAll(() => {
        dailyTask = createMockRecurringTask('daily', Date.now());
        weeklyTask = createMockRecurringTask('weekly', Date.now());
        complexTask = createMockRecurringTask(
            JSON.stringify({ frequency: 'weekly', daysOfWeek: [1, 3, 5] }),
            Date.now()
        );
    });

    bench('prepare next daily task', () => {
        prepareNextRecurringTask(dailyTask);
    });

    bench('prepare next weekly task', () => {
        prepareNextRecurringTask(weeklyTask);
    });

    bench('prepare next complex weekly task', () => {
        prepareNextRecurringTask(complexTask);
    });
});

describe('Bulk Recurrence Calculations', () => {
    let tasks: SkelenoteObject[];

    beforeAll(() => {
        const patterns = ['daily', 'weekly', 'monthly', 'yearly'];
        tasks = [];
        for (let i = 0; i < 100; i++) {
            tasks.push(
                createMockRecurringTask(
                    patterns[i % patterns.length],
                    Date.now() + i * 86400000
                )
            );
        }
    });

    bench('process 100 recurring tasks', () => {
        for (const task of tasks) {
            prepareNextRecurringTask(task);
        }
    });
});
