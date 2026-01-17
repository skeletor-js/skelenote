/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { UndoProvider, useUndo, useUndoSafe } from '../UndoContext';
import { ToastProvider } from '../ToastContext';

// Hoist the mock setup so it's available when vi.mock executes
const { mockUndoMgr, MockUndoManagerClass, constructorCalls } = vi.hoisted(
  () => {
    const mockFns = {
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      undo: vi.fn(() => true),
      redo: vi.fn(() => true),
      free: vi.fn(),
      groupStart: vi.fn(),
      groupEnd: vi.fn(),
      setOnPop: vi.fn(),
    };

    const calls: any[][] = [];

    // Create an actual class that can be instantiated with 'new'
    class MockClass {
      canUndo = mockFns.canUndo;
      canRedo = mockFns.canRedo;
      undo = mockFns.undo;
      redo = mockFns.redo;
      free = mockFns.free;
      groupStart = mockFns.groupStart;
      groupEnd = mockFns.groupEnd;
      setOnPop = mockFns.setOnPop;

      constructor(...args: any[]) {
        calls.push(args);
      }
    }

    return {
      mockUndoMgr: mockFns,
      MockUndoManagerClass: MockClass,
      constructorCalls: calls,
    };
  }
);

vi.mock('loro-crdt', () => ({
  UndoManager: MockUndoManagerClass,
}));

// Mock useObjects to return null doc initially
const mockRefreshData = vi.fn();
let mockDoc: any = null;

vi.mock('../ObjectContext', () => ({
  useObjects: () => ({
    doc: mockDoc,
    refreshData: mockRefreshData,
  }),
}));

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('../ToastContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../ToastContext')>();
  return {
    ...original,
    useToast: () => ({
      addToast: mockAddToast,
      removeToast: vi.fn(),
      toasts: [],
    }),
  };
});

describe('UndoContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastProvider>
      <UndoProvider>{children}</UndoProvider>
    </ToastProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    constructorCalls.length = 0; // Clear tracked calls
    mockDoc = null;
    mockUndoMgr.canUndo.mockReturnValue(false);
    mockUndoMgr.canRedo.mockReturnValue(false);
    mockUndoMgr.undo.mockReturnValue(true);
    mockUndoMgr.redo.mockReturnValue(true);
  });

  afterEach(() => {
    mockDoc = null;
  });

  describe('useUndo hook', () => {
    it('should throw when useUndo is used outside provider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUndo());
      }).toThrow('useUndo must be used within an UndoProvider');

      spy.mockRestore();
    });

    it('should return null from useUndoSafe when outside provider', () => {
      const { result } = renderHook(() => useUndoSafe());
      expect(result.current).toBeNull();
    });

    it('should return context value from useUndoSafe when inside provider', () => {
      const { result } = renderHook(() => useUndoSafe(), { wrapper });
      expect(result.current).not.toBeNull();
      expect(result.current).toHaveProperty('canUndo');
      expect(result.current).toHaveProperty('canRedo');
      expect(result.current).toHaveProperty('undo');
      expect(result.current).toHaveProperty('redo');
    });
  });

  describe('when doc is null', () => {
    it('should initialize with canUndo and canRedo as false', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should provide undo function', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      expect(typeof result.current.undo).toBe('function');
    });

    it('should provide redo function', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      expect(typeof result.current.redo).toBe('function');
    });

    it('should provide groupStart and groupEnd functions', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      expect(typeof result.current.groupStart).toBe('function');
      expect(typeof result.current.groupEnd).toBe('function');
    });

    it('should return false from undo when doc is null', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      const undoResult = result.current.undo();
      expect(undoResult).toBe(false);
    });

    it('should return false from redo when doc is null', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      const redoResult = result.current.redo();
      expect(redoResult).toBe(false);
    });

    it('should not crash when calling groupStart/groupEnd without doc', () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      // Should not throw
      expect(() => {
        result.current.groupStart();
        result.current.groupEnd();
      }).not.toThrow();
    });
  });

  describe('when doc is available', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
    });

    it('should create UndoManager with correct config', async () => {
      renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(constructorCalls.length).toBeGreaterThan(0);
        const args = constructorCalls[0];
        expect(args[0]).toBe(mockDoc);
        expect(args[1]).toEqual({
          mergeInterval: 1000,
          maxUndoSteps: 100,
        });
      });
    });

    it('should subscribe to document changes', async () => {
      renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });
    });

    it('should set up onPop callback', async () => {
      renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockUndoMgr.setOnPop).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    it('should initialize canUndo/canRedo from UndoManager', async () => {
      mockUndoMgr.canUndo.mockReturnValue(true);
      mockUndoMgr.canRedo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(true);
      });
    });

    it('should unsubscribe and free UndoManager on cleanup', async () => {
      const { unmount } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockUndoMgr.free).toHaveBeenCalled();
    });
  });

  describe('undo operation', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
    });

    it('should return false when canUndo is false', async () => {
      mockUndoMgr.canUndo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });

      let undoResult: boolean = true;
      act(() => {
        undoResult = result.current.undo();
      });

      expect(undoResult).toBe(false);
      expect(mockUndoMgr.undo).not.toHaveBeenCalled();
    });

    it('should call UndoManager.undo when canUndo is true', async () => {
      mockUndoMgr.canUndo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
      });

      act(() => {
        result.current.undo();
      });

      expect(mockUndoMgr.undo).toHaveBeenCalled();
    });

    it('should call refreshData after successful undo', async () => {
      mockUndoMgr.canUndo.mockReturnValue(true);
      mockUndoMgr.undo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
      });

      act(() => {
        result.current.undo();
      });

      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should return true on successful undo', async () => {
      mockUndoMgr.canUndo.mockReturnValue(true);
      mockUndoMgr.undo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
      });

      let undoResult: boolean = false;
      act(() => {
        undoResult = result.current.undo();
      });

      expect(undoResult).toBe(true);
    });
  });

  describe('redo operation', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
    });

    it('should return false when canRedo is false', async () => {
      mockUndoMgr.canRedo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });

      let redoResult: boolean = true;
      act(() => {
        redoResult = result.current.redo();
      });

      expect(redoResult).toBe(false);
      expect(mockUndoMgr.redo).not.toHaveBeenCalled();
    });

    it('should call UndoManager.redo when canRedo is true', async () => {
      mockUndoMgr.canRedo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canRedo).toBe(true);
      });

      act(() => {
        result.current.redo();
      });

      expect(mockUndoMgr.redo).toHaveBeenCalled();
    });

    it('should call refreshData after successful redo', async () => {
      mockUndoMgr.canRedo.mockReturnValue(true);
      mockUndoMgr.redo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canRedo).toBe(true);
      });

      act(() => {
        result.current.redo();
      });

      expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should return true on successful redo', async () => {
      mockUndoMgr.canRedo.mockReturnValue(true);
      mockUndoMgr.redo.mockReturnValue(true);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canRedo).toBe(true);
      });

      let redoResult: boolean = false;
      act(() => {
        redoResult = result.current.redo();
      });

      expect(redoResult).toBe(true);
    });
  });

  describe('groupStart and groupEnd', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
    });

    it('should call UndoManager.groupStart', async () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });

      act(() => {
        result.current.groupStart();
      });

      expect(mockUndoMgr.groupStart).toHaveBeenCalled();
    });

    it('should call UndoManager.groupEnd', async () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });

      act(() => {
        result.current.groupEnd();
      });

      expect(mockUndoMgr.groupEnd).toHaveBeenCalled();
    });

    it('should allow paired groupStart/groupEnd calls', async () => {
      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(mockDoc.subscribe).toHaveBeenCalled();
      });

      act(() => {
        result.current.groupStart();
        result.current.groupEnd();
      });

      expect(mockUndoMgr.groupStart).toHaveBeenCalled();
      expect(mockUndoMgr.groupEnd).toHaveBeenCalled();
    });
  });

  describe('onPop callback', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;
    let capturedOnPop: ((isUndo: boolean) => void) | null = null;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
      capturedOnPop = null;
      mockUndoMgr.setOnPop.mockImplementation((callback) => {
        capturedOnPop = callback;
      });
    });

    it('should show undo toast when onPop is called with true', async () => {
      renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(capturedOnPop).not.toBeNull();
      });

      act(() => {
        capturedOnPop!(true);
      });

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Undid last action',
        duration: 2000,
      });
    });

    it('should show redo toast when onPop is called with false', async () => {
      renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(capturedOnPop).not.toBeNull();
      });

      act(() => {
        capturedOnPop!(false);
      });

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Redid last action',
        duration: 2000,
      });
    });
  });

  describe('document subscription', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;
    let capturedSubscriber: ((event: any) => void) | null = null;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      capturedSubscriber = null;
      mockDoc = {
        subscribe: vi.fn((callback: any) => {
          capturedSubscriber = callback;
          return mockUnsubscribe;
        }),
      };
    });

    it('should update canUndo/canRedo on local change', async () => {
      mockUndoMgr.canUndo.mockReturnValue(false);
      mockUndoMgr.canRedo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(capturedSubscriber).not.toBeNull();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);

      // Simulate local change
      mockUndoMgr.canUndo.mockReturnValue(true);
      mockUndoMgr.canRedo.mockReturnValue(true);

      act(() => {
        capturedSubscriber!({ by: 'local' });
      });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(true);
      });
    });

    it('should update canUndo/canRedo on import change', async () => {
      mockUndoMgr.canUndo.mockReturnValue(false);
      mockUndoMgr.canRedo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(capturedSubscriber).not.toBeNull();
      });

      // Simulate import change
      mockUndoMgr.canUndo.mockReturnValue(true);

      act(() => {
        capturedSubscriber!({ by: 'import' });
      });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
      });
    });

    it('should not update on remote changes', async () => {
      mockUndoMgr.canUndo.mockReturnValue(false);
      mockUndoMgr.canRedo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(capturedSubscriber).not.toBeNull();
      });

      const initialCanUndo = result.current.canUndo;
      const initialCanRedo = result.current.canRedo;

      // This shouldn't trigger an update because 'remote' is not handled
      act(() => {
        capturedSubscriber!({ by: 'remote' });
      });

      // Values should remain the same
      expect(result.current.canUndo).toBe(initialCanUndo);
      expect(result.current.canRedo).toBe(initialCanRedo);
    });
  });

  describe('doc change handling', () => {
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
    });

    it('should reset state when doc changes to null', async () => {
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
      mockUndoMgr.canUndo.mockReturnValue(true);
      mockUndoMgr.canRedo.mockReturnValue(true);

      const { result, rerender } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(true);
      });

      // Change doc to null
      mockDoc = null;
      rerender();

      await waitFor(() => {
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
      });
    });

    it('should handle undo returning false', async () => {
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
      mockUndoMgr.canUndo.mockReturnValue(true);
      mockUndoMgr.undo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
      });

      act(() => {
        result.current.undo();
      });

      // refreshData should NOT be called when undo returns false
      expect(mockRefreshData).not.toHaveBeenCalled();
    });

    it('should handle redo returning false', async () => {
      mockDoc = {
        subscribe: vi.fn(() => mockUnsubscribe),
      };
      mockUndoMgr.canRedo.mockReturnValue(true);
      mockUndoMgr.redo.mockReturnValue(false);

      const { result } = renderHook(() => useUndo(), { wrapper });

      await waitFor(() => {
        expect(result.current.canRedo).toBe(true);
      });

      act(() => {
        result.current.redo();
      });

      // refreshData should NOT be called when redo returns false
      expect(mockRefreshData).not.toHaveBeenCalled();
    });
  });
});
