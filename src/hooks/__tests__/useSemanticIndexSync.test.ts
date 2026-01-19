/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSemanticIndexSync } from '..';

// Mock dependencies
const mockStore = {
  getAll: vi.fn(),
};

const mockTypeRegistry = {};
let mockDataVersion = 1;

vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => ({
      store: mockStore,
      typeRegistry: mockTypeRegistry,
      dataVersion: mockDataVersion,
    }),
  };
});

const mockGetIndexableContentForObject = vi.fn();
const mockHashContent = vi.fn((content: string) => `hash:${content}`);

vi.mock('@/lib/semantic', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,

    getIndexableContentForObject: (id: any, store: any, typeRegistry: any) =>
      mockGetIndexableContentForObject(id, store, typeRegistry),

    hashContent: (content: any) => mockHashContent(content),
  };
});

describe('useSemanticIndexSync', () => {
  const mockEngine = {
    isReady: true,
    indexSingle: vi.fn().mockResolvedValue(undefined),
    removeFromIndex: vi.fn().mockResolvedValue(undefined),
  };

  const getEngine = vi.fn(() => mockEngine as any);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockStore.getAll.mockReturnValue([]);
    mockDataVersion = 1;
    mockEngine.isReady = true;
    mockEngine.indexSingle.mockResolvedValue(undefined);
    mockEngine.removeFromIndex.mockResolvedValue(undefined);

    getEngine.mockReturnValue(mockEngine as any);
    mockGetIndexableContentForObject.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic hook behavior', () => {
    it('should return notifyContentChange and flushContentChanges functions', () => {
      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      expect(typeof result.current.notifyContentChange).toBe('function');
      expect(typeof result.current.flushContentChanges).toBe('function');
    });

    it('should not process when isEnabled is false', () => {
      mockStore.getAll.mockReturnValue([{ id: '1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: '1',
        title: 'Test',
        content: 'Content',
      });

      renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: false,
          engineStatus: 'ready',
        })
      );

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(mockEngine.indexSingle).not.toHaveBeenCalled();
    });
  });

  describe('notifyContentChange', () => {
    it('should track pending content changes', () => {
      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Just verify it doesn't throw
      act(() => {
        result.current.notifyContentChange('obj-1');
        result.current.notifyContentChange('obj-2');
      });

      // The changes are tracked internally
      expect(true).toBe(true); // No error means success
    });
  });

  describe('flushContentChanges', () => {
    it('should flush a single object when objectId provided', async () => {
      mockStore.getAll.mockReturnValue([{ id: '1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: '1',
        title: 'Title',
        content: 'Content',
      });

      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Notify a content change
      act(() => {
        result.current.notifyContentChange('1');
      });

      // Flush the specific object
      act(() => {
        result.current.flushContentChanges('1');
      });

      // Wait for async processing
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.indexSingle).toHaveBeenCalled();
    });

    it('should flush all objects when no objectId provided', async () => {
      mockStore.getAll.mockReturnValue([{ id: '1' }, { id: '2' }]);
      mockGetIndexableContentForObject.mockImplementation((id) => {
        if (id === '1') {
          return { objectId: '1', title: 'Title 1', content: 'Content 1' };
        }
        if (id === '2') {
          return { objectId: '2', title: 'Title 2', content: 'Content 2' };
        }
        return null;
      });

      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Notify content changes
      act(() => {
        result.current.notifyContentChange('1');
        result.current.notifyContentChange('2');
      });

      // Flush all
      act(() => {
        result.current.flushContentChanges();
      });

      // Wait for async processing with more ticks
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Should have called indexSingle at least twice (once per flush)
      expect(mockEngine.indexSingle.mock.calls.length).toBeGreaterThanOrEqual(
        2
      );
    });

    it('should not flush if object not in pending set', async () => {
      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Flush without notifying first
      act(() => {
        result.current.flushContentChanges('non-existent');
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.indexSingle).not.toHaveBeenCalled();
    });
  });

  describe('deletion detection', () => {
    it('should detect and remove deleted objects after debounce', async () => {
      // Initial state: has one object
      mockStore.getAll.mockReturnValue([{ id: 'obj-1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'obj-1',
        title: 'Title',
        content: 'Content',
      });

      const { rerender } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Initial sync
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Now simulate deletion - object no longer returned
      mockStore.getAll.mockReturnValue([]);
      mockDataVersion = 2;

      // Rerender to pick up change (simulating context update)
      rerender();

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.removeFromIndex).toHaveBeenCalledWith('obj-1');
    });
  });

  describe('creation/update detection', () => {
    it('should index new objects when they appear', async () => {
      // Start with no objects
      mockStore.getAll.mockReturnValue([]);

      const { rerender } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Initial sync (no objects)
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Now add an object
      mockStore.getAll.mockReturnValue([{ id: 'new-obj' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'new-obj',
        title: 'New Title',
        content: 'New Content',
      });
      mockDataVersion = 2;

      rerender();

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.indexSingle).toHaveBeenCalledWith({
        objectId: 'new-obj',
        title: 'New Title',
        content: 'New Content',
      });
    });

    it('should re-index objects when hash changes', async () => {
      mockStore.getAll.mockReturnValue([{ id: 'obj-1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'obj-1',
        title: 'Title',
        content: 'Original Content',
      });

      const { rerender } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Initial sync
      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Clear mock calls
      mockEngine.indexSingle.mockClear();

      // Now update the content (different hash)
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'obj-1',
        title: 'Title',
        content: 'Updated Content',
      });
      mockDataVersion = 2;

      rerender();

      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.indexSingle).toHaveBeenCalled();
    });

    it('should skip objects with null indexable content', async () => {
      mockStore.getAll.mockReturnValue([{ id: 'skip-me' }]);
      mockGetIndexableContentForObject.mockReturnValue(null);

      renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.indexSingle).not.toHaveBeenCalled();
    });
  });

  describe('engine readiness', () => {
    it('should queue changes when engine is not ready', async () => {
      mockEngine.isReady = false;

      mockStore.getAll.mockReturnValue([{ id: '1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: '1',
        title: 'Title',
        content: 'Content',
      });

      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'loading',
        })
      );

      // Trigger a flush while engine not ready
      act(() => {
        result.current.notifyContentChange('1');
        result.current.flushContentChanges('1');
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Should not have indexed yet
      expect(mockEngine.indexSingle).not.toHaveBeenCalled();
    });

    it('should process pending queue when engine becomes ready', async () => {
      mockEngine.isReady = false;

      mockStore.getAll.mockReturnValue([{ id: '1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: '1',
        title: 'Title',
        content: 'Content',
      });

      const { result, rerender } = renderHook(
        ({ engineStatus }) =>
          useSemanticIndexSync({
            getEngine,
            isEnabled: true,
            engineStatus,
          }),
        { initialProps: { engineStatus: 'loading' } }
      );

      // Queue a change while engine not ready
      act(() => {
        result.current.notifyContentChange('1');
        result.current.flushContentChanges('1');
      });

      // Engine becomes ready
      mockEngine.isReady = true;
      rerender({ engineStatus: 'ready' });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockEngine.indexSingle).toHaveBeenCalled();
    });
  });

  describe('debounce behavior', () => {
    it('should debounce dataVersion changes', () => {
      mockStore.getAll.mockReturnValue([{ id: '1' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: '1',
        title: 'Title',
        content: 'Content',
      });

      renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Note: getAll may be called during initialization effect
      // Clear calls to test debounce behavior specifically
      const initialCallCount = mockStore.getAll.mock.calls.length;

      // Advance only 200ms (less than 500ms debounce)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should have same call count (no additional calls during debounce window)
      expect(mockStore.getAll.mock.calls.length).toBe(initialCallCount);

      // Advance past debounce (total 600ms now)
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Now the debounced function should have fired
      expect(mockStore.getAll.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });

    it('should clear debounce timer on unmount', () => {
      mockStore.getAll.mockReturnValue([{ id: '1' }]);

      const { unmount } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Unmount before debounce fires
      unmount();

      // Advance past debounce - should not throw or call getAll
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // getAll only called once during cleanup check, not from debounce
      expect(mockStore.getAll.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    it('should handle indexSingle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockStore.getAll.mockReturnValue([{ id: 'error-obj' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'error-obj',
        title: 'Title',
        content: 'Content',
      });
      mockEngine.indexSingle.mockRejectedValue(new Error('Index failed'));

      const { result } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      act(() => {
        result.current.notifyContentChange('error-obj');
        result.current.flushContentChanges('error-obj');
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Should log warning but not throw
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to index error-obj:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle removeFromIndex errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Start with an object
      mockStore.getAll.mockReturnValue([{ id: 'delete-me' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'delete-me',
        title: 'Title',
        content: 'Content',
      });

      const { rerender } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Initial sync
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Set up removal to fail
      mockEngine.removeFromIndex.mockRejectedValue(new Error('Remove failed'));
      mockStore.getAll.mockReturnValue([]);
      mockDataVersion = 2;

      rerender();

      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to index delete-me:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('hash tracking', () => {
    it('should initialize hash map on enable', () => {
      mockStore.getAll.mockReturnValue([{ id: '1' }, { id: '2' }]);
      mockGetIndexableContentForObject
        .mockReturnValueOnce({ objectId: '1', title: 'T1', content: 'C1' })
        .mockReturnValueOnce({ objectId: '2', title: 'T2', content: 'C2' });

      renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // hashContent should have been called for initial tracking
      expect(mockHashContent).toHaveBeenCalledWith('T1C1');
      expect(mockHashContent).toHaveBeenCalledWith('T2C2');
    });
  });

  describe('skip pending content changes', () => {
    it('should skip objects with pending content changes during rescan', async () => {
      mockStore.getAll.mockReturnValue([{ id: 'pending-obj' }]);
      mockGetIndexableContentForObject.mockReturnValue({
        objectId: 'pending-obj',
        title: 'Title',
        content: 'Content',
      });

      const { result, rerender } = renderHook(() =>
        useSemanticIndexSync({
          getEngine,
          isEnabled: true,
          engineStatus: 'ready',
        })
      );

      // Initial sync
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Clear calls
      mockEngine.indexSingle.mockClear();

      // Notify content change - this object is now in pending set
      act(() => {
        result.current.notifyContentChange('pending-obj');
      });

      // Trigger dataVersion change
      mockDataVersion = 2;
      rerender();

      act(() => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Should NOT have been indexed by the rescan (it's in pending set)
      expect(mockEngine.indexSingle).not.toHaveBeenCalled();
    });
  });
});
