/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDuplicate } from '../useDuplicate';

// Mock store
const mockStore = {
  canDuplicate: vi.fn(),
  duplicate: vi.fn(),
  duplicateMany: vi.fn(),
};

// Track mock values
const mockContext = {
  store: mockStore,
  refreshData: vi.fn(),
};

const mockNavigationContext = {
  navigateToObject: vi.fn(),
};

const mockToastContext = {
  addToast: vi.fn(),
};

const mockLinkToDaily = vi.fn();

vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => mockContext,
    useNavigation: () => mockNavigationContext,
    useToast: () => mockToastContext,
  };
});

vi.mock('../useLinkToDaily', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useLinkToDaily: () => ({ linkToDaily: mockLinkToDaily }),
  };
});

describe('useDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('canDuplicate', () => {
    it('should return true when store allows duplication', () => {
      mockStore.canDuplicate.mockReturnValue(true);

      const { result } = renderHook(() => useDuplicate());

      expect(result.current.canDuplicate('object-1')).toBe(true);
      expect(mockStore.canDuplicate).toHaveBeenCalledWith('object-1');
    });

    it('should return false when store disallows duplication', () => {
      mockStore.canDuplicate.mockReturnValue(false);

      const { result } = renderHook(() => useDuplicate());

      expect(result.current.canDuplicate('daily-note-1')).toBe(false);
    });

    it('should return false when store is null', () => {
      mockContext.store = null as unknown as typeof mockStore;

      const { result } = renderHook(() => useDuplicate());

      expect(result.current.canDuplicate('object-1')).toBe(false);

      // Restore
      mockContext.store = mockStore;
    });
  });

  describe('duplicate', () => {
    beforeEach(() => {
      mockContext.store = mockStore;
    });

    it('should duplicate an object successfully', () => {
      const duplicatedObject = {
        id: 'dup-1',
        typeId: 'built-in:task',
        properties: { title: 'Test Task' },
        hasContent: false,
        inboxed: true,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.canDuplicate.mockReturnValue(true);
      mockStore.duplicate.mockReturnValue(duplicatedObject);

      const { result } = renderHook(() => useDuplicate());

      let duplicated;
      act(() => {
        duplicated = result.current.duplicate('object-1');
      });

      expect(duplicated).toEqual(duplicatedObject);
      expect(mockStore.duplicate).toHaveBeenCalledWith('object-1');
      expect(mockLinkToDaily).toHaveBeenCalledWith(duplicatedObject);
      expect(mockContext.refreshData).toHaveBeenCalled();
      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('Duplicated'),
        })
      );
    });

    it('should show error toast for daily notes', () => {
      mockStore.canDuplicate.mockReturnValue(false);

      const { result } = renderHook(() => useDuplicate());

      let duplicated;
      act(() => {
        duplicated = result.current.duplicate('daily-note-1');
      });

      expect(duplicated).toBeNull();
      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Daily notes cannot be duplicated',
        })
      );
    });

    it('should handle duplication errors', () => {
      mockStore.canDuplicate.mockReturnValue(true);
      mockStore.duplicate.mockImplementation(() => {
        throw new Error('Duplication failed');
      });

      const { result } = renderHook(() => useDuplicate());

      let duplicated;
      act(() => {
        duplicated = result.current.duplicate('object-1');
      });

      expect(duplicated).toBeNull();
      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Duplication failed',
        })
      );
    });

    it('should return null when store is null', () => {
      mockContext.store = null as unknown as typeof mockStore;

      const { result } = renderHook(() => useDuplicate());

      let duplicated;
      act(() => {
        duplicated = result.current.duplicate('object-1');
      });

      expect(duplicated).toBeNull();

      // Restore
      mockContext.store = mockStore;
    });

    it('should truncate long titles in toast', () => {
      const duplicatedObject = {
        id: 'dup-1',
        typeId: 'built-in:task',
        properties: { title: 'A'.repeat(50) },
        hasContent: false,
        inboxed: true,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.canDuplicate.mockReturnValue(true);
      mockStore.duplicate.mockReturnValue(duplicatedObject);

      const { result } = renderHook(() => useDuplicate());

      act(() => {
        result.current.duplicate('object-1');
      });

      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('...'),
        })
      );
    });
  });

  describe('duplicateMany', () => {
    beforeEach(() => {
      mockContext.store = mockStore;
    });

    it('should duplicate multiple objects', () => {
      const duplicatedObjects = [
        { id: 'dup-1', properties: { title: 'Task 1' } },
        { id: 'dup-2', properties: { title: 'Task 2' } },
      ];

      mockStore.duplicateMany.mockReturnValue({
        duplicated: duplicatedObjects,
        errors: [],
      });

      const { result } = renderHook(() => useDuplicate());

      let returnValue;
      act(() => {
        returnValue = result.current.duplicateMany(['obj-1', 'obj-2']);
      });

      expect(returnValue).toEqual({
        duplicated: duplicatedObjects,
        errors: [],
      });

      // Each duplicate should be linked to daily
      expect(mockLinkToDaily).toHaveBeenCalledTimes(2);
      expect(mockContext.refreshData).toHaveBeenCalled();
      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Duplicated 2 items',
        })
      );
    });

    it('should show warning toast when some fail', () => {
      mockStore.duplicateMany.mockReturnValue({
        duplicated: [{ id: 'dup-1', properties: { title: 'Task 1' } }],
        errors: ['obj-2'],
      });

      const { result } = renderHook(() => useDuplicate());

      act(() => {
        result.current.duplicateMany(['obj-1', 'obj-2']);
      });

      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'Duplicated 1 of 2 items',
        })
      );
    });

    it('should show error toast when all fail', () => {
      mockStore.duplicateMany.mockReturnValue({
        duplicated: [],
        errors: ['obj-1', 'obj-2'],
      });

      const { result } = renderHook(() => useDuplicate());

      act(() => {
        result.current.duplicateMany(['obj-1', 'obj-2']);
      });

      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to duplicate items',
        })
      );
    });

    it('should return empty when store is null', () => {
      mockContext.store = null as unknown as typeof mockStore;

      const { result } = renderHook(() => useDuplicate());

      let returnValue;
      act(() => {
        returnValue = result.current.duplicateMany(['obj-1', 'obj-2']);
      });

      expect(returnValue).toEqual({
        duplicated: [],
        errors: ['obj-1', 'obj-2'],
      });

      // Restore
      mockContext.store = mockStore;
    });
  });
});
