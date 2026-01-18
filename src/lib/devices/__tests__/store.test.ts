/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DeviceRegistryStore,
  getDeviceRegistryStore,
  resetDeviceRegistryStore,
} from '../store';
import { createDeviceRecord } from '../registry';

// Mock dependencies
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/app/data'),
  join: vi
    .fn()
    .mockImplementation((...args) => Promise.resolve(args.join('/'))),
}));

const mockFiles = new Map<string, Uint8Array>();
vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn().mockImplementation(async (path) => mockFiles.has(path)),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockImplementation(async (path) => {
    if (!mockFiles.has(path)) throw new Error('File not found');
    return mockFiles.get(path);
  }),
  writeFile: vi.fn().mockImplementation(async (path, data) => {
    mockFiles.set(path, data);
  }),
}));

describe('DeviceRegistryStore', () => {
  let store: DeviceRegistryStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFiles.clear();
    store = new DeviceRegistryStore();
  });

  describe('Initialization', () => {
    it('should initialize and create directory', async () => {
      await store.initialize('current-device-id');
      expect(store.isInitialized()).toBe(true);
      expect(store.getCurrentDeviceId()).toBe('current-device-id');
    });

    it('should skip re-initialization', async () => {
      await store.initialize('device-1');
      await store.initialize('device-2'); // Should be ignored
      expect(store.getCurrentDeviceId()).toBe('device-1');
    });
  });

  describe('Device Registration', () => {
    it('should register current device', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Test Device',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      const device = store.getDevice('device-1');
      expect(device).toBeDefined();
      expect(device?.name).toBe('Test Device');
    });

    it('should throw if registering before initialization', () => {
      expect(() =>
        store.registerCurrentDevice({
          name: 'Test',
          platform: 'macos',
          appVersion: '1.0',
          publicSigningKey: 'key',
        })
      ).toThrow('Store not initialized');
    });

    it('should register peer device', async () => {
      await store.initialize('device-1');
      const peerRecord = createDeviceRecord({
        deviceId: 'peer-1',
        name: 'Peer Device',
        platform: 'ios',
        appVersion: '1.0',
        publicSigningKey: 'peer-key',
      });
      store.registerPeerDevice(peerRecord);

      const peer = store.getDevice('peer-1');
      expect(peer).toBeDefined();
      expect(peer?.name).toBe('Peer Device');
    });

    it('should get all devices', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Current',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key1',
      });
      store.registerPeerDevice(
        createDeviceRecord({
          deviceId: 'peer-1',
          name: 'Peer',
          platform: 'ios',
          appVersion: '1.0',
          publicSigningKey: 'key2',
        })
      );

      const all = store.getAllDevices();
      expect(all).toHaveLength(2);
    });
  });

  describe('Device Updates', () => {
    it('should rename device', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Old Name',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      store.renameDevice('device-1', 'New Name');
      expect(store.getDevice('device-1')?.name).toBe('New Name');
    });

    it('should update current device lastSeen', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Test',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      const before = store.getDevice('device-1')?.lastSeen;
      await new Promise((r) => setTimeout(r, 10));
      store.updateCurrentDeviceLastSeen();
      const after = store.getDevice('device-1')?.lastSeen;

      expect(after).toBeGreaterThanOrEqual(before!);
    });

    it('should update any device lastSeen', async () => {
      await store.initialize('device-1');
      store.registerPeerDevice(
        createDeviceRecord({
          deviceId: 'peer-1',
          name: 'Peer',
          platform: 'ios',
          appVersion: '1.0',
          publicSigningKey: 'key',
        })
      );

      store.updateDeviceLastSeen('peer-1');
      expect(store.getDevice('peer-1')?.lastSeen).toBeDefined();
    });

    it('should not crash updating lastSeen for non-existent current device', async () => {
      await store.initialize('device-1');
      // currentDeviceId is set but no device registered yet
      store.updateCurrentDeviceLastSeen();
      // Should not throw
    });
  });

  describe('Revocation', () => {
    it('should revoke device', async () => {
      await store.initialize('device-1');
      store.registerPeerDevice(
        createDeviceRecord({
          deviceId: 'bad-device',
          name: 'Bad',
          platform: 'android',
          appVersion: '1.0',
          publicSigningKey: 'key',
        })
      );

      store.revokeDevice({
        deviceId: 'bad-device',
        revokedAt: Date.now(),
        revokedBy: 'device-1',
        signature: 'sig',
        reason: 'compromised',
      });

      expect(store.isRevoked('bad-device')).toBe(true);
      expect(store.isBlocked('bad-device')).toBe(true);
      expect(store.getRevokedDeviceIds()).toContain('bad-device');
    });

    it('should get all revocations', async () => {
      await store.initialize('device-1');
      store.revokeDevice({
        deviceId: 'r1',
        revokedAt: Date.now(),
        revokedBy: 'device-1',
        signature: 's1',
      });
      store.revokeDevice({
        deviceId: 'r2',
        revokedAt: Date.now(),
        revokedBy: 'device-1',
        signature: 's2',
      });

      expect(store.getAllRevocations()).toHaveLength(2);
    });

    it('should persist blocklist', async () => {
      await store.initialize('device-1');
      store.addToBlocklist('blocked-device');

      // Wait for async save
      await new Promise((r) => setTimeout(r, 50));

      const newStore = new DeviceRegistryStore();
      await newStore.initialize('device-1');
      expect(newStore.isBlocked('blocked-device')).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should save and load registry', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Test Device',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      await store.save();

      const keys = Array.from(mockFiles.keys());
      expect(keys.some((k) => k.includes('devices.loro'))).toBe(true);

      const newStore = new DeviceRegistryStore();
      await newStore.initialize('device-1');

      const device = newStore.getDevice('device-1');
      expect(device).toBeDefined();
      expect(device?.name).toBe('Test Device');
    });

    it('should throw save if not initialized', async () => {
      await expect(store.save()).rejects.toThrow('not initialized');
    });
  });

  describe('Device Info for UI', () => {
    it('should get device info with connection status', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'My Device',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      const info = store.getDeviceInfo('device-1', 'connected');
      expect(info).toBeDefined();
      expect(info?.isCurrentDevice).toBe(true);
      expect(info?.status).toBe('connected');
    });

    it('should get device info with default offline status', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'My Device',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      const info = store.getDeviceInfo('device-1');
      expect(info?.status).toBe('offline');
    });

    it('should return null for device info before initialization', () => {
      expect(store.getDeviceInfo('any-device')).toBeNull();
    });

    it('should get all device info', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'My Device',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      const allInfo = store.getAllDeviceInfo();
      expect(allInfo).toHaveLength(1);
      expect(allInfo[0].isCurrentDevice).toBe(true);
    });

    it('should get all device info with status map', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Current',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'k1',
      });
      store.registerPeerDevice(
        createDeviceRecord({
          deviceId: 'peer-1',
          name: 'Peer',
          platform: 'ios',
          appVersion: '1.0',
          publicSigningKey: 'k2',
        })
      );

      const statuses = new Map([['peer-1', 'connecting' as const]]);
      const allInfo = store.getAllDeviceInfo(statuses);

      const peerInfo = allInfo.find((i) => i.deviceId === 'peer-1');
      expect(peerInfo?.status).toBe('connecting');
    });

    it('should return empty array for all device info before initialization', () => {
      expect(store.getAllDeviceInfo()).toEqual([]);
    });

    it('should get active device count', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Current',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'k1',
      });
      store.registerPeerDevice(
        createDeviceRecord({
          deviceId: 'peer-1',
          name: 'Peer',
          platform: 'ios',
          appVersion: '1.0',
          publicSigningKey: 'k2',
        })
      );

      expect(store.getActiveDeviceCount()).toBe(2);

      store.revokeDevice({
        deviceId: 'peer-1',
        revokedAt: Date.now(),
        revokedBy: 'device-1',
        signature: 'sig',
      });

      expect(store.getActiveDeviceCount()).toBe(1);
    });

    it('should get registry version', async () => {
      await store.initialize('device-1');
      expect(store.getRegistryVersion()).toBeDefined();
    });
  });

  describe('Sync Integration', () => {
    it('should set and call onRegistryChange callback', async () => {
      await store.initialize('device-1');
      const callback = vi.fn();
      store.onRegistryChange(callback);

      store.registerCurrentDevice({
        name: 'Test',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      // Callback should be called on registry change
      expect(callback).toHaveBeenCalled();
    });

    it('should set broadcast callback and export for sync', async () => {
      await store.initialize('device-1');
      const broadcastFn = vi.fn().mockResolvedValue(undefined);
      store.setBroadcastCallback(broadcastFn);

      store.registerCurrentDevice({
        name: 'Test',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      // Wait for debounced broadcast
      await new Promise((r) => setTimeout(r, 150));
      expect(broadcastFn).toHaveBeenCalled();
    });

    it('should export for sync', async () => {
      await store.initialize('device-1');
      store.registerCurrentDevice({
        name: 'Test',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'key',
      });

      const data = store.exportForSync();
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should handle sync update', async () => {
      // Create source store
      const sourceStore = new DeviceRegistryStore();
      await sourceStore.initialize('source-device');
      sourceStore.registerCurrentDevice({
        name: 'Source',
        platform: 'macos',
        appVersion: '1.0',
        publicSigningKey: 'source-key',
      });
      const exportedData = sourceStore.exportForSync();

      // Target store receives sync update
      await store.initialize('target-device');
      store.handleSyncUpdate(exportedData);

      expect(store.getDevice('source-device')).toBeDefined();
    });

    it('should update blocklist on sync update with revocations', async () => {
      const sourceStore = new DeviceRegistryStore();
      await sourceStore.initialize('source-device');
      sourceStore.revokeDevice({
        deviceId: 'bad-device',
        revokedAt: Date.now(),
        revokedBy: 'source-device',
        signature: 'sig',
      });
      const exportedData = sourceStore.exportForSync();

      await store.initialize('target-device');
      store.handleSyncUpdate(exportedData);

      expect(store.isBlocked('bad-device')).toBe(true);
    });
  });
});

describe('Singleton functions', () => {
  afterEach(() => {
    resetDeviceRegistryStore();
  });

  it('should return singleton instance', () => {
    const store1 = getDeviceRegistryStore();
    const store2 = getDeviceRegistryStore();
    expect(store1).toBe(store2);
  });

  it('should reset singleton', () => {
    const store1 = getDeviceRegistryStore();
    resetDeviceRegistryStore();
    const store2 = getDeviceRegistryStore();
    expect(store1).not.toBe(store2);
  });
});
