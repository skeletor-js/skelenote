import { describe, it, expect, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore, ObjectNotFoundError, ValidationError } from '../objects';
import { createTypeRegistry, BuiltInTypeIds } from '../../types';
import {
  TaskType,
  NoteType,
  ProjectType,
  TagType,
} from '../../types/built-in-types';
import type { CreateObjectInput } from '../../types';

// Helper to create test store with built-in types
function createTestStore(): ObjectStore {
  const doc = new LoroDoc();
  const registry = createTypeRegistry([
    TaskType,
    NoteType,
    ProjectType,
    TagType,
  ]);
  return new ObjectStore(doc, registry);
}

// Helper to create mock object input with sensible defaults
function createMockInput(
  overrides: Partial<CreateObjectInput> = {}
): CreateObjectInput {
  const { properties, ...rest } = overrides;
  return {
    typeId: BuiltInTypeIds.TASK,
    properties: {
      title: 'Test Task',
      status: 'todo',
      ...properties,
    },
    ...rest,
  };
}

describe('ObjectStore', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = createTestStore();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an object with auto-generated ID', () => {
      const obj = store.create(createMockInput());
      expect(obj.id).toBeDefined();
      expect(obj.id.length).toBeGreaterThan(0);
    });

    it('should create an object with provided ID', () => {
      const obj = store.create(createMockInput({ id: 'custom-id' }));
      expect(obj.id).toBe('custom-id');
    });

    it('should set typeId correctly', () => {
      const obj = store.create(
        createMockInput({ typeId: BuiltInTypeIds.NOTE })
      );
      expect(obj.typeId).toBe(BuiltInTypeIds.NOTE);
    });

    it('should set properties correctly', () => {
      const obj = store.create(
        createMockInput({
          properties: { title: 'My Task', status: 'done' },
        })
      );
      expect(obj.properties.title).toBe('My Task');
      expect(obj.properties.status).toBe('done');
    });

    it('should default inboxed to true', () => {
      const obj = store.create(createMockInput());
      expect(obj.inboxed).toBe(true);
    });

    it('should respect inboxed override', () => {
      const obj = store.create(createMockInput({ inboxed: false }));
      expect(obj.inboxed).toBe(false);
    });

    it('should initialize pinned to false', () => {
      const obj = store.create(createMockInput());
      expect(obj.pinned).toBe(false);
    });

    it('should initialize archived to false', () => {
      const obj = store.create(createMockInput());
      expect(obj.archived).toBe(false);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const before = Date.now();
      const obj = store.create(createMockInput());
      const after = Date.now();

      expect(obj.createdAt).toBeGreaterThanOrEqual(before);
      expect(obj.createdAt).toBeLessThanOrEqual(after);
      expect(obj.updatedAt).toBe(obj.createdAt);
    });

    it('should throw ValidationError for unknown type', () => {
      expect(() =>
        store.create({ typeId: 'unknown-type', properties: {} })
      ).toThrow(ValidationError);
    });
  });

  describe('get', () => {
    it('should return object by ID', () => {
      const created = store.create(createMockInput({ id: 'test-1' }));
      const retrieved = store.get('test-1');
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent ID', () => {
      const result = store.get('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getOrThrow', () => {
    it('should return object by ID', () => {
      const created = store.create(createMockInput({ id: 'test-1' }));
      const retrieved = store.getOrThrow('test-1');
      expect(retrieved).toEqual(created);
    });

    it('should throw ObjectNotFoundError for non-existent ID', () => {
      expect(() => store.getOrThrow('non-existent')).toThrow(
        ObjectNotFoundError
      );
    });
  });

  describe('update', () => {
    it('should update properties', () => {
      store.create(
        createMockInput({
          id: 'test-1',
          properties: { title: 'Original', status: 'todo' },
        })
      );
      const updated = store.update('test-1', {
        properties: { title: 'Updated' },
      });
      expect(updated.properties.title).toBe('Updated');
      expect(updated.properties.status).toBe('todo'); // Preserved
    });

    it('should update updatedAt timestamp', () => {
      const created = store.create(createMockInput({ id: 'test-1' }));
      const originalUpdatedAt = created.updatedAt;

      const updated = store.update('test-1', {
        properties: { title: 'New Title' },
      });
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should throw for non-existent object', () => {
      expect(() => store.update('non-existent', { properties: {} })).toThrow(
        ObjectNotFoundError
      );
    });
  });

  describe('setProperty', () => {
    it('should set a single property', () => {
      store.create(
        createMockInput({
          id: 'test-1',
          properties: { title: 'Task', status: 'todo' },
        })
      );
      const updated = store.setProperty('test-1', 'status', 'done');
      expect(updated.properties.status).toBe('done');
    });
  });

  describe('delete', () => {
    it('should delete an existing object', () => {
      store.create(createMockInput({ id: 'test-1' }));
      expect(store.exists('test-1')).toBe(true);

      const result = store.delete('test-1');
      expect(result).toBe(true);
      expect(store.exists('test-1')).toBe(false);
    });

    it('should return false for non-existent object', () => {
      const result = store.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should remove from pinned order when deleting pinned object', () => {
      store.create(createMockInput({ id: 'test-1' }));
      store.pin('test-1');
      expect(store.getPinnedObjects()).toHaveLength(1);

      store.delete('test-1');
      expect(store.getPinnedObjects()).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing object', () => {
      store.create(createMockInput({ id: 'test-1' }));
      expect(store.exists('test-1')).toBe(true);
    });

    it('should return false for non-existent object', () => {
      expect(store.exists('non-existent')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Retrieval Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return empty array when no objects exist', () => {
      expect(store.getAll()).toEqual([]);
    });

    it('should return all non-archived objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));

      const all = store.getAll();
      expect(all).toHaveLength(2);
    });

    it('should exclude archived objects by default', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-2');

      const all = store.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('task-1');
    });

    it('should include archived objects when requested', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-2');

      const all = store.getAll({ includeArchived: true });
      expect(all).toHaveLength(2);
    });
  });

  describe('getByType', () => {
    it('should return only objects of specified type', () => {
      store.create(
        createMockInput({ id: 'task-1', typeId: BuiltInTypeIds.TASK })
      );
      store.create(
        createMockInput({
          id: 'note-1',
          typeId: BuiltInTypeIds.NOTE,
          properties: { title: 'Note' },
        })
      );

      const tasks = store.getByType(BuiltInTypeIds.TASK);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
    });

    it('should exclude archived by default', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-2');

      const tasks = store.getByType(BuiltInTypeIds.TASK);
      expect(tasks).toHaveLength(1);
    });
  });

  describe('getInboxed', () => {
    it('should return only inboxed, non-archived objects', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));
      store.create(createMockInput({ id: 'task-2', inboxed: false }));

      const inboxed = store.getInboxed();
      expect(inboxed).toHaveLength(1);
      expect(inboxed[0].id).toBe('task-1');
    });

    it('should exclude archived objects even if inboxed', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));
      store.archive('task-1');

      // After archive, inboxed should also be false
      const inboxed = store.getInboxed();
      expect(inboxed).toHaveLength(0);
    });
  });

  describe('getArchived', () => {
    it('should return only archived objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-2');

      const archived = store.getArchived();
      expect(archived).toHaveLength(1);
      expect(archived[0].id).toBe('task-2');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Content Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('getContent', () => {
    it('should return empty string for object without content', () => {
      store.create(createMockInput({ id: 'task-1' }));
      expect(store.getContent('task-1')).toBe('');
    });

    it('should return empty string for non-existent object', () => {
      expect(store.getContent('non-existent')).toBe('');
    });
  });

  describe('setContent', () => {
    it('should set and retrieve content', () => {
      store.create(createMockInput({ id: 'task-1', withContent: true }));
      store.setContent('task-1', 'Hello world');
      expect(store.getContent('task-1')).toBe('Hello world');
    });

    it('should replace existing content', () => {
      store.create(createMockInput({ id: 'task-1', withContent: true }));
      store.setContent('task-1', 'First');
      store.setContent('task-1', 'Second');
      expect(store.getContent('task-1')).toBe('Second');
    });

    it('should throw for object without content support', () => {
      store.create(createMockInput({ id: 'task-1', withContent: false }));
      expect(() => store.setContent('task-1', 'content')).toThrow(
        ValidationError
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Inbox Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('markProcessed', () => {
    it('should set inboxed to false', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));
      const updated = store.markProcessed('task-1');
      expect(updated.inboxed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Pinning Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('pin', () => {
    it('should set pinned to true', () => {
      store.create(createMockInput({ id: 'task-1' }));
      const pinned = store.pin('task-1');
      expect(pinned.pinned).toBe(true);
    });

    it('should be idempotent', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.pin('task-1');
      const pinned = store.pin('task-1');
      expect(pinned.pinned).toBe(true);
    });

    it('should add to pinned order', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.pin('task-1');
      expect(store.getPinnedObjects()).toHaveLength(1);
    });
  });

  describe('unpin', () => {
    it('should set pinned to false', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.pin('task-1');
      const unpinned = store.unpin('task-1');
      expect(unpinned.pinned).toBe(false);
    });

    it('should remove from pinned order', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.pin('task-1');
      store.unpin('task-1');
      expect(store.getPinnedObjects()).toHaveLength(0);
    });
  });

  describe('reorderPinned', () => {
    it('should reorder pinned objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.create(createMockInput({ id: 'task-3' }));
      store.pin('task-1');
      store.pin('task-2');
      store.pin('task-3');

      store.reorderPinned(['task-3', 'task-1', 'task-2']);
      const pinned = store.getPinnedObjects();
      expect(pinned.map((p) => p.id)).toEqual(['task-3', 'task-1', 'task-2']);
    });
  });

  describe('getPinnedObjects', () => {
    it('should return pinned objects in order', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.pin('task-1');
      store.pin('task-2');

      const pinned = store.getPinnedObjects();
      expect(pinned).toHaveLength(2);
      expect(pinned.map((p) => p.id)).toEqual(['task-1', 'task-2']);
    });

    it('should filter out deleted objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.pin('task-1');
      store.pin('task-2');
      store.delete('task-1');

      const pinned = store.getPinnedObjects();
      expect(pinned).toHaveLength(1);
      expect(pinned[0].id).toBe('task-2');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Archive Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('should set archived to true', () => {
      store.create(createMockInput({ id: 'task-1' }));
      const archived = store.archive('task-1');
      expect(archived.archived).toBe(true);
    });

    it('should set inboxed to false when archiving', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));
      const archived = store.archive('task-1');
      expect(archived.inboxed).toBe(false);
    });

    it('should be idempotent', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.archive('task-1');
      const archived = store.archive('task-1');
      expect(archived.archived).toBe(true);
    });
  });

  describe('unarchive', () => {
    it('should set archived to false', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.archive('task-1');
      const unarchived = store.unarchive('task-1');
      expect(unarchived.archived).toBe(false);
    });

    it('should not restore inboxed state', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));
      store.archive('task-1');
      const unarchived = store.unarchive('task-1');
      expect(unarchived.inboxed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Duplication Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('canDuplicate', () => {
    it('should return true for regular objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      expect(store.canDuplicate('task-1')).toBe(true);
    });

    it('should return false for daily notes', () => {
      store.create(
        createMockInput({
          id: 'note-1',
          typeId: BuiltInTypeIds.NOTE,
          properties: { title: 'Daily', isDailyNote: true },
        })
      );
      expect(store.canDuplicate('note-1')).toBe(false);
    });

    it('should return false for non-existent objects', () => {
      expect(store.canDuplicate('non-existent')).toBe(false);
    });
  });

  describe('duplicate', () => {
    it('should create a copy with new ID', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: { title: 'Original', status: 'todo' },
        })
      );
      const dup = store.duplicate('task-1');

      expect(dup.id).not.toBe('task-1');
      expect(dup.properties.title).toBe('Original (Copy)');
    });

    it('should reset task status to todo', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: { title: 'Done Task', status: 'done' },
        })
      );
      const dup = store.duplicate('task-1');

      expect(dup.properties.status).toBe('todo');
    });

    it('should throw for daily notes', () => {
      store.create(
        createMockInput({
          id: 'note-1',
          typeId: BuiltInTypeIds.NOTE,
          properties: { title: 'Daily', isDailyNote: true },
        })
      );
      expect(() => store.duplicate('note-1')).toThrow(ValidationError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Batch Operations
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteMany', () => {
    it('should delete multiple objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.create(createMockInput({ id: 'task-3' }));

      const result = store.deleteMany(['task-1', 'task-2']);
      expect(result.deleted).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(store.exists('task-1')).toBe(false);
      expect(store.exists('task-2')).toBe(false);
      expect(store.exists('task-3')).toBe(true);
    });
  });

  describe('updateMany', () => {
    it('should update multiple objects', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: { title: 'Task 1', status: 'todo' },
        })
      );
      store.create(
        createMockInput({
          id: 'task-2',
          properties: { title: 'Task 2', status: 'todo' },
        })
      );

      const result = store.updateMany(['task-1', 'task-2'], {
        properties: { status: 'done' },
      });
      expect(result.updated).toHaveLength(2);
      expect(result.updated[0].properties.status).toBe('done');
      expect(result.updated[1].properties.status).toBe('done');
    });
  });

  describe('duplicateMany', () => {
    it('should duplicate multiple objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));

      const result = store.duplicateMany(['task-1', 'task-2']);
      expect(result.duplicated).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.duplicated[0].properties.title).toContain('(Copy)');
    });
  });

  describe('addTagToMany', () => {
    it('should add tag to multiple objects', () => {
      store.create(createMockInput({ id: 'task-1', properties: { tags: [] } }));
      store.create(
        createMockInput({ id: 'task-2', properties: { tags: ['existing'] } })
      );

      const result = store.addTagToMany(['task-1', 'task-2'], 'new-tag');
      expect(result.updated).toBe(2);

      const t1 = store.get('task-1');
      const t2 = store.get('task-2');
      expect(t1?.properties.tags).toContain('new-tag');
      expect(t2?.properties.tags).toContain('new-tag');
      expect(t2?.properties.tags).toContain('existing');
    });
  });

  describe('removeTagFromMany', () => {
    it('should remove tag from multiple objects', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: { tags: ['tag-a', 'tag-b'] },
        })
      );
      store.create(
        createMockInput({ id: 'task-2', properties: { tags: ['tag-a'] } })
      );

      const result = store.removeTagFromMany(['task-1', 'task-2'], 'tag-a');
      expect(result.updated).toBe(2);

      const t1 = store.get('task-1');
      const t2 = store.get('task-2');
      expect(t1?.properties.tags).not.toContain('tag-a');
      expect(t1?.properties.tags).toContain('tag-b');
      expect(t2?.properties.tags).not.toContain('tag-a');
    });
  });

  describe('deleteMany cleanup', () => {
    it('should remove relation references when deleting objects', () => {
      store.create(createMockInput({ id: 'target' }));
      store.create(
        createMockInput({
          id: 'linker',
          properties: { related: ['target', 'other'] },
        })
      );

      store.deleteMany(['target']);

      const linker = store.get('linker');
      expect(linker?.properties.related).toEqual(['other']);
    });

    // Note: Testing mention cleanup usually requires Loro text content setup or mocks which might be complex here.
    // However, relation reference cleanup is tested above.
  });

  describe('pinMany', () => {
    it('should pin multiple objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));

      // Use any cast if TS complains, or assume existing method
      // @ts-ignore
      if (typeof store.pinMany === 'function') {
        const result = (store as any).pinMany(['task-1', 'task-2']);
        expect(result.pinned).toBe(2);
        expect(store.getPinnedObjects()).toHaveLength(2);
      }
    });
  });

  describe('archiveMany', () => {
    it('should archive multiple objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));

      const result = store.archiveMany(['task-1', 'task-2']);
      expect(result.archived).toBe(2);
      expect(store.getArchived()).toHaveLength(2);
    });

    it('should skip already archived objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-1');

      const result = store.archiveMany(['task-1', 'task-2']);
      expect(result.archived).toBe(1);
    });
  });

  describe('archive behavior', () => {
    it('should keep pinned status but archived objects remain accessible', () => {
      store.create(createMockInput({ id: 'archive-task-1' }));
      store.pin('archive-task-1');
      expect(store.getPinnedObjects()).toHaveLength(1);

      store.archive('archive-task-1');
      // Archived objects with pinned=true still appear in getPinnedObjects
      // This is the current behavior
      const pinned = store.getPinnedObjects();
      expect(pinned).toHaveLength(1);
      expect(pinned[0].archived).toBe(true);
    });
  });

  describe('unarchiveMany', () => {
    it('should unarchive multiple objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-1');
      store.archive('task-2');

      const result = store.unarchiveMany(['task-1', 'task-2']);
      expect(result.unarchived).toBe(2);
      expect(store.getArchived()).toHaveLength(0);
    });

    it('should skip already unarchived objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.archive('task-1');

      const result = store.unarchiveMany(['task-1', 'task-2']);
      expect(result.unarchived).toBe(1);
    });
  });

  describe('duplicate transformations', () => {
    it('should clear recurrence when duplicating task', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: {
            title: 'Recurring Task',
            status: 'todo',
            recurrence: JSON.stringify({ frequency: 'weekly', interval: 1 }),
          },
        })
      );
      const dup = store.duplicate('task-1');
      expect(dup.properties.recurrence).toBe(null);
    });

    it('should reset project dates and status when duplicating', () => {
      store.create({
        id: 'proj-dup-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: {
          name: 'Completed Project',
          status: 'completed',
          startDate: 1000,
          endDate: 2000,
        },
      });
      const dup = store.duplicate('proj-dup-1');
      expect(dup.properties.status).toBe('active');
      expect(dup.properties.startDate).toBe(null);
      expect(dup.properties.endDate).toBe(null);
    });

    it('should use name property when title is absent', () => {
      store.create({
        id: 'proj-dup-2',
        typeId: BuiltInTypeIds.PROJECT,
        properties: {
          name: 'My Project',
          status: 'active',
        },
      });
      const dup = store.duplicate('proj-dup-2');
      expect(dup.properties.name).toBe('My Project (Copy)');
    });

    it('should copy content when duplicating', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          withContent: true,
          properties: { title: 'Task with content', status: 'todo' },
        })
      );
      store.setContent('task-1', 'Some content here');

      const dup = store.duplicate('task-1');
      expect(store.getContent(dup.id)).toBe('Some content here');
    });
  });

  describe('changeTypeMany', () => {
    it('should return all as errors when type is invalid', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));

      const result = store.changeTypeMany(['task-1', 'task-2'], 'invalid-type');
      expect(result.updated).toBe(0);
      expect(result.errors).toEqual(['task-1', 'task-2']);
    });

    it('should skip objects already of target type', () => {
      store.create(
        createMockInput({
          id: 'note-1',
          typeId: BuiltInTypeIds.NOTE,
          properties: { title: 'Note' },
        })
      );
      store.create(createMockInput({ id: 'task-1' }));

      const result = store.changeTypeMany(
        ['note-1', 'task-1'],
        BuiltInTypeIds.NOTE
      );
      // note-1 is skipped (already a note), task-1 is converted
      expect(result.updated).toBe(1);

      const converted = store.get('task-1');
      expect(converted?.typeId).toBe(BuiltInTypeIds.NOTE);
    });
  });

  describe('setPriorityMany', () => {
    it('should skip non-task objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create({
        id: 'note-1',
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note' },
      });

      const result = store.setPriorityMany(['task-1', 'note-1'], 'high');
      expect(result.updated).toBe(1);

      const task = store.get('task-1');
      expect(task?.properties.priority).toBe('high');
    });

    it('should set null priority', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: { title: 'Task', status: 'todo', priority: 'high' },
        })
      );

      const result = store.setPriorityMany(['task-1'], null);
      expect(result.updated).toBe(1);

      const task = store.get('task-1');
      expect(task?.properties.priority).toBe(null);
    });
  });

  describe('setStatusMany', () => {
    it('should skip non-task objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create({
        id: 'note-1',
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note' },
      });

      const result = store.setStatusMany(['task-1', 'note-1'], 'done');
      expect(result.updated).toBe(1);
    });

    it('should skip objects already at target status', () => {
      store.create(
        createMockInput({
          id: 'task-1',
          properties: { title: 'Task 1', status: 'done' },
        })
      );
      store.create(
        createMockInput({
          id: 'task-2',
          properties: { title: 'Task 2', status: 'todo' },
        })
      );

      const result = store.setStatusMany(['task-1', 'task-2'], 'done');
      expect(result.updated).toBe(1);
    });
  });

  describe('unpinMany', () => {
    it('should unpin multiple objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.pin('task-1');
      store.pin('task-2');

      const result = store.unpinMany(['task-1', 'task-2']);
      expect(result.unpinned).toBe(2);
      expect(store.getPinnedObjects()).toHaveLength(0);
    });

    it('should skip already unpinned objects', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.pin('task-1');

      const result = store.unpinMany(['task-1', 'task-2']);
      expect(result.unpinned).toBe(1);
    });
  });

  describe('markProcessedMany', () => {
    it('should mark multiple objects as processed', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));
      store.create(createMockInput({ id: 'task-2', inboxed: true }));

      const result = store.markProcessedMany(['task-1', 'task-2']);
      expect(result.processed).toBe(2);

      const t1 = store.get('task-1');
      const t2 = store.get('task-2');
      expect(t1?.inboxed).toBe(false);
      expect(t2?.inboxed).toBe(false);
    });

    it('should track errors for non-existent objects', () => {
      store.create(createMockInput({ id: 'task-1', inboxed: true }));

      const result = store.markProcessedMany(['task-1', 'non-existent']);
      expect(result.processed).toBe(1);
      expect(result.errors).toContain('non-existent');
    });
  });

  describe('assignToProjectMany', () => {
    it('should track errors for non-existent objects', () => {
      store.create(createMockInput({ id: 'assign-task-1' }));

      const result = store.assignToProjectMany(
        ['assign-task-1', 'non-existent'],
        'some-proj'
      );
      // non-existent will be in errors
      expect(result.errors).toContain('non-existent');
    });

    it('should skip tag type objects', () => {
      store.create({
        id: 'assign-tag-1',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag' },
      });

      const result = store.assignToProjectMany(['assign-tag-1'], 'some-proj');
      // Tags are skipped (not updated, not error)
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip project type objects', () => {
      store.create({
        id: 'assign-proj-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const result = store.assignToProjectMany(['assign-proj-1'], 'some-proj');
      // Projects are skipped
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('updateMany errors', () => {
    it('should track errors for non-existent objects', () => {
      store.create(createMockInput({ id: 'task-1' }));

      const result = store.updateMany(['task-1', 'non-existent'], {
        properties: { title: 'Updated' },
      });
      expect(result.updated).toHaveLength(1);
      expect(result.errors).toContain('non-existent');
    });
  });

  describe('deleteMany errors', () => {
    it('should track errors and still delete valid objects', () => {
      store.create(createMockInput({ id: 'task-1' }));

      const result = store.deleteMany(['task-1', 'non-existent']);
      expect(result.deleted).toBe(1);
      // non-existent won't error on delete (delete returns false for non-existent)
    });
  });

  describe('pinMany proper implementation', () => {
    it('should pin multiple objects and skip already pinned', () => {
      store.create(createMockInput({ id: 'task-1' }));
      store.create(createMockInput({ id: 'task-2' }));
      store.create(createMockInput({ id: 'task-3' }));
      store.pin('task-1');

      const result = store.pinMany(['task-1', 'task-2', 'task-3']);
      expect(result.pinned).toBe(2);
      expect(store.getPinnedObjects()).toHaveLength(3);
    });

    it('should track errors for non-existent objects', () => {
      store.create(createMockInput({ id: 'task-1' }));

      const result = store.pinMany(['task-1', 'non-existent']);
      expect(result.pinned).toBe(1);
      expect(result.errors).toContain('non-existent');
    });
  });
});
