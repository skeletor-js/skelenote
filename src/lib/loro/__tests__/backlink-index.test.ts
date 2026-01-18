import { describe, it, expect, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { BacklinkIndex, createBacklinkIndex } from '../backlink-index';
import { createRelationHelper } from '../relations';
import { ObjectStore } from '../objects';
import { createTypeRegistry, BuiltInTypeIds } from '../../types';
import {
  TaskType,
  NoteType,
  ProjectType,
  TagType,
} from '../../types/built-in-types';
import type { TypeRegistry } from '../../types';

// Helper to create test store with built-in types
function createTestStore(): { store: ObjectStore; registry: TypeRegistry } {
  const doc = new LoroDoc();
  const registry = createTypeRegistry([
    TaskType,
    NoteType,
    ProjectType,
    TagType,
  ]);
  const store = new ObjectStore(doc, registry);
  return { store, registry };
}

// Helper to create a BlockNote content JSON with mentions
function createContentWithMentions(mentionIds: string[]): string {
  const blocks = mentionIds.map((id) => ({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Hello ' },
      {
        type: 'mention',
        props: {
          objectId: id,
          objectName: 'Test Object',
          objectTypeId: 'task',
        },
      },
      { type: 'text', text: ' world' },
    ],
    children: [],
  }));
  return JSON.stringify(blocks);
}

describe('BacklinkIndex', () => {
  let store: ObjectStore;
  let registry: TypeRegistry;
  let index: BacklinkIndex;

  beforeEach(() => {
    const setup = createTestStore();
    store = setup.store;
    registry = setup.registry;
    index = createBacklinkIndex(store, registry);
  });

  describe('rebuild', () => {
    it('should build index from all objects', () => {
      // Create a project
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Test Project', status: 'active' },
      });

      // Create a task that references the project
      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 1',
          status: 'todo',
          project: [project.id],
        },
      });

      // Build the index
      index.rebuild();

      // Verify the project has a backlink
      const backlinks = index.getBacklinks(project.id);
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].propertyId).toBe('project');
    });

    it('should index relation properties correctly', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const tag = store.create({
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Important' },
      });

      // Create task with multiple relations
      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task',
          status: 'todo',
          project: [project.id],
          tags: [tag.id],
        },
      });

      index.rebuild();

      // Project should have backlink
      const projectBacklinks = index.getBacklinks(project.id);
      expect(projectBacklinks).toHaveLength(1);
      expect(projectBacklinks[0].sourceId).toBe(task.id);
      expect(projectBacklinks[0].propertyId).toBe('project');

      // Tag should have backlink
      const tagBacklinks = index.getBacklinks(tag.id);
      expect(tagBacklinks).toHaveLength(1);
      expect(tagBacklinks[0].sourceId).toBe(task.id);
      expect(tagBacklinks[0].propertyId).toBe('tags');
    });

    it('should index @mentions in content', () => {
      const note1 = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 1' },
      });

      const note2 = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 2' },
      });

      // Set content with mention
      const content = createContentWithMentions([note1.id]);
      store.setContent(note2.id, content);

      index.rebuild();

      // note1 should have backlink from note2
      const backlinks = index.getBacklinks(note1.id);
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].sourceId).toBe(note2.id);
      expect(backlinks[0].propertyId).toBe('content');
      expect(backlinks[0].propertyName).toBe('Content');
    });

    it('should handle objects with no relations', () => {
      store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Lonely Note' },
      });

      index.rebuild();

      // Should complete without errors
      expect(index.size).toBe(0);
    });

    it('should handle objects with unknown types gracefully', () => {
      // Create valid objects
      store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note' },
      });

      // Rebuild should work even if some objects have issues
      index.rebuild();
      expect(index.rebuilding).toBe(false);
    });
  });

  describe('getBacklinks', () => {
    it('should return empty array for object with no backlinks', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'No Backlinks' },
      });

      index.rebuild();

      expect(index.getBacklinks(note.id)).toEqual([]);
    });

    it('should return all sources referencing target', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      // Create multiple tasks referencing the same project
      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 1', status: 'todo', project: [project.id] },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 2', status: 'todo', project: [project.id] },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 3', status: 'todo', project: [project.id] },
      });

      index.rebuild();

      const backlinks = index.getBacklinks(project.id);
      expect(backlinks).toHaveLength(3);
    });

    it('should include property name and ID', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project.id] },
      });

      index.rebuild();

      const backlinks = index.getBacklinks(project.id);
      expect(backlinks[0].propertyId).toBe('project');
      expect(backlinks[0].propertyName).toBe('Project');
    });
  });

  describe('hasBacklinks', () => {
    it('should return false for object with no backlinks', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note' },
      });

      index.rebuild();

      expect(index.hasBacklinks(note.id)).toBe(false);
    });

    it('should return true for object with backlinks', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project.id] },
      });

      index.rebuild();

      expect(index.hasBacklinks(project.id)).toBe(true);
    });
  });

  describe('getBacklinkCount', () => {
    it('should return 0 for object with no backlinks', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note' },
      });

      index.rebuild();

      expect(index.getBacklinkCount(note.id)).toBe(0);
    });

    it('should return correct count', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 1', status: 'todo', project: [project.id] },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 2', status: 'todo', project: [project.id] },
      });

      index.rebuild();

      expect(index.getBacklinkCount(project.id)).toBe(2);
    });
  });

  describe('updateObject', () => {
    it('should add new entries when object gains references', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo' },
      });

      index.rebuild();
      expect(index.getBacklinkCount(project.id)).toBe(0);

      // Update task to reference project
      store.setProperty(task.id, 'project', [project.id]);
      index.updateObject(task.id);

      expect(index.getBacklinkCount(project.id)).toBe(1);
    });

    it('should remove entries when object loses references', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project.id] },
      });

      index.rebuild();
      expect(index.getBacklinkCount(project.id)).toBe(1);

      // Remove project reference
      store.setProperty(task.id, 'project', []);
      index.updateObject(task.id);

      expect(index.getBacklinkCount(project.id)).toBe(0);
    });

    it('should update entries when references change', () => {
      const project1 = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project 1', status: 'active' },
      });

      const project2 = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project 2', status: 'active' },
      });

      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project1.id] },
      });

      index.rebuild();
      expect(index.getBacklinkCount(project1.id)).toBe(1);
      expect(index.getBacklinkCount(project2.id)).toBe(0);

      // Change project reference
      store.setProperty(task.id, 'project', [project2.id]);
      index.updateObject(task.id);

      expect(index.getBacklinkCount(project1.id)).toBe(0);
      expect(index.getBacklinkCount(project2.id)).toBe(1);
    });

    it('should handle deleted objects', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project.id] },
      });

      index.rebuild();
      expect(index.getBacklinkCount(project.id)).toBe(1);

      // Delete task
      store.delete(task.id);
      index.updateObject(task.id);

      expect(index.getBacklinkCount(project.id)).toBe(0);
    });
  });

  describe('removeObject', () => {
    it('should remove all entries for deleted object', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project.id] },
      });

      index.rebuild();
      expect(index.getBacklinkCount(project.id)).toBe(1);

      index.removeObject(task.id);
      expect(index.getBacklinkCount(project.id)).toBe(0);
    });

    it('should not affect other objects backlinks', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const task1 = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 1', status: 'todo', project: [project.id] },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 2', status: 'todo', project: [project.id] },
      });

      index.rebuild();
      expect(index.getBacklinkCount(project.id)).toBe(2);

      index.removeObject(task1.id);
      expect(index.getBacklinkCount(project.id)).toBe(1);
    });
  });

  describe('content mentions', () => {
    it('should index mentions in nested blocks', () => {
      const note1 = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 1' },
      });

      const note2 = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 2' },
      });

      // Create nested content with mention
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Parent' }],
          children: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'mention',
                  props: { objectId: note1.id, objectName: 'Note 1' },
                },
              ],
              children: [],
            },
          ],
        },
      ]);
      store.setContent(note2.id, content);

      index.rebuild();

      expect(index.getBacklinkCount(note1.id)).toBe(1);
    });

    it('should handle malformed content gracefully', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note' },
      });

      store.setContent(note.id, 'not valid json');

      // Should not throw
      index.rebuild();
      expect(index.size).toBe(0);
    });

    it('should update when content changes', () => {
      const note1 = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 1' },
      });

      const note2 = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Note 2' },
      });

      index.rebuild();
      expect(index.getBacklinkCount(note1.id)).toBe(0);

      // Add mention
      store.setContent(note2.id, createContentWithMentions([note1.id]));
      index.updateObject(note2.id);

      expect(index.getBacklinkCount(note1.id)).toBe(1);

      // Remove mention
      store.setContent(note2.id, '[]');
      index.updateObject(note2.id);

      expect(index.getBacklinkCount(note1.id)).toBe(0);
    });
  });

  describe('integration with RelationHelper', () => {
    it('should return same results as O(N) scan', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const tag = store.create({
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag' },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 1',
          status: 'todo',
          project: [project.id],
          tags: [tag.id],
        },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 2',
          status: 'todo',
          project: [project.id],
        },
      });

      // Get results from both methods
      index.rebuild();
      const indexBacklinks = index.getBacklinks(project.id);

      const helper = createRelationHelper(store, registry);
      const helperBacklinks = helper.findBacklinks(project.id);

      // Should have same count
      expect(indexBacklinks.length).toBe(helperBacklinks.length);

      // Should have same source IDs
      const indexSourceIds = indexBacklinks.map((b) => b.sourceId).sort();
      const helperSourceIds = helperBacklinks.map((b) => b.sourceId).sort();
      expect(indexSourceIds).toEqual(helperSourceIds);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: [project.id] },
      });

      index.rebuild();
      expect(index.size).toBeGreaterThan(0);

      index.clear();
      expect(index.size).toBe(0);
    });
  });
});
