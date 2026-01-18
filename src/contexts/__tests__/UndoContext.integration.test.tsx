/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { UndoProvider, useUndo } from '../UndoContext';
import { LoroDoc } from 'loro-crdt';

// Mocks
const mockAddToast = vi.fn();
vi.mock('../ToastContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useToast: () => ({
      addToast: mockAddToast,
    }),
  };
});

// We will inject the doc dynamically
let mockDoc: LoroDoc | null = null;
const mockRefreshData = vi.fn();

vi.mock('../ObjectContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useObjects: () => ({
      doc: mockDoc,
      refreshData: mockRefreshData,
    }),
  };
});

describe('UndoContext Integration', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UndoProvider>{children}</UndoProvider>
  );

  beforeEach(() => {
    mockDoc = new LoroDoc();
    mockDoc.setPeerId(1n); // Deterministic peer ID
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockDoc = null;
  });

  it('should initialize with no undo/redo available', () => {
    const { result } = renderHook(() => useUndo(), { wrapper });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update canUndo when changes occur', async () => {
    const { result } = renderHook(() => useUndo(), { wrapper });

    // Simulate a change in Loro
    await act(async () => {
      const text = mockDoc!.getText('test');
      text.insert(0, 'hello');
      mockDoc!.commit();
    });

    // Wait for subscription update
    await waitFor(() => {
      expect(result.current.canUndo).toBe(true);
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('should perform undo and update state', async () => {
    const { result } = renderHook(() => useUndo(), { wrapper });

    // Change
    await act(async () => {
      const text = mockDoc!.getText('test');
      text.insert(0, 'hello');
      mockDoc!.commit();
    });

    await waitFor(() => expect(result.current.canUndo).toBe(true));

    // Undo
    await act(async () => {
      const success = result.current.undo();
      expect(success).toBe(true);
    });

    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockDoc!.getText('test').toString()).toBe('');

    // State updates
    await waitFor(() => {
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    // Toast check
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', message: 'Undid last action' })
    );
  });

  it('should perform redo and update state', async () => {
    const { result } = renderHook(() => useUndo(), { wrapper });

    // Change and Undo
    await act(async () => {
      const text = mockDoc!.getText('test');
      text.insert(0, 'hello');
      mockDoc!.commit();
    });
    await waitFor(() => expect(result.current.canUndo).toBe(true));

    await act(async () => {
      result.current.undo();
    });
    await waitFor(() => expect(result.current.canRedo).toBe(true));

    // Redo
    await act(async () => {
      const success = result.current.redo();
      expect(success).toBe(true);
    });

    expect(mockRefreshData).toHaveBeenCalledTimes(2); // Undo + Redo
    expect(mockDoc!.getText('test').toString()).toBe('hello');

    await waitFor(() => {
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    // Toast check
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', message: 'Redid last action' })
    );
  });

  it('should group operations logic', async () => {
    const { result } = renderHook(() => useUndo(), { wrapper });

    // Group start
    await act(async () => {
      result.current.groupStart();
      const text = mockDoc!.getText('test');
      text.insert(0, 'h');
      mockDoc!.commit();
    });

    // Should NOT be undoable yet if we are in a group?
    // Actually Loro UndoManager might handle groups atomic.
    // Let's add more changes
    await act(async () => {
      const text = mockDoc!.getText('test');
      text.insert(1, 'i');
      mockDoc!.commit();
      result.current.groupEnd();
    });

    await waitFor(() => expect(result.current.canUndo).toBe(true));

    // Undo should remove "hi" at once (atomic)
    await act(async () => {
      result.current.undo();
    });

    expect(mockDoc!.getText('test').toString()).toBe('');
  });
});
