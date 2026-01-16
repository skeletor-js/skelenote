/**
 * Sync Relay Server
 *
 * HTTP + WebSocket server that manages sync rooms for Skelenote.
 */

import { createServer, type IncomingMessage, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { SyncRoom } from './sync-room.js';

export interface ServerConfig {
    port: number;
    dataDir: string;
    /** Maximum idle time for empty rooms before cleanup (ms) */
    roomIdleTimeout?: number;
}

/**
 * Room metadata for cleanup tracking
 */
interface RoomMetadata {
    room: SyncRoom;
    lastActivity: number;
}

/**
 * Sync Relay Server
 */
export class SyncRelayServer {
    private httpServer: Server;
    private wss: WebSocketServer;
    private rooms: Map<string, RoomMetadata> = new Map();
    private config: ServerConfig;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: ServerConfig) {
        this.config = {
            roomIdleTimeout: 5 * 60 * 1000, // 5 minutes default
            ...config,
        };

        // Create HTTP server
        this.httpServer = createServer((req, res) => {
            this.handleHttpRequest(req, res);
        });

        // Create WebSocket server attached to HTTP server
        this.wss = new WebSocketServer({
            noServer: true,
        });

        // Handle WebSocket upgrade
        this.httpServer.on('upgrade', (request, socket, head) => {
            this.handleUpgrade(request, socket, head);
        });

        console.log('[Server] Initialized');
    }

    /**
     * Handle HTTP requests
     */
    private handleHttpRequest(
        req: IncomingMessage,
        res: import('node:http').ServerResponse
    ): void {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

        // Health check
        if (url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
            return;
        }

        // Status endpoint
        if (url.pathname === '/status') {
            const status = {
                rooms: this.rooms.size,
                connections: Array.from(this.rooms.values()).reduce(
                    (sum, meta) => sum + meta.room.getConnectionCount(),
                    0
                ),
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }

        // Handle reset endpoint: DELETE /sync/:userId/reset
        const resetMatch = url.pathname.match(/^\/sync\/([^/]+)\/reset$/);
        if (resetMatch && req.method === 'DELETE') {
            const userId = decodeURIComponent(resetMatch[1]);
            const roomMeta = this.rooms.get(userId);
            if (roomMeta) {
                roomMeta.room.reset();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Room data cleared' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Room not found' }));
            }
            return;
        }

        // CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Upgrade, Connection',
            });
            res.end();
            return;
        }

        // Default response for sync endpoint without upgrade
        const syncMatch = url.pathname.match(/^\/sync\/([^/]+)$/);
        if (syncMatch) {
            res.writeHead(426, { 'Content-Type': 'text/plain' });
            res.end('Expected WebSocket upgrade request');
            return;
        }

        // Not found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found. Use /sync/:userId for WebSocket connections.');
    }

    /**
     * Handle WebSocket upgrade requests
     */
    private handleUpgrade(
        request: IncomingMessage,
        socket: import('node:stream').Duplex,
        head: Buffer
    ): void {
        const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
        const syncMatch = url.pathname.match(/^\/sync\/([^/]+)$/);

        if (!syncMatch) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        const userId = decodeURIComponent(syncMatch[1]);
        console.log(`[Server] WebSocket upgrade for user: ${userId}`);

        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.handleConnection(ws, userId);
        });
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, userId: string): void {
        // Get or create room
        let roomMeta = this.rooms.get(userId);

        if (!roomMeta) {
            const room = new SyncRoom(this.config.dataDir, userId);
            roomMeta = { room, lastActivity: Date.now() };
            this.rooms.set(userId, roomMeta);
            console.log(`[Server] Created room for user: ${userId}`);
        }

        // Update last activity
        roomMeta.lastActivity = Date.now();

        // Add connection to room
        roomMeta.room.addConnection(ws);

        // Track activity on messages
        ws.on('message', () => {
            const meta = this.rooms.get(userId);
            if (meta) {
                meta.lastActivity = Date.now();
            }
        });

        // Handle close - check if room should be cleaned up
        ws.on('close', () => {
            const meta = this.rooms.get(userId);
            if (meta) {
                meta.lastActivity = Date.now();
            }
        });
    }

    /**
     * Cleanup idle empty rooms
     */
    private cleanupIdleRooms(): void {
        const now = Date.now();
        const timeout = this.config.roomIdleTimeout!;

        for (const [userId, meta] of this.rooms) {
            if (meta.room.isEmpty() && now - meta.lastActivity > timeout) {
                console.log(`[Server] Cleaning up idle room: ${userId}`);
                meta.room.close();
                this.rooms.delete(userId);
            }
        }
    }

    /**
     * Start the server
     */
    start(): Promise<void> {
        return new Promise((resolve) => {
            this.httpServer.listen(this.config.port, () => {
                console.log(`[Server] Listening on port ${this.config.port}`);
                console.log(`[Server] Data directory: ${this.config.dataDir}`);
                console.log(`[Server] WebSocket endpoint: ws://localhost:${this.config.port}/sync/:userId`);

                // Start cleanup interval
                this.cleanupInterval = setInterval(
                    () => this.cleanupIdleRooms(),
                    60 * 1000 // Check every minute
                );

                resolve();
            });
        });
    }

    /**
     * Stop the server gracefully
     */
    stop(): Promise<void> {
        return new Promise((resolve) => {
            console.log('[Server] Shutting down...');

            // Stop cleanup interval
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }

            // Close all rooms
            for (const [userId, meta] of this.rooms) {
                console.log(`[Server] Closing room: ${userId}`);
                meta.room.close();
            }
            this.rooms.clear();

            // Close WebSocket server
            this.wss.close(() => {
                // Close HTTP server
                this.httpServer.close(() => {
                    console.log('[Server] Shutdown complete');
                    resolve();
                });
            });
        });
    }
}
