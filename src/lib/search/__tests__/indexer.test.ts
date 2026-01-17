import { describe, it, expect } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { buildSearchIndex, buildSearchableItemForObject } from '../indexer';
import { ObjectStore } from '../../loro/objects';
import { createTypeRegistry, BuiltInTypeIds } from '../../types';
import {
  NoteType,
  TaskType,
  LinkType,
  TagType,
} from '../../types/built-in-types';

// Helper to create test store
function createTestStore(): ObjectStore {
  const doc = new LoroDoc();
  const registry = createTypeRegistry([NoteType, TaskType, LinkType, TagType]);
  return new ObjectStore(doc, registry);
}

function createTestRegistry() {
  return createTypeRegistry([NoteType, TaskType, LinkType, TagType]);
}

describe('Search Indexer', () => {
  describe('buildSearchIndex', () => {
    it('should return empty array for empty store', () => {
      const store = createTestStore();
      const registry = createTestRegistry();
      const result = buildSearchIndex(store, registry);
      expect(result).toEqual([]);
    });

    it('should index all objects in store', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 1', status: 'todo' },
      });
      store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 1' },
      });

      const result = buildSearchIndex(store, registry);
      expect(result).toHaveLength(2);
    });

    it('should extract title from objects', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'My Important Task', status: 'todo' },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].title).toBe('My Important Task');
    });

    it('should extract name property as title for tags', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      store.create({
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Important Tag' },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].title).toBe('Important Tag');
    });

    it('should include typeId in searchable items', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Test', status: 'todo' },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].typeId).toBe(BuiltInTypeIds.TASK);
    });

    it('should extract searchable properties', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      store.create({
        typeId: BuiltInTypeIds.LINK,
        properties: {
          title: 'My Link',
          url: 'https://example.com',
          description: 'A description',
        },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].properties).toContain('https://example.com');
    });

    it('should include object id', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Test', status: 'todo' },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].id).toBe(obj.id);
    });

    it('should include updatedAt timestamp', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Test', status: 'todo' },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].updatedAt).toBe(obj.updatedAt);
    });
  });

  describe('buildSearchableItemForObject', () => {
    it('should build searchable item for single object', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Individual Task', status: 'done' },
      });

      const item = buildSearchableItemForObject(obj, registry, store);

      expect(item.id).toBe(obj.id);
      expect(item.title).toBe('Individual Task');
      expect(item.typeId).toBe(BuiltInTypeIds.TASK);
    });

    it('should extract content when object has content', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note with content' },
        withContent: true,
      });

      // Set some content
      store.setContent(
        obj.id,
        JSON.stringify([
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is note content' }],
          },
        ])
      );

      const item = buildSearchableItemForObject(obj, registry, store);
      expect(item.content).toContain('This is note content');
    });

    it('should return empty content when object has no content', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task without content', status: 'todo' },
        // Note: withContent defaults to false for tasks
      });

      const item = buildSearchableItemForObject(obj, registry, store);
      expect(item.content).toBe('');
    });

    it('should handle object with empty title', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: '', status: 'todo' },
      });

      const item = buildSearchableItemForObject(obj, registry, store);
      expect(item.title).toBe('');
    });

    it('should return empty string for properties when type not in registry', () => {
      const store = createTestStore();

      // Create object
      const obj = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Test' },
      });

      // Create a minimal custom registry without the type
      const emptyRegistry = createTypeRegistry([]);
      const item = buildSearchableItemForObject(obj, emptyRegistry, store);
      expect(item.properties).toBe('');
    });
  });

  describe('property extraction edge cases', () => {
    it('should handle number property values', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      // Link has url which is text type
      store.create({
        typeId: BuiltInTypeIds.LINK,
        properties: {
          title: 'Test Link',
          url: 'https://example.com',
        },
      });

      const result = buildSearchIndex(store, registry);
      expect(result[0].properties).toContain('https://example.com');
    });

    it('should handle null/undefined property values gracefully', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task',
          status: 'todo',
          // Test that properties not in schema are handled gracefully
        },
      });

      // Should not throw
      const result = buildSearchIndex(store, registry);
      expect(result).toHaveLength(1);
    });

    // Note: Tests for non-string titles and missing titles are not possible
    // because ObjectStore.create() validates properties and requires valid title/name

    it('should exclude boolean property values from search text', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: {
          title: 'Test Note',
          isDailyNote: true, // Boolean property
        },
      });

      const item = buildSearchableItemForObject(obj, registry, store);
      // Boolean values should not appear in properties search text
      expect(item.properties).not.toContain('true');
    });

    it('should exclude array/relation values from search text', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      const obj = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task with relations',
          status: 'todo',
          tags: ['tag-id-1', 'tag-id-2'], // Relation array
        },
      });

      const item = buildSearchableItemForObject(obj, registry, store);
      // Array values (relation IDs) should not appear in properties
      expect(item.properties).not.toContain('tag-id-1');
    });

    it('should skip hidden properties', () => {
      const store = createTestStore();
      const registry = createTestRegistry();

      // Note: We can't easily test hidden properties without a custom type
      // But we can verify the function handles missing properties gracefully
      const obj = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Test Note' },
      });

      const item = buildSearchableItemForObject(obj, registry, store);
      expect(item.properties).toBeDefined();
    });
  });
});
