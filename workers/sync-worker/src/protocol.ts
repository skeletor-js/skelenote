/**
 * Sync Protocol - Server Side
 *
 * Defines the message format and types for the sync protocol.
 * This file is duplicated on the client side for consistency.
 */

// Message type constants
export const MessageType = {
  HELLO: 0x01, // Client handshake
  UPDATE: 0x02, // Loro update bytes
  SNAPSHOT_REQUEST: 0x03, // Request full snapshot from another device
  SNAPSHOT: 0x04, // Full Loro snapshot
  ACK: 0x05, // Acknowledgment
  PING: 0x06, // Keep-alive ping
  PONG: 0x07, // Keep-alive pong
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

// Payload interfaces
export interface HelloPayload {
  deviceId: string;
  protocolVersion: number;
}

export interface AckPayload {
  sessionCount: number;
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
