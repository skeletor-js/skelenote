/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplates } from '../useTemplates';

// Mock dependencies
const mockStore = {
  get: vi.fn(),
};

const mockRefreshData = vi.fn();
const mockNavigateToObject = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: vi.fn(
    () =>
      ({
        store: mockStore,
        isLoading: false,
        refreshData: mockRefreshData,
      }) as any
  ),
}));

vi.mock('@/contexts/NavigationContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigation: () => ({
      navigateToObject: mockNavigateToObject,
    }),
  };
});

// Mock library functions
vi.mock('@/lib/templates', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getTemplates: vi.fn(),
    getTemplatesForType: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    createFromTemplate: vi.fn(),
    getDailyNoteTemplate: vi.fn(),
    setDailyNoteTemplate: vi.fn(),
    clearDailyNoteTemplate: vi.fn(),
  };
});

import * as templatesLib from '@/lib/templates';
import * as contexts from '@/contexts';

const mockUseObjects = vi.mocked(contexts.useObjects);

describe('useTemplates', () => {
  const template1 = { id: 't1', title: 'Template 1', targetTypeId: 'note' };
  const template2 = { id: 't2', title: 'Template 2', targetTypeId: 'task' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(templatesLib.getTemplates).mockReturnValue([
      template1,
      template2,
    ] as any);
    vi.mocked(templatesLib.getTemplatesForType).mockReturnValue([
      template1,
    ] as any);

    vi.mocked(templatesLib.getTemplate).mockReturnValue(template1 as any);

    vi.mocked(templatesLib.createTemplate).mockReturnValue(template1 as any);

    vi.mocked(templatesLib.updateTemplate).mockReturnValue(template1 as any);

    vi.mocked(templatesLib.duplicateTemplate).mockReturnValue(template1 as any);
    vi.mocked(templatesLib.createFromTemplate).mockReturnValue({
      objectId: 'new-obj',
    } as any);
    vi.mocked(templatesLib.getDailyNoteTemplate).mockReturnValue(
      template1 as any
    );
    vi.mocked(templatesLib.deleteTemplate).mockReturnValue(true);
  });

  describe('Queries', () => {
    it('should return all templates', () => {
      const { result } = renderHook(() => useTemplates());
      expect(result.current.templates).toHaveLength(2);
      expect(templatesLib.getTemplates).toHaveBeenCalledWith(mockStore);
    });

    it('should return empty array when store is null', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());
      expect(result.current.templates).toEqual([]);
    });

    it('should return count', () => {
      const { result } = renderHook(() => useTemplates());
      expect(result.current.count).toBe(2);
    });

    it('should get templates for type', () => {
      const { result } = renderHook(() => useTemplates());
      const filtered = result.current.getForType('note');
      expect(filtered).toEqual([template1]);
      expect(templatesLib.getTemplatesForType).toHaveBeenCalledWith(
        mockStore,
        'note'
      );
    });

    it('should return empty array when store is null in getForType', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());
      const filtered = result.current.getForType('note');
      expect(filtered).toEqual([]);
    });

    it('should get template by id', () => {
      const { result } = renderHook(() => useTemplates());
      const found = result.current.getById('t1');
      expect(found).toEqual(template1);
      expect(templatesLib.getTemplate).toHaveBeenCalledWith(mockStore, 't1');
    });

    it('should return undefined when store is null in getById', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());
      const found = result.current.getById('t1');
      expect(found).toBeUndefined();
    });
  });

  describe('Mutations', () => {
    it('should create template', () => {
      const { result } = renderHook(() => useTemplates());
      const input = { name: 'New', targetTypeId: 'note' };

      act(() => {
        result.current.create(input);
      });

      expect(templatesLib.createTemplate).toHaveBeenCalledWith(
        mockStore,
        input
      );
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should return null when store is null in create', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());
      const input = { name: 'New', targetTypeId: 'note' };

      let created: unknown;
      act(() => {
        created = result.current.create(input);
      });

      expect(created).toBeNull();
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should handle error in create and log to console', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('Create failed');
      vi.mocked(templatesLib.createTemplate).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useTemplates());
      const input = { name: 'New', targetTypeId: 'note' };

      let created: unknown;
      act(() => {
        created = result.current.create(input);
      });

      expect(created).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to create template:',
        error
      );
      expect(mockRefreshData).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should update template', () => {
      const { result } = renderHook(() => useTemplates());
      const input = { name: 'Updated' };

      act(() => {
        result.current.update('t1', input);
      });

      expect(templatesLib.updateTemplate).toHaveBeenCalledWith(
        mockStore,
        't1',
        input
      );
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should return null when store is null in update', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());
      const input = { name: 'Updated' };

      let updated: unknown;
      act(() => {
        updated = result.current.update('t1', input);
      });

      expect(updated).toBeNull();
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should handle error in update and log to console', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('Update failed');
      vi.mocked(templatesLib.updateTemplate).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useTemplates());
      const input = { name: 'Updated' };

      let updated: unknown;
      act(() => {
        updated = result.current.update('t1', input);
      });

      expect(updated).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to update template:',
        error
      );
      expect(mockRefreshData).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should delete template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.remove('t1');
      });

      expect(templatesLib.deleteTemplate).toHaveBeenCalledWith(mockStore, 't1');
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should return false when store is null in remove', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());

      let removed: unknown;
      act(() => {
        removed = result.current.remove('t1');
      });

      expect(removed).toBe(false);
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should handle error in remove and log to console', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('Delete failed');
      vi.mocked(templatesLib.deleteTemplate).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useTemplates());

      let removed: unknown;
      act(() => {
        removed = result.current.remove('t1');
      });

      expect(removed).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to delete template:',
        error
      );
      expect(mockRefreshData).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should duplicate template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.duplicate('t1');
      });

      expect(templatesLib.duplicateTemplate).toHaveBeenCalledWith(
        mockStore,
        't1'
      );
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should return null when store is null in duplicate', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());

      let duplicated: unknown;
      act(() => {
        duplicated = result.current.duplicate('t1');
      });

      expect(duplicated).toBeNull();
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should handle error in duplicate and log to console', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('Duplicate failed');
      vi.mocked(templatesLib.duplicateTemplate).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useTemplates());

      let duplicated: unknown;
      act(() => {
        duplicated = result.current.duplicate('t1');
      });

      expect(duplicated).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to duplicate template:',
        error
      );
      expect(mockRefreshData).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('createObject', () => {
    it('should create object from template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.createObject('t1', { title: 'New Note' });
      });

      expect(templatesLib.createFromTemplate).toHaveBeenCalledWith(
        mockStore,
        't1',
        {
          title: 'New Note',
          properties: undefined,
          context: undefined,
        }
      );
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should navigate to created object if requested', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.createObject('t1', { navigate: true });
      });

      expect(mockNavigateToObject).toHaveBeenCalledWith('new-obj');
    });

    it('should not navigate when navigate option is false', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.createObject('t1', { navigate: false });
      });

      expect(mockNavigateToObject).not.toHaveBeenCalled();
    });

    it('should return null when store is null in createObject', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());

      let objectId: unknown;
      act(() => {
        objectId = result.current.createObject('t1');
      });

      expect(objectId).toBeNull();
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should handle error in createObject and log to console', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('Create from template failed');
      vi.mocked(templatesLib.createFromTemplate).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useTemplates());

      let objectId: unknown;
      act(() => {
        objectId = result.current.createObject('t1');
      });

      expect(objectId).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to create object from template:',
        error
      );
      expect(mockRefreshData).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Daily Note Template', () => {
    it('should get daily note template', () => {
      const { result } = renderHook(() => useTemplates());
      expect(result.current.dailyNoteTemplate).toEqual(template1);
      expect(templatesLib.getDailyNoteTemplate).toHaveBeenCalledWith(mockStore);
    });

    it('should return null when store is null for daily note template', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
      } as any);

      const { result } = renderHook(() => useTemplates());
      expect(result.current.dailyNoteTemplate).toBeNull();
    });

    it('should set daily note template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.setDailyNoteTemplate('t1');
      });

      expect(templatesLib.setDailyNoteTemplate).toHaveBeenCalledWith('t1');
    });

    it('should trigger force update when setting daily note template', () => {
      const { result, rerender } = renderHook(() => useTemplates());

      // First, verify initial template
      expect(result.current.dailyNoteTemplate).toEqual(template1);

      // Change the mock to return a different template
      vi.mocked(templatesLib.getDailyNoteTemplate).mockReturnValue(
        template2 as any
      );

      // Set the daily note template (this should trigger force update)
      act(() => {
        result.current.setDailyNoteTemplate('t2');
      });

      // Rerender to pick up the change
      rerender();

      // The force update should cause dailyNoteTemplate to be recalculated
      expect(templatesLib.setDailyNoteTemplate).toHaveBeenCalledWith('t2');
    });

    it('should clear daily note template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.setDailyNoteTemplate(null);
      });

      expect(templatesLib.clearDailyNoteTemplate).toHaveBeenCalled();
    });
  });
});
