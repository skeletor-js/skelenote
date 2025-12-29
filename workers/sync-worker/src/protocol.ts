/**
 * Sync Protocol - Server Side
 *
 * Defines the message format and types for the sync protocol.
 * This file is duplicated on the client side for consistency.
 */

// Message type constants
export const MessageType = {
  // Core sync messages (0x01-0x0a)
  HELLO: 0x01, // Client handshake
  UPDATE: 0x02, // Loro update bytes (encrypted in E2EE mode)
  SNAPSHOT_REQUEST: 0x03, // Request full snapshot from another device
  SNAPSHOT: 0x04, // Full Loro snapshot (encrypted in E2EE mode)
  ACK: 0x05, // Acknowledgment
  PING: 0x06, // Keep-alive ping
  PONG: 0x07, // Keep-alive pong
  CATCH_UP: 0x08, // Request historical updates from server
  HISTORY: 0x09, // Batch of historical encrypted updates
  COMPACT: 0x0a, // Client-initiated compaction

  // Device management messages (0x10-0x14)
  DEVICE_REGISTRY: 0x10, // Full device registry sync (Loro snapshot)
  DEVICE_UPDATE: 0x11, // Incremental device registry update (Loro update)
  DEVICE_REVOKE: 0x12, // Device revocation message
  DEVICE_REVOKE_ACK: 0x13, // Revocation acknowledgment
  DEVICE_RENAME: 0x14, // Device rename request
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

// Payload interfaces
export interface HelloPayload {
  deviceId: string;
  protocolVersion: number;
  /** Whether client supports E2EE (encrypted updates) */
  encrypted?: boolean;
  /** Last known sequence number for catch-up */
  lastSequence?: number;
}

export interface AckPayload {
  sessionCount: number;
  /** Current server sequence number */
  currentSequence?: number;
  /** Whether there are historical updates to catch up on */
  hasHistory?: boolean;
}

/** Request historical updates from server */
export interface CatchUpPayload {
  /** Start sequence (exclusive) - get updates after this */
  fromSequence: number;
}

/** Header for batch of historical updates */
export interface HistoryHeaderPayload {
  /** Number of updates in this batch */
  count: number;
  /** Sequence of first update */
  fromSequence: number;
  /** Sequence of last update */
  toSequence: number;
}

/** Client-initiated compaction request */
export interface CompactPayload {
  /** Compact all updates up to this sequence */
  upToSequence: number;
}

// Device management payload interfaces

/** Device revocation message */
export interface DeviceRevokePayload {
  /** ID of the device being revoked */
  deviceId: string;
  /** Timestamp of revocation */
  revokedAt: number;
  /** ID of the device performing revocation */
  revokedBy: string;
  /** Optional reason for revocation */
  reason?: string;
  /** Ed25519 signature over canonical data */
  signature: string;
}

/** Revocation acknowledgment */
export interface DeviceRevokeAckPayload {
  /** ID of the revoked device */
  deviceId: string;
  /** Whether revocation was accepted */
  accepted: boolean;
  /** Optional error message if rejected */
  error?: string;
}

/** Device rename request */
export interface DeviceRenamePayload {
  /** ID of the device being renamed */
  deviceId: string;
  /** New name for the device */
  newName: string;
}

/** Device update message (incremental registry changes) */
export interface DeviceUpdatePayload {
  /** ID of the device being updated */
  deviceId: string;
  /** Last seen timestamp */
  lastSeen?: number;
  /** Connection status */
  connectionStatus?: 'online' | 'offline' | 'connecting';
}

/**
 * Encode a message with type prefix and length
 * Format: [type: 1 byte][length: 4 bytes little-endian][payload: N bytes]
 */
export function encodeMessage(
  type: MessageTypeValue,
  payload: Uint8Array
): Uint8Array {
  const result = new Uint8Array(1 + 4 + payload.length);
  result[0] = type;
  new DataView(result.buffer).setUint32(1, payload.length, true);
  result.set(payload, 5);
  return result;
}

/**
 * Decode a message from binary format
 */
export function decodeMessage(data: ArrayBuffer): {
  type: MessageTypeValue;
  payload: Uint8Array;
} {
  const view = new DataView(data);
  const type = view.getUint8(0) as MessageTypeValue;
  const length = view.getUint32(1, true);
  const payload = new Uint8Array(data, 5, length);
  return { type, payload };
}

/**
 * Encode a JSON object as a Uint8Array payload
 */
export function encodeJsonPayload<T>(data: T): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data));
}

/**
 * Decode a Uint8Array payload as a JSON object
 */
export function decodeJsonPayload<T>(payload: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(payload));
}

/**
 * Check if a message type is valid
 */
export function isValidMessageType(type: number): type is MessageTypeValue {
  return Object.values(MessageType).includes(type as MessageTypeValue);
}

/**
 * Check if a message type is a device management message
 */
export function isDeviceManagementMessage(type: MessageTypeValue): boolean {
  return type >= MessageType.DEVICE_REGISTRY && type <= MessageType.DEVICE_RENAME;
}
