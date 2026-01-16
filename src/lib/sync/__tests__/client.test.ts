import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncClient } from '../client';
import {
  MessageType,
  decodeMessage,
  encodeMessage,
  encodeJsonPayload,
} from '../protocol';

// Mock crypto
vi.mock('@/lib/crypto', () => ({
  hasKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

// Mock ConnectionManager
vi.mock('../connection', () => {
  return {
    ConnectionManager: class {
      scheduleReconnect = vi.fn();
      cancelReconnect = vi.fn();
      resetRetries = vi.fn();
    },
  };
});

import { hasKey, encrypt, decrypt } from '@/lib/crypto';

// Setup global WebSocket mock
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static CONNECTING = 0;
  static CLOSING = 2;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  binaryType: string = 'blob'; // Default, client sets to arraybuffer

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: (() => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  // Helper to simulate open
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.WebSocket = MockWebSocket as any;

describe('SyncClient', () => {
  let client: SyncClient;
  const config = {
    serverUrl: 'ws://localhost:8080',
    userId: 'user-1',
    deviceId: 'device-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = []; // Clear mock instances
    client = new SyncClient(config);
    // Mock crypto defaults
    vi.mocked(hasKey).mockResolvedValue(false);
    vi.mocked(encrypt).mockImplementation(async (data: Uint8Array) => data);
    vi.mocked(decrypt).mockImplementation(async (data: Uint8Array) => data);
  });

  afterEach(() => {
    client.disconnect();
  });

  it('should initialize with disconnected status', () => {
    expect(client.getStatus()).toBe('disconnected');
  });

  it('should connect and send HELLO', async () => {
    client.connect();

    expect(client.getStatus()).toBe('connecting');
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:8080/sync/user-1'); // SyncClient constructs URL

    // Simulate connection open
    ws.simulateOpen();

    // Should have sent HELLO
    expect(ws.send).toHaveBeenCalled();
    const sentData = ws.send.mock.calls[0][0];
    const { type } = decodeMessage(sentData.buffer); // FIXED: pass buffer
    expect(type).toBe(MessageType.HELLO);
  });

  it('should handle ACK and transition to connected', async () => {
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    // Simulate receiving ACK
    const ackPayload = encodeJsonPayload({
      sessionCount: 1,
      currentSequence: 10,
    });
    const ackMsg = encodeMessage(MessageType.ACK, ackPayload);

    if (ws.onmessage) {
      ws.onmessage({ data: ackMsg.buffer });
    }

    expect(client.getStatus()).toBe('connected');
    expect(client.getLastSequence()).toBe(10);
  });

  it('should enable encryption if key exists', async () => {
    vi.mocked(hasKey).mockResolvedValue(true);
    const enabled = await client.enableEncryption();
    expect(enabled).toBe(true);
    expect(client.isEncryptionEnabled()).toBe(true);
  });

  it('should encrypt updates when encryption enabled', async () => {
    vi.mocked(hasKey).mockResolvedValue(true);
    vi.mocked(encrypt).mockResolvedValue(new Uint8Array([1, 2, 3]));
    vi.mocked(encrypt).mockResolvedValue(new Uint8Array([1, 2, 3]));

    await client.enableEncryption();

    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    // Send update
    const updateData = new Uint8Array([4, 5, 6]);
    await client.sendUpdate(updateData);

    expect(encrypt).toHaveBeenCalledWith(updateData);

    const lastCall = ws.send.mock.calls[ws.send.mock.calls.length - 1];
    const { type, payload } = decodeMessage(lastCall[0].buffer); // FIXED: pass buffer
    expect(type).toBe(MessageType.UPDATE);
    expect(payload).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should queue updates when disconnected', async () => {
    // Don't connect

    const updateData = new Uint8Array([10, 20]);
    await client.sendUpdate(updateData);

    expect(client.getPendingCount()).toBe(1);
  });

  it('should retry connection on close', () => {
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const spy = vi.spyOn(client['connectionManager'], 'scheduleReconnect');

    // trigger close
    if (ws.onclose) {
      ws.onclose({ code: 1006, reason: 'Abnormal' } as CloseEvent);
    }

    expect(client.getStatus()).toBe('disconnected');
    expect(spy).toHaveBeenCalled();
  });

  describe('Sync Protocol', () => {
    it('should handle incoming SNAPSHOT', async () => {
      const callback = vi.fn();
      client.onUpdate(callback); // Snapshots use onUpdate callback

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const snapshotData = new Uint8Array([100, 101, 102]);
      const msg = encodeMessage(MessageType.SNAPSHOT, snapshotData);

      if (ws.onmessage) {
        ws.onmessage({ data: msg.buffer });
      }

      // Should be passed to update callback
      expect(callback).toHaveBeenCalledWith(snapshotData);
    });

    it('should handle SNAPSHOT_REQUEST', () => {
      const snapshot = new Uint8Array([1, 2, 3]);
      client.onSnapshotRequest(() => snapshot);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const msg = encodeMessage(
        MessageType.SNAPSHOT_REQUEST,
        new Uint8Array(0)
      );
      if (ws.onmessage) {
        ws.onmessage({ data: msg.buffer });
      }

      // Should send SNAPSHOT response
      const sent = ws.send.mock.calls.find((call) => {
        const { type } = decodeMessage(call[0].buffer);
        return type === MessageType.SNAPSHOT;
      });
      expect(sent).toBeDefined();
      const { payload } = decodeMessage(
        (sent && sent[0] ? (sent[0] as unknown as { buffer: ArrayBuffer }).buffer : new ArrayBuffer(0))
      );
      expect(payload).toEqual(snapshot);
    });

    it('should handle HISTORY', async () => {
      const callback = vi.fn();
      client.onHistory(callback);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Construct HISTORY message
      const historyHeader = encodeJsonPayload({
        fromSequence: 1,
        toSequence: 2,
        count: 2,
      });
      const update1 = new Uint8Array([1]);
      const update2 = new Uint8Array([2]);

      // [headerLen(4)][header][len(4)][u1][len(4)][u2]
      const payloadLen =
        4 + historyHeader.length + 4 + update1.length + 4 + update2.length;
      const historyPayload = new Uint8Array(payloadLen);
      const view = new DataView(historyPayload.buffer);
      let offset = 0;

      view.setUint32(offset, historyHeader.length, true);
      offset += 4;
      historyPayload.set(historyHeader, offset);
      offset += historyHeader.length;

      view.setUint32(offset, update1.length, true);
      offset += 4;
      historyPayload.set(update1, offset);
      offset += update1.length;

      view.setUint32(offset, update2.length, true);
      offset += 4;
      historyPayload.set(update2, offset);

      const msg = encodeMessage(MessageType.HISTORY, historyPayload);

      if (ws.onmessage) {
        ws.onmessage({ data: msg.buffer });
      }

      // Wait for promise resolution if handled async
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith([update1, update2]);
      expect(client.getLastSequence()).toBe(2);
    });
  });

  describe('Control Messages', () => {
    beforeEach(() => {
      client.connect();
      MockWebSocket.instances[0].simulateOpen();
    });

    it('sends requestCatchUp', () => {
      client.requestCatchUp(5);
      const ws = MockWebSocket.instances[0];
      const call = ws.send.mock.calls.find(
        (c) => decodeMessage(c[0].buffer).type === MessageType.CATCH_UP
      );
      expect(call).toBeDefined();
    });

    it('sends requestSnapshot', () => {
      client.requestSnapshot();
      const ws = MockWebSocket.instances[0];
      const call = ws.send.mock.calls.find(
        (c) => decodeMessage(c[0].buffer).type === MessageType.SNAPSHOT_REQUEST
      );
      expect(call).toBeDefined();
    });

    it('sends requestCompaction', async () => {
      const snapshot = new Uint8Array([1, 2, 3]);
      await client.requestCompaction(10, snapshot);
      const ws = MockWebSocket.instances[0];
      const call = ws.send.mock.calls.find(
        (c) => decodeMessage(c[0].buffer).type === MessageType.COMPACT
      );
      expect(call).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      if (ws.onmessage) {
        ws.onmessage({ data: new Uint8Array([255, 255]).buffer });
      }
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle invalid message type', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = encodeMessage(99 as any, new Uint8Array(0));
      if (ws.onmessage) {
        ws.onmessage({ data: msg.buffer });
      }
    });

    it('should handle non-binary messages', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      if (ws.onmessage) {
        ws.onmessage({ data: 'text frame' });
      }
    });
  });

  describe('Revocation Handling', () => {
    it('should handle revocation via close code 4001', () => {
      const onRevoked = vi.fn();
      client.onDeviceRevoked(onRevoked);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      if (ws.onclose) {
        ws.onclose({ code: 4001, reason: 'Device revoked' } as CloseEvent);
      }

      expect(client.getStatus()).toBe('disconnected');
      expect(onRevoked).toHaveBeenCalledWith('device-1', 'Device revoked');

      const spy = vi.spyOn(client['connectionManager'], 'scheduleReconnect');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle revocation via ACK rejection', () => {
      const onRevoked = vi.fn();
      client.onDeviceRevoked(onRevoked);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const ackPayload = encodeJsonPayload({
        rejected: true,
        reason: 'Banned',
      });
      const ackMsg = encodeMessage(MessageType.ACK, ackPayload);

      if (ws.onmessage) {
        ws.onmessage({ data: ackMsg.buffer });
      }

      expect(client.getStatus()).toBe('disconnected');
      expect(onRevoked).toHaveBeenCalledWith('device-1', 'Banned');
    });
  });

  describe('Device Management Handlers', () => {
    beforeEach(() => {
      client.connect();
      MockWebSocket.instances[0].simulateOpen();
    });

    it('should send device messages', () => {
      client.sendDeviceRevoke({
        deviceId: 'd2',
        revokedBy: 'me',
        reason: 're',
        signature: 's',
        revokedAt: 1,
      });
      client.sendDeviceRename({
        deviceId: 'd1',
        newName: 'n',
        renamedAt: 1,
      });
      client.sendDeviceRegistryUpdate(new Uint8Array([1]));
      client.sendDeviceRegistry(new Uint8Array([2]));

      // 1 (HELLO) + 4 messages = 5
      expect(MockWebSocket.instances[0].send).toHaveBeenCalledTimes(5);
    });

    it('should handle DEVICE_REGISTRY', () => {
      const callback = vi.fn();
      client.onDeviceRegistry(callback);

      const data = new Uint8Array([1, 2]);
      const msg = encodeMessage(MessageType.DEVICE_REGISTRY, data);

      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(callback).toHaveBeenCalledWith(data);
    });

    it('should handle DEVICE_UPDATE', () => {
      const callback = vi.fn();
      client.onDeviceRegistryUpdate(callback);

      const data = new Uint8Array([3, 4]);
      const msg = encodeMessage(MessageType.DEVICE_UPDATE, data);

      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(callback).toHaveBeenCalledWith(data);
    });

    it('should handle DEVICE_REVOKE', () => {
      const callback = vi.fn();
      client.onDeviceRevokeReceived(callback);

      const payload = {
        deviceId: 'd2',
        reason: 'reason',
        signature: 'sig',
        timestamp: 123,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE,
        encodeJsonPayload(payload)
      );

      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it('should detect self-revocation via DEVICE_REVOKE message', () => {
      const onRevoked = vi.fn();
      client.onDeviceRevoked(onRevoked);

      const payload = {
        deviceId: 'device-1',
        reason: 'You are revoked',
        signature: 'sig',
        timestamp: 123,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE,
        encodeJsonPayload(payload)
      );

      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(onRevoked).toHaveBeenCalledWith('device-1', 'You are revoked');
    });
  });
});
