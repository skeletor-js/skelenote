/**
 * Device Management Types
 *
 * Types for the device registry, which tracks all devices that have synced
 * with the user's vault. Used for device management, renaming, and revocation.
 */

/**
 * Platform identifier for a device
 */
export type DevicePlatform =
  | 'macos'
  | 'windows'
  | 'linux'
  | 'ios'
  | 'android'
  | 'web';

/**
 * Connection status for a device (derived from P2P and relay state)
 */
export type DeviceConnectionStatus =
  | 'connected' // Active connection (P2P TCP or relay WebSocket)
  | 'discovered' // Found via mDNS, not yet connected
  | 'connecting' // Connection in progress
  | 'disconnected' // Was connected, connection lost
  | 'offline'; // Not seen on network

/**
 * A device record stored in the device registry CRDT
 *
 * This is the persistent record that syncs between all devices.
 */
export interface DeviceRecord {
  /** Unique device identifier (UUID) */
  deviceId: string;

  /** User-editable device name (e.g., "Work Laptop") */
  name: string;

  /** Platform/OS of the device */
  platform: DevicePlatform;

  /** App version when device last synced (e.g., "0.1.0") */
  appVersion: string;

  /** Base64-encoded Ed25519 public signing key for this device */
  publicSigningKey: string;

  /** Unix timestamp (ms) when device was first seen */
  firstSeen: number;

  /** Unix timestamp (ms) when device was last seen */
  lastSeen: number;

  /** Device ID that first registered this device */
  createdBy: string;
}

/**
 * A revocation record stored in the device registry CRDT
 *
 * Once a device is revoked, it cannot sync. Revocations are append-only
 * and cannot be undone (except by Skeleton Key rotation).
 */
export interface RevocationRecord {
  /** Device ID that was revoked */
  deviceId: string;

  /** Unix timestamp (ms) when revocation occurred */
  revokedAt: number;

  /** Device ID that performed the revocation */
  revokedBy: string;

  /** Optional reason for revocation */
  reason?: string;

  /**
   * Base64-encoded Ed25519 signature over canonical message:
   * "revoke:{deviceId}:{revokedAt}:{revokedBy}"
   *
   * This prevents forged revocations.
   */
  signature: string;
}

/**
 * Combined device info for UI display
 *
 * Merges persistent DeviceRecord with ephemeral connection state.
 */
export interface DeviceInfo extends DeviceRecord {
  /** Whether this is the current device */
  isCurrentDevice: boolean;

  /** Current connection status (not persisted) */
  status: DeviceConnectionStatus;

  /** Whether the device has been revoked */
  isRevoked: boolean;
}

/**
 * Device registry metadata
 */
export interface DeviceRegistryMeta {
  /** Schema version for migrations */
  version: number;

  /** Unix timestamp (ms) when registry was created */
  createdAt: number;
}

/**
 * Payload for DEVICE_REVOKE protocol message
 */
export interface DeviceRevokePayload {
  deviceId: string;
  revokedAt: number;
  revokedBy: string;
  reason?: string;
  signature: string;
}

/**
 * Payload for DEVICE_REVOKE_ACK protocol message
 */
export interface DeviceRevokeAckPayload {
  /** ID of the revoked device */
  deviceId: string;
  /** Whether revocation was accepted */
  accepted: boolean;
  /** Optional error message if rejected */
  error?: string;
}

/**
 * Payload for DEVICE_RENAME protocol message
 */
export interface DeviceRenamePayload {
  deviceId: string;
  newName: string;
  renamedAt: number;
}

/**
 * Payload for DEVICE_UPDATE protocol message (incremental CRDT update)
 */
export interface DeviceUpdatePayload {
  /** Loro update bytes (encrypted) */
  data: Uint8Array;
}

/**
 * Payload for DEVICE_REGISTRY protocol message (full snapshot)
 */
export interface DeviceRegistryPayload {
  /** Registry version for conflict detection */
  version: number;

  /** Loro snapshot bytes (encrypted) */
  data: Uint8Array;
}

/**
 * Extended HELLO payload with device registry info
 */
export interface ExtendedHelloPayload {
  deviceId: string;
  deviceName: string;
  protocolVersion: number;
  encrypted?: boolean;
  lastSequence?: number;

  /** Device registry version (Loro lamport clock) */
  registryVersion?: number;

  /** Base64-encoded Ed25519 public signing key */
  signingPublicKey?: string;

  /** Device IDs this device knows are revoked */
  knownRevocations?: string[];
}

/**
 * Helper to create a canonical revocation message for signing
 */
export function createRevocationMessage(
  deviceId: string,
  revokedAt: number,
  revokedBy: string
): string {
  return `revoke:${deviceId}:${revokedAt}:${revokedBy}`;
}

/**
 * Helper to format last seen time relative to now
 */
export function formatLastSeen(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Helper to get a human-readable platform name
 */
export function getPlatformDisplayName(platform: DevicePlatform): string {
  const names: Record<DevicePlatform, string> = {
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    ios: 'iOS',
    android: 'Android',
    web: 'Web',
  };
  return names[platform];
}
