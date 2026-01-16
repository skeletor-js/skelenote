/**
 * Sync Room
 *
 * Manages WebSocket connections for a single user's sync room.
 * Port of the Cloudflare Durable Object implementation to standard Node.js.
 */

import type { WebSocket } from 'ws';
import { SyncStorage } from './storage.js';
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
} from './protocol.js';

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
 * SyncRoom - manages a single user's sync sessions
 */
export class SyncRoom {
    private storage: SyncStorage;
    private connections: Map<WebSocket, SessionData> = new Map();
    private userId: string;

    constructor(dataDir: string, userId: string) {
        this.userId = userId;
        this.storage = new SyncStorage(dataDir, userId);
        console.log(`[SyncRoom:${userId}] Created`);
    }

    /**
     * Add a new WebSocket connection to this room
     */
    addConnection(ws: WebSocket): void {
        console.log(
            `[SyncRoom:${this.userId}] WebSocket connected. Total: ${this.connections.size + 1}`
        );

        // Set up message handler
        ws.on('message', (data: Buffer) => {
            this.handleMessage(ws, data);
        });

        // Set up close handler
        ws.on('close', (code: number, reason: Buffer) => {
            this.handleClose(ws, code, reason.toString());
        });

        // Set up error handler
        ws.on('error', (error: Error) => {
            console.error(`[SyncRoom:${this.userId}] WebSocket error:`, error);
        });
    }

    /**
     * Get the number of active connections
     */
    getConnectionCount(): number {
        return this.connections.size;
    }

    /**
     * Check if room has any active connections
     */
    isEmpty(): boolean {
        return this.connections.size === 0;
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(ws: WebSocket, data: Buffer): void {
        // Check minimum message size (1 byte type + 4 bytes length)
        if (data.length < 5) {
            console.warn(`[SyncRoom:${this.userId}] Message too short, ignoring`);
            return;
        }

        try {
            const arrayBuffer = data.buffer.slice(
                data.byteOffset,
                data.byteOffset + data.byteLength
            ) as ArrayBuffer;
            const { type, payload } = decodeMessage(arrayBuffer);

            if (!isValidMessageType(type)) {
                console.warn(`[SyncRoom:${this.userId}] Unknown message type: ${type}`);
                return;
            }

            switch (type) {
                case MessageType.HELLO:
                    this.handleHello(ws, payload);
                    break;

                case MessageType.UPDATE:
                    this.handleUpdate(ws, payload);
                    break;

                case MessageType.SNAPSHOT_REQUEST:
                    this.handleSnapshotRequest(ws);
                    break;

                case MessageType.SNAPSHOT:
                    this.handleSnapshot(ws, payload);
                    break;

                case MessageType.CATCH_UP:
                    this.handleCatchUp(ws, payload);
                    break;

                case MessageType.COMPACT:
                    this.handleCompact(ws, payload);
                    break;

                case MessageType.PING:
                    this.handlePing(ws);
                    break;

                case MessageType.PONG:
                    // Ignore pong messages
                    break;

                // Device management messages
                case MessageType.DEVICE_REGISTRY:
                    this.handleDeviceRegistry(ws, payload);
                    break;

                case MessageType.DEVICE_UPDATE:
                    this.handleDeviceUpdate(ws, payload);
                    break;

                case MessageType.DEVICE_REVOKE:
                    this.handleDeviceRevoke(ws, payload);
                    break;

                case MessageType.DEVICE_RENAME:
                    this.handleDeviceRename(ws, payload);
                    break;

                default:
                    console.warn(
                        `[SyncRoom:${this.userId}] Unhandled message type: ${type}`
                    );
            }
        } catch (err) {
            console.error(`[SyncRoom:${this.userId}] Error processing message:`, err);
        }
    }

    /**
     * Handle HELLO handshake from client
     */
    private handleHello(ws: WebSocket, payload: Uint8Array): void {
        try {
            const hello = decodeJsonPayload<HelloPayload>(payload);

            // Check if device has been revoked
            if (this.storage.isDeviceRevoked(hello.deviceId)) {
                console.log(
                    `[SyncRoom:${this.userId}] Rejecting revoked device: ${hello.deviceId}`
                );

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

            // Store session data
            const sessionData: SessionData = {
                deviceId: hello.deviceId,
                connectedAt: Date.now(),
                encrypted: hello.encrypted ?? false,
                lastSequence: hello.lastSequence ?? 0,
            };
            this.connections.set(ws, sessionData);

            console.log(
                `[SyncRoom:${this.userId}] Device ${hello.deviceId} connected (encrypted: ${hello.encrypted}, lastSeq: ${hello.lastSequence})`
            );

            // Determine if client needs to catch up
            const clientSeq = hello.lastSequence ?? 0;
            const currentSequence = this.storage.getCurrentSequence();
            const hasHistory = currentSequence > clientSeq;

            console.log(
                `[SyncRoom:${this.userId}] Sending ACK: sessionCount=${this.connections.size}, currentSequence=${currentSequence}, hasHistory=${hasHistory}`
            );

            // Send ACK response with sequence info
            const ack: AckPayload = {
                sessionCount: this.connections.size,
                currentSequence,
                hasHistory,
            };
            const ackMessage = encodeMessage(MessageType.ACK, encodeJsonPayload(ack));
            ws.send(ackMessage);

            console.log(`[SyncRoom:${this.userId}] ACK sent successfully`);
        } catch (err) {
            console.error(`[SyncRoom:${this.userId}] Error handling HELLO:`, err);
        }
    }

    /**
     * Handle UPDATE message - store and broadcast
     */
    private handleUpdate(ws: WebSocket, payload: Uint8Array): void {
        // Store the update
        const sequence = this.storage.storeUpdate(payload);

        console.log(
            `[SyncRoom:${this.userId}] Stored update #${sequence} (${payload.byteLength} bytes)`
        );

        // Broadcast to other clients
        const updateMessage = encodeMessage(MessageType.UPDATE, payload);
        this.broadcastExcept(ws, updateMessage);
    }

    /**
     * Handle SNAPSHOT_REQUEST - check storage first, then other devices
     */
    private handleSnapshotRequest(ws: WebSocket): void {
        // Check if we have stored updates
        const updates = this.storage.getUpdatesAfter(0, 1);

        if (updates.length > 0) {
            // We have stored data - client should use CATCH_UP instead
            console.log(
                `[SyncRoom:${this.userId}] Snapshot request, but stored updates exist. Use CATCH_UP.`
            );
            return;
        }

        // No stored data, request from other device
        const otherSockets = this.getOtherSockets(ws);

        if (otherSockets.length === 0) {
            console.log(`[SyncRoom:${this.userId}] No other devices for snapshot`);
            return;
        }

        const requestMessage = encodeMessage(
            MessageType.SNAPSHOT_REQUEST,
            new Uint8Array(0)
        );
        otherSockets[0].send(requestMessage);
        console.log(
            `[SyncRoom:${this.userId}] Forwarded snapshot request to another device`
        );
    }

    /**
     * Handle SNAPSHOT - store and broadcast
     */
    private handleSnapshot(ws: WebSocket, payload: Uint8Array): void {
        // Store snapshot
        const sequence = this.storage.storeUpdate(payload, true);

        console.log(
            `[SyncRoom:${this.userId}] Stored snapshot #${sequence} (${payload.byteLength} bytes)`
        );

        // Broadcast to other clients
        const snapshotMessage = encodeMessage(MessageType.SNAPSHOT, payload);
        this.broadcastExcept(ws, snapshotMessage);
    }

    /**
     * Handle CATCH_UP - send historical updates
     */
    private handleCatchUp(ws: WebSocket, payload: Uint8Array): void {
        try {
            const { fromSequence } = decodeJsonPayload<CatchUpPayload>(payload);

            console.log(
                `[SyncRoom:${this.userId}] CATCH_UP request from sequence ${fromSequence}`
            );

            const updates = this.storage.getUpdatesAfter(fromSequence);

            if (updates.length === 0) {
                console.log(
                    `[SyncRoom:${this.userId}] No updates to catch up from sequence ${fromSequence}`
                );
                return;
            }

            console.log(
                `[SyncRoom:${this.userId}] Sending ${updates.length} historical updates from #${fromSequence}`
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
                totalSize += 4 + update.data.length;
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
                new DataView(response.buffer).setUint32(offset, update.data.length, true);
                offset += 4;
                response.set(new Uint8Array(update.data), offset);
                offset += update.data.length;
            }

            const message = encodeMessage(MessageType.HISTORY, response);
            ws.send(message);
            console.log(`[SyncRoom:${this.userId}] HISTORY response sent`);
        } catch (err) {
            console.error(`[SyncRoom:${this.userId}] Error handling CATCH_UP:`, err);
        }
    }

    /**
     * Handle COMPACT - replace old updates with snapshot
     */
    private handleCompact(_ws: WebSocket, payload: Uint8Array): void {
        try {
            // Parse header
            const headerLen = new DataView(
                payload.buffer,
                payload.byteOffset
            ).getUint32(0, true);
            const headerBytes = payload.slice(4, 4 + headerLen);
            const { upToSequence } = decodeJsonPayload<{ upToSequence: number }>(
                headerBytes
            );

            const snapshot = payload.slice(4 + headerLen);

            console.log(
                `[SyncRoom:${this.userId}] Compacting updates up to #${upToSequence}`
            );

            this.storage.compactUpdates(upToSequence, snapshot);
        } catch (err) {
            console.error(`[SyncRoom:${this.userId}] Error handling COMPACT:`, err);
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
     * Handle DEVICE_REGISTRY - full device registry sync
     */
    private handleDeviceRegistry(ws: WebSocket, payload: Uint8Array): void {
        console.log(
            `[SyncRoom:${this.userId}] Received DEVICE_REGISTRY (${payload.byteLength} bytes)`
        );

        // Store the registry update
        const seq = this.storage.storeDeviceRegistryUpdate(payload);
        console.log(`[SyncRoom:${this.userId}] Stored device registry #${seq}`);

        // Broadcast to other connected devices
        const message = encodeMessage(MessageType.DEVICE_REGISTRY, payload);
        this.broadcastExcept(ws, message);
    }

    /**
     * Handle DEVICE_UPDATE - incremental device registry update
     */
    private handleDeviceUpdate(ws: WebSocket, payload: Uint8Array): void {
        console.log(
            `[SyncRoom:${this.userId}] Received DEVICE_UPDATE (${payload.byteLength} bytes)`
        );

        // Store the update
        const seq = this.storage.storeDeviceRegistryUpdate(payload);
        console.log(`[SyncRoom:${this.userId}] Stored device update #${seq}`);

        // Broadcast to other connected devices
        const message = encodeMessage(MessageType.DEVICE_UPDATE, payload);
        this.broadcastExcept(ws, message);
    }

    /**
     * Handle DEVICE_REVOKE - device revocation with signature
     */
    private handleDeviceRevoke(ws: WebSocket, payload: Uint8Array): void {
        try {
            const revocation = decodeJsonPayload<DeviceRevokePayload>(payload);

            console.log(
                `[SyncRoom:${this.userId}] Received DEVICE_REVOKE for ${revocation.deviceId} from ${revocation.revokedBy}`
            );

            // Store the revocation
            this.storage.storeRevocation(revocation);

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
            const revokeMessage = encodeMessage(MessageType.DEVICE_REVOKE, payload);

            for (const [socket, sessionData] of this.connections) {
                if (socket === ws) continue;

                try {
                    if (sessionData.deviceId === revocation.deviceId) {
                        // This is the revoked device - send revocation then close
                        socket.send(revokeMessage);
                        socket.close(4001, 'Device has been revoked');
                        console.log(
                            `[SyncRoom:${this.userId}] Disconnected revoked device: ${revocation.deviceId}`
                        );
                    } else {
                        // Regular device - just forward the revocation
                        socket.send(revokeMessage);
                    }
                } catch (err) {
                    console.error(
                        `[SyncRoom:${this.userId}] Failed to send revocation:`,
                        err
                    );
                }
            }
        } catch (err) {
            console.error(
                `[SyncRoom:${this.userId}] Error handling DEVICE_REVOKE:`,
                err
            );

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
     */
    private handleDeviceRename(ws: WebSocket, payload: Uint8Array): void {
        console.log(
            `[SyncRoom:${this.userId}] Received DEVICE_RENAME (${payload.byteLength} bytes)`
        );

        // Just broadcast to other devices
        const message = encodeMessage(MessageType.DEVICE_RENAME, payload);
        this.broadcastExcept(ws, message);
    }

    /**
     * Handle WebSocket close
     */
    private handleClose(ws: WebSocket, code: number, reason: string): void {
        const sessionData = this.connections.get(ws);
        const deviceId = sessionData?.deviceId ?? 'unknown';

        this.connections.delete(ws);

        console.log(
            `[SyncRoom:${this.userId}] Device ${deviceId} disconnected. Code: ${code}, Reason: ${reason}. Remaining: ${this.connections.size}`
        );
    }

    /**
     * Get all sockets except the specified one
     */
    private getOtherSockets(ws: WebSocket): WebSocket[] {
        return Array.from(this.connections.keys()).filter((s) => s !== ws);
    }

    /**
     * Broadcast a message to all connections except the sender
     */
    private broadcastExcept(sender: WebSocket, message: Uint8Array): void {
        for (const socket of this.connections.keys()) {
            if (socket !== sender) {
                try {
                    socket.send(message);
                } catch (err) {
                    console.error(`[SyncRoom:${this.userId}] Failed to broadcast:`, err);
                }
            }
        }
    }

    /**
     * Reset room data (for testing/admin)
     */
    reset(): void {
        this.storage.clearAllUpdates();
        console.log(`[SyncRoom:${this.userId}] Room data reset`);
    }

    /**
     * Close all connections and cleanup
     */
    close(): void {
        // Close all WebSocket connections
        for (const ws of this.connections.keys()) {
            try {
                ws.close(1001, 'Server shutting down');
            } catch {
                // Ignore errors during shutdown
            }
        }
        this.connections.clear();

        // Close storage
        this.storage.close();
        console.log(`[SyncRoom:${this.userId}] Room closed`);
    }
}
