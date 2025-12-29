/**
 * Device Management Module
 *
 * Provides device registry, revocation, and management functionality.
 */

// Types
export type {
  DevicePlatform,
  DeviceConnectionStatus,
  DeviceRecord,
  RevocationRecord,
  DeviceInfo,
  DeviceRegistryMeta,
  DeviceRevokePayload,
  DeviceRevokeAckPayload,
  DeviceRenamePayload,
  DeviceUpdatePayload,
  DeviceRegistryPayload,
  ExtendedHelloPayload,
} from './types';

export {
  createRevocationMessage,
  formatLastSeen,
  getPlatformDisplayName,
} from './types';

// Registry
export { DeviceRegistry, createDeviceRecord } from './registry';

// Store
export {
  DeviceRegistryStore,
  getDeviceRegistryStore,
  resetDeviceRegistryStore,
} from './store';

// Tauri Commands
export {
  getSigningPublicKey,
  signRevocation,
  verifyRevocation,
  createSignedRevocation,
} from './commands';
