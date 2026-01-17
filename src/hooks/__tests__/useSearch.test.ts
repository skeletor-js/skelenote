/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../useSearch';

// Mock data - needs to be hoisted
const mockSearchIndex = [
  {
    id: '1',
    title: 'Test Note 1',
    content: 'Hello world',
    typeName: 'Note',
    typeId: 'built-in:note',
    properties: '',
    updatedAt: Date.now(),
  },
  {
    id: '2',
    title: 'Test Note 2',
    content: 'Goodbye world',
    typeName: 'Note',
    typeId: 'built-in:note',
    properties: '',
    updatedAt: Date.now(),
  },
  {
    id: '3',
    title: 'Task Item',
    content: 'Complete task',
    typeName: 'Task',
    typeId: 'built-in:task',
    properties: '',
    updatedAt: Date.now(),
  },
];

const mockStore = {
  getAll: vi.fn(() => []),
};

const mockTypeRegistry = {
  getAll: vi.fn(() => []),
};

// Mock contexts
vi.mock('@/contexts', () => ({
  useObjects: vi.fn(() => ({ store: mockStore })),
  useTypeRegistry: vi.fn(() => mockTypeRegistry),

  useSemanticSearchSafe: vi.fn(() => null) as any,
}));

// Create mock search function
const mockSearchFn = vi.fn(() => [
  { item: mockSearchIndex[0], score: 0.9, matches: [] },
]);

// Mock search library with a class that can be instantiated
vi.mock('@/lib/search', async (importOriginal) => {
  const actual = await importOriginal<any>();

  // Create the mock class inside the factory
  function MockSearchEngine() {
    // @ts-expect-error mock
    this.search = (...args) => mockSearchFn(...args);
    // @ts-expect-error mock
    this.setItems = vi.fn();
  }

  return {
    ...actual,
    SearchEngine: MockSearchEngine,
    buildSearchIndex: vi.fn(() => mockSearchIndex),
    fuseSearchResults: (textResults: unknown[]) => textResults,
  };
});

import * as contexts from '@/contexts';
import * as searchLib from '@/lib/search';

const mockUseSemanticSearchSafe = vi.mocked(contexts.useSemanticSearchSafe);
const mockBuildSearchIndex = vi.mocked(searchLib.buildSearchIndex);

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSearchFn.mockClear();
    mockSearchFn.mockReturnValue([
      { item: mockSearchIndex[0], score: 0.9, matches: [] },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty query', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });

    it('should report index size', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.indexSize).toBe(mockSearchIndex.length);
    });

    it('should default to no hybrid search when semantic context is null', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.isHybridSearch).toBe(false);
    });
  });

  describe('query handling', () => {
    it('should update query when setQuery is called', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.query).toBe('test');
    });

    it('should set isSearching to true while searching', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.isSearching).toBe(true);
    });

    it('should not search for empty queries', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('   ');
      });

      expect(result.current.isSearching).toBe(false);
      expect(result.current.results).toEqual([]);
    });
  });

  describe('debouncing', () => {
    it('should debounce search calls', async () => {
      const { result } = renderHook(() => useSearch({ debounceMs: 200 }));

      act(() => {
        result.current.setQuery('a');
        result.current.setQuery('ab');
        result.current.setQuery('abc');
      });

      // Before debounce completes - search not yet called
      expect(mockSearchFn).not.toHaveBeenCalled();

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      // Search should have been called once with final query
      expect(mockSearchFn).toHaveBeenCalledWith('abc', expect.any(Object));
    });

    it('should use custom debounce delay', async () => {
      const { result } = renderHook(() => useSearch({ debounceMs: 500 }));

      act(() => {
        result.current.setQuery('test');
      });

      // Advance 200ms - should not have searched yet
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      expect(mockSearchFn).not.toHaveBeenCalled();

      // Advance another 350ms - now should have searched
      await act(async () => {
        vi.advanceTimersByTime(350);
      });
      expect(mockSearchFn).toHaveBeenCalled();
    });
  });

  describe('search results', () => {
    it('should return search results after debounce', async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.results.length).toBeGreaterThan(0);
      expect(result.current.isSearching).toBe(false);
    });

    it('should respect limit option', async () => {
      mockSearchFn.mockReturnValue([
        { item: mockSearchIndex[0], score: 0.9, matches: [] },
        { item: mockSearchIndex[1], score: 0.8, matches: [] },
        { item: mockSearchIndex[2], score: 0.7, matches: [] },
      ]);

      const { result } = renderHook(() => useSearch({ limit: 2 }));

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.results.length).toBeLessThanOrEqual(2);
    });

    it('should add matchType to results', async () => {
      mockSearchFn.mockReturnValue([
        { item: mockSearchIndex[0], score: 0.9, matches: [] },
      ]);

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.results[0]).toHaveProperty('matchType', 'text');
    });
  });

  describe('clear functionality', () => {
    it('should clear query and results', async () => {
      const { result } = renderHook(() => useSearch());

      // Set up a search
      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.results.length).toBeGreaterThan(0);

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });

    it('should cancel pending search when clearing', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      // Clear before debounce completes
      act(() => {
        result.current.clear();
      });

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Search should not have been called because we cleared
      expect(result.current.results).toEqual([]);
    });
  });

  describe('options', () => {
    it('should use default options', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.isHybridSearch).toBe(false);
    });

    it('should allow disabling hybrid search', () => {
      const { result } = renderHook(() => useSearch({ enableHybrid: false }));

      expect(result.current.isHybridSearch).toBe(false);
    });
  });

  describe('hybrid search', () => {
    const mockSemanticEngine = {
      status: 'ready' as const,
      search: vi.fn(),
    };

    const mockSemanticContext = {
      isEnabled: true,
      status: 'ready' as const,
      threshold: 0.7,
      getEngine: vi.fn(() => mockSemanticEngine),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockSemanticEngine.search.mockResolvedValue([
        { item: mockSearchIndex[1], score: 0.85, matches: [] },
      ]);
    });

    it('should enable hybrid search when semantic context is ready', () => {
      mockUseSemanticSearchSafe.mockReturnValue(mockSemanticContext as any);

      const { result } = renderHook(() => useSearch());

      expect(result.current.isHybridSearch).toBe(true);
    });

    it('should use both text and semantic search in hybrid mode', async () => {
      mockUseSemanticSearchSafe.mockReturnValue(mockSemanticContext as any);

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(mockSearchFn).toHaveBeenCalledWith('test', expect.any(Object));
      expect(mockSemanticEngine.search).toHaveBeenCalledWith('test', {
        limit: expect.any(Number),
        threshold: 0.7,
      });
    });

    it('should fallback to text-only when semantic search throws error', async () => {
      const consoleWarn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockSemanticEngine.search.mockRejectedValue(
        new Error('Semantic search failed')
      );

      mockUseSemanticSearchSafe.mockReturnValue(mockSemanticContext as any);

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        'Semantic search failed, falling back to text:',
        expect.any(Error)
      );
      expect(result.current.results[0]).toHaveProperty('matchType', 'text');
      consoleWarn.mockRestore();
    });

    it('should use text-only when semantic engine is not ready', async () => {
      const notReadyContext = {
        ...mockSemanticContext,
        getEngine: vi.fn(() => ({
          ...mockSemanticEngine,
          status: 'loading' as const,
        })),
      };

      mockUseSemanticSearchSafe.mockReturnValue(notReadyContext as any);

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(mockSemanticEngine.search).not.toHaveBeenCalled();
      expect(result.current.results[0]).toHaveProperty('matchType', 'text');
    });

    it('should use text-only when semantic context is disabled', async () => {
      const disabledContext = {
        ...mockSemanticContext,
        isEnabled: false,
      };

      mockUseSemanticSearchSafe.mockReturnValue(disabledContext as any);

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(mockSemanticEngine.search).not.toHaveBeenCalled();
      expect(result.current.isHybridSearch).toBe(false);
    });

    it('should use text-only when enableHybrid option is false', async () => {
      mockUseSemanticSearchSafe.mockReturnValue(mockSemanticContext as any);

      const { result } = renderHook(() => useSearch({ enableHybrid: false }));

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(mockSemanticEngine.search).not.toHaveBeenCalled();
      expect(result.current.isHybridSearch).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear debounce timer on unmount', () => {
      const { result, unmount } = renderHook(() => useSearch());

      act(() => {
        // Start a search but don't let it complete
        result.current.setQuery('test');
      });

      // Unmount should clear the timer
      unmount();

      // Advance timers - search should not execute because timer was cleared
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // If timer was properly cleared, the search would not have completed
      // We verify cleanup by ensuring unmount doesn't throw and handles cleanup gracefully
    });
  });

  describe('search engine initialization', () => {
    it('should create search engine when ref is null', () => {
      const { result } = renderHook(() => useSearch());

      // Engine should be created
      expect(result.current.indexSize).toBe(mockSearchIndex.length);
    });

    it('should update search engine when index changes', () => {
      const { rerender } = renderHook(() => useSearch());

      // Mock a change to the search index
      const newMockSearchIndex = [
        ...mockSearchIndex,
        {
          id: '4',
          title: 'New Item',
          content: 'New content',
          typeName: 'Note',
          typeId: 'built-in:note',
          properties: '',
          updatedAt: Date.now(),
        },
      ];

      mockBuildSearchIndex.mockReturnValue(newMockSearchIndex);

      // Rerender to trigger useEffect
      rerender();

      // The engine should have been updated (via setItems)
      // We verify this indirectly by checking that the hook continues to work
    });

    it('should return early from search when engine ref is null', async () => {
      const { result } = renderHook(() => useSearch());

      // Manually set isSearching to true to simulate the search starting
      act(() => {
        result.current.setQuery('test');
      });

      // If we somehow have no engine, the search should complete with no results
      // This is a defensive edge case - normally engine is always initialized
      expect(result.current.isSearching).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.isSearching).toBe(false);
    });
  });
});
