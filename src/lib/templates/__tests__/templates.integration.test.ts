/**
 * @vitest-environment jsdom
 *
 * Integration tests for Template Application
 *
 * Tests the full integration between:
 * - Template manager
 * - ObjectStore (real Loro CRDT)
 * - Placeholder expansion system
 * - Content copying
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ObjectStore } from '../../loro/objects';
import { createTypeRegistry, BuiltInTypeIds, builtInTypes } from '../../types';
import {
  createTemplate,
  createFromTemplate,
  getTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  getTemplates,
  getTemplatesForType,
  applyDailyNoteTemplate,
  setDailyNoteTemplate,
  clearDailyNoteTemplate,
  getDailyNoteTemplateId,
  TEMPLATE_TYPE_ID,
} from '../manager';
import type { Template, CreateTemplateInput } from '../types';

describe('Template Integration Tests', () => {
  let doc: LoroDoc;
  let store: ObjectStore;

  beforeEach(() => {
    // Create a real LoroDoc
    doc = new LoroDoc();
    doc.setPeerId('1');

    // Create real type registry with built-in types
    const registry = createTypeRegistry(builtInTypes);

    // Create real ObjectStore
    store = new ObjectStore(doc, registry);

    // Mock localStorage for daily note template
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Template CRUD with real ObjectStore', () => {
    it('creates a template and persists it in the CRDT store', () => {
      const input: CreateTemplateInput = {
        name: 'Meeting Notes',
        description: 'Template for meeting notes',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: {
          category: 'meeting',
          status: 'draft',
        },
      };

      const template = createTemplate(store, input);

      // Verify template was created
      expect(template.id).toBeDefined();
      expect(template.name).toBe('Meeting Notes');
      expect(template.description).toBe('Template for meeting notes');
      expect(template.targetTypeId).toBe(BuiltInTypeIds.NOTE);
      expect(template.defaultProperties).toEqual({
        category: 'meeting',
        status: 'draft',
      });

      // Verify template exists in store
      const retrieved = getTemplate(store, template.id);
      expect(retrieved).toEqual(template);

      // Verify the underlying object exists in the CRDT
      const obj = store.get(template.id);
      expect(obj).toBeDefined();
      expect(obj?.typeId).toBe(TEMPLATE_TYPE_ID);
    });

    it('updates a template and persists changes', () => {
      const template = createTemplate(store, {
        name: 'Original',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const updated = updateTemplate(store, template.id, {
        name: 'Updated Name',
        description: 'New description',
        defaultProperties: { priority: 'high' },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
      expect(updated.defaultProperties).toEqual({ priority: 'high' });

      // Verify persistence
      const retrieved = getTemplate(store, template.id);
      expect(retrieved?.name).toBe('Updated Name');
    });

    it('duplicates a template including content', () => {
      const original = createTemplate(store, {
        name: 'Original Template',
        targetTypeId: BuiltInTypeIds.NOTE,
        content: 'Template content with {{date}}',
      });

      const copy = duplicateTemplate(store, original.id);

      expect(copy.name).toBe('Original Template (Copy)');
      expect(copy.id).not.toBe(original.id);
      expect(copy.targetTypeId).toBe(original.targetTypeId);

      // Verify content was copied
      const copyContent = store.getContent(copy.id);
      expect(copyContent).toContain('Template content');
    });

    it('deletes a template from the store', () => {
      const template = createTemplate(store, {
        name: 'To Delete',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const result = deleteTemplate(store, template.id);

      expect(result).toBe(true);
      expect(getTemplate(store, template.id)).toBeUndefined();
      expect(store.get(template.id)).toBeUndefined();
    });
  });

  describe('Template Application with Placeholder Expansion', () => {
    it('applies template with date placeholder expansion', () => {
      // Create template with date placeholders
      const template = createTemplate(store, {
        name: 'Weekly Review',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: {
          title: 'Weekly Review - {{date_short}}',
        },
        content: 'Weekly review for {{date}}',
      });

      // Create object from template with a specific date
      const testDate = new Date('2025-06-15T10:00:00Z');
      const result = createFromTemplate(store, template.id, {
        context: { date: testDate, title: 'Weekly Review' },
      });

      // Verify placeholder expansion in properties
      expect(result.appliedProperties.title).toBe('Weekly Review - 2025-06-15');

      // Verify placeholder expansion in content
      const content = store.getContent(result.objectId);
      expect(content).toContain('Weekly review for June 15, 2025');
    });

    it('applies template with title placeholder expansion', () => {
      const template = createTemplate(store, {
        name: 'Meeting',
        targetTypeId: BuiltInTypeIds.NOTE,
        content: 'Meeting: {{title}}\n\nAgenda:\n- Item 1',
      });

      const result = createFromTemplate(store, template.id, {
        title: 'Q1 Planning',
        properties: { title: 'Q1 Planning' },
        context: { date: new Date(), title: 'Q1 Planning' },
      });

      const content = store.getContent(result.objectId);
      expect(content).toContain('Meeting: Q1 Planning');
    });

    it('applies template with multiple placeholders', () => {
      const template = createTemplate(store, {
        name: 'Journal Entry',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: {
          title: 'Journal - {{date_short}}',
          category: 'journal',
        },
        content:
          '# {{date}}\n\n## Morning\n\n## Evening\n\nTomorrow: {{tomorrow}}',
      });

      const testDate = new Date('2025-12-25T12:00:00Z');
      const result = createFromTemplate(store, template.id, {
        context: { date: testDate },
      });

      expect(result.appliedProperties.title).toBe('Journal - 2025-12-25');
      expect(result.appliedProperties.category).toBe('journal');

      const content = store.getContent(result.objectId);
      expect(content).toContain('December 25, 2025');
      expect(content).toContain('December 26, 2025'); // tomorrow
    });

    it('preserves property values during template application', () => {
      const template = createTemplate(store, {
        name: 'Task Template',
        targetTypeId: BuiltInTypeIds.TASK,
        defaultProperties: {
          status: 'todo',
          priority: 'medium', // Priority is a string enum
        },
      });

      const result = createFromTemplate(store, template.id, {
        properties: { title: 'My Task' },
      });

      expect(result.appliedProperties.priority).toBe('medium');
      expect(result.appliedProperties.status).toBe('todo');
      expect(result.appliedProperties.title).toBe('My Task');
    });

    it('allows property overrides to take precedence', () => {
      const template = createTemplate(store, {
        name: 'Task',
        targetTypeId: BuiltInTypeIds.TASK,
        defaultProperties: {
          status: 'todo',
          priority: 'low', // Priority is a string enum
        },
      });

      const result = createFromTemplate(store, template.id, {
        properties: {
          title: 'Urgent Task',
          status: 'in-progress', // Override template default
          priority: 'urgent', // Override template default
        },
      });

      expect(result.appliedProperties.status).toBe('in-progress');
      expect(result.appliedProperties.priority).toBe('urgent');
    });
  });

  describe('Content Copying', () => {
    it('copies template content to new object', () => {
      const templateContent = JSON.stringify([
        {
          id: 'block-1',
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'Meeting Notes', styles: {} }],
          children: [],
        },
        {
          id: 'block-2',
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: 'Attendees:', styles: {} }],
          children: [],
        },
        {
          id: 'block-3',
          type: 'bulletListItem',
          props: {},
          content: [],
          children: [],
        },
      ]);

      const template = createTemplate(store, {
        name: 'Meeting',
        targetTypeId: BuiltInTypeIds.NOTE,
        content: templateContent,
      });

      const result = createFromTemplate(store, template.id, {
        properties: { title: 'Team Standup' },
      });

      expect(result.contentApplied).toBe(true);

      const content = store.getContent(result.objectId);
      const parsedContent = JSON.parse(content);

      expect(parsedContent).toHaveLength(3);
      expect(parsedContent[0].type).toBe('heading');
      expect(parsedContent[1].content[0].text).toBe('Attendees:');
    });

    it('expands placeholders within BlockNote content structure', () => {
      const templateContent = JSON.stringify([
        {
          id: 'block-1',
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: 'Date: {{date_short}}', styles: {} }],
          children: [],
        },
        {
          id: 'block-2',
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: 'Title: {{title}}', styles: {} }],
          children: [],
        },
      ]);

      const template = createTemplate(store, {
        name: 'Report',
        targetTypeId: BuiltInTypeIds.NOTE,
        content: templateContent,
      });

      const testDate = new Date('2025-03-15T10:00:00Z');
      const result = createFromTemplate(store, template.id, {
        title: 'Monthly Report',
        properties: { title: 'Monthly Report' },
        context: { date: testDate, title: 'Monthly Report' },
      });

      const content = store.getContent(result.objectId);
      const parsedContent = JSON.parse(content);

      expect(parsedContent[0].content[0].text).toBe('Date: 2025-03-15');
      expect(parsedContent[1].content[0].text).toBe('Title: Monthly Report');
    });

    it('handles template without content gracefully', () => {
      const template = createTemplate(store, {
        name: 'Empty Template',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      // Mark as having no content
      const obj = store.get(template.id);
      expect(obj?.hasContent).toBe(true); // Templates always have content

      const result = createFromTemplate(store, template.id);

      // Should still create successfully
      expect(result.objectId).toBeDefined();
      const createdObj = store.get(result.objectId);
      expect(createdObj).toBeDefined();
    });
  });

  describe('Template Filtering and Retrieval', () => {
    beforeEach(() => {
      // Create various templates
      createTemplate(store, {
        name: 'Note Template 1',
        targetTypeId: BuiltInTypeIds.NOTE,
      });
      createTemplate(store, {
        name: 'Task Template',
        targetTypeId: BuiltInTypeIds.TASK,
      });
      createTemplate(store, {
        name: 'Note Template 2',
        targetTypeId: BuiltInTypeIds.NOTE,
      });
      createTemplate(store, {
        name: 'Project Template',
        targetTypeId: BuiltInTypeIds.PROJECT,
      });
    });

    it('retrieves all templates sorted by name', () => {
      const templates = getTemplates(store);

      expect(templates).toHaveLength(4);
      expect(templates[0].name).toBe('Note Template 1');
      expect(templates[1].name).toBe('Note Template 2');
      expect(templates[2].name).toBe('Project Template');
      expect(templates[3].name).toBe('Task Template');
    });

    it('filters templates by target type', () => {
      const noteTemplates = getTemplatesForType(store, BuiltInTypeIds.NOTE);
      const taskTemplates = getTemplatesForType(store, BuiltInTypeIds.TASK);
      const projectTemplates = getTemplatesForType(
        store,
        BuiltInTypeIds.PROJECT
      );

      expect(noteTemplates).toHaveLength(2);
      expect(taskTemplates).toHaveLength(1);
      expect(projectTemplates).toHaveLength(1);
    });
  });

  describe('Daily Note Template Integration', () => {
    it('sets and retrieves daily note template ID', () => {
      const template = createTemplate(store, {
        name: 'Daily Journal',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });

      setDailyNoteTemplate(template.id);

      expect(getDailyNoteTemplateId()).toBe(template.id);
    });

    it('applies daily note template to a daily note object', () => {
      // Create daily note template
      const template = createTemplate(store, {
        name: 'Daily Log',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
        content: '# Daily Log - {{date_short}}\n\n## Tasks\n\n## Notes',
      });

      setDailyNoteTemplate(template.id);

      // Create a daily note object
      const dailyNote = store.create({
        typeId: BuiltInTypeIds.NOTE,
        properties: { title: 'January 15, 2025', isDailyNote: true },
        withContent: true,
        inboxed: false,
      });

      // Apply template
      const testDate = new Date('2025-01-15T10:00:00Z');
      const result = applyDailyNoteTemplate(store, dailyNote.id, testDate);

      expect(result).toBe(true);

      const content = store.getContent(dailyNote.id);
      expect(content).toContain('Daily Log - 2025-01-15');
      expect(content).toContain('Tasks');
      expect(content).toContain('Notes');
    });

    it('clears daily note template preference', () => {
      const template = createTemplate(store, {
        name: 'Daily',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });

      setDailyNoteTemplate(template.id);
      expect(getDailyNoteTemplateId()).toBe(template.id);

      clearDailyNoteTemplate();
      expect(getDailyNoteTemplateId()).toBeNull();
    });

    it('clears daily note template when deleted', () => {
      const template = createTemplate(store, {
        name: 'Daily',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });

      setDailyNoteTemplate(template.id);
      deleteTemplate(store, template.id);

      // Attempting to get daily note template should return null since template was deleted
      expect(getDailyNoteTemplateId()).toBeNull();
    });
  });

  describe('Template with Complex Content Structures', () => {
    it('handles nested BlockNote structures with placeholders', () => {
      const complexContent = JSON.stringify([
        {
          id: 'block-1',
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: '{{title}}', styles: {} }],
          children: [],
        },
        {
          id: 'block-2',
          type: 'paragraph',
          props: {},
          content: [
            { type: 'text', text: 'Created on ', styles: {} },
            { type: 'text', text: '{{date}}', styles: { bold: true } },
          ],
          children: [],
        },
        {
          id: 'block-3',
          type: 'bulletListItem',
          props: {},
          content: [{ type: 'text', text: 'Week: {{week}}', styles: {} }],
          children: [
            {
              id: 'block-3-1',
              type: 'bulletListItem',
              props: {},
              content: [{ type: 'text', text: 'Year: {{year}}', styles: {} }],
              children: [],
            },
          ],
        },
      ]);

      const template = createTemplate(store, {
        name: 'Complex Template',
        targetTypeId: BuiltInTypeIds.NOTE,
        content: complexContent,
      });

      const testDate = new Date('2025-06-15T10:00:00Z');
      const result = createFromTemplate(store, template.id, {
        title: 'My Document',
        context: { date: testDate, title: 'My Document' },
      });

      const content = store.getContent(result.objectId);
      const parsed = JSON.parse(content);

      // Verify heading
      expect(parsed[0].content[0].text).toBe('My Document');

      // Verify paragraph with multiple text nodes
      expect(parsed[1].content[0].text).toBe('Created on ');
      expect(parsed[1].content[1].text).toBe('June 15, 2025');
      expect(parsed[1].content[1].styles).toEqual({ bold: true });

      // Verify nested list items
      expect(parsed[2].content[0].text).toContain('Week:');
      expect(parsed[2].children[0].content[0].text).toBe('Year: 2025');
    });
  });

  describe('CRDT Sync Integration', () => {
    it('templates sync between documents via CRDT merge', () => {
      // Create template in first store
      const template = createTemplate(store, {
        name: 'Synced Template',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: { category: 'synced' },
        content: 'Synced content',
      });

      // Export the document state
      const snapshot = doc.export({ mode: 'snapshot' });

      // Create second document and import
      const doc2 = new LoroDoc();
      doc2.setPeerId('2');
      doc2.import(snapshot);

      // Create second store
      const registry2 = createTypeRegistry(builtInTypes);
      const store2 = new ObjectStore(doc2, registry2);

      // Verify template exists in second store
      const retrieved = getTemplate(store2, template.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Synced Template');
      expect(retrieved?.defaultProperties).toEqual({ category: 'synced' });

      // Verify content synced
      const content = store2.getContent(template.id);
      expect(content).toContain('Synced content');
    });

    it('template updates propagate between peers', () => {
      // Create template
      const template = createTemplate(store, {
        name: 'Original',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      // Snapshot and create peer
      const snapshot = doc.export({ mode: 'snapshot' });
      const doc2 = new LoroDoc();
      doc2.setPeerId('2');
      doc2.import(snapshot);

      const registry2 = createTypeRegistry(builtInTypes);
      const store2 = new ObjectStore(doc2, registry2);

      // Verify both peers start with same state
      expect(getTemplate(store, template.id)?.name).toBe('Original');
      expect(getTemplate(store2, template.id)?.name).toBe('Original');

      // Update in first store
      updateTemplate(store, template.id, { name: 'Updated by Peer 1' });

      // Sync peer 1's updates to peer 2
      const updates1 = doc.export({ mode: 'update' });
      doc2.import(updates1);
      store2.clearCache();

      // Verify peer 2 receives the update
      expect(getTemplate(store2, template.id)?.name).toBe('Updated by Peer 1');

      // Now peer 2 makes an update on top of that
      updateTemplate(store2, template.id, { description: 'Added by Peer 2' });

      // Sync peer 2's updates to peer 1
      const updates2 = doc2.export({ mode: 'update' });
      doc.import(updates2);
      store.clearCache();

      // Both stores should have both updates
      const fromStore1 = getTemplate(store, template.id);
      const fromStore2 = getTemplate(store2, template.id);

      expect(fromStore1?.name).toBe('Updated by Peer 1');
      expect(fromStore1?.description).toBe('Added by Peer 2');
      expect(fromStore2?.name).toBe('Updated by Peer 1');
      expect(fromStore2?.description).toBe('Added by Peer 2');
    });
  });
});
