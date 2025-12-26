import { DurableObject } from 'cloudflare:workers';

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
    // This allows the Durable Object to hibernate when idle, reducing costs
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
    console.log(
      `[SyncRoom] Received message. Broadcasting to ${this.ctx.getWebSockets().length - 1} other clients.`
    );

    // Broadcast to all connected clients except the sender
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== ws) {
        try {
          socket.send(message);
        } catch (err) {
          console.error('[SyncRoom] Failed to send to socket:', err);
        }
      }
    }
  }

  /**
   * Handle WebSocket close events
   * Called by the hibernation API when a connection closes
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    console.log(
      `[SyncRoom] WebSocket closed. Code: ${code}, Reason: ${reason}, Clean: ${wasClean}. Remaining connections: ${this.ctx.getWebSockets().length}`
    );
  }

  /**
   * Handle WebSocket errors
   * Called by the hibernation API when an error occurs
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[SyncRoom] WebSocket error:', error);
  }
}
