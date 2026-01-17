/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SyncProvider, useSyncContext } from '../SyncContext';
import { invoke } from '@tauri-apps/api/core';

// Define MockSyncClient inside factory or use module-level variable initialized before
// But cleanest is inside the mock factory.

// We need to capture instances.

const instances: any[] = [];

vi.mock('@/lib/sync', async () => {
  // Minimal event emitter implementation
  class MockSyncClient {
    config: any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listeners: Record<string, Function[]> = {};

    disconnect = vi.fn();
    connect = vi.fn();
    enableEncryption = vi.fn().mockResolvedValue(true);
    getPendingCount = vi.fn().mockReturnValue(0);

    constructor(config: any) {
      this.config = config;
      instances.push(this);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on(event: string, cb: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
      return () => {};
    }

    emit(event: string, data?: any) {
      if (this.listeners[event]) {
        this.listeners[event].forEach((cb) => cb(data));
      }
    }
  }

  return {
    SyncClient: MockSyncClient,
    getSyncServerUrl: vi.fn(),
    getUserId: vi.fn(),
    getDeviceId: vi.fn(),
  };
});

// Mock dependencies
vi.mock('../ObjectContext', () => ({
  useObjects: vi.fn(),
}));

vi.mock('../ToastContext', () => ({
  useToast: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

const mockPlatform = { isMobile: false, isIOS: false };
vi.mock('@/hooks/usePlatform', () => ({
  usePlatform: () => mockPlatform,
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { useObjects } from '../ObjectContext';
import { getSyncServerUrl } from '@/lib/sync';

describe('SyncContext', () => {
  const mockDocStore = {
    setSyncClient: vi.fn(),
    setOnRemoteChange: vi.fn(),
  };
  const mockStore = {
    clearCache: vi.fn(),
  };
  const mockRefreshData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    instances.length = 0; // Clear mock instances

    (useObjects as any).mockReturnValue({
      docStore: mockDocStore,
      store: mockStore,
      refreshData: mockRefreshData,
    });
  });

  it('should provide default values', () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.syncClient).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect and initialize client', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });

    expect(instances.length).toBe(1);
    expect(mockDocStore.setSyncClient).toHaveBeenCalled();
    expect(result.current.syncClient).toBeDefined();
  });

  it('should update status on client events', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });

    const client = instances[0];

    act(() => {
      client.emit('statusChange', { status: 'connected' });
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should auto-connect if url exists', async () => {
    (getSyncServerUrl as any).mockReturnValue('ws://saved');

    renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    expect(instances.length).toBe(1);
    expect(instances[0].config.serverUrl).toBe('ws://saved');
  });
  it('should handle online/offline events', () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  describe('Background Tasks (iOS)', () => {
    beforeEach(() => {
      mockPlatform.isMobile = true;
      mockPlatform.isIOS = true;
    });

    afterEach(() => {
      mockPlatform.isMobile = false;
      mockPlatform.isIOS = false;
    });

    it('should start background task when going to background while syncing', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      // Connect to set status (mock client emits status)
      await act(async () => {
        result.current.connect('ws://test', 'user1', 'device1');
      });
      const client = instances[0];
      act(() => {
        client.emit('statusChange', { status: 'syncing' });
      });

      // Mock invoke for begin_background_task
      (invoke as any).mockResolvedValue(123);

      // Simulate visibility change to hidden
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(invoke).toHaveBeenCalledWith('begin_background_task');
    });

    it('should end background task when returning to foreground', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      // Setup active background task
      (invoke as any).mockResolvedValue(123);
      await act(async () => {
        result.current.connect('ws://test', 'u', 'd');
      });
      act(() => {
        instances[0].emit('statusChange', { status: 'syncing' });
      });

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Simulate returning to foreground
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(invoke).toHaveBeenCalledWith('end_background_task', {
        taskId: 123,
      });
    });

    it('should not start background task if not syncing or no pending', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      // Connect but not syncing
      await act(async () => {
        result.current.connect('ws://test', 'user1', 'device1');
      });
      const client = instances[0];
      act(() => {
        client.emit('statusChange', { status: 'connected' });
      });

      // Mock invoke for begin_background_task
      (invoke as any).mockResolvedValue(123);

      // Simulate visibility change to hidden (but not syncing)
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should NOT have called begin_background_task
      expect(invoke).not.toHaveBeenCalledWith('begin_background_task');
    });

    it('should handle begin_background_task error gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      await act(async () => {
        result.current.connect('ws://test', 'user1', 'device1');
      });
      const client = instances[0];
      act(() => {
        client.emit('statusChange', { status: 'syncing' });
      });

      // Make invoke fail
      (invoke as any).mockRejectedValue(new Error('Background task failed'));

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncContext] Failed to begin background task:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle end_background_task error gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      (invoke as any).mockResolvedValueOnce(123); // begin succeeds
      (invoke as any).mockRejectedValueOnce(new Error('End task failed')); // end fails

      await act(async () => {
        result.current.connect('ws://test', 'u', 'd');
      });
      act(() => {
        instances[0].emit('statusChange', { status: 'syncing' });
      });

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SyncContext] Failed to end background task:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should not start duplicate background task if one already running', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      await act(async () => {
        result.current.connect('ws://test', 'user1', 'device1');
      });
      const client = instances[0];
      act(() => {
        client.emit('statusChange', { status: 'syncing' });
      });

      (invoke as any).mockResolvedValue(123);

      // Go to background first time
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      const callCount = (invoke as any).mock.calls.length;

      // Try to go to background again
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should not have called begin_background_task again
      expect((invoke as any).mock.calls.length).toBe(callCount);
    });

    it('should end background task when sync completes', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      (invoke as any).mockResolvedValue(123);

      await act(async () => {
        result.current.connect('ws://test', 'u', 'd');
      });
      const client = instances[0];
      act(() => {
        client.emit('statusChange', { status: 'syncing' });
      });

      // Go to background
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Sync completes while in background
      await act(async () => {
        client.emit('statusChange', { status: 'connected' });
      });

      // Should have ended the background task
      expect(invoke).toHaveBeenCalledWith('end_background_task', {
        taskId: 123,
      });
    });

    it('should handle taskId of 0 from begin_background_task', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: SyncProvider,
      });

      await act(async () => {
        result.current.connect('ws://test', 'user1', 'device1');
      });
      const client = instances[0];
      act(() => {
        client.emit('statusChange', { status: 'syncing' });
      });

      // Return 0 (which means background task not actually started)
      (invoke as any).mockResolvedValue(0);

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should not log "Started background task" since taskId is 0
      const startedCalls = consoleLogSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('Started background task')
      );
      expect(startedCalls.length).toBe(0);

      consoleLogSpy.mockRestore();
    });
  });

  it('should disconnect existing client when connecting new one', async () => {
    // Ensure no saved URL to prevent auto-connect
    (getSyncServerUrl as any).mockReturnValue(null);

    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    // Connect first client
    await act(async () => {
      result.current.connect('ws://test1', 'user1', 'device1');
    });
    const firstClient = instances[0];

    // Connect second client - should disconnect first
    await act(async () => {
      result.current.connect('ws://test2', 'user2', 'device2');
    });

    expect(firstClient.disconnect).toHaveBeenCalled();
    expect(instances.length).toBe(2);
  });

  it('should handle disconnect when no client exists', async () => {
    // Ensure no saved URL to prevent auto-connect
    (getSyncServerUrl as any).mockReturnValue(null);

    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    // Should not throw when disconnecting with no client
    await act(async () => {
      result.current.disconnect();
    });

    expect(result.current.syncClient).toBeNull();
  });

  it('should handle reconnect when no client exists', async () => {
    // Ensure no saved URL to prevent auto-connect
    (getSyncServerUrl as any).mockReturnValue(null);

    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    // Should not throw when reconnecting with no client
    act(() => {
      result.current.reconnect();
    });

    expect(result.current.syncClient).toBeNull();
  });

  it('should clear error and reconnect', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });
    const client = instances[0];

    // Trigger error
    act(() => {
      client.emit('error', { error: new Error('Test error') });
    });

    expect(result.current.hasError).toBe(true);

    // Reconnect should clear error
    act(() => {
      result.current.reconnect();
    });

    expect(result.current.hasError).toBe(false);
    expect(client.connect).toHaveBeenCalled();
  });

  it('should clear error with clearError', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });
    const client = instances[0];

    act(() => {
      client.emit('error', { error: new Error('Test error') });
    });

    expect(result.current.hasError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.hasError).toBe(false);
  });

  it('should handle error event without error message', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });
    const client = instances[0];

    // Error event with no error object
    act(() => {
      client.emit('error', {});
    });

    expect(result.current.hasError).toBe(true);
  });

  it('should handle statusChange event without status', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });
    const client = instances[0];

    // statusChange with no status (undefined)
    act(() => {
      client.emit('statusChange', {});
    });

    // Status should remain unchanged
    expect(result.current.status).toBe('disconnected');
  });

  it('should update pending count on sync event', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });
    const client = instances[0];

    client.getPendingCount.mockReturnValue(5);

    act(() => {
      client.emit('sync', {});
    });

    expect(result.current.pendingCount).toBe(5);
  });

  it('should call refreshData on remote change', async () => {
    renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    // Get the callback that was set
    const onRemoteChangeCallback =
      mockDocStore.setOnRemoteChange.mock.calls[0]?.[0];

    // If callback was set, call it
    if (onRemoteChangeCallback) {
      act(() => {
        onRemoteChangeCallback();
      });

      expect(mockStore.clearCache).toHaveBeenCalled();
      expect(mockRefreshData).toHaveBeenCalled();
    }
  });

  it('should handle store being null in onRemoteChange', async () => {
    // Set store to null
    (useObjects as any).mockReturnValue({
      docStore: mockDocStore,
      store: null,
      refreshData: mockRefreshData,
    });

    renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    const onRemoteChangeCallback =
      mockDocStore.setOnRemoteChange.mock.calls[0]?.[0];

    if (onRemoteChangeCallback) {
      // Should not throw when store is null
      act(() => {
        onRemoteChangeCallback();
      });

      expect(mockRefreshData).toHaveBeenCalled();
    }
  });

  it('should not auto-connect when docStore is not ready', () => {
    (useObjects as any).mockReturnValue({
      docStore: null,
      store: mockStore,
      refreshData: mockRefreshData,
    });

    (getSyncServerUrl as any).mockReturnValue('ws://saved');

    renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    // Should not have created any clients
    expect(instances.length).toBe(0);
  });

  it('should throw when useSyncContext is used outside provider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSyncContext());
    }).toThrow('useSyncContext must be used within a SyncProvider');

    errorSpy.mockRestore();
  });

  it('should cleanup syncClient on unmount', async () => {
    const { result, unmount } = renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    await act(async () => {
      result.current.connect('ws://test', 'user1', 'device1');
    });
    const client = instances[0];

    unmount();

    expect(client.disconnect).toHaveBeenCalled();
  });
});
