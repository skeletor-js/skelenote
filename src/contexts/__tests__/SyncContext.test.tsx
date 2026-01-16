/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SyncProvider, useSyncContext } from '../SyncContext';


// Define MockSyncClient inside factory or use module-level variable initialized before
// But cleanest is inside the mock factory.

// We need to capture instances.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const instances: any[] = [];

vi.mock('@/lib/sync', async () => {
  // Minimal event emitter implementation
  class MockSyncClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listeners: Record<string, Function[]> = {};

    disconnect = vi.fn();
    connect = vi.fn();
    enableEncryption = vi.fn().mockResolvedValue(true);
    getPendingCount = vi.fn().mockReturnValue(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any) {
      this.config = config;
      instances.push(this);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on(event: string, cb: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
      return () => { };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

vi.mock('@/hooks/usePlatform', () => ({
  usePlatform: vi.fn(() => ({
    isMobile: false,
    isIOS: false,
  })),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSyncServerUrl as any).mockReturnValue('ws://saved');

    renderHook(() => useSyncContext(), {
      wrapper: SyncProvider,
    });

    expect(instances.length).toBe(1);
    expect(instances[0].config.serverUrl).toBe('ws://saved');
  });
});
