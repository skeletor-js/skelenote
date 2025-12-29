/**
 * Device Registry CRDT Wrapper
 *
 * Manages the device registry using a Loro CRDT document. This enables
 * conflict-free synchronization of device information between peers.
 *
 * The registry tracks:
 * - All devices that have synced with this vault
 * - Device metadata (name, platform, version, etc.)
 * - Revocation records (signed to prevent forgery)
 */

import { LoroDoc, LoroMap } from 'loro-crdt';
import type {
  DeviceRecord,
  RevocationRecord,
  DeviceRegistryMeta,
  DeviceInfo,
  DeviceConnectionStatus,
} from './types';

/** Registry schema version for migrations */
const REGISTRY_VERSION = 1;

/** Loro map keys */
const DEVICES_KEY = 'devices';
const REVOCATIONS_KEY = 'revocations';
const META_KEY = 'meta';

/**
 * Device Registry manages device records and revocations in a Loro CRDT
 */
export class DeviceRegistry {
  private doc: LoroDoc;
  private onChangeCallback: (() => void) | null = null;

  constructor() {
    this.doc = new LoroDoc();
    this.initializeStructure();
  }

  /**
   * Initialize the CRDT structure if empty
   */
  private initializeStructure(): void {
    const root = this.doc.getMap('root');

    // Create devices map if it doesn't exist
    if (!root.get(DEVICES_KEY)) {
      root.setContainer(DEVICES_KEY, new LoroMap());
    }

    // Create revocations map if it doesn't exist
    if (!root.get(REVOCATIONS_KEY)) {
      root.setContainer(REVOCATIONS_KEY, new LoroMap());
    }

    // Create meta map if it doesn't exist
    if (!root.get(META_KEY)) {
      const meta = root.setContainer(META_KEY, new LoroMap());
      meta.set('version', REGISTRY_VERSION);
      meta.set('createdAt', Date.now());
    }
  }

  /**
   * Get the devices map
   */
  private getDevicesMap(): LoroMap<Record<string, unknown>> {
    return this.doc.getMap('root').get(DEVICES_KEY) as LoroMap<Record<string, unknown>>;
  }

  /**
   * Get the revocations map
   */
  private getRevocationsMap(): LoroMap<Record<string, unknown>> {
    return this.doc.getMap('root').get(REVOCATIONS_KEY) as LoroMap<Record<string, unknown>>;
  }

  /**
   * Register or update a device in the registry
   */
  registerDevice(record: DeviceRecord): void {
    const devices = this.getDevicesMap();
    const deviceMap = devices.setContainer(record.deviceId, new LoroMap());

    deviceMap.set('deviceId', record.deviceId);
    deviceMap.set('name', record.name);
    deviceMap.set('platform', record.platform);
    deviceMap.set('appVersion', record.appVersion);
    deviceMap.set('publicSigningKey', record.publicSigningKey);
    deviceMap.set('firstSeen', record.firstSeen);
    deviceMap.set('lastSeen', record.lastSeen);
    deviceMap.set('createdBy', record.createdBy);

    this.notifyChange();
  }

  /**
   * Update a device's lastSeen timestamp
   */
  updateLastSeen(deviceId: string, timestamp: number = Date.now()): void {
    const devices = this.getDevicesMap();
    const deviceData = devices.get(deviceId);

    if (deviceData && typeof deviceData === 'object') {
      const deviceMap = devices.get(deviceId) as LoroMap<Record<string, unknown>>;
      deviceMap.set('lastSeen', timestamp);
      this.notifyChange();
    }
  }

  /**
   * Update a device's name
   */
  renameDevice(deviceId: string, newName: string): void {
    const devices = this.getDevicesMap();
    const deviceData = devices.get(deviceId);

    if (deviceData && typeof deviceData === 'object') {
      const deviceMap = devices.get(deviceId) as LoroMap<Record<string, unknown>>;
      deviceMap.set('name', newName);
      this.notifyChange();
    }
  }

  /**
   * Add a revocation record
   *
   * Note: Caller must verify the signature before adding!
   */
  addRevocation(revocation: RevocationRecord): void {
    const revocations = this.getRevocationsMap();
    const revocationMap = revocations.setContainer(revocation.deviceId, new LoroMap());

    revocationMap.set('deviceId', revocation.deviceId);
    revocationMap.set('revokedAt', revocation.revokedAt);
    revocationMap.set('revokedBy', revocation.revokedBy);
    if (revocation.reason) {
      revocationMap.set('reason', revocation.reason);
    }
    revocationMap.set('signature', revocation.signature);

    this.notifyChange();
  }

  /**
   * Check if a device has been revoked
   */
  isRevoked(deviceId: string): boolean {
    const revocations = this.getRevocationsMap();
    return revocations.get(deviceId) !== undefined;
  }

  /**
   * Get a device record by ID
   */
  getDevice(deviceId: string): DeviceRecord | null {
    const devices = this.getDevicesMap();
    const deviceData = devices.get(deviceId);

    if (!deviceData || typeof deviceData !== 'object') {
      return null;
    }

    const deviceMap = deviceData as LoroMap<Record<string, unknown>>;
    return {
      deviceId: deviceMap.get('deviceId') as string,
      name: deviceMap.get('name') as string,
      platform: deviceMap.get('platform') as DeviceRecord['platform'],
      appVersion: deviceMap.get('appVersion') as string,
      publicSigningKey: deviceMap.get('publicSigningKey') as string,
      firstSeen: deviceMap.get('firstSeen') as number,
      lastSeen: deviceMap.get('lastSeen') as number,
      createdBy: deviceMap.get('createdBy') as string,
    };
  }

  /**
   * Get all device records
   */
  getAllDevices(): DeviceRecord[] {
    const devices = this.getDevicesMap();
    const result: DeviceRecord[] = [];

    // Iterate over all device entries
    const entries = devices.entries();
    for (const [, value] of entries) {
      if (value && typeof value === 'object') {
        const deviceMap = value as unknown as LoroMap<Record<string, unknown>>;
        result.push({
          deviceId: deviceMap.get('deviceId') as string,
          name: deviceMap.get('name') as string,
          platform: deviceMap.get('platform') as DeviceRecord['platform'],
          appVersion: deviceMap.get('appVersion') as string,
          publicSigningKey: deviceMap.get('publicSigningKey') as string,
          firstSeen: deviceMap.get('firstSeen') as number,
          lastSeen: deviceMap.get('lastSeen') as number,
          createdBy: deviceMap.get('createdBy') as string,
        });
      }
    }

    return result;
  }

  /**
   * Get all revocation records
   */
  getAllRevocations(): RevocationRecord[] {
    const revocations = this.getRevocationsMap();
    const result: RevocationRecord[] = [];

    const entries = revocations.entries();
    for (const [, value] of entries) {
      if (value && typeof value === 'object') {
        const revMap = value as unknown as LoroMap<Record<string, unknown>>;
        result.push({
          deviceId: revMap.get('deviceId') as string,
          revokedAt: revMap.get('revokedAt') as number,
          revokedBy: revMap.get('revokedBy') as string,
          reason: revMap.get('reason') as string | undefined,
          signature: revMap.get('signature') as string,
        });
      }
    }

    return result;
  }

  /**
   * Get revoked device IDs
   */
  getRevokedDeviceIds(): string[] {
    const revocations = this.getRevocationsMap();
    const result: string[] = [];

    const entries = revocations.entries();
    for (const [deviceId] of entries) {
      result.push(deviceId);
    }

    return result;
  }

  /**
   * Get a revocation record for a device
   */
  getRevocation(deviceId: string): RevocationRecord | null {
    const revocations = this.getRevocationsMap();
    const revData = revocations.get(deviceId);

    if (!revData || typeof revData !== 'object') {
      return null;
    }

    const revMap = revData as LoroMap<Record<string, unknown>>;
    return {
      deviceId: revMap.get('deviceId') as string,
      revokedAt: revMap.get('revokedAt') as number,
      revokedBy: revMap.get('revokedBy') as string,
      reason: revMap.get('reason') as string | undefined,
      signature: revMap.get('signature') as string,
    };
  }

  /**
   * Get combined device info for UI display
   */
  getDeviceInfo(
    deviceId: string,
    currentDeviceId: string,
    connectionStatus: DeviceConnectionStatus = 'offline'
  ): DeviceInfo | null {
    const device = this.getDevice(deviceId);
    if (!device) return null;

    return {
      ...device,
      isCurrentDevice: deviceId === currentDeviceId,
      status: connectionStatus,
      isRevoked: this.isRevoked(deviceId),
    };
  }

  /**
   * Get all devices as DeviceInfo for UI display
   */
  getAllDeviceInfo(
    currentDeviceId: string,
    connectionStatuses: Map<string, DeviceConnectionStatus> = new Map()
  ): DeviceInfo[] {
    const devices = this.getAllDevices();

    return devices.map((device) => ({
      ...device,
      isCurrentDevice: device.deviceId === currentDeviceId,
      status: connectionStatuses.get(device.deviceId) || 'offline',
      isRevoked: this.isRevoked(device.deviceId),
    }));
  }

  /**
   * Get registry metadata
   */
  getMeta(): DeviceRegistryMeta {
    const root = this.doc.getMap('root');
    const meta = root.get(META_KEY) as LoroMap<Record<string, unknown>>;

    return {
      version: (meta.get('version') as number) || REGISTRY_VERSION,
      createdAt: (meta.get('createdAt') as number) || Date.now(),
    };
  }

  /**
   * Get the Loro document version (lamport clock)
   * Used for comparing registry versions between peers
   */
  getVersion(): number {
    // Use frontiers length as a simple version indicator
    const frontiers = this.doc.frontiers();
    return frontiers.length;
  }

  /**
   * Export the registry as a binary snapshot
   */
  export(): Uint8Array {
    return this.doc.export({ mode: 'snapshot' });
  }

  /**
   * Export incremental updates since a version
   */
  exportUpdates(): Uint8Array {
    return this.doc.export({ mode: 'update' });
  }

  /**
   * Import a registry snapshot (merge via CRDT)
   */
  import(data: Uint8Array): void {
    this.doc.import(data);
    this.notifyChange();
  }

  /**
   * Import from a fresh snapshot, replacing current state
   */
  importSnapshot(data: Uint8Array): void {
    this.doc = new LoroDoc();
    this.doc.import(data);
    this.notifyChange();
  }

  /**
   * Subscribe to registry changes
   */
  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  /**
   * Notify listeners of changes
   */
  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  /**
   * Get device count (excluding revoked)
   */
  getActiveDeviceCount(): number {
    const devices = this.getAllDevices();
    return devices.filter((d) => !this.isRevoked(d.deviceId)).length;
  }

  /**
   * Check if registry is empty
   */
  isEmpty(): boolean {
    return this.getAllDevices().length === 0;
  }
}

/**
 * Create a new device record for the current device
 */
export function createDeviceRecord(params: {
  deviceId: string;
  name: string;
  platform: DeviceRecord['platform'];
  appVersion: string;
  publicSigningKey: string;
  createdBy?: string;
}): DeviceRecord {
  const now = Date.now();
  return {
    deviceId: params.deviceId,
    name: params.name,
    platform: params.platform,
    appVersion: params.appVersion,
    publicSigningKey: params.publicSigningKey,
    firstSeen: now,
    lastSeen: now,
    createdBy: params.createdBy || params.deviceId,
  };
}
