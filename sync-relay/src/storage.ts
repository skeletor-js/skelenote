/**
 * SQLite Storage Adapter
 *
 * Provides persistent storage for sync rooms using better-sqlite3.
 * Each user gets their own SQLite database file.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DeviceRevokePayload } from './protocol.js';

/**
 * Stored update record
 */
export interface StoredUpdate {
    sequence: number;
    data: Buffer;
    timestamp: number;
    isSnapshot: boolean;
}

/**
 * Storage adapter for a single user's sync room
 */
export class SyncStorage {
    private db: Database.Database;
    private currentSequence: number = 0;

    constructor(dataDir: string, userId: string) {
        // Ensure data directory exists
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }

        // Sanitize userId for use in filename
        const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const dbPath = join(dataDir, `${safeUserId}.db`);

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.initializeDatabase();
    }

    /**
     * Initialize SQLite schema
     */
    private initializeDatabase(): void {
        // Create updates table for append-only log
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS updates (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        data BLOB NOT NULL,
        timestamp INTEGER NOT NULL,
        is_snapshot INTEGER DEFAULT 0
      )
    `);

        // Create revoked devices table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS revoked_devices (
        device_id TEXT PRIMARY KEY,
        revoked_at INTEGER NOT NULL,
        revoked_by TEXT NOT NULL,
        reason TEXT,
        signature TEXT NOT NULL
      )
    `);

        // Create device registry updates table (stores encrypted Loro updates)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_registry (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        data BLOB NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

        // Get current sequence
        const result = this.db
            .prepare('SELECT MAX(sequence) as max_seq FROM updates')
            .get() as { max_seq: number | null } | undefined;
        this.currentSequence = result?.max_seq ?? 0;

        console.log(`[Storage] Initialized with sequence ${this.currentSequence}`);
    }

    /**
     * Get current sequence number
     */
    getCurrentSequence(): number {
        return this.currentSequence;
    }

    /**
     * Store an encrypted update
     */
    storeUpdate(data: Uint8Array, isSnapshot: boolean = false): number {
        const timestamp = Date.now();

        this.db
            .prepare(
                'INSERT INTO updates (data, timestamp, is_snapshot) VALUES (?, ?, ?)'
            )
            .run(Buffer.from(data), timestamp, isSnapshot ? 1 : 0);

        this.currentSequence++;
        return this.currentSequence;
    }

    /**
     * Get updates after a given sequence
     */
    getUpdatesAfter(sequence: number, limit: number = 100): StoredUpdate[] {
        const results = this.db
            .prepare(
                `SELECT sequence, data, timestamp, is_snapshot FROM updates
         WHERE sequence > ?
         ORDER BY sequence ASC
         LIMIT ?`
            )
            .all(sequence, limit) as Array<{
                sequence: number;
                data: Buffer;
                timestamp: number;
                is_snapshot: number;
            }>;

        return results.map((row) => ({
            sequence: row.sequence,
            data: row.data,
            timestamp: row.timestamp,
            isSnapshot: row.is_snapshot === 1,
        }));
    }

    /**
     * Compact updates up to a sequence (replace with snapshot)
     */
    compactUpdates(upToSequence: number, snapshot: Uint8Array): void {
        const transaction = this.db.transaction(() => {
            // Delete old updates
            this.db
                .prepare('DELETE FROM updates WHERE sequence <= ?')
                .run(upToSequence);

            // Store the compacted snapshot
            this.storeUpdate(snapshot, true);
        });

        transaction();
        console.log(`[Storage] Compacted updates up to sequence ${upToSequence}`);
    }

    /**
     * Clear all stored updates (for data reset)
     */
    clearAllUpdates(): void {
        this.db.prepare('DELETE FROM updates').run();
        this.currentSequence = 0;
        console.log('[Storage] All updates cleared');
    }

    /**
     * Check if a device has been revoked
     */
    isDeviceRevoked(deviceId: string): boolean {
        const result = this.db
            .prepare('SELECT 1 FROM revoked_devices WHERE device_id = ?')
            .get(deviceId);
        return result !== undefined;
    }

    /**
     * Store a device revocation
     */
    storeRevocation(revocation: DeviceRevokePayload): void {
        this.db
            .prepare(
                `INSERT OR REPLACE INTO revoked_devices (device_id, revoked_at, revoked_by, reason, signature)
         VALUES (?, ?, ?, ?, ?)`
            )
            .run(
                revocation.deviceId,
                revocation.revokedAt,
                revocation.revokedBy,
                revocation.reason ?? null,
                revocation.signature
            );
        console.log(`[Storage] Stored revocation for device ${revocation.deviceId}`);
    }

    /**
     * Get all revoked device IDs
     */
    getRevokedDevices(): string[] {
        const results = this.db
            .prepare('SELECT device_id FROM revoked_devices')
            .all() as Array<{ device_id: string }>;
        return results.map((row) => row.device_id);
    }

    /**
     * Store a device registry update (Loro update bytes)
     */
    storeDeviceRegistryUpdate(data: Uint8Array): number {
        const timestamp = Date.now();
        const info = this.db
            .prepare('INSERT INTO device_registry (data, timestamp) VALUES (?, ?)')
            .run(Buffer.from(data), timestamp);
        return Number(info.lastInsertRowid);
    }

    /**
     * Get device registry updates after a given sequence
     */
    getDeviceRegistryUpdatesAfter(
        sequence: number,
        limit: number = 100
    ): Array<{ sequence: number; data: Buffer }> {
        const results = this.db
            .prepare(
                `SELECT sequence, data FROM device_registry
         WHERE sequence > ?
         ORDER BY sequence ASC
         LIMIT ?`
            )
            .all(sequence, limit) as Array<{ sequence: number; data: Buffer }>;
        return results;
    }

    /**
     * Close the database connection
     */
    close(): void {
        this.db.close();
        console.log('[Storage] Database closed');
    }
}
