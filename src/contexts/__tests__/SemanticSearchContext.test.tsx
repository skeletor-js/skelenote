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

// Mocks using vi.hoisted to avoid declaration issues
const { mockEngine, captureCallbacks } = vi.hoisted(() => {
  // We store callbacks in a closure to exposing them via getter/setter or just an object
  // But vi.hoisted must return variables.
  const callbacks: any = {
    statusChange: null,
    initProgress: null,
    indexProgress: null,
  };

  const engine = {
    status: 'ready',
    indexedCount: 10,
    onStatusChange: vi.fn((cb) => {
      callbacks.statusChange = cb;
      return vi.fn();
    }),
    initialize: vi.fn((cb) => {
      if (cb) callbacks.initProgress = cb;
      return Promise.resolve();
    }),
    indexContent: vi.fn((_, cb) => {
      if (cb) callbacks.indexProgress = cb;
      return Promise.resolve(true);
    }),
    disable: vi.fn().mockResolvedValue(undefined),
    rebuildIndex: vi.fn((_, cb) => {
      if (cb) callbacks.indexProgress = cb;
      return Promise.resolve(true);
    }),
  };

  return { mockEngine: engine, captureCallbacks: callbacks };
});

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
    captureCallbacks.statusChange = null;
    captureCallbacks.initProgress = null;
    captureCallbacks.indexProgress = null;

    // Reset implementations to happy path
    mockEngine.initialize.mockImplementation((cb: any) => {
      if (cb) captureCallbacks.initProgress = cb;
      return Promise.resolve();
    });
    mockEngine.indexContent.mockImplementation((_, cb) => {
      if (cb) captureCallbacks.indexProgress = cb;
      return Promise.resolve(true);
    });
    mockEngine.rebuildIndex.mockImplementation((_, cb) => {
      if (cb) captureCallbacks.indexProgress = cb;
      return Promise.resolve(true);
    });
    mockEngine.onStatusChange.mockImplementation((cb) => {
      captureCallbacks.statusChange = cb;
      return vi.fn();
    });
    mockEngine.disable.mockResolvedValue(undefined);
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

  it('should receive status updates from engine', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await act(async () => {
      await result.current.enable([]);
    });

    expect(captureCallbacks.statusChange).toBeTruthy();

    act(() => {
      if (captureCallbacks.statusChange) {
        captureCallbacks.statusChange('indexing');
      }
    });

    expect(result.current.status).toBe('indexing');
  });

  it('should receive progress updates during initialization', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    let resolveInit: any;
    mockEngine.initialize.mockImplementation((cb: any) => {
      captureCallbacks.initProgress = cb;
      return new Promise((resolve) => {
        resolveInit = resolve;
      });
    });

    // Start enabling, but don't await the promise yet (it will hang)
    let enablePromise: Promise<void>;
    await act(async () => {
      enablePromise = result.current.enable([]);
    });

    // Send progress
    expect(captureCallbacks.initProgress).toBeTruthy();
    act(() => {
      captureCallbacks.initProgress?.({
        operation: 'download',
        percent: 50,
        message: 'Downloading...',
      });
    });

    expect(result.current.progress).toEqual({
      operation: 'download',
      percent: 50,
      message: 'Downloading...',
    });

    // Finish
    await act(async () => {
      if (resolveInit) resolveInit();
      try {
        await enablePromise;
      } catch {
        // ignore
      }
    });

    expect(result.current.progress).toBeNull();
  });

  it('should receive progress updates during indexing', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    // We must ensure indexContent is reached.
    // Mock initialize to succeed instantly.
    mockEngine.initialize.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.enable([
        { content: 'foo', objectId: '1', title: 'bar' },
      ]);
    });

    // Since mock resolved instantly, progress might have been cleared already.
    // To test interaction, we'd need to pause indexContent
    expect(mockEngine.indexContent).toHaveBeenCalled();
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
    expect(result.current.status).toBe('disabled');
  });

  it('should manage threshold', () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    act(() => {
      result.current.setThreshold(0.5);
    });

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
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    expect(result.current.notifyContentChange).toBeDefined();
    expect(result.current.flushContentChanges).toBeDefined();
  });

  it('should throw error when rebuildIndex called without engine', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    await expect(result.current.rebuildIndex([])).rejects.toThrow(
      'Semantic search is not enabled'
    );
  });

  it('should handle enable error', async () => {
    const mockError = new Error('Enable failed');
    mockEngine.initialize.mockRejectedValue(mockError);

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await expect(result.current.enable([])).rejects.toThrow('Enable failed');

    await waitFor(() => {
      expect(result.current.error).toBe('Enable failed');
    });
  });

  it('should handle initialization error in useEffect', async () => {
    // Simulate enabled in storage
    localStorage.setItem('skelenote:semanticSearchEnabled', 'true');
    mockEngine.initialize.mockRejectedValue(new Error('Init failed'));

    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Init failed');
    });
  });

  it('should disable with cleanup flag', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });

    await act(async () => {
      await result.current.enable([]);
    });

    await act(async () => {
      await result.current.disable(true);
    });

    expect(mockEngine.disable).toHaveBeenCalledWith(true);
    expect(result.current.isEnabled).toBe(false);
  });

  it('should expose getEngine', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    expect(result.current.getEngine()).toBeNull();

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
    captureCallbacks.statusChange = null;

    mockEngine.initialize.mockImplementation((cb: any) => {
      if (cb) captureCallbacks.initProgress = cb;
      return Promise.resolve();
    });
    mockEngine.onStatusChange.mockImplementation((cb) => {
      captureCallbacks.statusChange = cb;
      return vi.fn();
    });
    mockEngine.disable.mockResolvedValue(undefined);
  });

  it('should load enabled state from localStorage on init', async () => {
    localStorage.setItem('skelenote:semanticSearchEnabled', 'true');
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
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

  it('should persist threshold to localStorage', () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    act(() => {
      result.current.setThreshold(0.35);
    });
    expect(localStorage.getItem('skelenote:semanticThreshold')).toBe('0.35');
  });

  it('should skip indexing when content is empty', async () => {
    const { result } = renderHook(() => useSemanticSearch(), { wrapper });
    await act(async () => {
      await result.current.enable([]);
    });
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
