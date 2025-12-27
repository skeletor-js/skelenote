/**
 * Sync Types
 *
 * TypeScript types for the sync system.
 */

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing';

export interface SyncConfig {
  /** WebSocket server URL (e.g., wss://your-worker.workers.dev) */
  serverUrl: string;
  /** User ID for sync room isolation */
  userId: string;
  /** Device ID for this specific device */
  deviceId: string;
}

export interface QueuedUpdate {
  /** Unique ID for this queued update */
  id: number;
  /** The update data (Loro update bytes) */
  data: Uint8Array;
  /** Timestamp when the update was queued */
  timestamp: number;
}

export type SyncEventType = 'statusChange' | 'error' | 'sync';

export interface SyncEvent {
  type: SyncEventType;
  status?: ConnectionStatus;
  error?: Error;
}

export type SyncEventCallback = (event: SyncEvent) => void;
