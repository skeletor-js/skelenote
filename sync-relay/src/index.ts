/**
 * Skelenote Sync Relay - Entry Point
 *
 * Self-hosted sync relay server for Skelenote.
 * Protocol-compatible with the Cloudflare Worker implementation.
 */

import { SyncRelayServer } from './server.js';
import { resolve } from 'node:path';

// Configuration from environment variables
const PORT = parseInt(process.env.PORT ?? '8787', 10);
const DATA_DIR = process.env.DATA_DIR ?? resolve(process.cwd(), 'data');
const ROOM_IDLE_TIMEOUT = parseInt(
    process.env.ROOM_IDLE_TIMEOUT ?? String(5 * 60 * 1000),
    10
);

console.log('='.repeat(50));
console.log('Skelenote Sync Relay');
console.log('='.repeat(50));
console.log(`Version: 1.0.0`);
console.log(`Port: ${PORT}`);
console.log(`Data Directory: ${DATA_DIR}`);
console.log(`Room Idle Timeout: ${ROOM_IDLE_TIMEOUT}ms`);
console.log('='.repeat(50));

// Create and start the server
const server = new SyncRelayServer({
    port: PORT,
    dataDir: DATA_DIR,
    roomIdleTimeout: ROOM_IDLE_TIMEOUT,
});

// Handle graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n[Main] Received ${signal}, shutting down...`);
    await server.stop();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
server.start().catch((err) => {
    console.error('[Main] Failed to start server:', err);
    process.exit(1);
});
