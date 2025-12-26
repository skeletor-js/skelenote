/**
 * Sync Client
 *
 * Main class for managing WebSocket sync connections.
 * Handles connection lifecycle, message sending/receiving,
 * offline queuing, and automatic reconnection.
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
} from './protocol';
import type {
  ConnectionStatus,
  SyncConfig,
  SyncEventType,
  SyncEvent,
  SyncEventCallback,
} from './types';

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

  constructor(config: SyncConfig) {
    this.config = config;
    this.queue = new OfflineQueue();
    this.connectionManager = new ConnectionManager();
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
   */
  sendUpdate(update: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = encodeMessage(MessageType.UPDATE, update);
      this.ws.send(message);
    } else {
      // Queue the update for when we reconnect
      this.queue.enqueue(update);
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
   */
  sendSnapshot(snapshot: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = encodeMessage(MessageType.SNAPSHOT, snapshot);
      this.ws.send(message);
    }
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

    // Send HELLO handshake
    const hello: HelloPayload = {
      deviceId: this.config.deviceId,
      protocolVersion: PROTOCOL_VERSION,
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

      this.setStatus('connected');
      this.flushQueue();
    } catch (err) {
      console.error('[SyncClient] Error handling ACK:', err);
    }
  }

  /**
   * Handle UPDATE message from another device
   */
  private handleUpdate(payload: Uint8Array): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(payload);
    }
    this.emit({ type: 'sync' });
  }

  /**
   * Handle SNAPSHOT message from another device
   */
  private handleSnapshot(payload: Uint8Array): void {
    if (this.onUpdateCallback) {
      // Snapshots are imported the same way as updates in Loro
      this.onUpdateCallback(payload);
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
