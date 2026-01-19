/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchResults } from '..';

// Mock base useSearch hook
const mockUseSearch = {
  query: '',
  setQuery: vi.fn(),
  results: [] as Array<{
    item: { id: string; typeId: string; title: string };
    matchType: string;
    score: number;
  }>,
  isSearching: false,
  indexSize: 10,
  isHybridSearch: false,
  clear: vi.fn(),
};

vi.mock('../data/useSearch', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSearch: () => mockUseSearch,
  };
});

describe('useSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.query = '';
    mockUseSearch.results = [];
    mockUseSearch.isSearching = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSearchResults());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.filters.matchTypes).toEqual([]);
    expect(result.current.filters.objectTypes).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('should pass through base search properties', () => {
    mockUseSearch.query = 'test';
    mockUseSearch.isSearching = true;
    mockUseSearch.indexSize = 100;
    mockUseSearch.isHybridSearch = true;

    const { result } = renderHook(() => useSearchResults());

    expect(result.current.query).toBe('test');
    expect(result.current.isSearching).toBe(true);
    expect(result.current.indexSize).toBe(100);
    expect(result.current.isHybridSearch).toBe(true);
  });

  describe('filters', () => {
    it('should filter by match type', () => {
      mockUseSearch.results = [
        {
          item: { id: '1', typeId: 'note', title: 'Note 1' },
          matchType: 'text',
          score: 0.9,
        },
        {
          item: { id: '2', typeId: 'note', title: 'Note 2' },
          matchType: 'semantic',
          score: 0.8,
        },
        {
          item: { id: '3', typeId: 'task', title: 'Task 1' },
          matchType: 'text',
          score: 0.7,
        },
      ];

      const { result } = renderHook(() => useSearchResults());

      act(() => {
        result.current.setFilters({
          matchTypes: ['semantic'],
          objectTypes: [],
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].item.id).toBe('2');
      expect(result.current.unfilteredResults).toHaveLength(3);
    });

    it('should filter by object type', () => {
      mockUseSearch.results = [
        {
          item: { id: '1', typeId: 'note', title: 'Note 1' },
          matchType: 'text',
          score: 0.9,
        },
        {
          item: { id: '2', typeId: 'note', title: 'Note 2' },
          matchType: 'text',
          score: 0.8,
        },
        {
          item: { id: '3', typeId: 'task', title: 'Task 1' },
          matchType: 'text',
          score: 0.7,
        },
      ];

      const { result } = renderHook(() => useSearchResults());

      act(() => {
        result.current.setFilters({
          matchTypes: [],
          objectTypes: ['task'],
        });
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].item.typeId).toBe('task');
    });

    it('should filter by both match type and object type', () => {
      mockUseSearch.results = [
        {
          item: { id: '1', typeId: 'note', title: 'Note 1' },
          matchType: 'text',
          score: 0.9,
        },
        {
          item: { id: '2', typeId: 'note', title: 'Note 2' },
          matchType: 'semantic',
          score: 0.8,
        },
        {
          item: { id: '3', typeId: 'task', title: 'Task 1' },
          matchType: 'semantic',
          score: 0.7,
        },
      ];

      const { result } = renderHook(() => useSearchResults());

      act(() => {
        result.current.setFilters({
          matchTypes: ['semantic'],
          objectTypes: ['task'],
        });
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].item.id).toBe('3');
    });

    it('should let hybrid matches pass through text and semantic filters', () => {
      mockUseSearch.results = [
        {
          item: { id: '1', typeId: 'note', title: 'Note 1' },
          matchType: 'hybrid',
          score: 0.9,
        },
        {
          item: { id: '2', typeId: 'note', title: 'Note 2' },
          matchType: 'text',
          score: 0.8,
        },
      ];

      const { result } = renderHook(() => useSearchResults());

      // Filter by text only
      act(() => {
        result.current.setFilters({
          matchTypes: ['text'],
          objectTypes: [],
        });
      });

      // Hybrid should pass through text filter
      expect(result.current.results).toHaveLength(2);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useSearchResults());

      act(() => {
        result.current.setFilters({
          matchTypes: ['semantic'],
          objectTypes: ['note'],
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.matchTypes).toEqual([]);
      expect(result.current.filters.objectTypes).toEqual([]);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  it('should call clear on base search', () => {
    const { result } = renderHook(() => useSearchResults());

    act(() => {
      result.current.clear();
    });

    expect(mockUseSearch.clear).toHaveBeenCalled();
  });

  it('should handle results without matchType (defaults to text)', () => {
    mockUseSearch.results = [
      { item: { id: '1', typeId: 'note', title: 'Note 1' }, score: 0.9 } as any,
    ];

    const { result } = renderHook(() => useSearchResults());

    act(() => {
      result.current.setFilters({
        matchTypes: ['text'],
        objectTypes: [],
      });
    });

    // Should include result with undefined matchType when filtering for text
    expect(result.current.results).toHaveLength(1);
  });
});
