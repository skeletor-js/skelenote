/**
 * @vitest-environment jsdom
 *
 * End-to-End Sync Flow Integration Tests (P0)
 *
 * Tests the complete sync pipeline:
 * 1. Create object in Store A
 * 2. Export CRDT update
 * 3. Encrypt for transmission
 * 4. Send via WebSocket (mocked)
 * 5. Receive on Store B
 * 6. Decrypt
 * 7. Import/merge via CRDT
 *
 * Uses two simulated clients with a mock relay server.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { PersistentOfflineQueue } from '../persistent-queue';
import { LoroDocStore } from '../../loro/store';
import { SyncClient } from '../client';
import {
  MessageType,
  encodeMessage,
  decodeMessage,
  encodeJsonPayload,
} from '../protocol';

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

// Mock crypto (pass-through for testing without encryption)
vi.mock('../../crypto', () => ({
  encrypt: vi.fn(async (data: Uint8Array) => data),
  decrypt: vi.fn(async (data: Uint8Array) => data),
  hasKey: vi.fn().mockResolvedValue(true),
}));

// Mock WebSocket for realistic simulation
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static server: MockRelayServer | null = null;

  url: string;
  readyState: number = 0;
  binaryType: string = 'arraybuffer';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  onclose:
    | ((event: { code: number; reason: string; wasClean: boolean }) => void)
    | null = null;
  onerror: ((error: any) => void) | null = null;
  clientId: string;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    this.clientId = `client-${MockWebSocket.instances.length}`;
    MockWebSocket.instances.push(this);

    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
      MockWebSocket.server?.onClientConnect(this);
    }, 10);
  }

  send(data: ArrayBuffer | Uint8Array) {
    if (this.readyState !== MockWebSocket.OPEN) return;
    const buffer =
      data instanceof Uint8Array
        ? (data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength
          ) as ArrayBuffer)
        : data;
    MockWebSocket.server?.onMessage(this, buffer);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose)
      this.onclose({ code: 1000, reason: 'Normal', wasClean: true });
    MockWebSocket.server?.onClientDisconnect(this);
  }

  receive(data: ArrayBuffer) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  // Helper to simulate ACK message
  simulateAck() {
    const ackPayload = encodeJsonPayload({
      currentSequence: 0,
      hasHistory: false,
    });
    const ackMsg = encodeMessage(MessageType.ACK, ackPayload);
    this.receive(ackMsg.buffer as ArrayBuffer);
  }
}

// Mock relay server that broadcasts messages between clients
class MockRelayServer {
  clients: Set<MockWebSocket> = new Set();
  messageHistory: Uint8Array[] = [];
  private clientSequences: Map<string, number> = new Map();

  constructor() {
    MockWebSocket.server = this;
  }

  onClientConnect(client: MockWebSocket) {
    this.clients.add(client);
    this.clientSequences.set(client.clientId, 0);

    // Send ACK with current sequence
    const ackPayload = encodeJsonPayload({
      currentSequence: this.messageHistory.length,
      hasHistory: this.messageHistory.length > 0,
    });
    const ackMsg = encodeMessage(MessageType.ACK, ackPayload);
    client.receive(ackMsg.buffer as ArrayBuffer);

    // Send history if any (as UPDATE messages for simplicity in tests)
    for (const update of this.messageHistory) {
      const updateMsg = encodeMessage(MessageType.UPDATE, update);
      client.receive(updateMsg.buffer as ArrayBuffer);
    }
  }

  onClientDisconnect(client: MockWebSocket) {
    this.clients.delete(client);
    this.clientSequences.delete(client.clientId);
  }

  onMessage(sender: MockWebSocket, data: ArrayBuffer) {
    const { type, payload } = decodeMessage(data);

    if (type === MessageType.HELLO) {
      // Already handled in onClientConnect
      return;
    }

    if (type === MessageType.UPDATE) {
      // Store in history
      this.messageHistory.push(payload);

      // Broadcast to all OTHER clients
      const broadcastMsg = encodeMessage(MessageType.UPDATE, payload);
      for (const client of this.clients) {
        if (client !== sender) {
          client.receive(broadcastMsg.buffer as ArrayBuffer);
        }
      }
    }

    if (type === MessageType.PING) {
      const pongMsg = encodeMessage(MessageType.PONG, new Uint8Array(0));
      sender.receive(pongMsg.buffer as ArrayBuffer);
    }
  }

  reset() {
    this.clients.clear();
    this.messageHistory = [];
    this.clientSequences.clear();
  }
}

describe('End-to-End Sync Integration', () => {
  let server: MockRelayServer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    memoryFs = new Map();
    MockWebSocket.instances = [];
    server = new MockRelayServer();
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(async () => {
    vi.useRealTimers();
    server.reset();
    MockWebSocket.instances = [];
    // Clean up IndexedDB
    await PersistentOfflineQueue.deleteDatabase();
  });

  describe('two-client sync', () => {
    it('syncs object creation between clients', async () => {
      // 1. Create two LoroDocStore instances
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');

      // 2. Create two SyncClient instances
      // Temporarily use real timers for IndexedDB initialization
      vi.useRealTimers();
      const clientA = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-a',
        userId: 'user-1',
      });
      await clientA.waitForReady();

      const clientB = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-b',
        userId: 'user-1',
      });
      await clientB.waitForReady();
      // Re-enable fake timers for WebSocket simulation
      vi.useFakeTimers();

      // Wire up update handlers
      clientB.onUpdate((update) => {
        // Import the update into docB
        try {
          // Try to parse as JSON-wrapped snapshot
          const str = new TextDecoder().decode(update);
          if (str.startsWith('{')) {
            const parsed = JSON.parse(str) as Record<string, number[]>;
            for (const [, bytes] of Object.entries(parsed)) {
              docB.import(new Uint8Array(bytes));
            }
          } else {
            docB.import(update);
          }
        } catch {
          // Raw update
          docB.import(update);
        }
      });

      // Connect both clients
      clientA.connect();
      clientB.connect();

      // Wait for connections
      await vi.advanceTimersByTimeAsync(100);

      expect(clientA.getStatus()).toBe('connected');
      expect(clientB.getStatus()).toBe('connected');

      // 3. Client A creates object
      const objectsMapA = docA.getMap('objects');
      objectsMapA.set(
        'task-1',
        JSON.stringify({
          id: 'task-1',
          typeId: 'task',
          properties: { title: 'Sync Test Task', status: 'todo' },
        })
      );
      docA.commit();

      // 4. Export and send update
      const update = docA.export({ mode: 'snapshot' });
      const wrappedUpdate = JSON.stringify({
        main: Array.from(update),
      });
      await clientA.sendUpdate(new TextEncoder().encode(wrappedUpdate));

      // Wait for message propagation
      await vi.advanceTimersByTimeAsync(100);

      // 5. Verify Client B has object with correct data
      const objectsMapB = docB.getMap('objects');
      const taskB = objectsMapB.get('task-1');

      expect(taskB).toBeDefined();
      const parsed = JSON.parse(taskB as string);
      expect(parsed.id).toBe('task-1');
      expect(parsed.properties.title).toBe('Sync Test Task');
      expect(parsed.properties.status).toBe('todo');

      // Cleanup
      clientA.disconnect();
      clientB.disconnect();
    });

    it('merges concurrent edits from both clients', async () => {
      // Setup stores and initial shared state
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');

      // Create initial object in both
      const initialObj = {
        id: 'shared-obj',
        typeId: 'task',
        properties: { title: 'Original', status: 'todo', priority: 'none' },
      };

      docA.getMap('objects').set('shared-obj', JSON.stringify(initialObj));
      docA.commit();

      // Sync initial state to B
      const initialSnapshot = docA.export({ mode: 'snapshot' });
      docB.import(initialSnapshot);

      // Setup clients with mutual update handlers
      const clientA = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-a',
        userId: 'user-1',
      });

      const clientB = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-b',
        userId: 'user-1',
      });

      clientA.onUpdate((update) => {
        try {
          const str = new TextDecoder().decode(update);
          if (str.startsWith('{')) {
            const parsed = JSON.parse(str) as Record<string, number[]>;
            for (const [, bytes] of Object.entries(parsed)) {
              docA.import(new Uint8Array(bytes));
            }
          }
        } catch {
          docA.import(update);
        }
      });

      clientB.onUpdate((update) => {
        try {
          const str = new TextDecoder().decode(update);
          if (str.startsWith('{')) {
            const parsed = JSON.parse(str) as Record<string, number[]>;
            for (const [, bytes] of Object.entries(parsed)) {
              docB.import(new Uint8Array(bytes));
            }
          }
        } catch {
          docB.import(update);
        }
      });

      clientA.connect();
      clientB.connect();
      await vi.advanceTimersByTimeAsync(100);

      // Client A modifies title
      const objA = JSON.parse(
        docA.getMap('objects').get('shared-obj') as string
      );
      objA.properties.title = 'Modified by A';
      docA.getMap('objects').set('shared-obj', JSON.stringify(objA));
      docA.commit();

      // Client B modifies status (concurrently)
      const objB = JSON.parse(
        docB.getMap('objects').get('shared-obj') as string
      );
      objB.properties.status = 'done';
      docB.getMap('objects').set('shared-obj', JSON.stringify(objB));
      docB.commit();

      // Both send updates
      const updateA = docA.export({ mode: 'snapshot' });
      const updateB = docB.export({ mode: 'snapshot' });

      await clientA.sendUpdate(
        new TextEncoder().encode(JSON.stringify({ main: Array.from(updateA) }))
      );
      await clientB.sendUpdate(
        new TextEncoder().encode(JSON.stringify({ main: Array.from(updateB) }))
      );

      await vi.advanceTimersByTimeAsync(200);

      // Both clients should converge to same state
      const finalA = JSON.parse(
        docA.getMap('objects').get('shared-obj') as string
      );
      const finalB = JSON.parse(
        docB.getMap('objects').get('shared-obj') as string
      );

      expect(finalA).toEqual(finalB);

      clientA.disconnect();
      clientB.disconnect();
    });

    it('handles conflicting edits to same field', async () => {
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');

      // Initial state
      docA
        .getMap('objects')
        .set(
          'conflict-test',
          JSON.stringify({ id: 'conflict-test', title: 'Original' })
        );
      docA.commit();
      docB.import(docA.export({ mode: 'snapshot' }));

      // Both modify same field
      const objA = JSON.parse(
        docA.getMap('objects').get('conflict-test') as string
      );
      objA.title = 'Value from A';
      docA.getMap('objects').set('conflict-test', JSON.stringify(objA));
      docA.commit();

      const objB = JSON.parse(
        docB.getMap('objects').get('conflict-test') as string
      );
      objB.title = 'Value from B';
      docB.getMap('objects').set('conflict-test', JSON.stringify(objB));
      docB.commit();

      // Merge
      const updateA = docA.export({ mode: 'update', from: docB.version() });
      const updateB = docB.export({ mode: 'update', from: docA.version() });

      docA.import(updateB);
      docB.import(updateA);

      // Both converge to same value (deterministic winner)
      const resultA = JSON.parse(
        docA.getMap('objects').get('conflict-test') as string
      );
      const resultB = JSON.parse(
        docB.getMap('objects').get('conflict-test') as string
      );

      expect(resultA.title).toBe(resultB.title);
    });
  });

  describe('offline/online transition', () => {
    it('catches up after extended offline period', async () => {
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');

      const clientA = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-a',
        userId: 'user-1',
      });

      // Only A connects initially
      clientA.connect();
      await vi.advanceTimersByTimeAsync(100);

      // A makes 50 changes while B is offline
      for (let i = 0; i < 50; i++) {
        docA
          .getMap('objects')
          .set(`obj-${i}`, JSON.stringify({ id: `obj-${i}`, index: i }));
        docA.commit();

        const update = docA.export({ mode: 'snapshot' });
        await clientA.sendUpdate(
          new TextEncoder().encode(JSON.stringify({ main: Array.from(update) }))
        );
      }

      await vi.advanceTimersByTimeAsync(100);

      // Verify server has history
      expect(server.messageHistory.length).toBe(50);

      // B comes online
      const clientB = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-b',
        userId: 'user-1',
      });

      let historyReceived = 0;

      // Wire up update handler which processes HISTORY messages relayed as UPDATE
      clientB.onUpdate((update) => {
        historyReceived++;
        try {
          const str = new TextDecoder().decode(update);
          if (str.startsWith('{')) {
            const parsed = JSON.parse(str) as Record<string, number[]>;
            for (const [, bytes] of Object.entries(parsed)) {
              docB.import(new Uint8Array(bytes));
            }
          }
        } catch {
          docB.import(update);
        }
      });

      clientB.connect();
      await vi.advanceTimersByTimeAsync(100);

      // The mock server sends HISTORY messages on connect, which clientB handles
      // Wait for all history to be processed
      await vi.advanceTimersByTimeAsync(200);

      // B should have received all 50 changes
      expect(historyReceived).toBeGreaterThanOrEqual(50);

      // Verify B has all objects
      const objectsB = docB.getMap('objects');
      const entries = objectsB.toJSON() as Record<string, string>;
      expect(Object.keys(entries).length).toBe(50);

      for (let i = 0; i < 50; i++) {
        const obj = JSON.parse(entries[`obj-${i}`]);
        expect(obj.index).toBe(i);
      }

      clientA.disconnect();
      clientB.disconnect();
    });

    it('queues local changes while offline and syncs when reconnected', async () => {
      // Switch to real timers for SyncClient initialization and IndexedDB
      vi.useRealTimers();

      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const clientA = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-a',
        userId: 'user-1',
      });
      await clientA.waitForReady();

      // Queue changes before connecting
      docA
        .getMap('objects')
        .set('offline-obj-1', JSON.stringify({ id: 'offline-obj-1' }));
      docA
        .getMap('objects')
        .set('offline-obj-2', JSON.stringify({ id: 'offline-obj-2' }));
      docA.commit();

      const update = docA.export({ mode: 'snapshot' });
      await clientA.sendUpdate(
        new TextEncoder().encode(JSON.stringify({ main: Array.from(update) }))
      );

      // Should be queued (client not connected)
      expect(clientA.getPendingCount()).toBe(1);

      // Connect (using real timers)
      clientA.connect();
      // Wait for WebSocket to open
      await new Promise((r) => setTimeout(r, 50));

      // Wait for queue to be flushed after ACK
      await vi.waitFor(() => {
        expect(clientA.getPendingCount()).toBe(0);
      });

      expect(server.messageHistory.length).toBe(1);

      clientA.disconnect();

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  describe('content sync', () => {
    it('syncs rich text content changes', async () => {
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');

      // Create object with content
      docA.getMap('objects').set(
        'note-1',
        JSON.stringify({
          id: 'note-1',
          typeId: 'note',
          hasContent: true,
        })
      );
      docA.getText('content:note-1').insert(0, 'Hello from A');
      docA.commit();

      // Sync to B
      const snapshot = docA.export({ mode: 'snapshot' });
      docB.import(snapshot);

      // Verify B has content
      expect(docB.getText('content:note-1').toString()).toBe('Hello from A');

      // B adds to content
      docB.getText('content:note-1').insert(12, ' - and from B!');
      docB.commit();

      // Sync back to A
      const updateB = docB.export({ mode: 'update', from: docA.version() });
      docA.import(updateB);

      // Both should have merged content
      expect(docA.getText('content:note-1').toString()).toBe(
        'Hello from A - and from B!'
      );
    });

    it('handles concurrent content edits', async () => {
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const storeB = new LoroDocStore();
      await storeB.initialize();
      const docB = storeB.createDocument('main');

      // Setup initial content
      docA.getText('content:doc-1').insert(0, 'The quick brown fox');
      docA.commit();
      docB.import(docA.export({ mode: 'snapshot' }));

      // A inserts at position 4
      docA.getText('content:doc-1').insert(4, ' very');
      docA.commit();

      // B appends at end
      docB.getText('content:doc-1').insert(19, ' jumps');
      docB.commit();

      // Merge
      const updateA = docA.export({ mode: 'update', from: docB.version() });
      const updateB = docB.export({ mode: 'update', from: docA.version() });

      docA.import(updateB);
      docB.import(updateA);

      // Both should have same merged content
      expect(docA.getText('content:doc-1').toString()).toBe(
        docB.getText('content:doc-1').toString()
      );

      // Content should contain all insertions
      const content = docA.getText('content:doc-1').toString();
      expect(content).toContain('very');
      expect(content).toContain('jumps');
      expect(content).toContain('quick');
      expect(content).toContain('brown');
      expect(content).toContain('fox');
    });
  });

  describe('error handling', () => {
    it('handles malformed update gracefully', async () => {
      const storeA = new LoroDocStore();
      await storeA.initialize();
      const docA = storeA.createDocument('main');

      const clientA = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-a',
        userId: 'user-1',
      });

      clientA.onUpdate((update) => {
        try {
          docA.import(update);
        } catch {
          // Ignore malformed updates
        }
      });

      clientA.connect();
      await vi.advanceTimersByTimeAsync(100);

      // Simulate receiving malformed data
      const ws = MockWebSocket.instances[0];
      const malformedMsg = encodeMessage(
        MessageType.UPDATE,
        new Uint8Array([0, 1, 2, 3])
      );

      // Should not crash
      ws.receive(malformedMsg.buffer as ArrayBuffer);
      await vi.advanceTimersByTimeAsync(100);

      // Client should still be functional
      expect(clientA.getStatus()).toBe('connected');

      clientA.disconnect();
    });

    it('handles server disconnect gracefully', async () => {
      const clientA = new SyncClient({
        serverUrl: 'ws://localhost:1234',
        deviceId: 'device-a',
        userId: 'user-1',
      });

      const statusChanges: string[] = [];
      clientA.on('statusChange', (e) => {
        if (e.status) statusChanges.push(e.status);
      });

      clientA.connect();
      await vi.advanceTimersByTimeAsync(100);

      // Simulate ACK
      MockWebSocket.instances[0].simulateAck();
      await vi.advanceTimersByTimeAsync(50);

      expect(clientA.getStatus()).toBe('connected');

      // Simulate server disconnect
      const ws = MockWebSocket.instances[0];
      ws.close();

      expect(clientA.getStatus()).toBe('disconnected');
      expect(statusChanges).toContain('connected');
      expect(statusChanges).toContain('disconnected');

      clientA.disconnect();
    });
  });
});
