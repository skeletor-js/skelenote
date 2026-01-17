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
  useObjects: vi.fn(
    () =>
      ({
        store: mockStore,
        isLoading: false,
        refreshData: mockRefreshData,
        dataVersion: 1,
      }) as any
  ),
}));

vi.mock('@/lib/editor', () => ({
  removeMentionsFromContent: vi.fn(),
}));

import { useObjects } from '@/contexts';
import { removeMentionsFromContent } from '@/lib/editor';

const mockUseObjects = vi.mocked(useObjects);
const mockRemoveMentionsFromContent = vi.mocked(removeMentionsFromContent);

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

    it('should return early when store is null', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
        dataVersion: 1,
      } as any);

      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.processItem('1');
      });

      expect(mockStore.markProcessed).not.toHaveBeenCalled();
      expect(mockRefreshData).not.toHaveBeenCalled();
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

    it('should return early when store is null', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
        dataVersion: 1,
      } as any);

      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.archiveItem('1');
      });

      expect(mockStore.archive).not.toHaveBeenCalled();
      expect(mockRefreshData).not.toHaveBeenCalled();
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

    it('should return early when store is null', () => {
      mockUseObjects.mockReturnValueOnce({
        store: null as any,
        isLoading: false,
        refreshData: mockRefreshData,
        dataVersion: 1,
      } as any);

      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.deleteItem('1');
      });

      expect(mockStore.delete).not.toHaveBeenCalled();
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should clean up mentions in other objects content', () => {
      const otherObject = { id: 'other-obj', typeId: BuiltInTypeIds.NOTE };
      mockStore.getAll.mockReturnValue([noteItem, otherObject]);
      mockStore.getContent.mockReturnValue('Some content with @mention');

      mockRemoveMentionsFromContent.mockReturnValue('Cleaned content');

      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.deleteItem('1');
      });

      expect(mockStore.getContent).toHaveBeenCalledWith('other-obj');
      expect(mockRemoveMentionsFromContent).toHaveBeenCalledWith(
        'Some content with @mention',
        '1'
      );
      expect(mockStore.setContent).toHaveBeenCalledWith(
        'other-obj',
        'Cleaned content'
      );
      expect(mockStore.delete).toHaveBeenCalledWith('1');
    });

    it('should skip objects without content when getContent throws', () => {
      const otherObject = { id: 'other-obj', typeId: BuiltInTypeIds.NOTE };
      mockStore.getAll.mockReturnValue([noteItem, otherObject]);
      mockStore.getContent.mockImplementation(() => {
        throw new Error('No content');
      });

      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.deleteItem('1');
      });

      expect(mockStore.getContent).toHaveBeenCalledWith('other-obj');
      expect(mockStore.setContent).not.toHaveBeenCalled();
      expect(mockStore.delete).toHaveBeenCalledWith('1');
    });

    it('should skip objects where removeMentionsFromContent returns null', () => {
      const otherObject = { id: 'other-obj', typeId: BuiltInTypeIds.NOTE };
      mockStore.getAll.mockReturnValue([noteItem, otherObject]);
      mockStore.getContent.mockReturnValue('Some content');
      mockRemoveMentionsFromContent.mockReturnValue(null);

      const { result } = renderHook(() => useInbox());

      act(() => {
        result.current.deleteItem('1');
      });

      expect(mockStore.getContent).toHaveBeenCalledWith('other-obj');
      expect(mockStore.setContent).not.toHaveBeenCalled();
      expect(mockStore.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('sorting and filtering', () => {
    it('should sort items by createdAt descending (newest first)', () => {
      const oldItem = {
        id: 'old',
        typeId: BuiltInTypeIds.NOTE,
        createdAt: 1000,
        properties: { title: 'Old' },
      };
      const newItem = {
        id: 'new',
        typeId: BuiltInTypeIds.NOTE,
        createdAt: 3000,
        properties: { title: 'New' },
      };
      const midItem = {
        id: 'mid',
        typeId: BuiltInTypeIds.NOTE,
        createdAt: 2000,
        properties: { title: 'Mid' },
      };

      mockStore.getInboxed.mockReturnValue([oldItem, midItem, newItem]);

      const { result } = renderHook(() => useInbox());

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].id).toBe('new');
      expect(result.current.items[1].id).toBe('mid');
      expect(result.current.items[2].id).toBe('old');
    });

    it('should return empty array when inbox is empty', () => {
      mockStore.getInboxed.mockReturnValue([]);

      const { result } = renderHook(() => useInbox());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.count).toBe(0);
    });
  });
});
