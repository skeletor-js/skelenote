/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ObjectProvider, useObjects } from '../ObjectContext';
import React from 'react';

// Hoist spies so they can be used in the mock factory
const {
  mockInitialize,
  mockLoad,
  mockSave,
  mockSync,
  mockGetOrCreateDocument,
} = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockLoad: vi.fn(),
  mockSave: vi.fn(),
  mockSync: vi.fn(),
  mockGetOrCreateDocument: vi.fn(),
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
    createObjectStore: vi.fn().mockReturnValue({}),
    createRelationHelper: vi.fn().mockReturnValue({}),
    ObjectStore: vi.fn(),
    RelationHelper: vi.fn(),
  };
});

vi.mock('@/lib/types', () => ({
  createTypeRegistry: vi.fn().mockReturnValue({ register: vi.fn() }),
  builtInTypes: [],
}));

describe('ObjectContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use real timers by default to avoid hanging waitFor during async init
    vi.useRealTimers();
    mockInitialize.mockResolvedValue(undefined);
    mockLoad.mockResolvedValue(undefined);
    mockGetOrCreateDocument.mockReturnValue({}); // Mock doc
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ObjectProvider>{children}</ObjectProvider>
  );

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

  it('should handle initialization error', async () => {
    mockInitialize.mockRejectedValue(new Error('Init failed'));

    const { result } = renderHook(() => useObjects(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Init failed');
  });

  it('should trigger debounced save on refreshData', async () => {
    vi.useFakeTimers();

    // We need to render hook AFTER enabling fake timers if we want the timer logic to use it?
    // Actually, useRef/setTimeout in component uses global setTimeout.
    // If we switch to fake timers here, existing timers (if any) might be affected, but providing component mounts now, it should be fine.

    // Wait for init first? explicit init mocking might be needed if useFakeTimers affects the async function.
    // Let's enable fake timers, but we might need to advance it for the init to complete if it uses timers?
    // The init is just a promise, so it should be microtasks.

    const { result } = renderHook(() => useObjects(), { wrapper });

    // Wait for init to finish. Since it's promise based, we might need loop.
    // Actually, let's just wait for isLoading false.
    // If we use fake timers, waitFor might hang unless we advance.
    // So let's use runAllTicks/advance.

    // Advance mainly for the effect to fire?
    await act(async () => {
      // Resolve promises
      await Promise.resolve();
      await Promise.resolve();
    });

    // We can't easily wait for isLoading false with waitFor if timers are fake and not moving.
    // Let's assume init is fast.

    act(() => {
      result.current.refreshData();
    });

    expect(mockSync).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled(); // Debounced

    // Fast forward time
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSave).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should save immediately on saveNow', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveNow();
    });

    expect(mockSave).toHaveBeenCalled();
  });
});
