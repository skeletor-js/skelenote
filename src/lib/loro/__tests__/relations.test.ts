import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import {
  extractMentionsFromContent,
  getRelationIds,
  isRelationProperty,
  getRelationProperties,
  createRelationHelper,
} from '../relations';
import { ObjectStore } from '../objects';
import { createTypeRegistry, BuiltInTypeIds } from '../../types';
import {
  TaskType,
  NoteType,
  ProjectType,
  TagType,
} from '../../types/built-in-types';
import type { PropertyDefinition, PropertyValue } from '../../types';

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

describe('extractMentionsFromContent', () => {
  it('should return empty array for null content', () => {
    expect(extractMentionsFromContent(null)).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(extractMentionsFromContent('')).toEqual([]);
  });

  it('should return empty array for invalid JSON', () => {
    expect(extractMentionsFromContent('not valid json')).toEqual([]);
  });

  it('should return empty array for content without mentions', () => {
    const content = JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello world' }],
        children: [],
      },
    ]);
    expect(extractMentionsFromContent(content)).toEqual([]);
  });

  it('should extract a single mention', () => {
    const content = createContentWithMentions(['obj-1']);
    expect(extractMentionsFromContent(content)).toEqual(['obj-1']);
  });

  it('should extract multiple mentions', () => {
    const blocks = [
      {
        type: 'paragraph',
        content: [
          { type: 'mention', props: { objectId: 'obj-1' } },
          { type: 'text', text: ' and ' },
          { type: 'mention', props: { objectId: 'obj-2' } },
        ],
        children: [],
      },
    ];
    const content = JSON.stringify(blocks);
    expect(extractMentionsFromContent(content)).toEqual(['obj-1', 'obj-2']);
  });

  it('should extract mentions from nested children', () => {
    const blocks = [
      {
        type: 'paragraph',
        content: [],
        children: [
          {
            type: 'paragraph',
            content: [{ type: 'mention', props: { objectId: 'nested-obj' } }],
            children: [],
          },
        ],
      },
    ];
    const content = JSON.stringify(blocks);
    expect(extractMentionsFromContent(content)).toContain('nested-obj');
  });

  it('should handle non-array content gracefully', () => {
    const content = JSON.stringify({ type: 'not-array' });
    expect(extractMentionsFromContent(content)).toEqual([]);
  });

  it('should ignore mentions without objectId', () => {
    const blocks = [
      {
        type: 'paragraph',
        content: [{ type: 'mention', props: { name: 'no-id' } }],
        children: [],
      },
    ];
    const content = JSON.stringify(blocks);
    expect(extractMentionsFromContent(content)).toEqual([]);
  });
});

describe('getRelationIds', () => {
  it('should return empty array for null', () => {
    expect(getRelationIds(null)).toEqual([]);
  });

  it('should return empty array for string value', () => {
    expect(getRelationIds('not-an-array' as PropertyValue)).toEqual([]);
  });

  it('should return empty array for number value', () => {
    expect(getRelationIds(123 as PropertyValue)).toEqual([]);
  });

  it('should return array contents for string array', () => {
    expect(getRelationIds(['id-1', 'id-2'])).toEqual(['id-1', 'id-2']);
  });

  it('should filter out non-string values', () => {
    const mixed = ['id-1', 123, 'id-2'] as unknown as PropertyValue;
    expect(getRelationIds(mixed)).toEqual(['id-1', 'id-2']);
  });

  it('should return empty array for empty array', () => {
    expect(getRelationIds([])).toEqual([]);
  });
});

describe('isRelationProperty', () => {
  it('should return true for relation type', () => {
    const propDef: PropertyDefinition = {
      id: 'project',
      name: 'Project',
      type: 'relation',
      required: false,
      multiple: false,
    };
    expect(isRelationProperty(propDef)).toBe(true);
  });

  it('should return false for text type', () => {
    const propDef: PropertyDefinition = {
      id: 'title',
      name: 'Title',
      type: 'text',
      required: true,
      multiple: false,
    };
    expect(isRelationProperty(propDef)).toBe(false);
  });

  it('should return false for select type', () => {
    const propDef: PropertyDefinition = {
      id: 'status',
      name: 'Status',
      type: 'select',
      required: false,
      multiple: false,
    };
    expect(isRelationProperty(propDef)).toBe(false);
  });
});

describe('getRelationProperties', () => {
  it('should return all relation properties from TaskType', () => {
    const relationProps = getRelationProperties(TaskType);
    const propIds = relationProps.map((p) => p.id);

    expect(propIds).toContain('project');
    expect(propIds).toContain('area');
    expect(propIds).toContain('tags');
    expect(propIds).toContain('dailyNote');
  });

  it('should not include non-relation properties', () => {
    const relationProps = getRelationProperties(TaskType);
    const propIds = relationProps.map((p) => p.id);

    expect(propIds).not.toContain('title');
    expect(propIds).not.toContain('status');
    expect(propIds).not.toContain('priority');
  });

  it('should return empty array for type with no relations', () => {
    const noRelationType = {
      ...TagType,
      schema: TagType.schema.filter((p) => p.type !== 'relation'),
    };
    expect(getRelationProperties(noRelationType)).toEqual([]);
  });
});

describe('RelationHelper', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('getRelatedObjects', () => {
    it('should return empty array for non-existent object', () => {
      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      expect(helper.getRelatedObjects('non-existent')).toEqual([]);
    });

    it('should return empty array for object with no relations', () => {
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Solo Task', status: 'todo' },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      expect(helper.getRelatedObjects('task-1')).toEqual([]);
    });

    it('should return related objects via project relation', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Test Project', status: 'active' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task with project',
          status: 'todo',
          project: ['project-1'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      const related = helper.getRelatedObjects('task-1');

      expect(related).toHaveLength(1);
      expect(related[0].id).toBe('project-1');
    });

    it('should return multiple related objects', () => {
      store.create({
        id: 'tag-1',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag 1' },
      });
      store.create({
        id: 'tag-2',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag 2' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task with tags',
          status: 'todo',
          tags: ['tag-1', 'tag-2'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, TagType])
      );
      const related = helper.getRelatedObjects('task-1');

      expect(related).toHaveLength(2);
      expect(related.map((r) => r.id)).toContain('tag-1');
      expect(related.map((r) => r.id)).toContain('tag-2');
    });
  });

  describe('findBacklinks', () => {
    it('should find backlinks via relation properties', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Test Project', status: 'active' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 1',
          status: 'todo',
          project: ['project-1'],
        },
      });
      store.create({
        id: 'task-2',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 2',
          status: 'todo',
          project: ['project-1'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      const backlinks = helper.findBacklinks('project-1');

      expect(backlinks).toHaveLength(2);
      expect(backlinks.map((b) => b.sourceId)).toContain('task-1');
      expect(backlinks.map((b) => b.sourceId)).toContain('task-2');
    });

    it('should return property name in backlink', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Test Project', status: 'active' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task',
          status: 'todo',
          project: ['project-1'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      const backlinks = helper.findBacklinks('project-1');

      expect(backlinks[0].propertyId).toBe('project');
      expect(backlinks[0].propertyName).toBe('Project');
    });

    it('should cache backlinks when dataVersion is provided', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Test Project', status: 'active' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task',
          status: 'todo',
          project: ['project-1'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );

      // Spy on store.getAll to verify caching
      const getAllSpy = vi.spyOn(store, 'getAll');

      // First call - should compute
      helper.findBacklinks('project-1', 1);
      expect(getAllSpy).toHaveBeenCalledTimes(1);

      // Second call with same version - should use cache
      helper.findBacklinks('project-1', 1);
      expect(getAllSpy).toHaveBeenCalledTimes(1);

      // Third call with new version - should recompute
      helper.findBacklinks('project-1', 2);
      expect(getAllSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when clearBacklinksCache is called', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Test Project', status: 'active' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task',
          status: 'todo',
          project: ['project-1'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );

      const getAllSpy = vi.spyOn(store, 'getAll');

      helper.findBacklinks('project-1', 1);
      expect(getAllSpy).toHaveBeenCalledTimes(1);

      helper.clearBacklinksCache();

      helper.findBacklinks('project-1', 1);
      expect(getAllSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBacklinkedObjects', () => {
    it('should return unique objects that reference target', () => {
      store.create({
        id: 'tag-1',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 1', status: 'todo', tags: ['tag-1'] },
      });
      store.create({
        id: 'task-2',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task 2', status: 'todo', tags: ['tag-1'] },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, TagType])
      );
      const objects = helper.getBacklinkedObjects('tag-1');

      expect(objects).toHaveLength(2);
    });
  });

  describe('addRelation', () => {
    it('should add a relation to an object', () => {
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', tags: [] },
      });
      store.create({
        id: 'tag-1',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag' },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, TagType])
      );
      helper.addRelation('task-1', 'tags', 'tag-1');

      const task = store.get('task-1');
      expect(task?.properties.tags).toEqual(['tag-1']);
    });

    it('should not duplicate existing relation', () => {
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', tags: ['tag-1'] },
      });
      store.create({
        id: 'tag-1',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag' },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, TagType])
      );
      helper.addRelation('task-1', 'tags', 'tag-1');

      const task = store.get('task-1');
      expect(task?.properties.tags).toEqual(['tag-1']);
    });

    it('should do nothing for non-existent source object', () => {
      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, TagType])
      );
      expect(() =>
        helper.addRelation('non-existent', 'tags', 'tag-1')
      ).not.toThrow();
    });
  });

  describe('removeRelation', () => {
    it('should remove a relation from an object', () => {
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', tags: ['tag-1', 'tag-2'] },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, TagType])
      );
      helper.removeRelation('task-1', 'tags', 'tag-1');

      const task = store.get('task-1');
      expect(task?.properties.tags).toEqual(['tag-2']);
    });
  });

  describe('getRelatedByProperty', () => {
    it('should return objects related by specific property', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });
      store.create({
        id: 'tag-1',
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'Tag' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task',
          status: 'todo',
          project: ['project-1'],
          tags: ['tag-1'],
        },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType, TagType])
      );

      const projectRelated = helper.getRelatedByProperty('task-1', 'project');
      expect(projectRelated).toHaveLength(1);
      expect(projectRelated[0].id).toBe('project-1');

      const tagsRelated = helper.getRelatedByProperty('task-1', 'tags');
      expect(tagsRelated).toHaveLength(1);
      expect(tagsRelated[0].id).toBe('tag-1');
    });
  });

  describe('areRelated', () => {
    it('should return true when objects are related', () => {
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo', project: ['project-1'] },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      expect(helper.areRelated('task-1', 'project-1')).toBe(true);
    });

    it('should return false when objects are not related', () => {
      store.create({
        id: 'task-1',
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Task', status: 'todo' },
      });
      store.create({
        id: 'project-1',
        typeId: BuiltInTypeIds.PROJECT,
        properties: { name: 'Project', status: 'active' },
      });

      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      expect(helper.areRelated('task-1', 'project-1')).toBe(false);
    });

    it('should return false for non-existent source object', () => {
      const helper = createRelationHelper(
        store,
        createTypeRegistry([TaskType, ProjectType])
      );
      expect(helper.areRelated('non-existent', 'some-id')).toBe(false);
    });
  });
});
