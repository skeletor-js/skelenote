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
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
    refreshData: mockRefreshData,
  }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    navigateToObject: mockNavigateToObject,
  }),
}));

// Mock library functions
vi.mock('@/lib/templates', () => ({
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
}));

import * as templatesLib from '@/lib/templates';

describe('useTemplates', () => {
  const template1 = { id: 't1', title: 'Template 1', targetTypeId: 'note' };
  const template2 = { id: 't2', title: 'Template 2', targetTypeId: 'task' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(templatesLib.getTemplates).mockReturnValue([
      template1,
      template2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    vi.mocked(templatesLib.getTemplatesForType).mockReturnValue([
      template1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(templatesLib.getTemplate).mockReturnValue(template1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(templatesLib.createTemplate).mockReturnValue(template1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(templatesLib.updateTemplate).mockReturnValue(template1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(templatesLib.duplicateTemplate).mockReturnValue(template1 as any);
    vi.mocked(templatesLib.createFromTemplate).mockReturnValue({
      objectId: 'new-obj',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(templatesLib.getDailyNoteTemplate).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    it('should get template by id', () => {
      const { result } = renderHook(() => useTemplates());
      const found = result.current.getById('t1');
      expect(found).toEqual(template1);
      expect(templatesLib.getTemplate).toHaveBeenCalledWith(mockStore, 't1');
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

    it('should delete template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.remove('t1');
      });

      expect(templatesLib.deleteTemplate).toHaveBeenCalledWith(mockStore, 't1');
      expect(mockRefreshData).toHaveBeenCalled();
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
  });

  describe('Daily Note Template', () => {
    it('should get daily note template', () => {
      const { result } = renderHook(() => useTemplates());
      expect(result.current.dailyNoteTemplate).toEqual(template1);
      expect(templatesLib.getDailyNoteTemplate).toHaveBeenCalledWith(mockStore);
    });

    it('should set daily note template', () => {
      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.setDailyNoteTemplate('t1');
      });

      expect(templatesLib.setDailyNoteTemplate).toHaveBeenCalledWith('t1');
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
