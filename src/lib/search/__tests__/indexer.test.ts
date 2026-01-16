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
  });
});
