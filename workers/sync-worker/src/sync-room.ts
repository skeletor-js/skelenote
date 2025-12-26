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
} from './protocol';

/**
 * Session metadata stored with each WebSocket connection
 */
interface SessionData {
  deviceId: string;
  connectedAt: number;
}

/**
 * SyncRoom Durable Object
 *
 * Manages WebSocket connections for a single user's sync room.
 * Broadcasts messages from any connected device to all other devices.
 * Uses the hibernation API for cost efficiency.
 */
export class SyncRoom extends DurableObject {
  /**
   * Handle incoming HTTP requests (including WebSocket upgrades)
   */
  async fetch(request: Request): Promise<Response> {
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

        case MessageType.PING:
          this.handlePing(ws);
          break;

        case MessageType.PONG:
          // Ignore pong messages
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

      // Store session data with the WebSocket
      const sessionData: SessionData = {
        deviceId: hello.deviceId,
        connectedAt: Date.now(),
      };
      ws.serializeAttachment(sessionData);

      console.log(
        `[SyncRoom] Device ${hello.deviceId} connected (protocol v${hello.protocolVersion})`
      );

      // Send ACK response
      const ack: AckPayload = {
        sessionCount: this.ctx.getWebSockets().length,
      };
      const ackMessage = encodeMessage(
        MessageType.ACK,
        encodeJsonPayload(ack)
      );
      ws.send(ackMessage);
    } catch (err) {
      console.error('[SyncRoom] Error handling HELLO:', err);
    }
  }

  /**
   * Handle UPDATE message - broadcast Loro update bytes to other clients
   */
  private async handleUpdate(
    ws: WebSocket,
    payload: Uint8Array
  ): Promise<void> {
    const otherSockets = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== ws);

    console.log(
      `[SyncRoom] Broadcasting update (${payload.byteLength} bytes) to ${otherSockets.length} clients`
    );

    // Wrap the payload in an UPDATE message
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
   * Handle SNAPSHOT_REQUEST - ask another connected device to send a snapshot
   */
  private async handleSnapshotRequest(ws: WebSocket): Promise<void> {
    const otherSockets = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== ws);

    if (otherSockets.length === 0) {
      console.log('[SyncRoom] No other devices to request snapshot from');
      return;
    }

    // Request snapshot from the first available device
    const requestMessage = encodeMessage(
      MessageType.SNAPSHOT_REQUEST,
      new Uint8Array(0)
    );
    otherSockets[0].send(requestMessage);
    console.log('[SyncRoom] Forwarded snapshot request to another device');
  }

  /**
   * Handle SNAPSHOT - broadcast full snapshot to requesting device(s)
   */
  private async handleSnapshot(
    ws: WebSocket,
    payload: Uint8Array
  ): Promise<void> {
    // For now, broadcast to all other devices
    // In the future, we could track which device requested the snapshot
    const otherSockets = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== ws);

    console.log(
      `[SyncRoom] Broadcasting snapshot (${payload.byteLength} bytes) to ${otherSockets.length} clients`
    );

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
   * Handle PING - respond with PONG
   */
  private handlePing(ws: WebSocket): void {
    const pongMessage = encodeMessage(MessageType.PONG, new Uint8Array(0));
    ws.send(pongMessage);
  }

  /**
   * Handle WebSocket close events
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
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
