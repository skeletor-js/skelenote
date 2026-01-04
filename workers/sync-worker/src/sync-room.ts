import { DurableObject } from 'cloudflare:workers';
import {
  MessageType,
  decodeMessage,
  encodeMessage,
  encodeJsonPayload,
  decodeJsonPayload,
  isValidMessageType,
  type HelloPayload,
  type AckPayload,
  type CatchUpPayload,
  type HistoryHeaderPayload,
  type DeviceRevokePayload,
  type DeviceRevokeAckPayload,
} from './protocol';

/**
 * Session metadata stored with each WebSocket connection
 */
interface SessionData {
  deviceId: string;
  connectedAt: number;
  encrypted: boolean;
  lastSequence: number;
}

/**
 * Stored update record
 */
interface StoredUpdate {
  sequence: number;
  data: ArrayBuffer;
  timestamp: number;
}

/**
 * SyncRoom Durable Object
 *
 * Manages WebSocket connections for a single user's sync room.
 * Stores encrypted updates in SQLite for catch-up and persistence.
 * Uses the hibernation API for cost efficiency.
 */
export class SyncRoom extends DurableObject {
  private sql: SqlStorage;
  private currentSequence: number = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.initializeDatabase();
  }

  /**
   * Initialize SQLite schema
   */
  private initializeDatabase(): void {
    try {
      // Create updates table for append-only log
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS updates (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          data BLOB NOT NULL,
          timestamp INTEGER NOT NULL,
          is_snapshot INTEGER DEFAULT 0
        )
      `);

      // Create revoked devices table
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS revoked_devices (
          device_id TEXT PRIMARY KEY,
          revoked_at INTEGER NOT NULL,
          revoked_by TEXT NOT NULL,
          reason TEXT,
          signature TEXT NOT NULL
        )
      `);

      // Create device registry updates table (stores encrypted Loro updates)
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS device_registry (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          data BLOB NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `);

      // Get current sequence
      const result = this.sql.exec('SELECT MAX(sequence) as max_seq FROM updates').one();
      this.currentSequence = (result?.max_seq as number) ?? 0;

      console.log(`[SyncRoom] Initialized with sequence ${this.currentSequence}`);
    } catch (err) {
      console.error('[SyncRoom] Database initialization failed:', err);
      this.currentSequence = 0;
    }
  }

  /**
   * Store an encrypted update
   */
  private storeUpdate(data: Uint8Array, isSnapshot: boolean = false): number {
    const timestamp = Date.now();

    this.sql.exec(
      'INSERT INTO updates (data, timestamp, is_snapshot) VALUES (?, ?, ?)',
      data,
      timestamp,
      isSnapshot ? 1 : 0
    );

    this.currentSequence++;
    return this.currentSequence;
  }

  /**
   * Get updates after a given sequence
   */
  private getUpdatesAfter(sequence: number, limit: number = 100): StoredUpdate[] {
    const results = this.sql.exec(
      `SELECT sequence, data, timestamp FROM updates
       WHERE sequence > ?
       ORDER BY sequence ASC
       LIMIT ?`,
      sequence,
      limit
    ).toArray();

    return results.map((row) => ({
      sequence: row.sequence as number,
      data: row.data as ArrayBuffer,
      timestamp: row.timestamp as number,
    }));
  }

  /**
   * Compact updates up to a sequence (replace with snapshot)
   */
  private compactUpdates(upToSequence: number, snapshot: Uint8Array): void {
    // Delete old updates (keep snapshots as markers)
    this.sql.exec(
      'DELETE FROM updates WHERE sequence <= ?',
      upToSequence
    );

    // Store the compacted snapshot
    this.storeUpdate(snapshot, true);

    console.log(`[SyncRoom] Compacted updates up to sequence ${upToSequence}`);
  }

  /**
   * Clear all stored updates (for data reset)
   */
  private clearAllUpdates(): void {
    this.sql.exec('DELETE FROM updates');
    this.currentSequence = 0;
    console.log('[SyncRoom] All updates cleared');
  }

  /**
   * Check if a device has been revoked
   */
  private isDeviceRevoked(deviceId: string): boolean {
    const result = this.sql.exec(
      'SELECT 1 FROM revoked_devices WHERE device_id = ?',
      deviceId
    ).one();
    return result !== null;
  }

  /**
   * Store a device revocation
   */
  private storeRevocation(revocation: DeviceRevokePayload): void {
    this.sql.exec(
      `INSERT OR REPLACE INTO revoked_devices (device_id, revoked_at, revoked_by, reason, signature)
       VALUES (?, ?, ?, ?, ?)`,
      revocation.deviceId,
      revocation.revokedAt,
      revocation.revokedBy,
      revocation.reason ?? null,
      revocation.signature
    );
    console.log(`[SyncRoom] Stored revocation for device ${revocation.deviceId}`);
  }

  /**
   * Get all revoked device IDs
   */
  private getRevokedDevices(): string[] {
    const results = this.sql.exec('SELECT device_id FROM revoked_devices').toArray();
    return results.map((row) => row.device_id as string);
  }

  /**
   * Store a device registry update (Loro update bytes)
   */
  private storeDeviceRegistryUpdate(data: Uint8Array): number {
    const timestamp = Date.now();
    this.sql.exec(
      'INSERT INTO device_registry (data, timestamp) VALUES (?, ?)',
      data,
      timestamp
    );
    const result = this.sql.exec('SELECT last_insert_rowid() as seq').one();
    return (result?.seq as number) ?? 0;
  }

  /**
   * Get device registry updates after a given sequence
   */
  private getDeviceRegistryUpdatesAfter(sequence: number, limit: number = 100): { sequence: number; data: ArrayBuffer }[] {
    const results = this.sql.exec(
      `SELECT sequence, data FROM device_registry
       WHERE sequence > ?
       ORDER BY sequence ASC
       LIMIT ?`,
      sequence,
      limit
    ).toArray();
    return results.map((row) => ({
      sequence: row.sequence as number,
      data: row.data as ArrayBuffer,
    }));
  }

  /**
   * Handle incoming HTTP requests (including WebSocket upgrades)
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle reset endpoint
    if (url.pathname.endsWith('/reset') && request.method === 'DELETE') {
      this.clearAllUpdates();
      return new Response(JSON.stringify({ success: true, message: 'All updates cleared' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create a WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection using hibernation API
    this.ctx.acceptWebSocket(server);

    console.log(
      `[SyncRoom] WebSocket connected. Total connections: ${this.ctx.getWebSockets().length}`
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Handle incoming WebSocket messages
   * Called by the hibernation API when a message is received
   */
  async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string
  ): Promise<void> {
    // Convert string messages to ArrayBuffer
    let data: ArrayBuffer;
    if (typeof message === 'string') {
      data = new TextEncoder().encode(message).buffer;
    } else {
      data = message;
    }

    // Check minimum message size (1 byte type + 4 bytes length)
    if (data.byteLength < 5) {
      console.warn('[SyncRoom] Message too short, ignoring');
      return;
    }

    try {
      const { type, payload } = decodeMessage(data);

      if (!isValidMessageType(type)) {
        console.warn(`[SyncRoom] Unknown message type: ${type}`);
        return;
      }

      switch (type) {
        case MessageType.HELLO:
          await this.handleHello(ws, payload);
          break;

        case MessageType.UPDATE:
          await this.handleUpdate(ws, payload);
          break;

        case MessageType.SNAPSHOT_REQUEST:
          await this.handleSnapshotRequest(ws);
          break;

        case MessageType.SNAPSHOT:
          await this.handleSnapshot(ws, payload);
          break;

        case MessageType.CATCH_UP:
          await this.handleCatchUp(ws, payload);
          break;

        case MessageType.COMPACT:
          await this.handleCompact(ws, payload);
          break;

        case MessageType.PING:
          this.handlePing(ws);
          break;

        case MessageType.PONG:
          // Ignore pong messages
          break;

        // Device management messages
        case MessageType.DEVICE_REGISTRY:
          await this.handleDeviceRegistry(ws, payload);
          break;

        case MessageType.DEVICE_UPDATE:
          await this.handleDeviceUpdate(ws, payload);
          break;

        case MessageType.DEVICE_REVOKE:
          await this.handleDeviceRevoke(ws, payload);
          break;

        case MessageType.DEVICE_RENAME:
          await this.handleDeviceRename(ws, payload);
          break;

        default:
          console.warn(`[SyncRoom] Unhandled message type: ${type}`);
      }
    } catch (err) {
      console.error('[SyncRoom] Error processing message:', err);
    }
  }

  /**
   * Handle HELLO handshake from client
   */
  private async handleHello(ws: WebSocket, payload: Uint8Array): Promise<void> {
    try {
      const hello = decodeJsonPayload<HelloPayload>(payload);

      // Check if device has been revoked
      if (this.isDeviceRevoked(hello.deviceId)) {
        console.log(`[SyncRoom] Rejecting revoked device: ${hello.deviceId}`);

        // Send rejection ACK
        const rejectAck = {
          sessionCount: 0,
          rejected: true,
          reason: 'Device has been revoked',
        };
        const rejectMessage = encodeMessage(
          MessageType.ACK,
          encodeJsonPayload(rejectAck)
        );
        ws.send(rejectMessage);

        // Close the connection
        ws.close(4001, 'Device revoked');
        return;
      }

      // Store session data with the WebSocket
      const sessionData: SessionData = {
        deviceId: hello.deviceId,
        connectedAt: Date.now(),
        encrypted: hello.encrypted ?? false,
        lastSequence: hello.lastSequence ?? 0,
      };

      try {
        ws.serializeAttachment(sessionData);
      } catch (attachErr) {
        console.error('[SyncRoom] Failed to serialize attachment:', attachErr);
      }

      console.log(
        `[SyncRoom] Device ${hello.deviceId} connected (encrypted: ${hello.encrypted}, lastSeq: ${hello.lastSequence})`
      );

      // Determine if client needs to catch up
      const clientSeq = hello.lastSequence ?? 0;
      const hasHistory = this.currentSequence > clientSeq;

      console.log(`[SyncRoom] Sending ACK: sessionCount=${this.ctx.getWebSockets().length}, currentSequence=${this.currentSequence}, hasHistory=${hasHistory}`);

      // Send ACK response with sequence info
      const ack: AckPayload = {
        sessionCount: this.ctx.getWebSockets().length,
        currentSequence: this.currentSequence,
        hasHistory,
      };
      const ackMessage = encodeMessage(
        MessageType.ACK,
        encodeJsonPayload(ack)
      );
      ws.send(ackMessage);

      console.log('[SyncRoom] ACK sent successfully');
    } catch (err) {
      console.error('[SyncRoom] Error handling HELLO:', err);
    }
  }

  /**
   * Handle UPDATE message - store and broadcast
   */
  private async handleUpdate(
    ws: WebSocket,
    payload: Uint8Array
  ): Promise<void> {
    // Store the update (encrypted or not - server doesn't care)
    const sequence = this.storeUpdate(payload);

    console.log(
      `[SyncRoom] Stored update #${sequence} (${payload.byteLength} bytes)`
    );

    // Broadcast to other clients
    const otherSockets = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== ws);

    const updateMessage = encodeMessage(MessageType.UPDATE, payload);

    for (const socket of otherSockets) {
      try {
        socket.send(updateMessage);
      } catch (err) {
        console.error('[SyncRoom] Failed to send update:', err);
      }
    }
  }

  /**
   * Handle SNAPSHOT_REQUEST - check storage first, then other devices
   */
  private async handleSnapshotRequest(ws: WebSocket): Promise<void> {
    // Check if we have stored updates
    const updates = this.getUpdatesAfter(0, 1);

    if (updates.length > 0) {
      // We have stored data - client should use CATCH_UP instead
      console.log('[SyncRoom] Snapshot request, but stored updates exist. Use CATCH_UP.');
      return;
    }

    // No stored data, request from other device
    const otherSockets = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== ws);

    if (otherSockets.length === 0) {
      console.log('[SyncRoom] No other devices for snapshot');
      return;
    }

    const requestMessage = encodeMessage(
      MessageType.SNAPSHOT_REQUEST,
      new Uint8Array(0)
    );
    otherSockets[0].send(requestMessage);
    console.log('[SyncRoom] Forwarded snapshot request to another device');
  }

  /**
   * Handle SNAPSHOT - store and broadcast
   */
  private async handleSnapshot(
    ws: WebSocket,
    payload: Uint8Array
  ): Promise<void> {
    // Store snapshot
    const sequence = this.storeUpdate(payload, true);

    console.log(
      `[SyncRoom] Stored snapshot #${sequence} (${payload.byteLength} bytes)`
    );

    // Broadcast to other clients
    const otherSockets = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== ws);

    const snapshotMessage = encodeMessage(MessageType.SNAPSHOT, payload);

    for (const socket of otherSockets) {
      try {
        socket.send(snapshotMessage);
      } catch (err) {
        console.error('[SyncRoom] Failed to send snapshot:', err);
      }
    }
  }

  /**
   * Handle CATCH_UP - send historical updates
   */
  private async handleCatchUp(ws: WebSocket, payload: Uint8Array): Promise<void> {
    try {
      const { fromSequence } = decodeJsonPayload<CatchUpPayload>(payload);

      console.log(`[SyncRoom] CATCH_UP request from sequence ${fromSequence}`);

      const updates = this.getUpdatesAfter(fromSequence);

      if (updates.length === 0) {
        console.log(`[SyncRoom] No updates to catch up from sequence ${fromSequence}`);
        return;
      }

      console.log(
        `[SyncRoom] Sending ${updates.length} historical updates from #${fromSequence}`
      );

      // Build history response
      const header: HistoryHeaderPayload = {
        count: updates.length,
        fromSequence: updates[0].sequence,
        toSequence: updates[updates.length - 1].sequence,
      };

      const headerBytes = encodeJsonPayload(header);

      // Calculate total size
      let totalSize = 4 + headerBytes.length;
      for (const update of updates) {
        totalSize += 4 + update.data.byteLength;
      }

      // Build response
      const response = new Uint8Array(totalSize);
      let offset = 0;

      // Header length + header
      new DataView(response.buffer).setUint32(offset, headerBytes.length, true);
      offset += 4;
      response.set(headerBytes, offset);
      offset += headerBytes.length;

      // Updates
      for (const update of updates) {
        const updateData = new Uint8Array(update.data);
        new DataView(response.buffer).setUint32(offset, updateData.length, true);
        offset += 4;
        response.set(updateData, offset);
        offset += updateData.length;
      }

      const message = encodeMessage(MessageType.HISTORY, response);
      ws.send(message);
      console.log('[SyncRoom] HISTORY response sent');
    } catch (err) {
      console.error('[SyncRoom] Error handling CATCH_UP:', err);
    }
  }

  /**
   * Handle COMPACT - replace old updates with snapshot
   */
  private async handleCompact(ws: WebSocket, payload: Uint8Array): Promise<void> {
    try {
      // Parse header
      const headerLen = new DataView(payload.buffer, payload.byteOffset).getUint32(0, true);
      const headerBytes = payload.slice(4, 4 + headerLen);
      const { upToSequence } = decodeJsonPayload<{ upToSequence: number }>(headerBytes);

      const snapshot = payload.slice(4 + headerLen);

      console.log(`[SyncRoom] Compacting updates up to #${upToSequence}`);

      this.compactUpdates(upToSequence, snapshot);
    } catch (err) {
      console.error('[SyncRoom] Error handling COMPACT:', err);
    }
  }

  /**
   * Handle PING - respond with PONG
   */
  private handlePing(ws: WebSocket): void {
    const pongMessage = encodeMessage(MessageType.PONG, new Uint8Array(0));
    ws.send(pongMessage);
  }

  /**
   * Handle DEVICE_REGISTRY - full device registry sync (Loro snapshot)
   * Store and broadcast to other devices
   */
  private async handleDeviceRegistry(ws: WebSocket, payload: Uint8Array): Promise<void> {
    console.log(`[SyncRoom] Received DEVICE_REGISTRY (${payload.byteLength} bytes)`);

    // Store the registry update
    const seq = this.storeDeviceRegistryUpdate(payload);
    console.log(`[SyncRoom] Stored device registry #${seq}`);

    // Broadcast to other connected devices
    const otherSockets = this.ctx.getWebSockets().filter((s) => s !== ws);
    const message = encodeMessage(MessageType.DEVICE_REGISTRY, payload);

    for (const socket of otherSockets) {
      try {
        socket.send(message);
      } catch (err) {
        console.error('[SyncRoom] Failed to broadcast device registry:', err);
      }
    }
  }

  /**
   * Handle DEVICE_UPDATE - incremental device registry update
   * Store and broadcast to other devices
   */
  private async handleDeviceUpdate(ws: WebSocket, payload: Uint8Array): Promise<void> {
    console.log(`[SyncRoom] Received DEVICE_UPDATE (${payload.byteLength} bytes)`);

    // Store the update
    const seq = this.storeDeviceRegistryUpdate(payload);
    console.log(`[SyncRoom] Stored device update #${seq}`);

    // Broadcast to other connected devices
    const otherSockets = this.ctx.getWebSockets().filter((s) => s !== ws);
    const message = encodeMessage(MessageType.DEVICE_UPDATE, payload);

    for (const socket of otherSockets) {
      try {
        socket.send(message);
      } catch (err) {
        console.error('[SyncRoom] Failed to broadcast device update:', err);
      }
    }
  }

  /**
   * Handle DEVICE_REVOKE - device revocation with Ed25519 signature
   * Store in revocations table, broadcast, and disconnect revoked device
   */
  private async handleDeviceRevoke(ws: WebSocket, payload: Uint8Array): Promise<void> {
    try {
      const revocation = decodeJsonPayload<DeviceRevokePayload>(payload);

      console.log(`[SyncRoom] Received DEVICE_REVOKE for ${revocation.deviceId} from ${revocation.revokedBy}`);

      // Note: Signature verification should happen client-side since server
      // doesn't have access to the public signing keys (E2EE). The server
      // just stores and relays the revocation. Clients verify the signature.

      // Store the revocation
      this.storeRevocation(revocation);

      // Send acknowledgment to the sender
      const ack: DeviceRevokeAckPayload = {
        deviceId: revocation.deviceId,
        accepted: true,
      };
      const ackMessage = encodeMessage(
        MessageType.DEVICE_REVOKE_ACK,
        encodeJsonPayload(ack)
      );
      ws.send(ackMessage);

      // Broadcast revocation to all OTHER devices
      const otherSockets = this.ctx.getWebSockets().filter((s) => s !== ws);
      const revokeMessage = encodeMessage(MessageType.DEVICE_REVOKE, payload);

      for (const socket of otherSockets) {
        try {
          // Check if this is the revoked device
          const sessionData = socket.deserializeAttachment() as SessionData | null;
          if (sessionData?.deviceId === revocation.deviceId) {
            // This is the revoked device - send revocation then close
            socket.send(revokeMessage);
            socket.close(4001, 'Device has been revoked');
            console.log(`[SyncRoom] Disconnected revoked device: ${revocation.deviceId}`);
          } else {
            // Regular device - just forward the revocation
            socket.send(revokeMessage);
          }
        } catch (err) {
          console.error('[SyncRoom] Failed to send revocation:', err);
        }
      }
    } catch (err) {
      console.error('[SyncRoom] Error handling DEVICE_REVOKE:', err);

      // Send error acknowledgment
      const errorAck: DeviceRevokeAckPayload = {
        deviceId: 'unknown',
        accepted: false,
        error: 'Failed to process revocation',
      };
      const errorMessage = encodeMessage(
        MessageType.DEVICE_REVOKE_ACK,
        encodeJsonPayload(errorAck)
      );
      ws.send(errorMessage);
    }
  }

  /**
   * Handle DEVICE_RENAME - device rename request
   * Broadcast to other devices (client-side CRDT handles the actual update)
   */
  private async handleDeviceRename(ws: WebSocket, payload: Uint8Array): Promise<void> {
    console.log(`[SyncRoom] Received DEVICE_RENAME (${payload.byteLength} bytes)`);

    // Just broadcast to other devices - the rename is handled in the CRDT
    const otherSockets = this.ctx.getWebSockets().filter((s) => s !== ws);
    const message = encodeMessage(MessageType.DEVICE_RENAME, payload);

    for (const socket of otherSockets) {
      try {
        socket.send(message);
      } catch (err) {
        console.error('[SyncRoom] Failed to broadcast device rename:', err);
      }
    }
  }

  /**
   * Handle WebSocket close events
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _wasClean: boolean
  ): Promise<void> {
    // Try to get session data for logging
    let deviceId = 'unknown';
    try {
      const sessionData = ws.deserializeAttachment() as SessionData | null;
      if (sessionData?.deviceId) {
        deviceId = sessionData.deviceId;
      }
    } catch {
      // Ignore deserialization errors
    }

    console.log(
      `[SyncRoom] Device ${deviceId} disconnected. Code: ${code}, Reason: ${reason}. Remaining: ${this.ctx.getWebSockets().length}`
    );
  }

  /**
   * Handle WebSocket errors
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[SyncRoom] WebSocket error:', error);
  }
}
