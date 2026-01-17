/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedViews } from '../useSavedViews';

// Mocks
const mockRefreshData = vi.fn();
const mockDoc = {}; // Dummy doc

vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => ({
      doc: mockDoc,
      isLoading: false,
      refreshData: mockRefreshData,
      dataVersion: 1,
    }),
  };
});

const mockViewStore = {
  getAll: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
};

vi.mock('@/lib/loro', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    createViewStore: vi.fn(() => mockViewStore),
    ViewStore: vi.fn(),
  };
});

describe('useSavedViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewStore.getAll.mockReturnValue([]);
  });

  describe('querying', () => {
    it('should return views from store', () => {
      const views = [{ id: 'v1', name: 'View 1' }];
      mockViewStore.getAll.mockReturnValue(views);

      const { result } = renderHook(() => useSavedViews());

      expect(result.current.views).toBe(views);
      expect(result.current.count).toBe(1);
    });
  });

  describe('CRUD', () => {
    it('should create view', () => {
      const newView = { id: 'v1', name: 'New View' };
      mockViewStore.create.mockReturnValue(newView);

      const { result } = renderHook(() => useSavedViews());

      let created;
      act(() => {
        created = result.current.createView({
          name: 'New View',
          filters: [],
          typeFilter: 'task',
        });
      });

      expect(created).toBe(newView);
      expect(mockViewStore.create).toHaveBeenCalled();
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should update view', () => {
      const updated = { id: 'v1', name: 'Updated' };
      mockViewStore.update.mockReturnValue(updated);

      const { result } = renderHook(() => useSavedViews());

      act(() => {
        result.current.updateView('v1', { name: 'Updated' });
      });

      expect(mockViewStore.update).toHaveBeenCalledWith('v1', {
        name: 'Updated',
      });
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should delete view', () => {
      mockViewStore.delete.mockReturnValue(true);

      const { result } = renderHook(() => useSavedViews());

      act(() => {
        result.current.deleteView('v1');
      });

      expect(mockViewStore.delete).toHaveBeenCalledWith('v1');
      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should get view by id', () => {
      const view = { id: 'v1', name: 'View 1' };
      mockViewStore.get.mockReturnValue(view);

      const { result } = renderHook(() => useSavedViews());

      const found = result.current.getView('v1');

      expect(found).toBe(view);
      expect(mockViewStore.get).toHaveBeenCalledWith('v1');
    });

    it('should check if view exists', () => {
      mockViewStore.exists.mockReturnValue(true);

      const { result } = renderHook(() => useSavedViews());

      const exists = result.current.exists('v1');

      expect(exists).toBe(true);
      expect(mockViewStore.exists).toHaveBeenCalledWith('v1');
    });

    it('should return false when view does not exist', () => {
      mockViewStore.exists.mockReturnValue(false);

      const { result } = renderHook(() => useSavedViews());

      const exists = result.current.exists('nonexistent');

      expect(exists).toBe(false);
    });

    it('should return null when update throws error', () => {
      mockViewStore.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const { result } = renderHook(() => useSavedViews());

      let updated;
      act(() => {
        updated = result.current.updateView('v1', { name: 'Updated' });
      });

      expect(updated).toBeNull();
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should not refresh when delete returns false', () => {
      mockViewStore.delete.mockReturnValue(false);

      const { result } = renderHook(() => useSavedViews());

      let deleted;
      act(() => {
        deleted = result.current.deleteView('v1');
      });

      expect(deleted).toBe(false);
      expect(mockRefreshData).not.toHaveBeenCalled();
    });
  });

  describe('when viewStore is null', () => {
    beforeEach(() => {
      vi.doMock('@/contexts', async (importOriginal) => {
        const actual = await importOriginal<any>();
        return {
          ...actual,
          useObjects: () => ({
            doc: null, // No doc means no viewStore
            isLoading: true,
            refreshData: mockRefreshData,
            dataVersion: 0,
          }),
        };
      });
    });

    it('should return empty views when no viewStore', async () => {
      const { createViewStore } = await import('@/lib/loro');
      vi.mocked(createViewStore).mockReturnValue(null as any);

      const { result } = renderHook(() => useSavedViews());

      expect(result.current.views).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it('should return null from createView when no viewStore', async () => {
      const { createViewStore } = await import('@/lib/loro');
      vi.mocked(createViewStore).mockReturnValue(null as any);

      const { result } = renderHook(() => useSavedViews());

      let created;
      act(() => {
        created = result.current.createView({
          name: 'Test',
          filters: [],
          typeFilter: 'task',
        });
      });

      expect(created).toBeNull();
    });

    it('should return undefined from getView when no viewStore', async () => {
      const { createViewStore } = await import('@/lib/loro');
      vi.mocked(createViewStore).mockReturnValue(null as any);

      const { result } = renderHook(() => useSavedViews());

      const view = result.current.getView('v1');

      expect(view).toBeUndefined();
    });

    it('should return null from updateView when no viewStore', async () => {
      const { createViewStore } = await import('@/lib/loro');
      vi.mocked(createViewStore).mockReturnValue(null as any);

      const { result } = renderHook(() => useSavedViews());

      let updated;
      act(() => {
        updated = result.current.updateView('v1', { name: 'Updated' });
      });

      expect(updated).toBeNull();
    });

    it('should return false from deleteView when no viewStore', async () => {
      const { createViewStore } = await import('@/lib/loro');
      vi.mocked(createViewStore).mockReturnValue(null as any);

      const { result } = renderHook(() => useSavedViews());

      let deleted;
      act(() => {
        deleted = result.current.deleteView('v1');
      });

      expect(deleted).toBe(false);
    });

    it('should return false from exists when no viewStore', async () => {
      const { createViewStore } = await import('@/lib/loro');
      vi.mocked(createViewStore).mockReturnValue(null as any);

      const { result } = renderHook(() => useSavedViews());

      const exists = result.current.exists('v1');

      expect(exists).toBe(false);
    });
  });
});
