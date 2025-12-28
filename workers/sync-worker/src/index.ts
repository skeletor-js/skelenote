/**
 * skelenote Sync Worker
 *
 * Cloudflare Worker entry point that routes WebSocket connections
 * to Durable Objects for stateful sync relay.
 */

export interface Env {
  SYNC_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Handle CORS preflight for WebSocket upgrade
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Upgrade, Connection',
        },
      });
    }

    // Extract user ID from path: /sync/:userId or /sync/:userId/reset
    const resetMatch = url.pathname.match(/^\/sync\/([^/]+)\/reset$/);
    const syncMatch = url.pathname.match(/^\/sync\/([^/]+)$/);

    if (resetMatch && request.method === 'DELETE') {
      // Handle reset endpoint
      const userId = resetMatch[1];
      console.log(`[Worker] Reset request for user: ${userId}`);

      const roomId = env.SYNC_ROOM.idFromName(userId);
      const room = env.SYNC_ROOM.get(roomId);
      return room.fetch(request);
    }

    if (!syncMatch) {
      return new Response('Not Found. Use /sync/:userId for WebSocket connections.', {
        status: 404,
      });
    }

    const userId = syncMatch[1];

    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade request', {
        status: 426,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.log(`[Worker] WebSocket upgrade request for user: ${userId}`);

    // Get or create a Durable Object for this user's sync room
    const roomId = env.SYNC_ROOM.idFromName(userId);
    const room = env.SYNC_ROOM.get(roomId);

    // Forward the request to the Durable Object
    return room.fetch(request);
  },
};

// Re-export the Durable Object class
export { SyncRoom } from './sync-room';
