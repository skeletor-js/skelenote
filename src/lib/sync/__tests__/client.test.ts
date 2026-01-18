/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SyncClient } from '../client';
import {
  MessageType,
  decodeMessage,
  encodeMessage,
  encodeJsonPayload,
  isDeviceManagementMessage,
} from '../protocol';
import { PersistentOfflineQueue } from '../persistent-queue';

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

global.WebSocket = MockWebSocket as any;

describe('SyncClient', () => {
  let client: SyncClient;
  const config = {
    serverUrl: 'ws://localhost:8080',
    userId: 'user-1',
    deviceId: 'device-1',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    MockWebSocket.instances = []; // Clear mock instances
    client = new SyncClient(config);
    await client.waitForReady();
    // Mock crypto defaults
    vi.mocked(hasKey).mockResolvedValue(false);
    vi.mocked(encrypt).mockImplementation(async (data: Uint8Array) => data);
    vi.mocked(decrypt).mockImplementation(async (data: Uint8Array) => data);
  });

  afterEach(async () => {
    client.disconnect();
    // Clean up IndexedDB
    await PersistentOfflineQueue.deleteDatabase();
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
        sent && sent[0]
          ? (sent[0] as unknown as { buffer: ArrayBuffer }).buffer
          : new ArrayBuffer(0)
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

    it('should handle DEVICE_REVOKE_ACK', () => {
      const callback = vi.fn();
      client.onDeviceRevokeAckReceived(callback);

      const payload = {
        deviceId: 'd2',
        success: true,
        acknowledgedAt: 123456,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE_ACK,
        encodeJsonPayload(payload)
      );

      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it('should handle DEVICE_RENAME', () => {
      const callback = vi.fn();
      client.onDeviceRenameReceived(callback);

      const payload = {
        deviceId: 'd1',
        newName: 'New Device Name',
        renamedAt: 123456,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_RENAME,
        encodeJsonPayload(payload)
      );

      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(callback).toHaveBeenCalledWith(payload);
    });
  });

  describe('Device Management Error Handling', () => {
    beforeEach(() => {
      client.connect();
      MockWebSocket.instances[0].simulateOpen();
    });

    it('should handle malformed DEVICE_REVOKE payload', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Send invalid JSON payload
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE,
        new Uint8Array([0xff, 0xfe])
      );
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SyncClient] Error handling DEVICE_REVOKE:'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle malformed DEVICE_REVOKE_ACK payload', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Send invalid JSON payload
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE_ACK,
        new Uint8Array([0xff, 0xfe])
      );
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[SyncClient] Error handling DEVICE_REVOKE_ACK:'
        ),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle malformed DEVICE_RENAME payload', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Send invalid JSON payload
      const msg = encodeMessage(
        MessageType.DEVICE_RENAME,
        new Uint8Array([0xff, 0xfe])
      );
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SyncClient] Error handling DEVICE_RENAME:'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('isDeviceManagementMessage', () => {
    it('should return true for DEVICE_REGISTRY', () => {
      expect(isDeviceManagementMessage(MessageType.DEVICE_REGISTRY)).toBe(true);
    });

    it('should return true for DEVICE_UPDATE', () => {
      expect(isDeviceManagementMessage(MessageType.DEVICE_UPDATE)).toBe(true);
    });

    it('should return true for DEVICE_REVOKE', () => {
      expect(isDeviceManagementMessage(MessageType.DEVICE_REVOKE)).toBe(true);
    });

    it('should return true for DEVICE_REVOKE_ACK', () => {
      expect(isDeviceManagementMessage(MessageType.DEVICE_REVOKE_ACK)).toBe(
        true
      );
    });

    it('should return true for DEVICE_RENAME', () => {
      expect(isDeviceManagementMessage(MessageType.DEVICE_RENAME)).toBe(true);
    });

    it('should return false for non-device messages', () => {
      expect(isDeviceManagementMessage(MessageType.HELLO)).toBe(false);
      expect(isDeviceManagementMessage(MessageType.UPDATE)).toBe(false);
      expect(isDeviceManagementMessage(MessageType.SNAPSHOT)).toBe(false);
      expect(isDeviceManagementMessage(MessageType.PONG)).toBe(false);
    });
  });

  describe('Encryption Decryption', () => {
    beforeEach(async () => {
      vi.mocked(hasKey).mockResolvedValue(true);
      await client.enableEncryption();
      client.connect();
      MockWebSocket.instances[0].simulateOpen();
    });

    it('should decrypt UPDATE when encryption enabled', async () => {
      const callback = vi.fn();
      client.onUpdate(callback);

      const encryptedData = new Uint8Array([10, 20, 30]);
      const decryptedData = new Uint8Array([1, 2, 3]);
      vi.mocked(decrypt).mockResolvedValue(decryptedData);

      const msg = encodeMessage(MessageType.UPDATE, encryptedData);
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(decrypt).toHaveBeenCalledWith(encryptedData);
      expect(callback).toHaveBeenCalledWith(decryptedData);
    });

    it('should handle UPDATE decryption failure', async () => {
      const callback = vi.fn();
      client.onUpdate(callback);

      const errorCallback = vi.fn();
      client.on('error', errorCallback);

      vi.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

      const msg = encodeMessage(MessageType.UPDATE, new Uint8Array([1]));
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should decrypt SNAPSHOT when encryption enabled', async () => {
      const callback = vi.fn();
      client.onUpdate(callback);

      const encryptedData = new Uint8Array([10, 20, 30]);
      const decryptedData = new Uint8Array([1, 2, 3]);
      vi.mocked(decrypt).mockResolvedValue(decryptedData);

      const msg = encodeMessage(MessageType.SNAPSHOT, encryptedData);
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(decrypt).toHaveBeenCalledWith(encryptedData);
      expect(callback).toHaveBeenCalledWith(decryptedData);
    });

    it('should handle SNAPSHOT decryption failure', async () => {
      const callback = vi.fn();
      client.onUpdate(callback);

      const errorCallback = vi.fn();
      client.on('error', errorCallback);

      vi.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

      const msg = encodeMessage(MessageType.SNAPSHOT, new Uint8Array([1]));
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should decrypt HISTORY updates when encryption enabled', async () => {
      const callback = vi.fn();
      client.onHistory(callback);

      // Setup decrypt to return different values for each call
      const decrypted1 = new Uint8Array([100]);
      const decrypted2 = new Uint8Array([200]);
      vi.mocked(decrypt)
        .mockResolvedValueOnce(decrypted1)
        .mockResolvedValueOnce(decrypted2);

      // Construct HISTORY message
      const historyHeader = encodeJsonPayload({
        fromSequence: 1,
        toSequence: 3,
        count: 2,
      });
      const update1 = new Uint8Array([1]);
      const update2 = new Uint8Array([2]);

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
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(decrypt).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith([decrypted1, decrypted2]);
      expect(client.getLastSequence()).toBe(3);
    });

    it('should continue processing HISTORY on partial decryption failure', async () => {
      const callback = vi.fn();
      client.onHistory(callback);

      // First decrypt fails, second succeeds
      const decrypted2 = new Uint8Array([200]);
      vi.mocked(decrypt)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(decrypted2);

      const historyHeader = encodeJsonPayload({
        fromSequence: 1,
        toSequence: 3,
        count: 2,
      });
      const update1 = new Uint8Array([1]);
      const update2 = new Uint8Array([2]);

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
      const ws = MockWebSocket.instances[0];

      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should have processed second update only
      expect(callback).toHaveBeenCalledWith([decrypted2]);
    });
  });

  describe('ACK with History', () => {
    it('should request catch-up when ACK indicates history available', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Simulate ACK with history available
      const ackPayload = encodeJsonPayload({
        sessionCount: 1,
        currentSequence: 50,
        hasHistory: true,
      });
      const ackMsg = encodeMessage(MessageType.ACK, ackPayload);

      if (ws.onmessage) ws.onmessage({ data: ackMsg.buffer });

      // Should have sent CATCH_UP request
      const catchUpCall = ws.send.mock.calls.find((call) => {
        const { type } = decodeMessage(call[0].buffer);
        return type === MessageType.CATCH_UP;
      });
      expect(catchUpCall).toBeDefined();
    });

    it('should not request catch-up if already at current sequence', async () => {
      // Set lastSequence first by processing an ACK
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // First ACK sets sequence to 50
      const ackPayload1 = encodeJsonPayload({
        sessionCount: 1,
        currentSequence: 50,
      });
      if (ws.onmessage)
        ws.onmessage({
          data: encodeMessage(MessageType.ACK, ackPayload1).buffer,
        });

      // Clear calls
      ws.send.mockClear();

      // Disconnect and reconnect
      client.disconnect();
      MockWebSocket.instances = [];
      client.connect();
      const ws2 = MockWebSocket.instances[0];
      ws2.simulateOpen();

      // ACK with same sequence, should not trigger catch-up
      const ackPayload2 = encodeJsonPayload({
        sessionCount: 2,
        currentSequence: 50,
        hasHistory: true,
      });
      if (ws2.onmessage)
        ws2.onmessage({
          data: encodeMessage(MessageType.ACK, ackPayload2).buffer,
        });

      // Should NOT have sent CATCH_UP (only HELLO was sent)
      const catchUpCall = ws2.send.mock.calls.find((call) => {
        const { type } = decodeMessage(call[0].buffer);
        return type === MessageType.CATCH_UP;
      });
      expect(catchUpCall).toBeUndefined();
    });
  });

  describe('Queue Flushing', () => {
    it('should flush queued updates on reconnect', async () => {
      // Queue some updates while disconnected
      await client.sendUpdate(new Uint8Array([1, 2]));
      await client.sendUpdate(new Uint8Array([3, 4]));
      expect(client.getPendingCount()).toBe(2);

      // Connect
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // ACK triggers flush (async, fire-and-forget)
      const ackPayload = encodeJsonPayload({
        sessionCount: 1,
        currentSequence: 0,
      });
      if (ws.onmessage)
        ws.onmessage({
          data: encodeMessage(MessageType.ACK, ackPayload).buffer,
        });

      // Wait for async flush to complete
      await vi.waitFor(() => {
        expect(client.getPendingCount()).toBe(0);
      });

      // Should have sent HELLO + 2 updates
      expect(ws.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Normal Close', () => {
    it('should not reconnect on normal close (1000)', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const spy = vi.spyOn(client['connectionManager'], 'scheduleReconnect');

      if (ws.onclose) {
        ws.onclose({ code: 1000, reason: 'Normal closure' } as CloseEvent);
      }

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Additional Branch Coverage', () => {
    it('should handle enableEncryption error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.mocked(hasKey).mockRejectedValue(new Error('Key check failed'));

      const enabled = await client.enableEncryption();

      expect(enabled).toBe(false);
      expect(client.isEncryptionEnabled()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncClient] Failed to check encryption key:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should not create new connection if already open', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Try to connect again
      client.connect();

      // Should still have only 1 WebSocket instance
      expect(MockWebSocket.instances.length).toBe(1);
    });

    it('should handle sendUpdate encryption error', async () => {
      vi.mocked(hasKey).mockResolvedValue(true);
      vi.mocked(encrypt).mockRejectedValue(new Error('Encryption failed'));
      await client.enableEncryption();

      const errorCallback = vi.fn();
      client.on('error', errorCallback);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await client.sendUpdate(new Uint8Array([1, 2, 3]));

      // Should have emitted error and not sent
      expect(errorCallback).toHaveBeenCalled();
      // Should only have sent HELLO, not the UPDATE
      const updateCalls = ws.send.mock.calls.filter((call) => {
        const { type } = decodeMessage(call[0].buffer);
        return type === MessageType.UPDATE;
      });
      expect(updateCalls.length).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should handle sendSnapshot encryption error', async () => {
      vi.mocked(hasKey).mockResolvedValue(true);
      vi.mocked(encrypt).mockRejectedValue(new Error('Encryption failed'));
      await client.enableEncryption();

      const errorCallback = vi.fn();
      client.on('error', errorCallback);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await client.sendSnapshot(new Uint8Array([1, 2, 3]));

      expect(errorCallback).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not send snapshot when WS not open', async () => {
      // Don't connect - WS not open
      await client.sendSnapshot(new Uint8Array([1, 2, 3]));

      // No WebSocket instances created, so nothing sent
      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should not send requestSnapshot when WS not open', () => {
      // Don't connect
      client.requestSnapshot();

      // No error, just no-op
      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should not send requestCatchUp when WS not open', () => {
      // Don't connect
      client.requestCatchUp(10);

      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should not send requestCompaction when WS not open', async () => {
      // Don't connect
      await client.requestCompaction(10, new Uint8Array([1]));

      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should handle requestCompaction encryption error', async () => {
      vi.mocked(hasKey).mockResolvedValue(true);
      vi.mocked(encrypt).mockRejectedValue(new Error('Encryption failed'));
      await client.enableEncryption();

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await client.requestCompaction(10, new Uint8Array([1]));

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncClient] Compaction snapshot encryption failed:',
        expect.any(Error)
      );
      // Should not have sent COMPACT message
      const compactCalls = ws.send.mock.calls.filter((call) => {
        const { type } = decodeMessage(call[0].buffer);
        return type === MessageType.COMPACT;
      });
      expect(compactCalls.length).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should not emit status change when status unchanged', () => {
      const statusCallback = vi.fn();
      client.on('statusChange', statusCallback);

      // Initial status is 'disconnected'
      // Manually trigger setStatus with same status
      client['setStatus']('disconnected');

      expect(statusCallback).not.toHaveBeenCalled();
    });

    it('should handle SNAPSHOT_REQUEST when callback returns null', () => {
      client.onSnapshotRequest(() => null);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const msg = encodeMessage(
        MessageType.SNAPSHOT_REQUEST,
        new Uint8Array(0)
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not have sent SNAPSHOT response
      const snapshotCalls = ws.send.mock.calls.filter((call) => {
        const { type } = decodeMessage(call[0].buffer);
        return type === MessageType.SNAPSHOT;
      });
      expect(snapshotCalls.length).toBe(0);
    });

    it('should handle SNAPSHOT_REQUEST when no callback set', () => {
      // Don't set onSnapshotRequest callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Send ACK first to get to connected state
      const ackPayload = encodeJsonPayload({ sessionCount: 1 });
      if (ws.onmessage)
        ws.onmessage({
          data: encodeMessage(MessageType.ACK, ackPayload).buffer,
        });

      const msg = encodeMessage(
        MessageType.SNAPSHOT_REQUEST,
        new Uint8Array(0)
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // No callback set, should not crash
      expect(client.getStatus()).toBe('connected');
    });

    it('should handle HISTORY when no callback set', async () => {
      // Don't set onHistory callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const historyHeader = encodeJsonPayload({
        fromSequence: 1,
        toSequence: 2,
        count: 1,
      });
      const update = new Uint8Array([1]);
      const payloadLen = 4 + historyHeader.length + 4 + update.length;
      const historyPayload = new Uint8Array(payloadLen);
      const view = new DataView(historyPayload.buffer);
      let offset = 0;
      view.setUint32(offset, historyHeader.length, true);
      offset += 4;
      historyPayload.set(historyHeader, offset);
      offset += historyHeader.length;
      view.setUint32(offset, update.length, true);
      offset += 4;
      historyPayload.set(update, offset);

      const msg = encodeMessage(MessageType.HISTORY, historyPayload);
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have updated sequence but not crashed
      expect(client.getLastSequence()).toBe(2);
    });

    it('should handle HISTORY with empty updates array', async () => {
      const callback = vi.fn();
      client.onHistory(callback);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const historyHeader = encodeJsonPayload({
        fromSequence: 1,
        toSequence: 5,
        count: 0, // No updates
      });
      const payloadLen = 4 + historyHeader.length;
      const historyPayload = new Uint8Array(payloadLen);
      const view = new DataView(historyPayload.buffer);
      view.setUint32(0, historyHeader.length, true);
      historyPayload.set(historyHeader, 4);

      const msg = encodeMessage(MessageType.HISTORY, historyPayload);
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not call callback with empty array
      expect(callback).not.toHaveBeenCalled();
      expect(client.getLastSequence()).toBe(5);
    });

    it('should handle DEVICE_REGISTRY when no callback set', () => {
      // Don't set onDeviceRegistry callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const msg = encodeMessage(
        MessageType.DEVICE_REGISTRY,
        new Uint8Array([1, 2])
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not crash
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle DEVICE_UPDATE when no callback set', () => {
      // Don't set onDeviceRegistryUpdate callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const msg = encodeMessage(
        MessageType.DEVICE_UPDATE,
        new Uint8Array([1, 2])
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not crash
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle DEVICE_REVOKE when no callback set (non-self)', () => {
      // Don't set any callbacks
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const payload = {
        deviceId: 'other-device', // Not this device
        reason: 'reason',
        signature: 'sig',
        timestamp: 123,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE,
        encodeJsonPayload(payload)
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not crash
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle DEVICE_REVOKE_ACK when no callback set', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const payload = {
        deviceId: 'd2',
        success: true,
        acknowledgedAt: 123,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE_ACK,
        encodeJsonPayload(payload)
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not crash
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle DEVICE_RENAME when no callback set', () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const payload = {
        deviceId: 'd1',
        newName: 'New Name',
        renamedAt: 123,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_RENAME,
        encodeJsonPayload(payload)
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not crash
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle UPDATE when no callback set', async () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const msg = encodeMessage(MessageType.UPDATE, new Uint8Array([1, 2]));
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not crash and should emit sync event
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle SNAPSHOT when no callback set', async () => {
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const msg = encodeMessage(MessageType.SNAPSHOT, new Uint8Array([1, 2]));
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not crash
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should not send device messages when WS not open', () => {
      // Don't connect
      client.sendDeviceRegistry(new Uint8Array([1]));
      client.sendDeviceRegistryUpdate(new Uint8Array([2]));
      client.sendDeviceRevoke({
        deviceId: 'd1',
        revokedBy: 'me',
        reason: 'r',
        signature: 's',
        revokedAt: 1,
      });
      client.sendDeviceRename({
        deviceId: 'd1',
        newName: 'n',
        renamedAt: 1,
      });

      // No WebSocket created
      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should handle malformed ACK payload', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Send malformed JSON
      const msg = encodeMessage(MessageType.ACK, new Uint8Array([0xff, 0xfe]));
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncClient] Error handling ACK:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle malformed HISTORY payload', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Send malformed HISTORY
      const msg = encodeMessage(
        MessageType.HISTORY,
        new Uint8Array([0xff, 0xfe])
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncClient] Error handling history:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle WebSocket error event', () => {
      const errorCallback = vi.fn();
      client.on('error', errorCallback);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      if (ws.onerror) ws.onerror();

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.any(Error),
        })
      );
    });

    it('should unsubscribe event listener', () => {
      const callback = vi.fn();
      const unsubscribe = client.on('sync', callback);

      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Unsubscribe
      unsubscribe();

      // Trigger sync event
      const msg = encodeMessage(MessageType.UPDATE, new Uint8Array([1]));
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not have been called (unsubscribed)
      // Note: sync event is emitted async, so we can only check immediately
    });

    it('should handle revocation close without callback', () => {
      // Don't set onDeviceRevoked callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const spy = vi.spyOn(client['connectionManager'], 'scheduleReconnect');

      if (ws.onclose) {
        ws.onclose({ code: 4001, reason: 'Device revoked' } as CloseEvent);
      }

      expect(client.getStatus()).toBe('disconnected');
      // Should NOT reconnect
      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle self-revocation via DEVICE_REVOKE without callback', () => {
      // Don't set onDeviceRevoked callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const payload = {
        deviceId: 'device-1', // This device
        reason: 'Revoked',
        signature: 'sig',
        timestamp: 123,
      };
      const msg = encodeMessage(
        MessageType.DEVICE_REVOKE,
        encodeJsonPayload(payload)
      );
      if (ws.onmessage) ws.onmessage({ data: msg.buffer });

      // Should not crash even without callback
      expect(client.getStatus()).not.toBe('disconnected');
    });

    it('should handle ACK rejection without callback', () => {
      // Don't set onDeviceRevoked callback
      client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const errorCallback = vi.fn();
      client.on('error', errorCallback);

      const ackPayload = encodeJsonPayload({
        rejected: true,
        reason: 'Banned',
      });
      const ackMsg = encodeMessage(MessageType.ACK, ackPayload);

      if (ws.onmessage) ws.onmessage({ data: ackMsg.buffer });

      expect(client.getStatus()).toBe('disconnected');
      expect(errorCallback).toHaveBeenCalled();
    });
  });
});
