/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  parseTemplate,
  isTemplate,
  getTemplates,
  getTemplatesForType,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  createFromTemplate,
  TEMPLATE_TYPE_ID,
  getDailyNoteTemplateId,
  setDailyNoteTemplate,
  getDailyNoteTemplate,
  applyDailyNoteTemplate,
  getDailyNoteTemplates,
} from '../manager';
import { TemplatePropertyIds } from '../types';
import { BuiltInTypeIds } from '../../types';
import type { ObjectStore } from '../../loro/objects';

// Mock ObjectStore
const mockStore = {
  get: vi.fn(),
  getByType: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getContent: vi.fn(),
  setContent: vi.fn(),
} as unknown as ObjectStore;

// Helper to access mock methods with proper types
const mocks = mockStore as unknown as {
  get: Mock;
  getByType: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getContent: Mock;
  setContent: Mock;
};

describe('Template Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTemplateObj = {
    id: 'template-1',
    typeId: TEMPLATE_TYPE_ID,
    properties: {
      [TemplatePropertyIds.TITLE]: 'Test Template',
      [TemplatePropertyIds.TARGET_TYPE_ID]: BuiltInTypeIds.NOTE,
      [TemplatePropertyIds.TEMPLATE_PROPERTIES]: '{"status":"todo"}',
      [TemplatePropertyIds.IS_DAILY_NOTE_TEMPLATE]: false,
    },
    hasContent: true,
    createdAt: 1000,
    updatedAt: 2000,
    inboxed: false,
    pinned: false,
    archived: false,
  };

  describe('parseTemplate', () => {
    it('should parse a valid template object', () => {
      const template = parseTemplate(mockTemplateObj);
      expect(template.id).toBe('template-1');
      expect(template.name).toBe('Test Template');
      expect(template.defaultProperties).toEqual({ status: 'todo' });
      expect(template.isDailyNoteTemplate).toBe(false);
    });

    it('should handle invalid JSON in template properties', () => {
      const invalidObj = {
        ...mockTemplateObj,
        properties: {
          ...mockTemplateObj.properties,
          [TemplatePropertyIds.TEMPLATE_PROPERTIES]: 'invalid-json',
        },
      };
      const template = parseTemplate(invalidObj);
      expect(template.defaultProperties).toEqual({});
    });
  });

  describe('isTemplate', () => {
    it('should return true for template type', () => {
      expect(isTemplate(mockTemplateObj)).toBe(true);
    });

    it('should return false for other types', () => {
      expect(isTemplate({ ...mockTemplateObj, typeId: 'note' })).toBe(false);
    });
  });

  describe('getTemplates', () => {
    it('should return sorted templates', () => {
      mocks.getByType.mockReturnValue([
        {
          ...mockTemplateObj,
          id: '2',
          properties: { [TemplatePropertyIds.TITLE]: 'B' },
        },
        {
          ...mockTemplateObj,
          id: '1',
          properties: { [TemplatePropertyIds.TITLE]: 'A' },
        },
      ]);
      const templates = getTemplates(mockStore);
      expect(templates[0].name).toBe('A');
      expect(templates[1].name).toBe('B');
    });
  });

  describe('getTemplatesForType', () => {
    it('should filter templates by target type', () => {
      mocks.getByType.mockReturnValue([
        {
          ...mockTemplateObj,
          id: '1',
          properties: {
            [TemplatePropertyIds.TITLE]: 'Note Template',
            [TemplatePropertyIds.TARGET_TYPE_ID]: BuiltInTypeIds.NOTE,
          },
        },
        {
          ...mockTemplateObj,
          id: '2',
          properties: {
            [TemplatePropertyIds.TITLE]: 'Task Template',
            [TemplatePropertyIds.TARGET_TYPE_ID]: BuiltInTypeIds.TASK,
          },
        },
      ]);

      const templates = getTemplatesForType(mockStore, BuiltInTypeIds.TASK);
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('2');
    });
  });

  describe('getTemplate', () => {
    it('should return template if found', () => {
      mocks.get.mockReturnValue(mockTemplateObj);
      const t = getTemplate(mockStore, 'template-1');
      expect(t).toBeDefined();
      expect(t?.id).toBe('template-1');
    });

    it('should return undefined if not found', () => {
      mocks.get.mockReturnValue(null);
      const t = getTemplate(mockStore, 'missing');
      expect(t).toBeUndefined();
    });

    it('should return undefined if found but not a template', () => {
      mocks.get.mockReturnValue({ ...mockTemplateObj, typeId: 'note' });
      const t = getTemplate(mockStore, 'note-1');
      expect(t).toBeUndefined();
    });
  });

  describe('createTemplate', () => {
    it('should create a template with content', () => {
      mocks.create.mockReturnValue(mockTemplateObj);

      const input = {
        name: 'New Template',
        targetTypeId: 'note',
        content: 'Hello',
      };

      const result = createTemplate(mockStore, input);

      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: TEMPLATE_TYPE_ID,
          withContent: true,
        })
      );
      expect(mockStore.setContent).toHaveBeenCalled();
      expect(result.name).toBe('Test Template'); // Returns parsed mockObj
    });
  });

  describe('updateTemplate', () => {
    it('should update template properties', () => {
      mocks.get.mockReturnValue(mockTemplateObj);
      mocks.update.mockReturnValue({
        ...mockTemplateObj,
        properties: {
          ...mockTemplateObj.properties,
          [TemplatePropertyIds.TITLE]: 'Updated',
        },
      });

      const result = updateTemplate(mockStore, 'template-1', {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
    });

    it('should throw if template not found', () => {
      mocks.get.mockReturnValue(null);
      expect(() => updateTemplate(mockStore, 'id', {})).toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template and clear daily note preference if match', () => {
      mocks.get.mockReturnValue(mockTemplateObj);
      mocks.delete.mockReturnValue(true);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('template-1');

      deleteTemplate(mockStore, 'template-1');
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'skelenote:dailyNoteTemplateId'
      );
      expect(mockStore.delete).toHaveBeenCalledWith('template-1');
    });

    it('should return false if template not found', () => {
      mocks.get.mockReturnValue(null);
      const result = deleteTemplate(mockStore, 'missing');
      expect(result).toBe(false);
    });
  });

  describe('duplicateTemplate', () => {
    it('should create a copy of the template', () => {
      mocks.get.mockReturnValue(mockTemplateObj);
      mocks.getContent.mockReturnValue('content');
      mocks.create.mockReturnValue({
        ...mockTemplateObj,
        properties: {
          ...mockTemplateObj.properties,
          [TemplatePropertyIds.TITLE]: 'Test Template (Copy)',
        },
      });

      const result = duplicateTemplate(mockStore, 'template-1');
      expect(result.name).toBe('Test Template (Copy)');
      expect(mockStore.setContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('content')
      );
    });

    it('should throw if template to duplicate not found', () => {
      mocks.get.mockReturnValue(null);
      expect(() => duplicateTemplate(mockStore, 'missing')).toThrow();
    });
  });

  describe('createFromTemplate', () => {
    it('should create object with merged properties', () => {
      mocks.get.mockImplementation((id) => {
        if (id === 'template-1') return mockTemplateObj;
        return undefined;
      });
      mocks.getContent.mockReturnValue('[{"type":"paragraph"}]');
      mocks.create.mockReturnValue({ id: 'new-obj' });

      createFromTemplate(mockStore, 'template-1', {
        title: 'New Note',
        properties: { priority: 'high', title: 'New Note' },
      });

      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            status: 'todo', // from template
            priority: 'high', // from override
            title: 'New Note',
          }),
        })
      );
    });

    it('should throw if template not found', () => {
      mocks.get.mockReturnValue(null);
      expect(() => createFromTemplate(mockStore, 'missing')).toThrow();
    });

    it('should handle template without content', () => {
      const noContentTemplate = { ...mockTemplateObj, hasContent: false };
      mocks.get.mockReturnValue(noContentTemplate);
      mocks.create.mockReturnValue({ id: 'new-obj' });

      const result = createFromTemplate(mockStore, 'template-1');
      expect(result.contentApplied).toBe(false);
      expect(mockStore.setContent).not.toHaveBeenCalled();
    });
  });

  describe('Daily Note Template', () => {
    it('should set and get daily note template id', () => {
      setDailyNoteTemplate('123');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'skelenote:dailyNoteTemplateId',
        '123'
      );
    });

    it('should return null if not set', () => {
      expect(getDailyNoteTemplateId()).toBeNull();
    });

    it('should verify template exists when getting daily note template', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('template-1');
      mocks.get.mockReturnValue(null); // Template deleted

      const result = getDailyNoteTemplate(mockStore);
      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled(); // Should clear preference
    });

    it('should apply daily note template', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('template-1');
      mocks.get.mockImplementation((id) => {
        if (id === 'template-1')
          return { ...mockTemplateObj, hasContent: true };
        if (id === 'note-1') return { id: 'note-1', properties: {} };
        return null;
      });
      mocks.getContent.mockReturnValue('Template Content');

      const result = applyDailyNoteTemplate(mockStore, 'note-1', new Date());
      expect(result).toBe(true);
      expect(mockStore.setContent).toHaveBeenCalled();
    });

    it('should fail to apply if no template configured', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      const result = applyDailyNoteTemplate(mockStore, 'note-1', new Date());
      expect(result).toBe(false);
    });

    it('should fail to apply if template has no content', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('template-1');
      mocks.get.mockReturnValue({ ...mockTemplateObj, hasContent: false });

      const result = applyDailyNoteTemplate(mockStore, 'note-1', new Date());
      expect(result).toBe(false);
    });

    it('getDailyNoteTemplates should return only those marked', () => {
      mocks.getByType.mockReturnValue([
        {
          ...mockTemplateObj,
          id: '1',
          properties: { [TemplatePropertyIds.IS_DAILY_NOTE_TEMPLATE]: true },
        },
        {
          ...mockTemplateObj,
          id: '2',
          properties: { [TemplatePropertyIds.IS_DAILY_NOTE_TEMPLATE]: false },
        },
      ]);
      const templates = getDailyNoteTemplates(mockStore);
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('1');
    });
  });
});
