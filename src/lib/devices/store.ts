/**
 * Device Registry Store
 *
 * Manages persistence and sync integration for the device registry.
 * The registry syncs through both P2P local network and Cloudflare relay.
 */

import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { DeviceRegistry, createDeviceRecord } from './registry';
import type {
  DeviceRecord,
  RevocationRecord,
  DeviceInfo,
  DeviceConnectionStatus,
  DevicePlatform,
} from './types';

/** Filename for the device registry */
const REGISTRY_FILENAME = 'devices.loro';

/** Filename for the local blocklist cache */
const BLOCKLIST_FILENAME = 'blocklist.json';

/**
 * Local blocklist for immediate revocation enforcement
 */
interface LocalBlocklist {
  /** Revoked device IDs */
  revokedDeviceIds: string[];
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Device Registry Store manages persistence and sync for the device registry
 */
export class DeviceRegistryStore {
  private registry: DeviceRegistry;
  private dataPath: string | null = null;
  private initialized = false;
  private currentDeviceId: string | null = null;
  private localBlocklist: Set<string> = new Set();

  // Sync callbacks
  private onRegistryChangeCallback: (() => void) | null = null;
  private broadcastCallback: ((data: Uint8Array) => Promise<void>) | null =
    null;

  // Debounce timers
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private broadcastDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.registry = new DeviceRegistry();

    // Subscribe to registry changes
    this.registry.onChange(() => {
      this.handleRegistryChange();
    });
  }

  /**
   * Initialize the store
   */
  async initialize(currentDeviceId: string): Promise<void> {
    if (this.initialized) return;

    this.currentDeviceId = currentDeviceId;

    try {
      // Get the app data directory path
      const appData = await appDataDir();
      this.dataPath = await join(appData, 'data');

      // Create data directory if it doesn't exist
      const dirExists = await exists(this.dataPath);
      if (!dirExists) {
        await mkdir(this.dataPath, { recursive: true });
      }

      // Load existing registry
      await this.load();

      // Load local blocklist
      await this.loadBlocklist();

      this.initialized = true;
    } catch (error) {
      console.error('[DeviceRegistryStore] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load the registry from disk
   */
  async load(): Promise<void> {
    if (!this.dataPath) {
      throw new Error('DeviceRegistryStore not initialized');
    }

    const filePath = await join(this.dataPath, REGISTRY_FILENAME);
    const fileExists = await exists(filePath);

    if (!fileExists) {
      return;
    }

    try {
      const data = await readFile(filePath);
      this.registry.importSnapshot(data);
    } catch (error) {
      console.error('[DeviceRegistryStore] Failed to load registry:', error);
    }
  }

  /**
   * Save the registry to disk (debounced)
   */
  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(async () => {
      this.saveDebounceTimer = null;
      await this.save();
    }, 500);
  }

  /**
   * Save the registry to disk immediately
   */
  async save(): Promise<void> {
    if (!this.initialized || !this.dataPath) {
      throw new Error('DeviceRegistryStore not initialized');
    }

    try {
      const filePath = await join(this.dataPath, REGISTRY_FILENAME);
      const data = this.registry.export();
      await writeFile(filePath, data);
    } catch (error) {
      console.error('[DeviceRegistryStore] Failed to save registry:', error);
    }
  }

  /**
   * Load the local blocklist from disk
   */
  private async loadBlocklist(): Promise<void> {
    if (!this.dataPath) return;

    const filePath = await join(this.dataPath, BLOCKLIST_FILENAME);
    const fileExists = await exists(filePath);

    if (!fileExists) return;

    try {
      const data = await readFile(filePath);
      const json = new TextDecoder().decode(data);
      const blocklist: LocalBlocklist = JSON.parse(json);
      this.localBlocklist = new Set(blocklist.revokedDeviceIds);
    } catch (error) {
      console.error('[DeviceRegistryStore] Failed to load blocklist:', error);
    }
  }

  /**
   * Save the local blocklist to disk
   */
  private async saveBlocklist(): Promise<void> {
    if (!this.dataPath) return;

    try {
      const filePath = await join(this.dataPath, BLOCKLIST_FILENAME);
      const blocklist: LocalBlocklist = {
        revokedDeviceIds: Array.from(this.localBlocklist),
        updatedAt: Date.now(),
      };
      const data = new TextEncoder().encode(JSON.stringify(blocklist, null, 2));
      await writeFile(filePath, data);
    } catch (error) {
      console.error('[DeviceRegistryStore] Failed to save blocklist:', error);
    }
  }

  /**
   * Handle registry changes (called by CRDT on change)
   */
  private handleRegistryChange(): void {
    // Schedule save
    this.scheduleSave();

    // Update local blocklist from CRDT revocations
    const revocations = this.registry.getAllRevocations();
    for (const rev of revocations) {
      this.localBlocklist.add(rev.deviceId);
    }

    // Schedule broadcast
    this.scheduleBroadcast();

    // Notify listeners
    if (this.onRegistryChangeCallback) {
      this.onRegistryChangeCallback();
    }
  }

  /**
   * Schedule a broadcast of registry updates (debounced)
   */
  private scheduleBroadcast(): void {
    if (!this.broadcastCallback) return;

    if (this.broadcastDebounceTimer) {
      clearTimeout(this.broadcastDebounceTimer);
    }

    this.broadcastDebounceTimer = setTimeout(async () => {
      this.broadcastDebounceTimer = null;
      if (this.broadcastCallback) {
        const data = this.registry.export();
        await this.broadcastCallback(data);
      }
    }, 100);
  }

  // ============================================================================
  // Device Management API
  // ============================================================================

  /**
   * Register the current device
   */
  registerCurrentDevice(params: {
    name: string;
    platform: DevicePlatform;
    appVersion: string;
    publicSigningKey: string;
  }): void {
    if (!this.currentDeviceId) {
      throw new Error('Store not initialized - no current device ID');
    }

    const record = createDeviceRecord({
      deviceId: this.currentDeviceId,
      name: params.name,
      platform: params.platform,
      appVersion: params.appVersion,
      publicSigningKey: params.publicSigningKey,
    });

    this.registry.registerDevice(record);
  }

  /**
   * Register or update a peer device
   */
  registerPeerDevice(record: DeviceRecord): void {
    this.registry.registerDevice(record);
  }

  /**
   * Update the current device's lastSeen timestamp
   */
  updateCurrentDeviceLastSeen(): void {
    if (this.currentDeviceId) {
      this.registry.updateLastSeen(this.currentDeviceId);
    }
  }

  /**
   * Update a device's lastSeen timestamp
   */
  updateDeviceLastSeen(deviceId: string): void {
    this.registry.updateLastSeen(deviceId);
  }

  /**
   * Rename a device
   */
  renameDevice(deviceId: string, newName: string): void {
    this.registry.renameDevice(deviceId, newName);
  }

  /**
   * Revoke a device
   *
   * @param revocation - The revocation record (must include valid signature)
   */
  revokeDevice(revocation: RevocationRecord): void {
    // Add to local blocklist immediately
    this.localBlocklist.add(revocation.deviceId);

    // Add to CRDT registry
    this.registry.addRevocation(revocation);

    // Save blocklist
    this.saveBlocklist();
  }

  /**
   * Add a device to the local blocklist (immediate enforcement)
   */
  addToBlocklist(deviceId: string): void {
    this.localBlocklist.add(deviceId);
    this.saveBlocklist();
  }

  /**
   * Check if a device is blocked (local blocklist)
   */
  isBlocked(deviceId: string): boolean {
    return this.localBlocklist.has(deviceId);
  }

  /**
   * Check if a device is revoked (CRDT registry)
   */
  isRevoked(deviceId: string): boolean {
    return this.registry.isRevoked(deviceId);
  }

  /**
   * Get a device record
   */
  getDevice(deviceId: string): DeviceRecord | null {
    return this.registry.getDevice(deviceId);
  }

  /**
   * Get all devices
   */
  getAllDevices(): DeviceRecord[] {
    return this.registry.getAllDevices();
  }

  /**
   * Get all revocations
   */
  getAllRevocations(): RevocationRecord[] {
    return this.registry.getAllRevocations();
  }

  /**
   * Get revoked device IDs
   */
  getRevokedDeviceIds(): string[] {
    return this.registry.getRevokedDeviceIds();
  }

  /**
   * Get device info for UI display
   */
  getDeviceInfo(
    deviceId: string,
    connectionStatus: DeviceConnectionStatus = 'offline'
  ): DeviceInfo | null {
    if (!this.currentDeviceId) return null;
    return this.registry.getDeviceInfo(
      deviceId,
      this.currentDeviceId,
      connectionStatus
    );
  }

  /**
   * Get all devices for UI display
   */
  getAllDeviceInfo(
    connectionStatuses: Map<string, DeviceConnectionStatus> = new Map()
  ): DeviceInfo[] {
    if (!this.currentDeviceId) return [];
    return this.registry.getAllDeviceInfo(
      this.currentDeviceId,
      connectionStatuses
    );
  }

  /**
   * Get active (non-revoked) device count
   */
  getActiveDeviceCount(): number {
    return this.registry.getActiveDeviceCount();
  }

  /**
   * Get registry version for sync comparison
   */
  getRegistryVersion(): number {
    return this.registry.getVersion();
  }

  // ============================================================================
  // Sync Integration
  // ============================================================================

  /**
   * Set callback for registry changes
   */
  onRegistryChange(callback: () => void): void {
    this.onRegistryChangeCallback = callback;
  }

  /**
   * Set broadcast callback for sync
   */
  setBroadcastCallback(callback: (data: Uint8Array) => Promise<void>): void {
    this.broadcastCallback = callback;
  }

  /**
   * Handle incoming registry sync data
   */
  handleSyncUpdate(data: Uint8Array): void {
    try {
      this.registry.import(data);

      // Update local blocklist from new revocations
      const revocations = this.registry.getAllRevocations();
      for (const rev of revocations) {
        if (!this.localBlocklist.has(rev.deviceId)) {
          this.localBlocklist.add(rev.deviceId);
        }
      }

      this.saveBlocklist();
    } catch (error) {
      console.error(
        '[DeviceRegistryStore] Failed to import sync update:',
        error
      );
    }
  }

  /**
   * Export registry for sync
   */
  exportForSync(): Uint8Array {
    return this.registry.export();
  }

  /**
   * Get current device ID
   */
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  /**
   * Check if store is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Singleton instance of the device registry store
 */
let deviceRegistryStore: DeviceRegistryStore | null = null;

/**
 * Get the singleton device registry store instance
 */
export function getDeviceRegistryStore(): DeviceRegistryStore {
  if (!deviceRegistryStore) {
    deviceRegistryStore = new DeviceRegistryStore();
  }
  return deviceRegistryStore;
}

/**
 * Reset the singleton (for testing)
 */
export function resetDeviceRegistryStore(): void {
  deviceRegistryStore = null;
}
