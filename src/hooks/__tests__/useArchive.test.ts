/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArchive } from '../useArchive';

// Mock dependencies
const mockStore = {
  get: vi.fn(),
  getArchived: vi.fn(),
  unarchive: vi.fn(),
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
  useAnalyticsSafe: () => null,
}));

const mockRemoveMentionsFromContent = vi.fn();
vi.mock('@/lib/editor', () => ({
  removeMentionsFromContent: (content: any, id: string) =>
    mockRemoveMentionsFromContent(content, id),
}));

describe('useArchive Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sorted archived items', () => {
    const item1 = { id: '1', updatedAt: 100 };
    const item2 = { id: '2', updatedAt: 200 };
    mockStore.getArchived.mockReturnValue([item1, item2]);

    const { result } = renderHook(() => useArchive());

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].id).toBe('2'); // Most recent first
    expect(result.current.items[1].id).toBe('1');
    expect(result.current.count).toBe(2);
  });

  it('should unarchive item and refresh data', () => {
    const { result } = renderHook(() => useArchive());

    act(() => {
      result.current.unarchiveItem('item-1');
    });

    expect(mockStore.unarchive).toHaveBeenCalledWith('item-1');
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should delete item and clean up mentions', () => {
    const { result } = renderHook(() => useArchive());

    // Setup mock for mention cleanup
    const otherObj = { id: 'other-1' };
    mockStore.getAll.mockReturnValue([otherObj]); // exclude archived check? Hook usually excludes archived for cleanup?
    // Hook calls store.getAll({ includeArchived: true })
    // Let's verify behavior

    mockStore.getContent.mockReturnValue('content-with-mention');
    mockRemoveMentionsFromContent.mockReturnValue('cleaned-content');

    act(() => {
      result.current.deleteItem('item-to-delete');
    });

    // Verify cleanup loop
    expect(mockStore.getAll).toHaveBeenCalledWith({ includeArchived: true });
    expect(mockStore.getContent).toHaveBeenCalledWith('other-1');
    expect(mockRemoveMentionsFromContent).toHaveBeenCalledWith(
      'content-with-mention',
      'item-to-delete'
    );
    expect(mockStore.setContent).toHaveBeenCalledWith(
      'other-1',
      'cleaned-content'
    );

    // Verify delete
    expect(mockStore.delete).toHaveBeenCalledWith('item-to-delete');
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should handle delete with no cleanup needed', () => {
    const { result } = renderHook(() => useArchive());

    mockStore.getAll.mockReturnValue([]);

    act(() => {
      result.current.deleteItem('item-1');
    });

    expect(mockStore.setContent).not.toHaveBeenCalled();
    expect(mockStore.delete).toHaveBeenCalledWith('item-1');
  });
});
