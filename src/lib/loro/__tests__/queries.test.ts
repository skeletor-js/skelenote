import { describe, it, expect } from 'vitest';
import { query, executeQuery } from '../queries';
import type { SkelenoteObject } from '../../types';

// Helper to create mock objects
function createMockObject(
  overrides: Partial<SkelenoteObject> = {}
): SkelenoteObject {
  return {
    id: overrides.id ?? `obj-${Math.random().toString(36).slice(2)}`,
    typeId: overrides.typeId ?? 'task',
    properties: {
      title: 'Test',
      status: 'todo',
      priority: null,
      dueDate: null,
      ...overrides.properties,
    },
    hasContent: overrides.hasContent ?? true,
    inboxed: overrides.inboxed ?? false,
    pinned: overrides.pinned ?? false,
    archived: overrides.archived ?? false,
    createdAt: overrides.createdAt ?? 1000,
    updatedAt: overrides.updatedAt ?? 1000,
  };
}

describe('Query System', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Filter Operators
  // ─────────────────────────────────────────────────────────────────────────

  describe('Filter Operators', () => {
    const objects = [
      createMockObject({
        id: '1',
        properties: {
          title: 'Alpha',
          status: 'todo',
          priority: 'high',
          dueDate: 1000,
        },
      }),
      createMockObject({
        id: '2',
        properties: {
          title: 'Beta',
          status: 'done',
          priority: 'low',
          dueDate: 2000,
        },
      }),
      createMockObject({
        id: '3',
        properties: {
          title: 'Gamma',
          status: 'todo',
          priority: null,
          dueDate: null,
        },
      }),
    ];

    describe('eq (equals)', () => {
      it('should match equal string values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'status', operator: 'eq', value: 'todo' }],
        });
        expect(result).toHaveLength(2);
      });

      it('should match null values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'priority', operator: 'eq', value: null }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('3');
      });
    });

    describe('neq (not equals)', () => {
      it('should exclude matching values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'status', operator: 'neq', value: 'done' }],
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('gt (greater than)', () => {
      it('should filter by greater than', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'dueDate', operator: 'gt', value: 1000 }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should return empty for non-numeric values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'title', operator: 'gt', value: 'Alpha' }],
        });
        expect(result).toHaveLength(0);
      });
    });

    describe('gte (greater than or equal)', () => {
      it('should include equal values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'dueDate', operator: 'gte', value: 1000 }],
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('lt (less than)', () => {
      it('should filter by less than', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'dueDate', operator: 'lt', value: 2000 }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });

    describe('lte (less than or equal)', () => {
      it('should include equal values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'dueDate', operator: 'lte', value: 2000 }],
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('contains', () => {
      it('should match substring (case-insensitive)', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'title', operator: 'contains', value: 'alp' }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });

      it('should return empty for non-string values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'dueDate', operator: 'contains', value: '1' }],
        });
        expect(result).toHaveLength(0);
      });
    });

    describe('startsWith', () => {
      it('should match prefix (case-insensitive)', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'title', operator: 'startsWith', value: 'bet' }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });
    });

    describe('endsWith', () => {
      it('should match suffix (case-insensitive)', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'title', operator: 'endsWith', value: 'ma' }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('3');
      });
    });

    describe('in', () => {
      it('should match if value is in array', () => {
        const result = executeQuery(objects, {
          filters: [
            { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
          ],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });

    describe('notIn', () => {
      it('should exclude values in array', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'priority', operator: 'notIn', value: ['high'] }],
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('isNull', () => {
      it('should match null values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'priority', operator: 'isNull' }],
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('3');
      });
    });

    describe('isNotNull', () => {
      it('should match non-null values', () => {
        const result = executeQuery(objects, {
          filters: [{ field: 'priority', operator: 'isNotNull' }],
        });
        expect(result).toHaveLength(2);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Built-in Field Access
  // ─────────────────────────────────────────────────────────────────────────

  describe('Built-in Field Access', () => {
    const objects = [
      createMockObject({
        id: '1',
        typeId: 'task',
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: 1000,
        updatedAt: 2000,
      }),
      createMockObject({
        id: '2',
        typeId: 'note',
        inboxed: false,
        pinned: true,
        archived: false,
        createdAt: 2000,
        updatedAt: 3000,
      }),
      createMockObject({
        id: '3',
        typeId: 'task',
        inboxed: false,
        pinned: false,
        archived: true,
        createdAt: 3000,
        updatedAt: 4000,
      }),
    ];

    it('should filter by id', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'id', operator: 'eq', value: '2' }],
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by typeId', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'typeId', operator: 'eq', value: 'task' }],
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by inboxed', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'inboxed', operator: 'eq', value: true }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by pinned', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'pinned', operator: 'eq', value: true }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should filter by archived', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'archived', operator: 'eq', value: true }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should filter by createdAt', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'createdAt', operator: 'gt', value: 1500 }],
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by updatedAt', () => {
      const result = executeQuery(objects, {
        filters: [{ field: 'updatedAt', operator: 'lte', value: 3000 }],
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Sorting
  // ─────────────────────────────────────────────────────────────────────────

  describe('Sorting', () => {
    const objects = [
      createMockObject({
        id: '1',
        properties: { title: 'Charlie' },
        createdAt: 2000,
      }),
      createMockObject({
        id: '2',
        properties: { title: 'Alpha' },
        createdAt: 3000,
      }),
      createMockObject({
        id: '3',
        properties: { title: 'Beta' },
        createdAt: 1000,
      }),
    ];

    it('should sort ascending by string', () => {
      const result = executeQuery(objects, {
        sort: { field: 'title', direction: 'asc' },
      });
      expect(result.map((o) => o.properties.title)).toEqual([
        'Alpha',
        'Beta',
        'Charlie',
      ]);
    });

    it('should sort descending by string', () => {
      const result = executeQuery(objects, {
        sort: { field: 'title', direction: 'desc' },
      });
      expect(result.map((o) => o.properties.title)).toEqual([
        'Charlie',
        'Beta',
        'Alpha',
      ]);
    });

    it('should sort ascending by number', () => {
      const result = executeQuery(objects, {
        sort: { field: 'createdAt', direction: 'asc' },
      });
      expect(result.map((o) => o.id)).toEqual(['3', '1', '2']);
    });

    it('should sort descending by number', () => {
      const result = executeQuery(objects, {
        sort: { field: 'createdAt', direction: 'desc' },
      });
      expect(result.map((o) => o.id)).toEqual(['2', '1', '3']);
    });

    describe('null handling', () => {
      const objectsWithNulls = [
        createMockObject({ id: '1', properties: { dueDate: 2000 } }),
        createMockObject({ id: '2', properties: { dueDate: null } }),
        createMockObject({ id: '3', properties: { dueDate: 1000 } }),
      ];

      it('should put nulls last in ascending sort', () => {
        const result = executeQuery(objectsWithNulls, {
          sort: { field: 'dueDate', direction: 'asc' },
        });
        expect(result.map((o) => o.id)).toEqual(['3', '1', '2']);
      });

      it('should put nulls first in descending sort', () => {
        const result = executeQuery(objectsWithNulls, {
          sort: { field: 'dueDate', direction: 'desc' },
        });
        // In descending sort, nulls sort first (lowest values come after highest)
        expect(result.map((o) => o.id)).toEqual(['2', '1', '3']);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────────────────────

  describe('Pagination', () => {
    const objects = [
      createMockObject({ id: '1' }),
      createMockObject({ id: '2' }),
      createMockObject({ id: '3' }),
      createMockObject({ id: '4' }),
      createMockObject({ id: '5' }),
    ];

    describe('limit', () => {
      it('should limit results', () => {
        const result = executeQuery(objects, { limit: 3 });
        expect(result).toHaveLength(3);
      });

      it('should return all if limit exceeds count', () => {
        const result = executeQuery(objects, { limit: 10 });
        expect(result).toHaveLength(5);
      });
    });

    describe('offset', () => {
      it('should skip results', () => {
        const result = executeQuery(objects, { offset: 2 });
        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('3');
      });

      it('should return empty if offset exceeds count', () => {
        const result = executeQuery(objects, { offset: 10 });
        expect(result).toHaveLength(0);
      });
    });

    describe('limit + offset', () => {
      it('should paginate correctly', () => {
        const result = executeQuery(objects, { limit: 2, offset: 1 });
        expect(result).toHaveLength(2);
        expect(result.map((o) => o.id)).toEqual(['2', '3']);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QueryBuilder Fluent API
  // ─────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder', () => {
    const objects = [
      createMockObject({
        id: '1',
        typeId: 'task',
        inboxed: true,
        properties: { status: 'todo' },
        createdAt: 1000,
      }),
      createMockObject({
        id: '2',
        typeId: 'note',
        inboxed: false,
        properties: { status: 'done' },
        createdAt: 2000,
      }),
      createMockObject({
        id: '3',
        typeId: 'task',
        inboxed: false,
        archived: true,
        properties: { status: 'todo' },
        createdAt: 3000,
      }),
    ];

    describe('where', () => {
      it('should add filter condition', () => {
        const result = query(objects).where('status', 'eq', 'todo').execute();
        expect(result).toHaveLength(2);
      });

      it('should chain multiple filters (AND)', () => {
        const result = query(objects)
          .where('status', 'eq', 'todo')
          .where('inboxed', 'eq', true)
          .execute();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });

    describe('whereEquals', () => {
      it('should be shorthand for eq', () => {
        const result = query(objects).whereEquals('status', 'done').execute();
        expect(result).toHaveLength(1);
      });
    });

    describe('ofType', () => {
      it('should filter by typeId', () => {
        const result = query(objects).ofType('task').execute();
        expect(result).toHaveLength(2);
      });
    });

    describe('inboxed', () => {
      it('should filter by inboxed=true', () => {
        const result = query(objects).inboxed().execute();
        expect(result).toHaveLength(1);
      });

      it('should filter by inboxed=false', () => {
        const result = query(objects).inboxed(false).execute();
        expect(result).toHaveLength(2);
      });
    });

    describe('archived', () => {
      it('should filter by archived=true', () => {
        const result = query(objects).archived().execute();
        expect(result).toHaveLength(1);
      });
    });

    describe('sortBy', () => {
      it('should sort results', () => {
        const result = query(objects).sortBy('createdAt', 'desc').execute();
        expect(result[0].id).toBe('3');
      });
    });

    describe('sortByCreated', () => {
      it('should sort by createdAt descending by default', () => {
        const result = query(objects).sortByCreated().execute();
        expect(result[0].id).toBe('3');
      });
    });

    describe('sortByUpdated', () => {
      it('should sort by updatedAt', () => {
        const result = query(objects).sortByUpdated('asc').execute();
        expect(result[0].id).toBe('1');
      });
    });

    describe('limit', () => {
      it('should limit results', () => {
        const result = query(objects).limit(1).execute();
        expect(result).toHaveLength(1);
      });
    });

    describe('offset', () => {
      it('should skip results', () => {
        const result = query(objects).offset(1).execute();
        expect(result).toHaveLength(2);
      });
    });

    describe('execute', () => {
      it('should return filtered, sorted, paginated results', () => {
        const result = query(objects)
          .ofType('task')
          .where('archived', 'eq', false)
          .sortBy('createdAt', 'asc')
          .execute();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });

    describe('first', () => {
      it('should return first result', () => {
        const result = query(objects).sortBy('createdAt', 'asc').first();
        expect(result?.id).toBe('1');
      });

      it('should return undefined if no results', () => {
        const result = query(objects)
          .where('typeId', 'eq', 'nonexistent')
          .first();
        expect(result).toBeUndefined();
      });
    });

    describe('count', () => {
      it('should return count of matching objects', () => {
        const count = query(objects).ofType('task').count();
        expect(count).toBe(2);
      });

      it('should ignore limit/offset for count', () => {
        const count = query(objects).limit(1).offset(1).count();
        expect(count).toBe(3);
      });
    });
  });
});
