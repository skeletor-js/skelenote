/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedViews } from '../useSavedViews';

// Mocks
const mockRefreshData = vi.fn();
const mockDoc = {}; // Dummy doc

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    doc: mockDoc,
    isLoading: false,
    refreshData: mockRefreshData,
    dataVersion: 1,
  }),
}));

const mockViewStore = {
  getAll: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
};

vi.mock('@/lib/loro', () => ({
  createViewStore: vi.fn(() => mockViewStore),
  ViewStore: vi.fn(),
}));

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
  });
});
