/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInbox } from '../useInbox';
import { BuiltInTypeIds } from '@/lib/types';

// Mock dependencies
const mockStore = {
  getInboxed: vi.fn(),
  markProcessed: vi.fn(),
  archive: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getContent: vi.fn(),
  setContent: vi.fn(),
};

const mockRefreshData = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
    refreshData: mockRefreshData,
    dataVersion: 1,
  }),
}));

vi.mock('@/lib/editor', () => ({
  removeMentionsFromContent: vi.fn(),
}));

describe('useInbox', () => {
  const noteItem = {
    id: '1',
    typeId: BuiltInTypeIds.NOTE,
    createdAt: 1000,
    properties: { title: 'Note' },
  };

  const tagItem = {
    id: '2',
    typeId: BuiltInTypeIds.TAG, // Should be excluded
    createdAt: 2000,
    properties: { name: 'Tag' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getInboxed.mockReturnValue([noteItem, tagItem]);
    mockStore.getAll.mockReturnValue([]);
  });

  describe('querying', () => {
    it('should return inbox items excluding excluded types (projects, tags)', () => {
      const { result } = renderHook(() => useInbox());

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('1');
      expect(result.current.count).toBe(1);
    });
  });

  describe('processItem', () => {
    it('should mark item as processed', () => {
      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.processItem('1');
      });

      expect(mockStore.markProcessed).toHaveBeenCalledWith('1');
      expect(mockRefreshData).toHaveBeenCalled();
    });
  });

  describe('archiveItem', () => {
    it('should archive item', () => {
      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.archiveItem('1');
      });

      expect(mockStore.archive).toHaveBeenCalledWith('1');
      expect(mockRefreshData).toHaveBeenCalled();
    });
  });

  describe('deleteItem', () => {
    it('should delete item', () => {
      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.deleteItem('1');
      });

      expect(mockStore.delete).toHaveBeenCalledWith('1');
      expect(mockRefreshData).toHaveBeenCalled();
    });
  });
});
