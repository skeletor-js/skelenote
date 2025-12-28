/**
 * Sync Client
 *
 * Main class for managing WebSocket sync connections.
 * Handles connection lifecycle, message sending/receiving,
 * offline queuing, automatic reconnection, and E2E encryption.
 */

import { OfflineQueue } from './queue';
import { ConnectionManager } from './connection';
import {
  MessageType,
  encodeMessage,
  decodeMessage,
  encodeJsonPayload,
  decodeJsonPayload,
  isValidMessageType,
  type HelloPayload,
  type AckPayload,
  type CatchUpPayload,
  type HistoryHeaderPayload,
} from './protocol';
import type {
  ConnectionStatus,
  SyncConfig,
  SyncEventType,
  SyncEvent,
  SyncEventCallback,
} from './types';
import { encrypt, decrypt, hasKey } from '../crypto';

const PROTOCOL_VERSION = 1;
const PING_INTERVAL = 30000; // 30 seconds

export class SyncClient {
  private ws: WebSocket | null = null;
  private queue: OfflineQueue;
  private connectionManager: ConnectionManager;
  private config: SyncConfig;
  private status: ConnectionStatus = 'disconnected';
  private listeners: Map<SyncEventType, Set<SyncEventCallback>> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onUpdateCallback: ((data: Uint8Array) => void) | null = null;
  private onSnapshotRequestCallback: (() => Uint8Array | null) | null = null;
  private onHistoryCallback: ((updates: Uint8Array[]) => void) | null = null;

  // E2E encryption state
  private encryptionEnabled = false;
  private lastSequence = 0;

  constructor(config: SyncConfig) {
    this.config = config;
    this.queue = new OfflineQueue();
    this.connectionManager = new ConnectionManager();
  }

  /**
   * Enable encryption mode
   *
   * Checks if a Skeleton Key exists and enables encryption if so.
   * Must be called before connect() for encrypted sync.
   *
   * @returns true if encryption is enabled
   */
  async enableEncryption(): Promise<boolean> {
    try {
      this.encryptionEnabled = await hasKey();
      console.log(`[SyncClient] Encryption ${this.encryptionEnabled ? 'enabled' : 'disabled'}`);
      return this.encryptionEnabled;
    } catch (err) {
      console.error('[SyncClient] Failed to check encryption key:', err);
      this.encryptionEnabled = false;
      return false;
    }
  }

  /**
   * Check if encryption is currently enabled
   */
  isEncryptionEnabled(): boolean {
    return this.encryptionEnabled;
  }

  /**
   * Get the last known sequence number
   */
  getLastSequence(): number {
    return this.lastSequence;
  }

  /**
   * Connect to the sync server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');
    const url = `${this.config.serverUrl}/sync/${this.config.userId}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = () => this.handleError();
    } catch (err) {
      this.setStatus('disconnected');
      this.emit({ type: 'error', error: new Error('Failed to create WebSocket') });
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the sync server
   */
  disconnect(): void {
    this.connectionManager.cancelReconnect();
    this.stopPing();

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnection on intentional close
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Send a Loro update to other connected devices
   *
   * If encryption is enabled, the update is encrypted before sending.
   */
  async sendUpdate(update: Uint8Array): Promise<void> {
    let payload = update;

    // Encrypt if encryption is enabled
    if (this.encryptionEnabled) {
      try {
        payload = await encrypt(update);
      } catch (err) {
        console.error('[SyncClient] Encryption failed:', err);
        this.emit({ type: 'error', error: new Error('Encryption failed') });
        return;
      }
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = encodeMessage(MessageType.UPDATE, payload);
      this.ws.send(message);
    } else {
      // Queue the (possibly encrypted) update for when we reconnect
      this.queue.enqueue(payload);
    }
  }

  /**
   * Request a full snapshot from another connected device
   */
  requestSnapshot(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = encodeMessage(MessageType.SNAPSHOT_REQUEST, new Uint8Array(0));
      this.ws.send(message);
    }
  }

  /**
   * Send a full snapshot to other connected devices
   *
   * If encryption is enabled, the snapshot is encrypted before sending.
   */
  async sendSnapshot(snapshot: Uint8Array): Promise<void> {
    let payload = snapshot;

    if (this.encryptionEnabled) {
      try {
        payload = await encrypt(snapshot);
      } catch (err) {
        console.error('[SyncClient] Snapshot encryption failed:', err);
        this.emit({ type: 'error', error: new Error('Encryption failed') });
        return;
      }
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = encodeMessage(MessageType.SNAPSHOT, payload);
      this.ws.send(message);
    }
  }

  /**
   * Request historical updates from server (for catch-up)
   */
  requestCatchUp(fromSequence: number): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const payload: CatchUpPayload = { fromSequence };
    const message = encodeMessage(MessageType.CATCH_UP, encodeJsonPayload(payload));
    this.ws.send(message);
    console.log(`[SyncClient] Requesting catch-up from sequence ${fromSequence}`);
  }

  /**
   * Request server-side compaction
   *
   * Sends an encrypted snapshot to replace historical updates.
   */
  async requestCompaction(upToSequence: number, snapshot: Uint8Array): Promise<void> {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    let encryptedSnapshot = snapshot;
    if (this.encryptionEnabled) {
      try {
        encryptedSnapshot = await encrypt(snapshot);
      } catch (err) {
        console.error('[SyncClient] Compaction snapshot encryption failed:', err);
        return;
      }
    }

    // Build COMPACT message: [headerLen: 4][header JSON][snapshot bytes]
    const header = encodeJsonPayload({ upToSequence });
    const payload = new Uint8Array(4 + header.length + encryptedSnapshot.length);
    new DataView(payload.buffer).setUint32(0, header.length, true);
    payload.set(header, 4);
    payload.set(encryptedSnapshot, 4 + header.length);

    const message = encodeMessage(MessageType.COMPACT, payload);
    this.ws.send(message);
    console.log(`[SyncClient] Requesting compaction up to sequence ${upToSequence}`);
  }

  /**
   * Get the current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get the number of pending updates in the queue
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Set callback for when updates are received from other devices
   */
  onUpdate(callback: (data: Uint8Array) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * Set callback for when a snapshot is requested by another device
   */
  onSnapshotRequest(callback: () => Uint8Array | null): void {
    this.onSnapshotRequestCallback = callback;
  }

  /**
   * Set callback for when historical updates are received
   */
  onHistory(callback: (updates: Uint8Array[]) => void): void {
    this.onHistoryCallback = callback;
  }

  /**
   * Subscribe to sync events
   */
  on(event: SyncEventType, callback: SyncEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => this.listeners.get(event)?.delete(callback);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.connectionManager.resetRetries();

    // Send HELLO handshake with encryption info
    const hello: HelloPayload = {
      deviceId: this.config.deviceId,
      protocolVersion: PROTOCOL_VERSION,
      encrypted: this.encryptionEnabled,
      lastSequence: this.lastSequence,
    };
    const message = encodeMessage(MessageType.HELLO, encodeJsonPayload(hello));
    this.ws!.send(message);

    // Start ping interval
    this.startPing();
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    if (!(event.data instanceof ArrayBuffer)) {
      console.warn('[SyncClient] Received non-binary message');
      return;
    }

    try {
      const { type, payload } = decodeMessage(event.data);

      if (!isValidMessageType(type)) {
        console.warn(`[SyncClient] Unknown message type: ${type}`);
        return;
      }

      switch (type) {
        case MessageType.ACK:
          this.handleAck(payload);
          break;

        case MessageType.UPDATE:
          this.handleUpdate(payload);
          break;

        case MessageType.SNAPSHOT:
          this.handleSnapshot(payload);
          break;

        case MessageType.SNAPSHOT_REQUEST:
          this.handleSnapshotRequest();
          break;

        case MessageType.HISTORY:
          this.handleHistory(payload);
          break;

        case MessageType.PONG:
          // Ignore pong responses
          break;
      }
    } catch (err) {
      console.error('[SyncClient] Error processing message:', err);
    }
  }

  /**
   * Handle ACK message (server acknowledged our HELLO)
   */
  private handleAck(payload: Uint8Array): void {
    try {
      const ack = decodeJsonPayload<AckPayload>(payload);
      console.log(`[SyncClient] Connected. ${ack.sessionCount} device(s) in room.`);

      // Update sequence tracking
      if (ack.currentSequence !== undefined) {
        // Check if we need to catch up
        if (ack.hasHistory && this.lastSequence < ack.currentSequence) {
          console.log(`[SyncClient] Need to catch up: local=${this.lastSequence} server=${ack.currentSequence}`);
          this.requestCatchUp(this.lastSequence);
        }
        this.lastSequence = ack.currentSequence;
      }

      this.setStatus('connected');
      this.flushQueue();
    } catch (err) {
      console.error('[SyncClient] Error handling ACK:', err);
    }
  }

  /**
   * Handle UPDATE message from another device
   */
  private async handleUpdate(payload: Uint8Array): Promise<void> {
    console.log('[SyncClient] Received UPDATE, encrypted size:', payload.length);
    let decrypted = payload;

    // Decrypt if encryption is enabled
    if (this.encryptionEnabled) {
      try {
        decrypted = await decrypt(payload);
        console.log('[SyncClient] Decrypted UPDATE, size:', decrypted.length);
      } catch (err) {
        console.error('[SyncClient] Decryption failed:', err);
        this.emit({ type: 'error', error: new Error('Decryption failed') });
        return;
      }
    }

    if (this.onUpdateCallback) {
      console.log('[SyncClient] Calling onUpdateCallback');
      this.onUpdateCallback(decrypted);
    } else {
      console.warn('[SyncClient] No onUpdateCallback registered');
    }
    this.emit({ type: 'sync' });
  }

  /**
   * Handle SNAPSHOT message from another device
   */
  private async handleSnapshot(payload: Uint8Array): Promise<void> {
    let decrypted = payload;

    if (this.encryptionEnabled) {
      try {
        decrypted = await decrypt(payload);
      } catch (err) {
        console.error('[SyncClient] Snapshot decryption failed:', err);
        this.emit({ type: 'error', error: new Error('Decryption failed') });
        return;
      }
    }

    if (this.onUpdateCallback) {
      // Snapshots are imported the same way as updates in Loro
      this.onUpdateCallback(decrypted);
    }
    this.emit({ type: 'sync' });
  }

  /**
   * Handle SNAPSHOT_REQUEST from another device
   */
  private handleSnapshotRequest(): void {
    if (this.onSnapshotRequestCallback) {
      const snapshot = this.onSnapshotRequestCallback();
      if (snapshot) {
        this.sendSnapshot(snapshot);
      }
    }
  }

  /**
   * Handle HISTORY message (batch of historical updates)
   */
  private async handleHistory(payload: Uint8Array): Promise<void> {
    try {
      // Parse header
      const headerLen = new DataView(payload.buffer, payload.byteOffset).getUint32(0, true);
      const headerBytes = payload.slice(4, 4 + headerLen);
      const header = decodeJsonPayload<HistoryHeaderPayload>(headerBytes);

      console.log(`[SyncClient] Receiving ${header.count} historical updates (${header.fromSequence}-${header.toSequence})`);

      // Decrypt and collect updates
      const updates: Uint8Array[] = [];
      let offset = 4 + headerLen;

      for (let i = 0; i < header.count; i++) {
        const updateLen = new DataView(payload.buffer, payload.byteOffset + offset).getUint32(0, true);
        offset += 4;
        const updateData = payload.slice(offset, offset + updateLen);
        offset += updateLen;

        if (this.encryptionEnabled) {
          try {
            const decrypted = await decrypt(updateData);
            updates.push(decrypted);
          } catch (err) {
            console.error(`[SyncClient] Failed to decrypt historical update ${i}:`, err);
            // Continue with other updates
          }
        } else {
          updates.push(updateData);
        }
      }

      // Update sequence
      this.lastSequence = header.toSequence;

      // Notify listener
      if (this.onHistoryCallback && updates.length > 0) {
        this.onHistoryCallback(updates);
      }

      this.emit({ type: 'sync' });
    } catch (err) {
      console.error('[SyncClient] Error handling history:', err);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.stopPing();
    this.ws = null;
    this.setStatus('disconnected');

    // Only reconnect if this wasn't an intentional close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(): void {
    this.emit({ type: 'error', error: new Error('WebSocket error') });
  }

  /**
   * Flush queued updates to the server
   */
  private flushQueue(): void {
    if (this.queue.isEmpty) {
      return;
    }

    this.setStatus('syncing');

    while (!this.queue.isEmpty) {
      const update = this.queue.dequeue();
      if (update && this.ws?.readyState === WebSocket.OPEN) {
        // Queue already contains encrypted data if encryption was enabled when queued
        const message = encodeMessage(MessageType.UPDATE, update.data);
        this.ws.send(message);
      }
    }

    this.setStatus('connected');
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    const delay = this.connectionManager.scheduleReconnect(() => {
      this.connect();
    });
    console.log(`[SyncClient] Reconnecting in ${delay}ms (attempt ${this.connectionManager.getRetryCount()})`);
  }

  /**
   * Start sending periodic ping messages
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const message = encodeMessage(MessageType.PING, new Uint8Array(0));
        this.ws.send(message);
      }
    }, PING_INTERVAL);
  }

  /**
   * Stop sending ping messages
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Update the connection status and emit event
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit({ type: 'statusChange', status });
    }
  }

  /**
   * Emit an event to listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.get(event.type)?.forEach((cb) => cb(event));
  }
}
