import { describe, it, expect } from 'vitest';
import {
  createTypeRegistry,
  BuiltInTypeIds,
  type TypeDefinition,
} from '../type-definition';
import { TaskType, NoteType, ProjectType, TagType } from '../built-in-types';

// Helper to create a minimal type definition for testing
function createMockType(
  overrides: Partial<TypeDefinition> = {}
): TypeDefinition {
  return {
    id: 'test-type',
    name: 'Test Type',
    icon: 'test',
    schema: [],
    hasContent: false,
    isBuiltIn: false,
    ...overrides,
  };
}

describe('BuiltInTypeIds', () => {
  it('should have all expected built-in type IDs', () => {
    expect(BuiltInTypeIds.TASK).toBe('task');
    expect(BuiltInTypeIds.NOTE).toBe('note');
    expect(BuiltInTypeIds.PROJECT).toBe('project');
    expect(BuiltInTypeIds.AREA).toBe('area');
    expect(BuiltInTypeIds.LINK).toBe('link');
    expect(BuiltInTypeIds.MEETING).toBe('meeting');
    expect(BuiltInTypeIds.TAG).toBe('tag');
    expect(BuiltInTypeIds.PERSON).toBe('person');
    expect(BuiltInTypeIds.TEMPLATE).toBe('template');
  });

  it('should be read-only', () => {
    // TypeScript ensures this at compile time with 'as const'
    // Runtime check that the object exists and is string-valued
    const values = Object.values(BuiltInTypeIds);
    expect(values.every((v) => typeof v === 'string')).toBe(true);
  });
});

describe('createTypeRegistry', () => {
  describe('initialization', () => {
    it('should create an empty registry when no initial types provided', () => {
      const registry = createTypeRegistry();
      expect(registry.getAll()).toEqual([]);
    });

    it('should create a registry with initial types', () => {
      const registry = createTypeRegistry([TaskType, NoteType]);
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should preserve order of initial types', () => {
      const registry = createTypeRegistry([TaskType, NoteType, ProjectType]);
      const types = registry.getAll();
      expect(types[0].id).toBe(BuiltInTypeIds.TASK);
      expect(types[1].id).toBe(BuiltInTypeIds.NOTE);
      expect(types[2].id).toBe(BuiltInTypeIds.PROJECT);
    });
  });

  describe('get', () => {
    it('should return a type by ID', () => {
      const registry = createTypeRegistry([TaskType, NoteType]);
      const task = registry.get(BuiltInTypeIds.TASK);
      expect(task).toBeDefined();
      expect(task?.name).toBe('Task');
    });

    it('should return undefined for non-existent type ID', () => {
      const registry = createTypeRegistry([TaskType]);
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should return undefined from empty registry', () => {
      const registry = createTypeRegistry();
      expect(registry.get(BuiltInTypeIds.TASK)).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered type', () => {
      const registry = createTypeRegistry([TaskType]);
      expect(registry.has(BuiltInTypeIds.TASK)).toBe(true);
    });

    it('should return false for unregistered type', () => {
      const registry = createTypeRegistry([TaskType]);
      expect(registry.has(BuiltInTypeIds.NOTE)).toBe(false);
    });

    it('should return false for empty registry', () => {
      const registry = createTypeRegistry();
      expect(registry.has(BuiltInTypeIds.TASK)).toBe(false);
    });
  });

  describe('register', () => {
    it('should add a new type to the registry', () => {
      const registry = createTypeRegistry();
      const customType = createMockType({ id: 'custom', name: 'Custom' });

      registry.register(customType);

      expect(registry.has('custom')).toBe(true);
      expect(registry.get('custom')?.name).toBe('Custom');
    });

    it('should throw error when registering duplicate type ID', () => {
      const registry = createTypeRegistry([TaskType]);

      expect(() => registry.register(TaskType)).toThrow(
        'Type with ID "task" is already registered'
      );
    });

    it('should allow registering multiple different types', () => {
      const registry = createTypeRegistry();

      registry.register(createMockType({ id: 'type-1', name: 'Type 1' }));
      registry.register(createMockType({ id: 'type-2', name: 'Type 2' }));
      registry.register(createMockType({ id: 'type-3', name: 'Type 3' }));

      expect(registry.getAll()).toHaveLength(3);
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty registry', () => {
      const registry = createTypeRegistry();
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered types', () => {
      const registry = createTypeRegistry([
        TaskType,
        NoteType,
        ProjectType,
        TagType,
      ]);
      const all = registry.getAll();

      expect(all).toHaveLength(4);
      expect(all.map((t) => t.id)).toContain(BuiltInTypeIds.TASK);
      expect(all.map((t) => t.id)).toContain(BuiltInTypeIds.NOTE);
      expect(all.map((t) => t.id)).toContain(BuiltInTypeIds.PROJECT);
      expect(all.map((t) => t.id)).toContain(BuiltInTypeIds.TAG);
    });

    it('should include dynamically registered types', () => {
      const registry = createTypeRegistry([TaskType]);
      registry.register(createMockType({ id: 'custom', name: 'Custom' }));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((t) => t.id)).toContain('custom');
    });
  });
});
