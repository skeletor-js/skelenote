/**
 * @vitest-environment jsdom
 *
 * Device Revocation Flow Integration Tests (P1)
 *
 * Tests the complete device revocation lifecycle:
 * - Revocation message creation and signing
 * - Blocklist enforcement
 * - Revocation sync between devices
 * - Blocklist persistence
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeviceRegistryStore, resetDeviceRegistryStore } from '../store';
import { DeviceRegistry, createDeviceRecord } from '../registry';
import type { RevocationRecord, DeviceRecord } from '../types';

// In-memory file storage
let memoryFs: Map<string, Uint8Array>;

// Mock Tauri path APIs
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/app/data'),
  join: vi.fn().mockImplementation(async (...args) => args.join('/')),
}));

// Mock Tauri FS APIs
vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi
    .fn()
    .mockImplementation(async (path: string) => memoryFs.has(path)),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockImplementation(async (path: string) => {
    const data = memoryFs.get(path);
    if (!data) throw new Error('File not found');
    return data;
  }),
  writeFile: vi
    .fn()
    .mockImplementation(async (path: string, data: Uint8Array) => {
      memoryFs.set(path, data);
    }),
}));

// Helper to create a mock revocation record
function createMockRevocation(
  deviceId: string,
  revokedBy: string,
  reason?: string
): RevocationRecord {
  return {
    deviceId,
    revokedAt: Date.now(),
    revokedBy,
    reason,
    signature: `mock-signature-${deviceId}-${revokedBy}`,
  };
}

// Helper to create test device records
function createTestDevice(
  deviceId: string,
  name: string,
  createdBy?: string
): DeviceRecord {
  return createDeviceRecord({
    deviceId,
    name,
    platform: 'macos',
    appVersion: '1.0.0',
    publicSigningKey: `mock-public-key-${deviceId}`,
    createdBy: createdBy || deviceId,
  });
}

describe('Device Revocation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryFs = new Map();
    resetDeviceRegistryStore();
  });

  afterEach(() => {
    memoryFs.clear();
    resetDeviceRegistryStore();
  });

  describe('revocation', () => {
    it('revokes device and adds to blocklist', async () => {
      // 1. Create store and initialize
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      // 2. Register devices A, B, C
      store.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });

      store.registerPeerDevice(createTestDevice('device-b', 'Device B'));
      store.registerPeerDevice(createTestDevice('device-c', 'Device C'));

      // Verify all devices registered
      expect(store.getAllDevices()).toHaveLength(3);

      // 3. Device A revokes device B
      const revocation = createMockRevocation(
        'device-b',
        'device-a',
        'Lost device'
      );
      store.revokeDevice(revocation);

      // 4. Verify B on blocklist
      expect(store.isBlocked('device-b')).toBe(true);
      expect(store.isRevoked('device-b')).toBe(true);

      // 5. Verify A and C not on blocklist
      expect(store.isBlocked('device-a')).toBe(false);
      expect(store.isBlocked('device-c')).toBe(false);
      expect(store.isRevoked('device-a')).toBe(false);
      expect(store.isRevoked('device-c')).toBe(false);

      // 6. Verify revocation record stored
      const revocations = store.getAllRevocations();
      expect(revocations).toHaveLength(1);
      expect(revocations[0].deviceId).toBe('device-b');
      expect(revocations[0].revokedBy).toBe('device-a');
      expect(revocations[0].reason).toBe('Lost device');
    });

    it('maintains active device count after revocation', async () => {
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      // Register 3 devices
      store.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store.registerPeerDevice(createTestDevice('device-b', 'Device B'));
      store.registerPeerDevice(createTestDevice('device-c', 'Device C'));

      // Initially 3 active devices
      expect(store.getActiveDeviceCount()).toBe(3);

      // Revoke one
      store.revokeDevice(createMockRevocation('device-b', 'device-a'));

      // Now 2 active devices
      expect(store.getActiveDeviceCount()).toBe(2);
    });

    it('multiple revocations work correctly', async () => {
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      // Register 5 devices
      store.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store.registerPeerDevice(createTestDevice('device-b', 'Device B'));
      store.registerPeerDevice(createTestDevice('device-c', 'Device C'));
      store.registerPeerDevice(createTestDevice('device-d', 'Device D'));
      store.registerPeerDevice(createTestDevice('device-e', 'Device E'));

      expect(store.getActiveDeviceCount()).toBe(5);

      // Revoke multiple devices
      store.revokeDevice(createMockRevocation('device-b', 'device-a'));
      store.revokeDevice(createMockRevocation('device-d', 'device-a'));

      // Verify revocations
      expect(store.isRevoked('device-b')).toBe(true);
      expect(store.isRevoked('device-d')).toBe(true);
      expect(store.isRevoked('device-c')).toBe(false);
      expect(store.isRevoked('device-e')).toBe(false);

      expect(store.getActiveDeviceCount()).toBe(3);
      expect(store.getRevokedDeviceIds()).toEqual(
        expect.arrayContaining(['device-b', 'device-d'])
      );
    });
  });

  describe('blocklist message filtering', () => {
    it('can identify blocked devices before processing messages', async () => {
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      store.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store.registerPeerDevice(createTestDevice('device-b', 'Device B'));

      // Revoke device B
      store.revokeDevice(createMockRevocation('device-b', 'device-a'));

      // Simulate receiving update with sender check
      const incomingUpdate = {
        senderId: 'device-b',
        data: new Uint8Array([1, 2, 3]),
      };

      // Application code would check this before processing
      const shouldProcess = !store.isBlocked(incomingUpdate.senderId);
      expect(shouldProcess).toBe(false);

      // Unrevoked device should be processable
      const validUpdate = {
        senderId: 'device-c',
        data: new Uint8Array([4, 5, 6]),
      };
      expect(store.isBlocked(validUpdate.senderId)).toBe(false);
    });

    it('addToBlocklist provides immediate local enforcement', async () => {
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      // Add to blocklist directly (without full revocation)
      store.addToBlocklist('suspicious-device');

      // Immediately blocked
      expect(store.isBlocked('suspicious-device')).toBe(true);

      // But not in CRDT revocations (no signed revocation)
      expect(store.isRevoked('suspicious-device')).toBe(false);
    });
  });

  describe('revocation sync between devices', () => {
    it('syncs revocation via CRDT import', async () => {
      // Use raw DeviceRegistry to test CRDT sync behavior
      const registryA = new DeviceRegistry();

      // Register devices
      registryA.registerDevice(createTestDevice('device-a', 'Device A'));
      registryA.registerDevice(createTestDevice('device-b', 'Device B'));
      registryA.registerDevice(createTestDevice('device-c', 'Device C'));

      // Device A revokes device B
      registryA.addRevocation(
        createMockRevocation('device-b', 'device-a', 'Compromised')
      );

      // Export state from A
      const syncData = registryA.export();

      // Create registry C and import snapshot
      const registryC = new DeviceRegistry();
      registryC.importSnapshot(syncData);

      // Verify device C now has the revocation
      expect(registryC.isRevoked('device-b')).toBe(true);
      expect(registryC.isRevoked('device-a')).toBe(false);
      expect(registryC.isRevoked('device-c')).toBe(false);

      // Verify the revocation record was synced
      const revocations = registryC.getAllRevocations();
      expect(revocations).toHaveLength(1);
      expect(revocations[0].deviceId).toBe('device-b');
      expect(revocations[0].reason).toBe('Compromised');

      // Verify devices were synced
      expect(registryC.getAllDevices()).toHaveLength(3);
    });

    it('store handles sync update and updates blocklist when sharing common history', async () => {
      // Create store A and set up initial state
      const storeA = new DeviceRegistryStore();
      await storeA.initialize('device-a');

      storeA.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      storeA.registerPeerDevice(createTestDevice('device-b', 'Device B'));
      storeA.registerPeerDevice(createTestDevice('device-c', 'Device C'));

      // Export initial shared state
      const sharedState = storeA.exportForSync();

      // Create store C from the same shared state
      resetDeviceRegistryStore();
      memoryFs.clear();

      const storeC = new DeviceRegistryStore();
      await storeC.initialize('device-c');
      storeC.handleSyncUpdate(sharedState); // Start from same base

      // Verify initial state - device-b is not revoked
      expect(storeC.isRevoked('device-b')).toBe(false);

      // Now store A revokes device B
      storeA.revokeDevice(
        createMockRevocation('device-b', 'device-a', 'Compromised')
      );
      const updatedState = storeA.exportForSync();

      // Store C receives the updated state
      storeC.handleSyncUpdate(updatedState);

      // Now device-b should be revoked in store C
      expect(storeC.isRevoked('device-b')).toBe(true);
      expect(storeC.isBlocked('device-b')).toBe(true);
    });

    it('merges revocations via CRDT', () => {
      // Registry A starts with devices
      const registryA = new DeviceRegistry();
      registryA.registerDevice(createTestDevice('device-a', 'Device A'));
      registryA.registerDevice(createTestDevice('device-b', 'Device B'));
      registryA.registerDevice(createTestDevice('device-c', 'Device C'));
      registryA.registerDevice(createTestDevice('device-d', 'Device D'));

      // Export initial state and create B from it
      const initialState = registryA.export();
      const registryB = new DeviceRegistry();
      registryB.importSnapshot(initialState);

      // A revokes device-b
      registryA.addRevocation(createMockRevocation('device-b', 'device-a'));

      // B revokes device-c
      registryB.addRevocation(createMockRevocation('device-c', 'device-d'));

      // Exchange updates
      const updateFromA = registryA.export();
      const updateFromB = registryB.export();

      // Import into each other
      registryA.import(updateFromB);
      registryB.import(updateFromA);

      // Both should have both revocations
      expect(registryA.isRevoked('device-b')).toBe(true);
      expect(registryA.isRevoked('device-c')).toBe(true);
      expect(registryB.isRevoked('device-b')).toBe(true);
      expect(registryB.isRevoked('device-c')).toBe(true);
    });
  });

  describe('blocklist persistence', () => {
    it('persists blocklist across restarts', async () => {
      // 1. Create store and revoke device
      const store1 = new DeviceRegistryStore();
      await store1.initialize('device-a');

      store1.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store1.registerPeerDevice(createTestDevice('device-b', 'Device B'));

      store1.revokeDevice(createMockRevocation('device-b', 'device-a'));

      // Wait for debounced saves
      await store1.save();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify blocklist file was written
      const blocklistPath = '/app/data/data/blocklist.json';
      expect(memoryFs.has(blocklistPath)).toBe(true);

      const blocklistData = memoryFs.get(blocklistPath);
      const blocklist = JSON.parse(new TextDecoder().decode(blocklistData!));
      expect(blocklist.revokedDeviceIds).toContain('device-b');

      // 2. Create new store instance (simulating restart)
      resetDeviceRegistryStore();
      const store2 = new DeviceRegistryStore();
      await store2.initialize('device-a');

      // 3. Verify still blocked
      expect(store2.isBlocked('device-b')).toBe(true);
      expect(store2.isRevoked('device-b')).toBe(true);
    });

    it('persists registry across restarts', async () => {
      // 1. Create store and add devices
      const store1 = new DeviceRegistryStore();
      await store1.initialize('device-a');

      store1.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store1.registerPeerDevice(createTestDevice('device-b', 'Device B'));
      store1.revokeDevice(createMockRevocation('device-b', 'device-a'));

      // Wait for debounced saves
      await store1.save();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify registry file was written
      const registryPath = '/app/data/data/devices.loro';
      expect(memoryFs.has(registryPath)).toBe(true);

      // 2. Create new store instance (simulating restart)
      resetDeviceRegistryStore();
      const store2 = new DeviceRegistryStore();
      await store2.initialize('device-a');

      // 3. Verify data loaded
      const devices = store2.getAllDevices();
      expect(devices.length).toBeGreaterThanOrEqual(1);

      // Device A should be present
      expect(store2.getDevice('device-a')).not.toBeNull();

      // Revocation should be present
      expect(store2.isRevoked('device-b')).toBe(true);
    });
  });

  describe('device info with revocation status', () => {
    it('includes revocation status in device info', async () => {
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      store.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store.registerPeerDevice(createTestDevice('device-b', 'Device B'));

      // Before revocation
      const infoBefore = store.getDeviceInfo('device-b');
      expect(infoBefore?.isRevoked).toBe(false);

      // Revoke
      store.revokeDevice(createMockRevocation('device-b', 'device-a'));

      // After revocation
      const infoAfter = store.getDeviceInfo('device-b');
      expect(infoAfter?.isRevoked).toBe(true);
    });

    it('getAllDeviceInfo reflects revocation status', async () => {
      const store = new DeviceRegistryStore();
      await store.initialize('device-a');

      store.registerCurrentDevice({
        name: 'Device A',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key-a',
      });
      store.registerPeerDevice(createTestDevice('device-b', 'Device B'));
      store.registerPeerDevice(createTestDevice('device-c', 'Device C'));

      store.revokeDevice(createMockRevocation('device-b', 'device-a'));

      const allInfo = store.getAllDeviceInfo();

      const deviceA = allInfo.find((d) => d.deviceId === 'device-a');
      const deviceB = allInfo.find((d) => d.deviceId === 'device-b');
      const deviceC = allInfo.find((d) => d.deviceId === 'device-c');

      expect(deviceA?.isRevoked).toBe(false);
      expect(deviceA?.isCurrentDevice).toBe(true);
      expect(deviceB?.isRevoked).toBe(true);
      expect(deviceC?.isRevoked).toBe(false);
    });
  });

  describe('CRDT registry sync', () => {
    it('registry export/importSnapshot works correctly', () => {
      const registry1 = new DeviceRegistry();

      // Add devices
      registry1.registerDevice(createTestDevice('device-a', 'Device A'));
      registry1.registerDevice(createTestDevice('device-b', 'Device B'));

      // Add revocation
      registry1.addRevocation(createMockRevocation('device-b', 'device-a'));

      // Export as snapshot
      const snapshot = registry1.export();

      // Create new registry and import snapshot (full replacement)
      const registry2 = new DeviceRegistry();
      registry2.importSnapshot(snapshot);

      // Verify state matches
      expect(registry2.getAllDevices()).toHaveLength(2);
      expect(registry2.isRevoked('device-b')).toBe(true);
      expect(registry2.isRevoked('device-a')).toBe(false);
    });

    it('registry merges concurrent changes from shared origin', () => {
      // Create initial registry and export
      const registryOrigin = new DeviceRegistry();
      registryOrigin.registerDevice(
        createTestDevice('device-shared', 'Shared')
      );
      const originSnapshot = registryOrigin.export();

      // Create two registries from same origin
      const registryA = new DeviceRegistry();
      registryA.importSnapshot(originSnapshot);

      const registryB = new DeviceRegistry();
      registryB.importSnapshot(originSnapshot);

      // A adds device-x
      registryA.registerDevice(createTestDevice('device-x', 'Device X'));

      // B adds device-y
      registryB.registerDevice(createTestDevice('device-y', 'Device Y'));

      // Exchange updates (using export which includes full state)
      const snapshotA = registryA.export();
      const snapshotB = registryB.export();

      // Import into each other
      registryA.import(snapshotB);
      registryB.import(snapshotA);

      // Both should have all devices
      expect(registryA.getAllDevices()).toHaveLength(3);
      expect(registryB.getAllDevices()).toHaveLength(3);

      expect(registryA.getDevice('device-x')).not.toBeNull();
      expect(registryA.getDevice('device-y')).not.toBeNull();
      expect(registryB.getDevice('device-x')).not.toBeNull();
      expect(registryB.getDevice('device-y')).not.toBeNull();
    });

    it('registry tracks changes via device count', () => {
      const registry = new DeviceRegistry();

      // Initially empty
      expect(registry.isEmpty()).toBe(true);
      expect(registry.getAllDevices()).toHaveLength(0);

      // Add device
      registry.registerDevice(createTestDevice('device-a', 'Device A'));
      expect(registry.isEmpty()).toBe(false);
      expect(registry.getAllDevices()).toHaveLength(1);

      // Add revocation
      registry.addRevocation(createMockRevocation('device-a', 'device-b'));
      expect(registry.isRevoked('device-a')).toBe(true);
      expect(registry.getActiveDeviceCount()).toBe(0);
    });
  });
});
