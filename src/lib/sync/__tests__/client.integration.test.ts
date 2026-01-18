/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncClient } from '../client';
import {
  MessageType,
  encodeMessage,
  encodeJsonPayload,
  decodeMessage,
} from '../protocol';

// Mock Crypto
vi.mock('../../crypto', () => ({
  encrypt: vi.fn(async (data) => data),
  decrypt: vi.fn(async (data) => data),
  hasKey: vi.fn().mockResolvedValue(true),
}));

// Manual Mock WebSocket
class ManualMockWebSocket {
  url: string;
  readyState: number;
  binaryType: string = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: any }) => void) | null = null;
  onclose:
    | ((event: { code: number; reason: string; wasClean: boolean }) => void)
    | null = null;
  onerror: ((error: any) => void) | null = null;

  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    this.readyState = ManualMockWebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = ManualMockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send = vi.fn();

  close(code = 1000, reason = '') {
    this.readyState = ManualMockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason, wasClean: true });
  }

  receive(data: Uint8Array) {
    if (this.onmessage) {
      this.onmessage({
        data: data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength
        ),
      });
    }
  }
}

// Helper to handle ArrayBuffer conversions for tests
const toArrayBuffer = (data: unknown): ArrayBuffer => {
  if (data instanceof Uint8Array) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
  }
  return data as ArrayBuffer;
};

describe('SyncClient Integration', () => {
  let client: SyncClient;
  const config = {
    serverUrl: 'ws://localhost:1234',
    deviceId: 'device-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    global.WebSocket = ManualMockWebSocket as any;
    client = new SyncClient(config);
  });

  afterEach(() => {
    if (client) client.disconnect();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const getSocket = () => (client as any).ws as ManualMockWebSocket;

  it('should enable encryption', async () => {
    const enabled = await client.enableEncryption();
    expect(enabled).toBe(true);
    expect(client.isEncryptionEnabled()).toBe(true);
  });

  it('should connect and send HELLO', async () => {
    client.connect();
    await vi.advanceTimersByTimeAsync(100);
    const ws = getSocket();
    expect(ws).toBeTruthy();
    expect(ws.send).toHaveBeenCalled();
    const call = ws.send.mock.calls[0][0];
    const { type } = decodeMessage(toArrayBuffer(call));
    expect(type).toBe(MessageType.HELLO);
    expect(client.getStatus()).toBe('connecting');
  });

  it('should handle ACK and transition to connected', async () => {
    client.connect();
    await vi.advanceTimersByTimeAsync(100);
    const ws = getSocket();
    const onStatus = vi.fn();
    client.on('statusChange', (e) => onStatus(e.status));
    const ackPayload = encodeJsonPayload({
      currentSequence: 10,
      hasHistory: false,
    });
    const ackMsg = encodeMessage(MessageType.ACK, ackPayload);
    ws.receive(ackMsg);
    expect(onStatus).toHaveBeenCalledWith('connected');
    expect(client.getLastSequence()).toBe(10);
  });

  it('should handle UPDATE message', async () => {
    client.connect();
    await vi.advanceTimersByTimeAsync(100);
    const ws = getSocket();
    const updatePromise = new Promise<Uint8Array>((resolve) => {
      client.onUpdate(resolve);
    });
    const updateData = new Uint8Array([1, 2, 3]);
    const msg = encodeMessage(MessageType.UPDATE, updateData);
    ws.receive(msg);
    const data = await updatePromise;
    expect(data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should queue updates when disconnected', async () => {
    await client.sendUpdate(new Uint8Array([1]));
    expect(client.getPendingCount()).toBe(1);
    client.connect();
    await vi.advanceTimersByTimeAsync(100);
    const ws = getSocket();
    expect(ws.send).toHaveBeenCalledTimes(1);
    const helloCall = ws.send.mock.calls[0][0];
    expect(decodeMessage(toArrayBuffer(helloCall)).type).toBe(
      MessageType.HELLO
    );

    // Ack to update
    const ackMsg = encodeMessage(MessageType.ACK, encodeJsonPayload({}));
    ws.receive(ackMsg);

    expect(client.getPendingCount()).toBe(0);
    expect(ws.send).toHaveBeenCalledTimes(2);
    const updateCall = ws.send.mock.calls[1][0];
    expect(decodeMessage(toArrayBuffer(updateCall)).type).toBe(
      MessageType.UPDATE
    );
  });

  it('should handle offline/reconnect cycle', async () => {
    client.connect();
    await vi.advanceTimersByTimeAsync(100);
    const ws1 = getSocket();
    expect(ws1).toBeTruthy();
    ws1.close(1006);
    expect(client.getStatus()).toBe('disconnected');
    await vi.advanceTimersByTimeAsync(2000);
    expect((client as any).ws).not.toBe(ws1);
    expect((client as any).ws).toBeTruthy();
  });
});
