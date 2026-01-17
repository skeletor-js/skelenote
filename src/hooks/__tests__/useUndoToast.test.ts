/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoToast } from '../useUndoToast';
import type { SkelenoteObject } from '@/lib/types';

// Mock store
const mockStore = {
  unarchive: vi.fn(),
  create: vi.fn(),
  pin: vi.fn(),
};

const mockContext = {
  store: mockStore,
  refreshData: vi.fn(),
};

let mockToastId = 0;
const mockAddToast = vi.fn().mockImplementation(() => {
  mockToastId += 1;
  return `toast-${mockToastId}`;
});
const mockRemoveToast = vi.fn();

vi.mock('@/contexts/ToastContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useToast: () => ({
      addToast: mockAddToast,
      removeToast: mockRemoveToast,
    }),
  };
});

vi.mock('@/contexts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => mockContext,
  };
});

describe('useUndoToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToastId = 0;
    mockContext.store = mockStore;
  });

  describe('showArchiveUndo', () => {
    it('should show undo toast after archiving', () => {
      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:task',
        properties: { title: 'Test Task' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showArchiveUndo(mockObject);
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: '"Test Task" archived',
          action: expect.objectContaining({
            label: 'Undo',
          }),
        })
      );
    });

    it('should use custom object name if provided', () => {
      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:task',
        properties: { title: 'Test Task' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showArchiveUndo(mockObject, 'Custom Name');
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '"Custom Name" archived',
        })
      );
    });

    it('should restore object when undo is clicked', () => {
      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:task',
        properties: { title: 'Test Task' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showArchiveUndo(mockObject);
      });

      // Get the onClick handler
      const toastCall = mockAddToast.mock.calls[0][0];
      const onClickHandler = toastCall.action.onClick;

      act(() => {
        onClickHandler();
      });

      expect(mockStore.unarchive).toHaveBeenCalledWith('obj-1');
      expect(mockContext.refreshData).toHaveBeenCalled();
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });

    it('should not show toast if store is null', () => {
      mockContext.store = null as unknown as typeof mockStore;

      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:task',
        properties: { title: 'Test Task' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showArchiveUndo(mockObject);
      });

      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe('showDeleteUndo', () => {
    it('should show undo toast after deleting', () => {
      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:note',
        properties: { title: 'Test Note' },
        hasContent: true,
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showDeleteUndo(mockObject);
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: '"Test Note" deleted',
          action: expect.objectContaining({
            label: 'Undo',
          }),
        })
      );
    });

    it('should recreate object with pinned state when undo is clicked', () => {
      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:note',
        properties: { title: 'Test Note' },
        hasContent: true,
        inboxed: true,
        pinned: true,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showDeleteUndo(mockObject);
      });

      // Get the onClick handler
      const toastCall = mockAddToast.mock.calls[0][0];
      const onClickHandler = toastCall.action.onClick;

      act(() => {
        onClickHandler();
      });

      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'obj-1',
          typeId: 'built-in:note',
          withContent: true,
          inboxed: true,
        })
      );
      expect(mockStore.pin).toHaveBeenCalledWith('obj-1');
      expect(mockContext.refreshData).toHaveBeenCalled();
    });

    it('should not pin if object was not pinned', () => {
      const mockObject: SkelenoteObject = {
        id: 'obj-1',
        typeId: 'built-in:note',
        properties: { title: 'Test Note' },
        hasContent: true,
        inboxed: true,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showDeleteUndo(mockObject);
      });

      const toastCall = mockAddToast.mock.calls[0][0];
      const onClickHandler = toastCall.action.onClick;

      act(() => {
        onClickHandler();
      });

      expect(mockStore.create).toHaveBeenCalled();
      expect(mockStore.pin).not.toHaveBeenCalled();
    });
  });

  describe('showUndoToast', () => {
    it('should show generic undo toast', () => {
      const undoFn = vi.fn();

      const { result } = renderHook(() => useUndoToast());

      let toastId: string | undefined;
      act(() => {
        toastId = result.current.showUndoToast('Action completed', undoFn);
      });

      expect(toastId).toBe('toast-1');
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Action completed',
          action: expect.objectContaining({
            label: 'Undo',
          }),
        })
      );
    });

    it('should call undo function and remove toast when clicked', () => {
      const undoFn = vi.fn();

      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast('Action completed', undoFn);
      });

      const toastCall = mockAddToast.mock.calls[0][0];
      const onClickHandler = toastCall.action.onClick;

      act(() => {
        onClickHandler();
      });

      expect(undoFn).toHaveBeenCalled();
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });
  });
});
