import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  createFromTemplate,
  getTemplate,
  getTemplates,
  getTemplatesForType,
  getDailyNoteTemplate,
  getDailyNoteTemplates,
  getDailyNoteTemplateId,
  setDailyNoteTemplate,
  clearDailyNoteTemplate,
  applyDailyNoteTemplate,
  parseTemplate,
  isTemplate,
  TEMPLATE_TYPE_ID,
} from '../manager';
import { TemplatePropertyIds } from '../types';
import { BuiltInTypeIds } from '../../types';
import type { ObjectStore } from '../../loro/objects';

describe('Template Manager', () => {
  let mockStore: ObjectStore;
  let mockObjects: any[];
  let mockContent: Record<string, string>;
  let nextId = 1;

  beforeEach(() => {
    mockObjects = [];
    mockContent = {};
    nextId = 1;

    // Mock localStorage methods
    const localStorageMock = (function () {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { localStorage: localStorageMock });

    // Mock ObjectStore
    mockStore = {
      create: vi.fn((input) => {
        const id = `obj-${nextId++}`;
        const obj = {
          id,
          typeId: input.typeId,
          properties: { ...input.properties },
          hasContent: input.withContent,
          inboxed: input.inboxed,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        mockObjects.push(obj);
        if (input.withContent) {
          mockContent[id] = '';
        }
        return obj;
      }),
      update: vi.fn((id, updates) => {
        const obj = mockObjects.find((o) => o.id === id);
        if (!obj) throw new Error('Not found');
        if (updates.properties) {
          Object.assign(obj.properties, updates.properties);
        }
        obj.updatedAt = Date.now();
        return obj;
      }),
      delete: vi.fn((id) => {
        const idx = mockObjects.findIndex((o) => o.id === id);
        if (idx === -1) return false;
        mockObjects.splice(idx, 1);
        delete mockContent[id];
        return true;
      }),
      get: vi.fn((id) => mockObjects.find((o) => o.id === id)),
      getByType: vi.fn((typeId) =>
        mockObjects.filter((o) => o.typeId === typeId)
      ),
      getContent: vi.fn((id) => mockContent[id] || ''),
      setContent: vi.fn((id, content) => {
        mockContent[id] = content;
      }),
    } as unknown as ObjectStore;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('CRUD Operations', () => {
    it('creates a template', () => {
      const input = {
        name: 'My Template',
        targetTypeId: BuiltInTypeIds.NOTE,
        description: 'A test template',
        defaultProperties: { status: 'todo' },
      };

      const template = createTemplate(mockStore, input);

      expect(template.name).toBe('My Template');
      expect(template.description).toBe('A test template');
      expect(template.targetTypeId).toBe(BuiltInTypeIds.NOTE);
      expect(template.defaultProperties).toEqual({ status: 'todo' });
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: TEMPLATE_TYPE_ID,
          inboxed: false,
        })
      );
    });

    it('retrieves a template', () => {
      const created = createTemplate(mockStore, {
        name: 'Test',
        targetTypeId: 'note',
      });
      const retrieved = getTemplate(mockStore, created.id);
      expect(retrieved).toEqual(created);
    });

    it('updates a template', () => {
      const created = createTemplate(mockStore, {
        name: 'Test',
        targetTypeId: 'note',
      });
      const updated = updateTemplate(mockStore, created.id, {
        name: 'Updated Name',
        defaultProperties: { priority: 'high' },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.defaultProperties).toEqual({ priority: 'high' });
    });

    it('deletes a template', () => {
      const created = createTemplate(mockStore, {
        name: 'Test',
        targetTypeId: 'note',
      });
      const result = deleteTemplate(mockStore, created.id);

      expect(result).toBe(true);
      expect(getTemplate(mockStore, created.id)).toBeUndefined();
    });

    it('duplicates a template', () => {
      const original = createTemplate(mockStore, {
        name: 'Original',
        targetTypeId: 'note',
        content: 'some content',
      });

      const copy = duplicateTemplate(mockStore, original.id);

      expect(copy.name).toBe('Original (Copy)');
      expect(copy.id).not.toBe(original.id);
      expect(mockStore.getContent).toHaveBeenCalledWith(original.id);
    });
  });

  describe('Template Application', () => {
    let templateId: string;

    beforeEach(() => {
      const t = createTemplate(mockStore, {
        name: 'Meeting Note',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: { category: 'meeting' },
        content: 'Meeting with {{title}}',
      });
      templateId = t.id;
    });

    it('creates object from template', () => {
      const result = createFromTemplate(mockStore, templateId, {
        title: 'John Doe',
        properties: { title: 'John Doe' },
      });

      const createdObj = mockStore.get(result.objectId);
      expect(createdObj).toBeDefined();
      expect(createdObj?.typeId).toBe(BuiltInTypeIds.NOTE);
      expect(createdObj?.properties.title).toBe('John Doe');
      expect(createdObj?.properties.category).toBe('meeting');

      // This time verifying that content is correctly set with expansion
      expect(mockStore.setContent).toHaveBeenCalled();
      expect(mockContent[createdObj!.id]).toContain('Meeting with John Doe');
    });

    it('overrides template properties', () => {
      const result = createFromTemplate(mockStore, templateId, {
        title: 'Overrides',
        properties: { category: 'urgent' },
      });

      expect(result.appliedProperties.category).toBe('urgent');
    });
  });

  describe('Daily Note Templates', () => {
    const DAILY_KEY = 'skelenote:dailyNoteTemplateId';

    it('sets and gets daily note template', () => {
      setDailyNoteTemplate('tmpl-123');
      expect(localStorage.setItem).toHaveBeenCalledWith(DAILY_KEY, 'tmpl-123');

      expect(getDailyNoteTemplateId()).toBe('tmpl-123');
    });

    it('clears daily note template', () => {
      clearDailyNoteTemplate();
      expect(localStorage.removeItem).toHaveBeenCalledWith(DAILY_KEY);
    });

    it('applies daily note template', () => {
      // Setup template
      const t = createTemplate(mockStore, {
        name: 'Daily',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
        content: 'Daily Log for {{date_short}}',
      });

      // Mock getDailyNoteTemplateId to return our template ID
      localStorage.setItem(DAILY_KEY, t.id);

      // Setup daily note
      const noteId = 'note-2025-01-01';
      mockObjects.push({
        id: noteId,
        typeId: 'built-in:note',
        properties: { title: 'Today' },
        hasContent: true,
      });
      mockContent[noteId] = '';

      // Test application
      const result = applyDailyNoteTemplate(
        mockStore,
        noteId,
        new Date('2025-01-01T12:00:00Z')
      );

      expect(result).toBe(true);
      expect(mockContent[noteId]).toContain('Daily Log for 2025-01-01');
    });

    it('returns false when no daily note template is set', () => {
      const result = applyDailyNoteTemplate(mockStore, 'note-123', new Date());
      expect(result).toBe(false);
    });

    it('returns false when template has no content', () => {
      // Create template without content
      const t = createTemplate(mockStore, {
        name: 'Empty',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });
      // Override hasContent to false
      mockObjects[mockObjects.length - 1].hasContent = false;

      localStorage.setItem(DAILY_KEY, t.id);

      const result = applyDailyNoteTemplate(mockStore, 'note-123', new Date());
      expect(result).toBe(false);
    });

    it('getDailyNoteTemplate returns null when no template configured', () => {
      const result = getDailyNoteTemplate(mockStore);
      expect(result).toBeNull();
    });

    it('getDailyNoteTemplate clears preference when template was deleted', () => {
      localStorage.setItem(DAILY_KEY, 'deleted-template-id');

      const result = getDailyNoteTemplate(mockStore);

      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith(DAILY_KEY);
    });

    it('getDailyNoteTemplates returns templates marked as daily note templates', () => {
      createTemplate(mockStore, {
        name: 'Daily 1',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });
      createTemplate(mockStore, {
        name: 'Regular',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: false,
      });
      createTemplate(mockStore, {
        name: 'Daily 2',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });

      const dailyTemplates = getDailyNoteTemplates(mockStore);

      expect(dailyTemplates).toHaveLength(2);
      expect(dailyTemplates.map((t) => t.name)).toContain('Daily 1');
      expect(dailyTemplates.map((t) => t.name)).toContain('Daily 2');
    });
  });

  describe('getTemplates and getTemplatesForType', () => {
    it('getTemplates returns all templates sorted by name', () => {
      createTemplate(mockStore, {
        name: 'Zebra',
        targetTypeId: BuiltInTypeIds.NOTE,
      });
      createTemplate(mockStore, {
        name: 'Alpha',
        targetTypeId: BuiltInTypeIds.TASK,
      });
      createTemplate(mockStore, {
        name: 'Middle',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const templates = getTemplates(mockStore);

      expect(templates).toHaveLength(3);
      expect(templates[0].name).toBe('Alpha');
      expect(templates[1].name).toBe('Middle');
      expect(templates[2].name).toBe('Zebra');
    });

    it('getTemplatesForType filters templates by target type', () => {
      createTemplate(mockStore, {
        name: 'Note Template',
        targetTypeId: BuiltInTypeIds.NOTE,
      });
      createTemplate(mockStore, {
        name: 'Task Template',
        targetTypeId: BuiltInTypeIds.TASK,
      });

      const noteTemplates = getTemplatesForType(mockStore, BuiltInTypeIds.NOTE);
      const taskTemplates = getTemplatesForType(mockStore, BuiltInTypeIds.TASK);

      expect(noteTemplates).toHaveLength(1);
      expect(noteTemplates[0].name).toBe('Note Template');
      expect(taskTemplates).toHaveLength(1);
      expect(taskTemplates[0].name).toBe('Task Template');
    });
  });

  describe('parseTemplate edge cases', () => {
    it('handles missing properties gracefully', () => {
      const obj = {
        id: 'tmpl-1',
        typeId: TEMPLATE_TYPE_ID,
        properties: {},
        hasContent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const template = parseTemplate(obj as any);

      expect(template.name).toBe('Untitled Template');
      expect(template.targetTypeId).toBe(BuiltInTypeIds.NOTE);
      expect(template.defaultProperties).toEqual({});
      expect(template.isDailyNoteTemplate).toBe(false);
    });

    it('handles invalid JSON in templateProperties', () => {
      const obj = {
        id: 'tmpl-1',
        typeId: TEMPLATE_TYPE_ID,
        properties: {
          [TemplatePropertyIds.TITLE]: 'Test',
          [TemplatePropertyIds.TEMPLATE_PROPERTIES]: 'invalid json {{{',
        },
        hasContent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const template = parseTemplate(obj as any);

      expect(template.defaultProperties).toEqual({});
    });
  });

  describe('isTemplate', () => {
    it('returns true for template objects', () => {
      const obj = { typeId: TEMPLATE_TYPE_ID } as any;
      expect(isTemplate(obj)).toBe(true);
    });

    it('returns false for non-template objects', () => {
      const obj = { typeId: BuiltInTypeIds.NOTE } as any;
      expect(isTemplate(obj)).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('updateTemplate throws when template not found', () => {
      expect(() =>
        updateTemplate(mockStore, 'nonexistent', { name: 'New' })
      ).toThrow('Template not found: nonexistent');
    });

    it('duplicateTemplate throws when template not found', () => {
      expect(() => duplicateTemplate(mockStore, 'nonexistent')).toThrow(
        'Template not found: nonexistent'
      );
    });

    it('createFromTemplate throws when template not found', () => {
      expect(() => createFromTemplate(mockStore, 'nonexistent')).toThrow(
        'Template not found: nonexistent'
      );
    });

    it('getTemplate returns undefined for non-template objects', () => {
      mockObjects.push({
        id: 'not-a-template',
        typeId: BuiltInTypeIds.NOTE,
        properties: {},
      });

      const result = getTemplate(mockStore, 'not-a-template');
      expect(result).toBeUndefined();
    });

    it('deleteTemplate returns false for non-existent template', () => {
      const result = deleteTemplate(mockStore, 'nonexistent');
      expect(result).toBe(false);
    });

    it('deleteTemplate clears daily note preference if deleting daily note template', () => {
      const t = createTemplate(mockStore, {
        name: 'Daily',
        targetTypeId: BuiltInTypeIds.NOTE,
        isDailyNoteTemplate: true,
      });

      // Set as daily note template
      localStorage.setItem('skelenote:dailyNoteTemplateId', t.id);

      // Delete it
      deleteTemplate(mockStore, t.id);

      // Check preference was cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'skelenote:dailyNoteTemplateId'
      );
    });
  });

  describe('updateTemplate with all properties', () => {
    it('updates description', () => {
      const created = createTemplate(mockStore, {
        name: 'Test',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const updated = updateTemplate(mockStore, created.id, {
        description: 'New description',
      });

      expect(updated.description).toBe('New description');
    });

    it('updates targetTypeId', () => {
      const created = createTemplate(mockStore, {
        name: 'Test',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const updated = updateTemplate(mockStore, created.id, {
        targetTypeId: BuiltInTypeIds.TASK,
      });

      expect(updated.targetTypeId).toBe(BuiltInTypeIds.TASK);
    });

    it('updates isDailyNoteTemplate', () => {
      const created = createTemplate(mockStore, {
        name: 'Test',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const updated = updateTemplate(mockStore, created.id, {
        isDailyNoteTemplate: true,
      });

      expect(updated.isDailyNoteTemplate).toBe(true);
    });
  });

  describe('createFromTemplate edge cases', () => {
    it('applies template without content', () => {
      const t = createTemplate(mockStore, {
        name: 'No Content',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: { status: 'draft' },
      });
      // Override hasContent
      mockObjects[mockObjects.length - 1].hasContent = false;

      const result = createFromTemplate(mockStore, t.id);

      expect(result.contentApplied).toBe(false);
      expect(result.appliedProperties.status).toBe('draft');
    });

    it('generates default title when none provided', () => {
      const t = createTemplate(mockStore, {
        name: 'Basic',
        targetTypeId: BuiltInTypeIds.NOTE,
      });

      const result = createFromTemplate(mockStore, t.id);

      expect(result.appliedProperties.title).toContain('Basic -');
    });

    it('expands placeholders in properties', () => {
      const t = createTemplate(mockStore, {
        name: 'Date Template',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: {
          title: 'Note for {{date}}',
        },
      });

      const result = createFromTemplate(mockStore, t.id);

      // Title should contain expanded date
      expect(result.appliedProperties.title).not.toContain('{{date}}');
    });

    it('handles non-string property values', () => {
      const t = createTemplate(mockStore, {
        name: 'Numeric Props',
        targetTypeId: BuiltInTypeIds.NOTE,
        defaultProperties: {
          priority: 5,
          enabled: true,
        },
      });

      const result = createFromTemplate(mockStore, t.id);

      expect(result.appliedProperties.priority).toBe(5);
      expect(result.appliedProperties.enabled).toBe(true);
    });

    it('uses custom context when provided', () => {
      const t = createTemplate(mockStore, {
        name: 'Custom Context',
        targetTypeId: BuiltInTypeIds.NOTE,
        content: 'Content for {{title}}',
      });

      const result = createFromTemplate(mockStore, t.id, {
        title: 'Custom Title',
        context: { title: 'Custom Title', date: new Date('2025-06-15') },
      });

      const createdObj = mockStore.get(result.objectId);
      expect(mockContent[createdObj!.id]).toContain('Content for Custom Title');
    });
  });
});
