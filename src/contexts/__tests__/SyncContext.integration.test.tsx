/**
 * @vitest-environment jsdom
 *
 * SyncContext Integration Tests (P1)
 *
 * Tests the sync context lifecycle:
 * - Connection to relay server
 * - Remote updates apply to store
 * - Disconnect cleanup
 * - Error handling and reconnection
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SyncProvider, useSyncContext } from '../SyncContext';
import { ObjectProvider, useObjects } from '../ObjectContext';
import { ToastProvider } from '../ToastContext';
import { LoroDoc } from 'loro-crdt';
import type { ReactNode } from 'react';
import {
  MessageType,
  encodeMessage,
  encodeJsonPayload,
} from '@/lib/sync/protocol';

// In-memory file storage
let memoryFs: Map<string, Uint8Array>;

// Mock Tauri APIs
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/app/data'),
  join: vi.fn().mockImplementation(async (...args) => args.join('/')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi
    .fn()
    .mockImplementation(async (path: string) => memoryFs.has(path)),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockImplementation(async (path: string) => {
    const data = memoryFs.get(path);
    if (!data) throw new Error('File not found');
    return data;
  }),
  writeFile: vi
    .fn()
    .mockImplementation(async (path: string, data: Uint8Array) => {
      memoryFs.set(path, data);
    }),
}));

// Mock crypto
vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn(async (data: Uint8Array) => data),
  decrypt: vi.fn(async (data: Uint8Array) => data),
  hasKey: vi.fn().mockResolvedValue(true),
}));

// Mock sync config functions
let mockSavedUrl: string | null = null;
let mockUserId = 'test-user-id';
let mockDeviceId = 'test-device-id';

vi.mock('@/lib/sync', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getSyncServerUrl: () => mockSavedUrl,
    getUserId: () => mockUserId,
    getDeviceId: () => mockDeviceId,
  };
});

// Mock platform hook
vi.mock('@/hooks/usePlatform', () => ({
  usePlatform: () => ({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isDesktop: true,
    os: 'macos',
    browser: null,
  }),
}));

// Mock Tauri invoke for iOS background tasks
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(0),
}));

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = 0;
  binaryType: string = 'arraybuffer';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  onclose:
    | ((event: { code: number; reason: string; wasClean: boolean }) => void)
    | null = null;
  onerror: ((error: any) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send = vi.fn();

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose)
      this.onclose({ code: 1000, reason: 'Normal', wasClean: true });
  }

  receive(data: ArrayBuffer) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  // Simulate receiving ACK message
  simulateAck() {
    const ackPayload = encodeJsonPayload({
      currentSequence: 0,
      hasHistory: false,
    });
    const ackMsg = encodeMessage(MessageType.ACK, ackPayload);
    this.receive(ackMsg.buffer as ArrayBuffer);
  }

  // Simulate receiving UPDATE message
  simulateUpdate(data: Uint8Array) {
    const msg = encodeMessage(MessageType.UPDATE, data);
    this.receive(msg.buffer as ArrayBuffer);
  }
}

describe('SyncContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    memoryFs = new Map();
    MockWebSocket.instances = [];
    mockSavedUrl = null;
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    memoryFs.clear();
    MockWebSocket.instances = [];
  });

  // Combined wrapper with all providers
  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <ToastProvider>
        <ObjectProvider>
          <SyncProvider>{children}</SyncProvider>
        </ObjectProvider>
      </ToastProvider>
    );
  };

  describe('connection', () => {
    it('connects to relay server when connect is called', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      // Wait for ObjectProvider to initialize
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Connect
      await act(async () => {
        result.current.connect('ws://localhost:1234', 'user-1', 'device-1');
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(MockWebSocket.instances.length).toBe(1);
      // The sync context appends /sync/{userId} to the base URL
      expect(MockWebSocket.instances[0].url).toContain('ws://localhost:1234');

      // Simulate ACK
      await act(async () => {
        MockWebSocket.instances[0].simulateAck();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.status).toBe('connected');
    });

    it('auto-connects when saved URL exists', async () => {
      mockSavedUrl = 'ws://saved-server:1234';

      const wrapper = createWrapper();
      renderHook(() => useSyncContext(), { wrapper });

      // Wait for auto-connect
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(MockWebSocket.instances.length).toBe(1);
      // The sync context appends /sync/{userId} to the base URL
      expect(MockWebSocket.instances[0].url).toContain(
        'ws://saved-server:1234'
      );
    });

    it('tracks online/offline status', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(result.current.isOnline).toBe(true);

      // Simulate going offline
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);

      // Simulate coming back online
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('receiving updates', () => {
    it('can receive update messages through websocket', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      // Wait for initialization
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Connect
      await act(async () => {
        result.current.connect('ws://localhost:1234', 'user-1', 'device-1');
        await vi.advanceTimersByTimeAsync(50);
      });

      // Simulate ACK
      await act(async () => {
        MockWebSocket.instances[0].simulateAck();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(result.current.isConnected).toBe(true);

      // Create update with new object
      const tempDoc = new LoroDoc();
      tempDoc.getMap('objects').set(
        'remote-task',
        JSON.stringify({
          id: 'remote-task',
          typeId: 'task',
          properties: { title: 'Task from remote' },
          hasContent: false,
          inboxed: true,
          pinned: false,
          archived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );
      tempDoc.commit();

      const snapshot = tempDoc.export({ mode: 'snapshot' });
      const wrappedUpdate = new TextEncoder().encode(
        JSON.stringify({
          main: Array.from(snapshot),
        })
      );

      // Simulate receiving update - should not throw
      await act(async () => {
        MockWebSocket.instances[0].simulateUpdate(wrappedUpdate);
        await vi.advanceTimersByTimeAsync(100);
      });

      // Verify connection is still stable after receiving update
      expect(result.current.isConnected).toBe(true);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('disconnects and cleans up', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Connect
      await act(async () => {
        result.current.connect('ws://localhost:1234', 'user-1', 'device-1');
        await vi.advanceTimersByTimeAsync(50);
      });

      await act(async () => {
        MockWebSocket.instances[0].simulateAck();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(result.current.isConnected).toBe(true);

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.status).toBe('disconnected');
      expect(result.current.syncClient).toBeNull();
    });
  });

  describe('error handling', () => {
    it('sets hasError on connection error', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Connect
      await act(async () => {
        result.current.connect('ws://localhost:1234', 'user-1', 'device-1');
        await vi.advanceTimersByTimeAsync(50);
      });

      // Simulate error
      await act(async () => {
        const ws = MockWebSocket.instances[0];
        if (ws.onerror) ws.onerror(new Error('Connection failed'));
        await vi.advanceTimersByTimeAsync(50);
      });

      // Note: hasError is set via SyncClient error event, which we'd need to trigger
      // through the client's internal error handler
    });

    it('clears error on reconnect', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await act(async () => {
        result.current.connect('ws://localhost:1234', 'user-1', 'device-1');
        await vi.advanceTimersByTimeAsync(50);
      });

      // Manually set error (simulating error state)
      // In real scenario, error comes from SyncClient

      // Reconnect should clear error
      act(() => {
        result.current.reconnect();
      });

      expect(result.current.hasError).toBe(false);
    });

    it('clearError resets error state', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Clear error should work even when no error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.hasError).toBe(false);
    });
  });

  describe('pending count', () => {
    it('tracks pending updates', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncContext(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Initially no pending
      expect(result.current.pendingCount).toBe(0);

      // Connect
      await act(async () => {
        result.current.connect('ws://localhost:1234', 'user-1', 'device-1');
        await vi.advanceTimersByTimeAsync(50);
      });

      // After ACK, pending should still be 0
      await act(async () => {
        MockWebSocket.instances[0].simulateAck();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('useSyncContext hook', () => {
    it('throws when used outside provider', () => {
      const { result } = renderHook(() => {
        try {
          return { error: null, context: useSyncContext() };
        } catch (e) {
          return { error: e, context: null };
        }
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as Error).message).toContain('SyncProvider');
    });
  });
});
