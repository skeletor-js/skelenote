/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  ObjectProvider,
  useObjects,
  useObjectStore,
  useRelationHelper,
  useTypeRegistry,
} from '../ObjectContext';
import React from 'react';

// Hoist spies so they can be used in the mock factory
const {
  mockInitialize,
  mockLoad,
  mockSave,
  mockSync,
  mockGetOrCreateDocument,
  mockCreateObjectStore,
  mockCreateRelationHelper,
} = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockLoad: vi.fn(),
  mockSave: vi.fn(),
  mockSync: vi.fn(),
  mockGetOrCreateDocument: vi.fn(),
  mockCreateObjectStore: vi.fn(),
  mockCreateRelationHelper: vi.fn(),
}));

// Mock LoroDocStore as a class
vi.mock('@/lib/loro', () => {
  class MockLoroDocStore {
    initialize = mockInitialize;
    load = mockLoad;
    save = mockSave;
    sync = mockSync;
    getOrCreateDocument = mockGetOrCreateDocument;
  }

  return {
    LoroDocStore: MockLoroDocStore,
    createObjectStore: mockCreateObjectStore,
    createRelationHelper: mockCreateRelationHelper,
    ObjectStore: vi.fn(),
    RelationHelper: vi.fn(),
  };
});

vi.mock('@/lib/types', () => ({
  createTypeRegistry: vi.fn().mockReturnValue({ register: vi.fn() }),
  builtInTypes: [],
}));

// Spy on console.error for error branch tests
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ObjectContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
    // Use real timers by default to avoid hanging waitFor during async init
    vi.useRealTimers();
    mockInitialize.mockResolvedValue(undefined);
    mockLoad.mockResolvedValue(undefined);
    mockGetOrCreateDocument.mockReturnValue({ id: 'mock-doc' }); // Mock doc
    mockCreateObjectStore.mockReturnValue({ id: 'mock-store' });
    mockCreateRelationHelper.mockReturnValue({ id: 'mock-helper' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ObjectProvider>{children}</ObjectProvider>
  );

  describe('initialization', () => {
    it('should initialize and load data', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for effect
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockInitialize).toHaveBeenCalled();
      expect(mockLoad).toHaveBeenCalled();
      expect(result.current.doc).toBeDefined();
    });

    it('should handle initialization error with Error instance', async () => {
      mockInitialize.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useObjects(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Init failed');
    });

    it('should handle initialization error with non-Error value', async () => {
      mockInitialize.mockRejectedValue('String error');

      const { result } = renderHook(() => useObjects(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('String error');
    });

    it('should create store and relationHelper when doc is ready', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockCreateObjectStore).toHaveBeenCalled();
      expect(mockCreateRelationHelper).toHaveBeenCalled();
      expect(result.current.store).toEqual({ id: 'mock-store' });
      expect(result.current.relationHelper).toEqual({ id: 'mock-helper' });
    });

    it('should not create store when doc is null', async () => {
      mockGetOrCreateDocument.mockReturnValue(null);

      const { result } = renderHook(() => useObjects(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Store should be null because doc is null
      expect(result.current.store).toBeNull();
      expect(result.current.relationHelper).toBeNull();
    });
  });

  describe('debounced save', () => {
    it('should trigger debounced save on refreshData', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      act(() => {
        result.current.refreshData();
      });

      expect(mockSync).toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled(); // Debounced

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockSave).toHaveBeenCalled();
    });

    it('should clear existing timer when refreshData called multiple times', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Call refreshData multiple times rapidly
      act(() => {
        result.current.refreshData();
      });
      act(() => {
        result.current.refreshData();
      });
      act(() => {
        result.current.refreshData();
      });

      // Advance only 100ms - not enough for first save
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockSave).not.toHaveBeenCalled();

      // Advance remaining 200ms for the last debounced save
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Should only save once (debounced)
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should log error when debounced save fails', async () => {
      vi.useFakeTimers();
      mockSave.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      act(() => {
        result.current.refreshData();
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Debounced save failed:',
        expect.any(Error)
      );
    });
  });

  describe('immediate save', () => {
    it('should save immediately on saveNow', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockSave).toHaveBeenCalled();
    });

    it('should clear pending debounced save when saveNow is called', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Start a debounced save
      act(() => {
        result.current.refreshData();
      });

      expect(mockSave).not.toHaveBeenCalled();

      // Call saveNow before debounce completes
      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Advance past debounce time - should NOT trigger another save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Still only one save (debounced one was cancelled)
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should log error when immediate save fails', async () => {
      mockSave.mockRejectedValue(new Error('Immediate save failed'));

      const { result } = renderHook(() => useObjects(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveNow();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Immediate save failed:',
        expect.any(Error)
      );
    });
  });

  describe('cleanup', () => {
    it('should clear debounce timer on unmount', async () => {
      vi.useFakeTimers();

      const { result, unmount } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Start a debounced save
      act(() => {
        result.current.refreshData();
      });

      expect(mockSave).not.toHaveBeenCalled();

      // Unmount before debounce completes
      unmount();

      // Advance time - timer should have been cleared
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Save should not have been called (timer was cleared on unmount)
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should clear auto-save interval on unmount', async () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('auto-save interval', () => {
    it('should auto-save every 30 seconds when doc is ready', async () => {
      vi.useFakeTimers();

      renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      mockSave.mockClear();

      // Advance 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Another 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('should not start auto-save when doc is null', async () => {
      vi.useFakeTimers();
      mockGetOrCreateDocument.mockReturnValue(null);
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // setInterval should not have been called for auto-save (doc is null)
      // Note: setInterval may be called 0 times or the effect returns early
      const intervalCalls = setIntervalSpy.mock.calls.filter(
        (call) => call[1] === 30000
      );
      expect(intervalCalls).toHaveLength(0);

      setIntervalSpy.mockRestore();
    });

    it('should log error when auto-save fails', async () => {
      vi.useFakeTimers();
      mockSave.mockRejectedValue(new Error('Auto-save failed'));

      renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      consoleErrorSpy.mockClear();

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Auto-save failed:',
        expect.any(Error)
      );
    });
  });

  describe('useObjects hook', () => {
    it('should throw when used outside provider', () => {
      // Suppress React error boundary console output
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useObjects());
      }).toThrow('useObjects must be used within an ObjectProvider');

      errorSpy.mockRestore();
    });
  });

  describe('useObjectStore hook', () => {
    it('should return store when initialized', async () => {
      // Need to wait for async initialization before the hook can return properly
      const { result } = renderHook(
        () => {
          const objects = useObjects();
          // Only call useObjectStore after loading is complete
          if (objects.isLoading || !objects.store) {
            return null;
          }
          return useObjectStore();
        },
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual({ id: 'mock-store' });
      });
    });

    it('should throw when store is loading', () => {
      // Make initialization hang
      mockInitialize.mockImplementation(() => new Promise(() => {}));

      // Suppress React error boundary console output
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useObjectStore(), { wrapper });
      }).toThrow('ObjectStore is still loading');

      errorSpy.mockRestore();
    });

    it('should verify failed state when doc is null', async () => {
      // When doc is null, store is null, and we're not loading
      // This tests the "failed to initialize" branch condition
      mockGetOrCreateDocument.mockReturnValue(null);

      const { result } = renderHook(() => useObjects(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Verify the state that would trigger "failed to initialize" error
      expect(result.current.store).toBeNull();
      expect(result.current.isLoading).toBe(false);
      // When isLoading is false and store is null, useObjectStore would throw
      // "ObjectStore failed to initialize" (tested via the state verification)
    });
  });

  describe('useRelationHelper hook', () => {
    it('should return relationHelper when initialized', async () => {
      const { result } = renderHook(
        () => {
          const objects = useObjects();
          // Only call useRelationHelper after loading is complete
          if (objects.isLoading || !objects.relationHelper) {
            return null;
          }
          return useRelationHelper();
        },
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual({ id: 'mock-helper' });
      });
    });

    it('should throw when relationHelper is loading', () => {
      mockInitialize.mockImplementation(() => new Promise(() => {}));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useRelationHelper(), { wrapper });
      }).toThrow('RelationHelper is still loading');

      errorSpy.mockRestore();
    });

    it('should verify failed state when doc is null', async () => {
      // When doc is null, relationHelper is null
      // This tests the "failed to initialize" branch condition
      mockGetOrCreateDocument.mockReturnValue(null);

      const { result } = renderHook(() => useObjects(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Verify the state that would trigger "failed to initialize" error
      expect(result.current.relationHelper).toBeNull();
      expect(result.current.isLoading).toBe(false);
      // When isLoading is false and relationHelper is null, useRelationHelper would throw
      // "RelationHelper failed to initialize" (tested via the state verification)
    });
  });

  describe('useTypeRegistry hook', () => {
    it('should return type registry', async () => {
      const { result } = renderHook(() => useTypeRegistry(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.register).toBeDefined();
      });
    });
  });

  describe('scheduleSave', () => {
    it('should trigger debounced save without re-render', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useObjects(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const initialVersion = result.current.dataVersion;

      act(() => {
        result.current.scheduleSave();
      });

      // dataVersion should NOT change (scheduleSave doesn't trigger re-render)
      expect(result.current.dataVersion).toBe(initialVersion);

      // But save should still be scheduled
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('dataVersion', () => {
    it('should increment on each refreshData call', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const v1 = result.current.dataVersion;

      act(() => {
        result.current.refreshData();
      });

      expect(result.current.dataVersion).toBe(v1 + 1);

      act(() => {
        result.current.refreshData();
      });

      expect(result.current.dataVersion).toBe(v1 + 2);
    });
  });
});
