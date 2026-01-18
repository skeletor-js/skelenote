/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../useSearch';

// Mocks
const mockStore = { id: 'store' };
const mockTypeRegistry = { id: 'registry' };
const mockSemanticContext = {
  isEnabled: true,
  status: 'ready',
  getEngine: vi.fn(),
  threshold: 0.7,
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({ store: mockStore }),
  useTypeRegistry: () => mockTypeRegistry,
  useSemanticSearchSafe: () => mockSemanticContext,
}));

// Mock @/lib/search
const {
  mockSearchEngineConstructor,
  mockBuildSearchIndex,
  mockFuseSearchResults,
  mockSearchEngineInstance,
} = vi.hoisted(() => {
  const mockInstance = {
    setItems: vi.fn(),
    search: vi.fn(),
  };

  const MockClass = vi.fn(function () {
    return mockInstance;
  });

  return {
    mockSearchEngineInstance: mockInstance,
    mockSearchEngineConstructor: MockClass,
    mockBuildSearchIndex: vi.fn(),
    mockFuseSearchResults: vi.fn(),
  };
});

vi.mock('@/lib/search', () => ({
  SearchEngine: mockSearchEngineConstructor,
  buildSearchIndex: (...args: any[]) => mockBuildSearchIndex(...args),
  fuseSearchResults: (...args: any[]) => mockFuseSearchResults(...args),
}));

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockBuildSearchIndex.mockReturnValue([{ id: '1', title: 'Test' }]);
    mockSearchEngineInstance.search.mockReturnValue([
      { item: { id: '1' }, score: 1 },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and build index', () => {
    const { result } = renderHook(() => useSearch());
    expect(mockBuildSearchIndex).toHaveBeenCalledWith(
      mockStore,
      mockTypeRegistry
    );
    expect(mockSearchEngineConstructor).toHaveBeenCalled();
    expect(result.current.indexSize).toBe(1);
  });

  it('should execute text search', async () => {
    // Disable hybrid for simple text test
    mockSemanticContext.isEnabled = false;

    const { result } = renderHook(() => useSearch({ enableHybrid: false }));

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.isSearching).toBe(true); // Should be searching immediately (debouncing happens, but state sets true)

    // Advance timer
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearchEngineInstance.search).toHaveBeenCalledWith(
      'test',
      expect.anything()
    );
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].matchType).toBe('text');
    expect(result.current.isSearching).toBe(false);

    // Reset
    mockSemanticContext.isEnabled = true;
  });

  it('should execute hybrid search', async () => {
    const { result } = renderHook(() => useSearch({ enableHybrid: true }));

    // Mock semantic answer
    const mockSemanticEngine = {
      status: 'ready',
      search: vi.fn().mockResolvedValue([{ item: { id: '1' }, score: 0.9 }]),
    };
    mockSemanticContext.getEngine.mockReturnValue(mockSemanticEngine);

    mockFuseSearchResults.mockReturnValue([
      { item: { id: '1', title: 'Fused' }, score: 0.95 },
    ]);

    act(() => {
      result.current.setQuery('test');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearchEngineInstance.search).toHaveBeenCalled(); // Text search
    expect(mockSemanticEngine.search).toHaveBeenCalled(); // Semantic search
    expect(mockFuseSearchResults).toHaveBeenCalled();
    expect(result.current.results[0].item.title).toBe('Fused');
  });

  it('should clear results', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('foo');
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });
});
