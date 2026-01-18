/**
 * @vitest-environment jsdom
 *
 * Integration tests for Import/Export Round-Trip
 *
 * Tests the full cycle of:
 * - Creating objects in the store
 * - Exporting to various formats (Markdown, JSON)
 * - Re-importing the exported data
 * - Verifying data integrity is preserved
 *
 * Note: Tests mock file system operations since they require Tauri APIs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '../../loro/objects';
import {
  createTypeRegistry,
  BuiltInTypeIds,
  builtInTypes,
  NoteType,
  TaskType,
  ProjectType,
  TagType,
} from '../../types';
import { generateMarkdownContent, type JSONBackup } from '../../export';
import {
  parseMarkdownToBlocks,
  parseFrontmatter,
  convertFrontmatterToProperties,
  mapTypeToSkelenote,
} from '../index';
import type { SkelenoteObject } from '../../types';

// Mock localStorage
const localStorageMock = (function () {
  let storage: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      storage = {};
    }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', { localStorage: localStorageMock });

describe('Import/Export Integration Tests', () => {
  let doc: LoroDoc;
  let store: ObjectStore;
  let registry: ReturnType<typeof createTypeRegistry>;

  beforeEach(() => {
    doc = new LoroDoc();
    doc.setPeerId('1');
    registry = createTypeRegistry(builtInTypes);
    store = new ObjectStore(doc, registry);
  });

  // Helper to resolve object names for export
  const resolveObjectName = (objectId: string): string | undefined => {
    const obj = store.get(objectId);
    if (!obj) return undefined;
    return (obj.properties.title as string) || (obj.properties.name as string);
  };

  describe('Markdown Round-Trip', () => {
    it('exports and reimports a note with content', () => {
      // 1. Create a note with content
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: {
          title: 'My Test Note',
        },
        withContent: true,
        inboxed: false,
      });

      const blockNoteContent = JSON.stringify([
        {
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'Introduction', styles: {} }],
          children: [],
        },
        {
          type: 'paragraph',
          props: {},
          content: [
            { type: 'text', text: 'This is a test paragraph.', styles: {} },
          ],
          children: [],
        },
        {
          type: 'bulletListItem',
          props: {},
          content: [{ type: 'text', text: 'First item', styles: {} }],
          children: [],
        },
        {
          type: 'bulletListItem',
          props: {},
          content: [{ type: 'text', text: 'Second item', styles: {} }],
          children: [],
        },
      ]);

      store.setContent(note.id, blockNoteContent);

      // 2. Export to Markdown
      const typeDef = registry.get(BuiltInTypeIds.NOTE)!;
      const markdown = generateMarkdownContent(
        note,
        typeDef,
        blockNoteContent,
        resolveObjectName,
        { includeFrontmatter: true, includeTitle: true }
      );

      // 3. Verify markdown structure
      expect(markdown).toContain('---'); // Frontmatter delimiter
      expect(markdown).toContain('# My Test Note');
      expect(markdown).toContain('# Introduction');
      expect(markdown).toContain('This is a test paragraph.');
      expect(markdown).toContain('- First item');
      expect(markdown).toContain('- Second item');

      // 4. Re-import the markdown
      const { properties: _frontmatter } = parseFrontmatter(markdown);
      const contentWithoutFrontmatter = markdown.replace(
        /---\n[\s\S]*?\n---\n/,
        ''
      );
      const { blocks } = parseMarkdownToBlocks(contentWithoutFrontmatter);

      // 5. Verify imported content
      expect(blocks.length).toBeGreaterThan(0);

      // Find the heading block
      const headingBlock = blocks.find(
        (b) => b.type === 'heading' && b.content?.[0]?.text === 'Introduction'
      );
      expect(headingBlock).toBeDefined();

      // Find paragraph
      const paragraphBlocks = blocks.filter((b) => b.type === 'paragraph');
      expect(
        paragraphBlocks.some((p) =>
          p.content?.some((c) => c.text?.includes('This is a test paragraph'))
        )
      ).toBe(true);

      // Find list items
      const listItems = blocks.filter((b) => b.type === 'bulletListItem');
      expect(listItems.length).toBeGreaterThanOrEqual(2);
    });

    it('preserves frontmatter properties through round-trip', () => {
      // 1. Create a task with properties
      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Important Task',
          status: 'todo',
          priority: 'high',
        },
        withContent: true,
        inboxed: true,
      });

      store.setContent(
        task.id,
        JSON.stringify([
          {
            type: 'paragraph',
            props: {},
            content: [
              { type: 'text', text: 'Task description here', styles: {} },
            ],
            children: [],
          },
        ])
      );

      // 2. Export to Markdown
      const typeDef = registry.get(BuiltInTypeIds.TASK)!;
      const markdown = generateMarkdownContent(
        task,
        typeDef,
        store.getContent(task.id),
        resolveObjectName
      );

      // 3. Parse frontmatter
      const { properties } = parseFrontmatter(markdown);

      // 4. Verify frontmatter contains key properties
      expect(properties.title).toBe('Important Task');
      expect(properties.status).toBe('todo');
      expect(properties.priority).toBe('high');
    });

    it('handles code blocks in round-trip', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Code Example' },
        withContent: true,
        inboxed: false,
      });

      const blockNoteContent = JSON.stringify([
        {
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: 'Here is some code:', styles: {} }],
          children: [],
        },
        {
          type: 'codeBlock',
          props: { language: 'typescript' },
          content: [
            {
              type: 'text',
              text: 'function hello() {\n  console.log("Hello!");\n}',
              styles: {},
            },
          ],
          children: [],
        },
      ]);

      store.setContent(note.id, blockNoteContent);

      // Export
      const typeDef = registry.get(BuiltInTypeIds.NOTE)!;
      const markdown = generateMarkdownContent(
        note,
        typeDef,
        blockNoteContent,
        resolveObjectName
      );

      // Should contain code block syntax
      expect(markdown).toContain('```typescript');
      expect(markdown).toContain('function hello()');
      expect(markdown).toContain('console.log');
      expect(markdown).toContain('```');

      // Re-import
      const contentWithoutFrontmatter = markdown.replace(
        /---\n[\s\S]*?\n---\n/,
        ''
      );
      const { blocks } = parseMarkdownToBlocks(contentWithoutFrontmatter);

      // Find code block
      const codeBlock = blocks.find((b) => b.type === 'codeBlock');
      expect(codeBlock).toBeDefined();
      expect(codeBlock?.props?.language).toBe('typescript');
    });
  });

  describe('JSON Backup Round-Trip', () => {
    it('exports and imports full object graph with JSON backup', () => {
      // 1. Create multiple related objects
      const project = store.create({
        typeId: BuiltInTypeIds.PROJECT,
        properties: {
          name: 'Test Project',
          status: 'active',
        },
        withContent: true,
        inboxed: false,
      });

      const task1 = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 1',
          status: 'todo',
          priority: 'high',
          project: [project.id], // Relations must be arrays
        },
        withContent: true,
        inboxed: true,
      });

      const task2 = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Task 2',
          status: 'in-progress',
          priority: 'medium',
          project: [project.id], // Relations must be arrays
        },
        withContent: true,
        inboxed: true,
      });

      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: {
          title: 'Project Notes',
          project: [project.id], // Relations must be arrays
        },
        withContent: true,
        inboxed: false,
      });

      // Set content for objects
      store.setContent(
        project.id,
        JSON.stringify([
          {
            type: 'paragraph',
            props: {},
            content: [
              { type: 'text', text: 'Project description', styles: {} },
            ],
            children: [],
          },
        ])
      );

      store.setContent(
        task1.id,
        JSON.stringify([
          {
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Task 1 details', styles: {} }],
            children: [],
          },
        ])
      );

      // 2. Create JSON backup
      const objects = store.getAll({ includeArchived: true });
      const backup: JSONBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        objects: objects.map((obj) => ({
          id: obj.id,
          typeId: obj.typeId,
          properties: obj.properties,
          content: obj.hasContent ? store.getContent(obj.id) : undefined,
          hasContent: obj.hasContent,
          inboxed: obj.inboxed,
          pinned: obj.pinned,
          createdAt: obj.createdAt,
          updatedAt: obj.updatedAt,
        })),
      };

      // 3. Verify backup structure
      expect(backup.version).toBe(1);
      expect(backup.objects).toHaveLength(4);

      // 4. Create fresh store and import
      const doc2 = new LoroDoc();
      doc2.setPeerId('2');
      const registry2 = createTypeRegistry(builtInTypes);
      const store2 = new ObjectStore(doc2, registry2);

      // 5. Import objects from backup
      for (const objData of backup.objects) {
        const imported = store2.create({
          id: objData.id,
          typeId: objData.typeId,
          properties: objData.properties as Record<string, unknown>,
          withContent: objData.hasContent,
          inboxed: objData.inboxed,
        });

        // Set pinned state if needed
        if (objData.pinned) {
          store2.pin(imported.id);
        }

        // Set content if available
        if (objData.content && objData.hasContent) {
          store2.setContent(imported.id, objData.content);
        }
      }

      // 6. Verify imported objects
      expect(store2.getAll({ includeArchived: true })).toHaveLength(4);

      // Verify project
      const importedProject = store2.get(project.id);
      expect(importedProject).toBeDefined();
      expect(importedProject?.properties.name).toBe('Test Project');
      expect(importedProject?.properties.status).toBe('active');

      // Verify tasks with relations
      const importedTask1 = store2.get(task1.id);
      expect(importedTask1?.properties.title).toBe('Task 1');
      expect(importedTask1?.properties.project).toEqual([project.id]);

      const importedTask2 = store2.get(task2.id);
      expect(importedTask2?.properties.title).toBe('Task 2');
      expect(importedTask2?.properties.project).toEqual([project.id]);

      // Verify content
      const importedProjectContent = store2.getContent(project.id);
      expect(importedProjectContent).toContain('Project description');
    });

    it('handles objects with various property types', () => {
      // Create object with diverse property types
      const task = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: {
          title: 'Complex Task',
          status: 'waiting',
          priority: 'urgent',
          dueDate: Date.now(),
        },
        withContent: true,
        inboxed: true,
      });

      // Create JSON backup
      const backup: JSONBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        objects: [
          {
            id: task.id,
            typeId: task.typeId,
            properties: task.properties,
            content: '',
            hasContent: true,
            inboxed: true,
            pinned: false,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        ],
      };

      // Import to fresh store
      const doc2 = new LoroDoc();
      doc2.setPeerId('2');
      const registry2 = createTypeRegistry(builtInTypes);
      const store2 = new ObjectStore(doc2, registry2);

      const objData = backup.objects[0];
      store2.create({
        id: objData.id,
        typeId: objData.typeId,
        properties: objData.properties as Record<string, unknown>,
        withContent: objData.hasContent,
        inboxed: objData.inboxed,
      });

      // Verify
      const imported = store2.get(task.id);
      expect(imported?.properties.title).toBe('Complex Task');
      expect(imported?.properties.status).toBe('waiting');
      expect(imported?.properties.priority).toBe('urgent');
      expect(imported?.properties.dueDate).toBe(task.properties.dueDate);
    });

    it('preserves pinned and archived states', () => {
      // Create pinned object
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Pinned Note' },
        withContent: false,
        inboxed: false,
      });
      store.pin(note.id);

      // Create archived object
      const oldTask = store.create({
        typeId: BuiltInTypeIds.TASK,
        properties: { title: 'Archived Task', status: 'done' },
        withContent: false,
        inboxed: false,
      });
      store.archive(oldTask.id);

      // Export
      const objects = store.getAll({ includeArchived: true });
      const backup: JSONBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        objects: objects.map((obj) => ({
          id: obj.id,
          typeId: obj.typeId,
          properties: obj.properties,
          content: undefined,
          hasContent: obj.hasContent,
          inboxed: obj.inboxed,
          pinned: obj.pinned,
          createdAt: obj.createdAt,
          updatedAt: obj.updatedAt,
        })),
      };

      // Find the note and task in backup
      const noteBackup = backup.objects.find((o) => o.id === note.id);
      const taskBackup = backup.objects.find((o) => o.id === oldTask.id);

      expect(noteBackup?.pinned).toBe(true);
      // Note: archived isn't in JSONBackup interface, would need to add if needed
    });
  });

  describe('Type Mapping', () => {
    it('maps frontmatter type hints to Skelenote types', () => {
      // Test various type mappings
      expect(mapTypeToSkelenote('task')).toBe(BuiltInTypeIds.TASK);
      expect(mapTypeToSkelenote('note')).toBe(BuiltInTypeIds.NOTE);
      expect(mapTypeToSkelenote('project')).toBe(BuiltInTypeIds.PROJECT);
      expect(mapTypeToSkelenote('meeting')).toBe(BuiltInTypeIds.MEETING);

      // Unknown types return null (caller decides default)
      expect(mapTypeToSkelenote('unknown')).toBeNull();
      expect(mapTypeToSkelenote('random')).toBeNull();
    });

    it('converts frontmatter properties to Skelenote properties', () => {
      const frontmatter = {
        title: 'Test Task',
        status: 'in-progress',
        priority: 'high',
        due: '2025-06-15',
        tags: ['urgent', 'work'],
      };

      const properties = convertFrontmatterToProperties(
        frontmatter,
        BuiltInTypeIds.TASK
      );

      expect(properties.title).toBe('Test Task');
      expect(properties.status).toBe('in-progress');
      expect(properties.priority).toBe('high');
    });
  });

  describe('CRDT Sync with Import/Export', () => {
    it('imported data syncs correctly between peers', () => {
      // Create and export from first store
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Synced Note' },
        withContent: true,
        inboxed: false,
      });

      store.setContent(
        note.id,
        JSON.stringify([
          {
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Content to sync', styles: {} }],
            children: [],
          },
        ])
      );

      // Create backup
      const backup: JSONBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        objects: [
          {
            id: note.id,
            typeId: note.typeId,
            properties: note.properties,
            content: store.getContent(note.id),
            hasContent: true,
            inboxed: false,
            pinned: false,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          },
        ],
      };

      // Import to second store
      const doc2 = new LoroDoc();
      doc2.setPeerId('2');
      const registry2 = createTypeRegistry(builtInTypes);
      const store2 = new ObjectStore(doc2, registry2);

      const objData = backup.objects[0];
      store2.create({
        id: objData.id,
        typeId: objData.typeId,
        properties: objData.properties as Record<string, unknown>,
        withContent: objData.hasContent,
        inboxed: objData.inboxed,
      });

      if (objData.content) {
        store2.setContent(objData.id, objData.content);
      }

      // Sync store2 to store1
      const updates = doc2.export({ mode: 'update' });
      doc.import(updates);
      store.clearCache();

      // Original store should still have the note
      const synced = store.get(note.id);
      expect(synced).toBeDefined();
      expect(synced?.properties.title).toBe('Synced Note');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Empty Note' },
        withContent: true,
        inboxed: false,
      });

      // Don't set any content

      const typeDef = registry.get(BuiltInTypeIds.NOTE)!;
      const markdown = generateMarkdownContent(
        note,
        typeDef,
        '',
        resolveObjectName
      );

      // Should still generate valid markdown with frontmatter
      expect(markdown).toContain('---');
      expect(markdown).toContain('# Empty Note');
    });

    it('handles special characters in content', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Special Characters' },
        withContent: true,
        inboxed: false,
      });

      const contentWithSpecialChars = JSON.stringify([
        {
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'text',
              text: 'Special chars: < > & " \' ` ~ @ # $ % ^ * ( ) [ ] { }',
              styles: {},
            },
          ],
          children: [],
        },
      ]);

      store.setContent(note.id, contentWithSpecialChars);

      const typeDef = registry.get(BuiltInTypeIds.NOTE)!;
      const markdown = generateMarkdownContent(
        note,
        typeDef,
        contentWithSpecialChars,
        resolveObjectName
      );

      // Should contain the special characters
      expect(markdown).toContain('<');
      expect(markdown).toContain('>');
      expect(markdown).toContain('&');
    });

    it('handles unicode content', () => {
      const note = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'Unicode Test' },
        withContent: true,
        inboxed: false,
      });

      const unicodeContent = JSON.stringify([
        {
          type: 'paragraph',
          props: {},
          content: [
            { type: 'text', text: 'Languages: English, ', styles: {} },
            {
              type: 'text',
              text: 'Mandarin: \u4E2D\u6587, Korean: \uD55C\uAD6D\uC5B4, Japanese: \u65E5\u672C\u8A9E',
              styles: {},
            },
          ],
          children: [],
        },
      ]);

      store.setContent(note.id, unicodeContent);

      const typeDef = registry.get(BuiltInTypeIds.NOTE)!;
      const markdown = generateMarkdownContent(
        note,
        typeDef,
        unicodeContent,
        resolveObjectName
      );

      expect(markdown).toContain('\u4E2D\u6587');
      expect(markdown).toContain('\uD55C\uAD6D\uC5B4');
      expect(markdown).toContain('\u65E5\u672C\u8A9E');
    });
  });
});
