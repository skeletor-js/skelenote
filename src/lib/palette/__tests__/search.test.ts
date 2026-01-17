/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { searchObjects, sortByRelevance } from '../search';
import type {
  SkelenoteObject,
  TypeRegistry,
  TypeDefinition,
} from '@/lib/types';

// Mock type registry
const mockTypeRegistry: TypeRegistry = {
  get: vi.fn((typeId: string) => {
    if (typeId === 'built-in:task') {
      return {
        id: 'built-in:task',
        name: 'Task',
        icon: 'circle-check',
        schema: [],
        hasContent: false,
        isBuiltIn: true,
      } as TypeDefinition;
    }
    if (typeId === 'built-in:note') {
      return {
        id: 'built-in:note',
        name: 'Note',
        icon: 'file-text',
        schema: [],
        hasContent: true,
        isBuiltIn: true,
      } as TypeDefinition;
    }
    return undefined;
  }),
  getAll: vi.fn(() => []),
  has: vi.fn(() => true),
  register: vi.fn(),
};

describe('lib/palette/search', () => {
  describe('searchObjects', () => {
    const mockObjects: SkelenoteObject[] = [
      {
        id: '1',
        typeId: 'built-in:task',
        properties: { title: 'Buy groceries' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: '2',
        typeId: 'built-in:note',
        properties: { title: 'Meeting notes' },
        hasContent: true,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: 1500,
        updatedAt: 2500,
      },
      {
        id: '3',
        typeId: 'built-in:task',
        properties: { title: 'Call dentist' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: 1200,
        updatedAt: 1800,
      },
    ];

    it('should return empty array for empty query', () => {
      const result = searchObjects(mockObjects, '', mockTypeRegistry);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for whitespace query', () => {
      const result = searchObjects(mockObjects, '   ', mockTypeRegistry);
      expect(result).toHaveLength(0);
    });

    it('should find objects by title match', () => {
      const result = searchObjects(mockObjects, 'groceries', mockTypeRegistry);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('object-1');
      expect(result[0].label).toBe('Buy groceries');
    });

    it('should return palette actions with correct structure', () => {
      const result = searchObjects(mockObjects, 'buy', mockTypeRegistry);
      expect(result[0]).toEqual({
        id: 'object-1',
        label: 'Buy groceries',
        icon: 'circle-check',
        category: 'object',
        objectId: '1',
      });
    });

    it('should use fuzzy matching', () => {
      const result = searchObjects(mockObjects, 'mtg', mockTypeRegistry);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Meeting notes');
    });

    it('should respect limit parameter', () => {
      const result = searchObjects(mockObjects, 'e', mockTypeRegistry, 1);
      expect(result).toHaveLength(1);
    });

    it('should skip objects without title or name', () => {
      const objectsWithMissing: SkelenoteObject[] = [
        {
          id: '4',
          typeId: 'built-in:task',
          properties: {},
          hasContent: false,
          inboxed: false,
          pinned: false,
          archived: false,
          createdAt: 1000,
          updatedAt: 2000,
        },
        ...mockObjects,
      ];
      const result = searchObjects(
        objectsWithMissing,
        'e',
        mockTypeRegistry,
        10
      );
      // Should not include the object without title
      expect(result.every((r) => r.label)).toBe(true);
    });

    it('should use name property if title is missing', () => {
      const objectsWithName: SkelenoteObject[] = [
        {
          id: '5',
          typeId: 'built-in:note',
          properties: { name: 'Named object' },
          hasContent: false,
          inboxed: false,
          pinned: false,
          archived: false,
          createdAt: 1000,
          updatedAt: 2000,
        },
      ];
      const result = searchObjects(objectsWithName, 'named', mockTypeRegistry);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Named object');
    });

    it('should use default icon for unknown types', () => {
      const unknownTypeObjects: SkelenoteObject[] = [
        {
          id: '6',
          typeId: 'unknown-type',
          properties: { title: 'Unknown type object' },
          hasContent: false,
          inboxed: false,
          pinned: false,
          archived: false,
          createdAt: 1000,
          updatedAt: 2000,
        },
      ];
      const result = searchObjects(
        unknownTypeObjects,
        'unknown',
        mockTypeRegistry
      );
      expect(result[0].icon).toBe('📄');
    });
  });

  describe('sortByRelevance', () => {
    const objects: SkelenoteObject[] = [
      {
        id: '1',
        typeId: 'built-in:task',
        properties: { title: 'Old' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: '2',
        typeId: 'built-in:task',
        properties: { title: 'Newest' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: 1000,
        updatedAt: 3000,
      },
      {
        id: '3',
        typeId: 'built-in:task',
        properties: { title: 'Middle' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];

    it('should sort by updatedAt descending', () => {
      const result = sortByRelevance(objects);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });

    it('should not modify original array', () => {
      const original = [...objects];
      sortByRelevance(objects);
      expect(objects).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = sortByRelevance([]);
      expect(result).toEqual([]);
    });

    it('should handle single item array', () => {
      const result = sortByRelevance([objects[0]]);
      expect(result).toHaveLength(1);
    });
  });
});
