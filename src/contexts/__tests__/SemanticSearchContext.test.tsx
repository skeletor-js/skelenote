/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  SemanticSearchProvider,
  useSemanticSearch,
} from '../SemanticSearchContext';
import * as semanticLib from '@/lib/semantic';

// Mock dependencies
const mockEngine = {
  status: 'ready',
  indexedCount: 10,
  onStatusChange: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined),
  indexContent: vi.fn().mockResolvedValue(true),
  disable: vi.fn().mockResolvedValue(undefined),
  rebuildIndex: vi.fn().mockResolvedValue(true),
};

vi.mock('@/lib/semantic', () => ({
  createSemanticEngine: vi.fn(() => mockEngine),
  SemanticEngineStatus: 'ready',
}));

vi.mock('@/hooks/useSemanticIndexSync', () => ({
  useSemanticIndexSync: () => ({
    notifyContentChange: vi.fn(),
    flushContentChanges: vi.fn(),
  }),
}));

describe('SemanticSearchContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SemanticSearchProvider>{children}</SemanticSearchProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockEngine.onStatusChange.mockReturnValue(() => {});
  });

  it('should initialize with default disabled state', () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.status).toBe('disabled');
  });

  it('should enable semantic search', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await act(async () => {
      await result.current.enable([
        { content: 'text', objectId: '1', title: 'test' },
      ]);
    });

    expect(semanticLib.createSemanticEngine).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(mockEngine.initialize).toHaveBeenCalled();
    expect(mockEngine.indexContent).toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(true);
    expect(localStorage.getItem('skelenote:semanticSearchEnabled')).toBe(
      'true'
    );
  });

  it('should disable semantic search', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // Enable first
    await act(async () => {
      await result.current.enable([]);
    });

    await act(async () => {
      await result.current.disable();
    });

    expect(mockEngine.disable).toHaveBeenCalledWith(false);
    expect(result.current.isEnabled).toBe(false);
    expect(localStorage.getItem('skelenote:semanticSearchEnabled')).toBeNull();
  });

  it('should manage threshold', () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    act(() => {
      result.current.setThreshold(0.5);
    });

    // It clamps to MAX_THRESHOLD (0.6)
    expect(result.current.threshold).toBe(0.5);

    act(() => {
      result.current.setThreshold(1.0);
    });

    expect(result.current.threshold).toBe(0.6); // MAX_THRESHOLD defined in context is 0.6
  });

  it('should rebuild index', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await act(async () => {
      await result.current.enable([]);
    });

    await act(async () => {
      await result.current.rebuildIndex([
        { content: 'text', objectId: '1', title: 'test' },
      ]);
    });

    expect(mockEngine.rebuildIndex).toHaveBeenCalled();
  });

  it('should notify content change', () => {
    // This is just a pass-through to the hook mock, but ensures API is exposed
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    expect(result.current.notifyContentChange).toBeDefined();
    expect(result.current.flushContentChanges).toBeDefined();
  });

  it('should throw error when rebuildIndex called without engine', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await expect(
      result.current.rebuildIndex([
        { content: 'text', objectId: '1', title: 'test' },
      ])
    ).rejects.toThrow('Semantic search is not enabled');
  });

  it('should handle enable error', async () => {
    const mockError = new Error('Enable failed');
    vi.mocked(semanticLib.createSemanticEngine).mockReturnValueOnce({
      ...mockEngine,
      initialize: vi.fn().mockRejectedValue(mockError),
    } as any);

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await expect(result.current.enable([])).rejects.toThrow('Enable failed');

    // Wait for the error state to be set (React state updates are async)
    await waitFor(() => {
      expect(result.current.error).toBe('Enable failed');
    });
  });

  it('should disable with cleanup flag', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // Enable first
    await act(async () => {
      await result.current.enable([]);
    });

    await act(async () => {
      await result.current.disable(true); // With cleanup
    });

    expect(mockEngine.disable).toHaveBeenCalledWith(true);
    expect(result.current.isEnabled).toBe(false);
  });

  it('should expose getEngine', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // Before enabling, engine is null
    expect(result.current.getEngine()).toBeNull();

    // After enabling
    await act(async () => {
      await result.current.enable([]);
    });

    expect(result.current.getEngine()).toBeTruthy();
  });

  it('should clamp threshold at minimum 0', () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    act(() => {
      result.current.setThreshold(-0.5);
    });

    expect(result.current.threshold).toBe(0);
  });
});

describe('useSemanticSearch error boundary', () => {
  it('should throw when used outside provider', () => {
    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSemanticSearch());
    }).toThrow(
      'useSemanticSearch must be used within a SemanticSearchProvider'
    );

    consoleSpy.mockRestore();
  });
});

describe('SemanticSearchContext persistence', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SemanticSearchProvider>{children}</SemanticSearchProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockEngine.onStatusChange.mockReturnValue(() => {});
  });

  it('should load enabled state from localStorage on init', async () => {
    // Set enabled before rendering
    localStorage.setItem('skelenote:semanticSearchEnabled', 'true');

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // Semantic search should initialize as enabled when localStorage says true
    // Note: The actual engine initialization happens asynchronously
    expect(result.current.isEnabled).toBe(true);
  });

  it('should load threshold from localStorage on init', () => {
    localStorage.setItem('skelenote:semanticThreshold', '0.4');

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    expect(result.current.threshold).toBe(0.4);
  });

  it('should cap threshold at MAX_THRESHOLD when loading from localStorage', () => {
    localStorage.setItem('skelenote:semanticThreshold', '0.9');

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // MAX_THRESHOLD is 0.6
    expect(result.current.threshold).toBe(0.6);
  });

  it('should use default threshold for invalid localStorage value', () => {
    localStorage.setItem('skelenote:semanticThreshold', 'invalid');

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // DEFAULT_THRESHOLD is 0.2
    expect(result.current.threshold).toBe(0.2);
  });

  it('should persist threshold to localStorage when set', () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    act(() => {
      result.current.setThreshold(0.35);
    });

    expect(localStorage.getItem('skelenote:semanticThreshold')).toBe('0.35');
  });

  it('should skip indexing when content is empty', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await act(async () => {
      await result.current.enable([]); // Empty content array
    });

    // indexContent should not be called for empty array
    expect(mockEngine.indexContent).not.toHaveBeenCalled();
  });
});

describe('useSemanticSearchSafe', () => {
  it('should return null outside provider', async () => {
    // Import the safe hook
    const { useSemanticSearchSafe } = await import('../SemanticSearchContext');

    const { result } = renderHook(() => useSemanticSearchSafe());

    expect(result.current).toBeNull();
  });
});
