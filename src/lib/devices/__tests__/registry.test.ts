/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceRegistry, createDeviceRecord } from '../registry';

describe('DeviceRegistry', () => {
  let registry: DeviceRegistry;

  beforeEach(() => {
    registry = new DeviceRegistry();
  });

  describe('Device management', () => {
    it('should register a device', () => {
      const record = createDeviceRecord({
        deviceId: 'device-1',
        name: 'Test Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key1',
      });

      registry.registerDevice(record);

      const retrieved = registry.getDevice('device-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.deviceId).toBe('device-1');
      expect(retrieved?.name).toBe('Test Device');
      expect(retrieved?.publicSigningKey).toBe('key1');
    });

    it('should update last seen', () => {
      const record = createDeviceRecord({
        deviceId: 'device-1',
        name: 'Test Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key1',
      });
      registry.registerDevice(record);

      const newTime = Date.now() + 1000;
      registry.updateLastSeen('device-1', newTime);

      expect(registry.getDevice('device-1')?.lastSeen).toBe(newTime);
    });

    it('should use default timestamp in updateLastSeen', () => {
      const record = createDeviceRecord({
        deviceId: 'device-1',
        name: 'Test Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key1',
      });
      registry.registerDevice(record);

      const before = Date.now();
      registry.updateLastSeen('device-1');
      const after = Date.now();

      const lastSeen = registry.getDevice('device-1')?.lastSeen;
      expect(lastSeen).toBeGreaterThanOrEqual(before);
      expect(lastSeen).toBeLessThanOrEqual(after);
    });

    it('should not crash when updating lastSeen for non-existent device', () => {
      // Should not throw
      registry.updateLastSeen('non-existent', Date.now());
      expect(registry.getDevice('non-existent')).toBeNull();
    });

    it('should rename device', () => {
      const record = createDeviceRecord({
        deviceId: 'device-1',
        name: 'Old Name',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key1',
      });
      registry.registerDevice(record);

      registry.renameDevice('device-1', 'New Name');
      expect(registry.getDevice('device-1')?.name).toBe('New Name');
    });

    it('should not crash when renaming non-existent device', () => {
      // Should not throw
      registry.renameDevice('non-existent', 'New Name');
      expect(registry.getDevice('non-existent')).toBeNull();
    });

    it('should list all devices', () => {
      const d1 = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      const d2 = createDeviceRecord({
        deviceId: 'd2',
        name: 'D2',
        platform: 'windows',
        appVersion: '1',
        publicSigningKey: 'k2',
      });

      registry.registerDevice(d1);
      registry.registerDevice(d2);

      const all = registry.getAllDevices();
      expect(all).toHaveLength(2);
      expect(all.map((d) => d.deviceId).sort()).toEqual(['d1', 'd2']);
    });

    it('should return null for non-existent device', () => {
      expect(registry.getDevice('non-existent')).toBeNull();
    });
  });

  describe('Revocation', () => {
    it('should add and check revocation', () => {
      const revocation = {
        deviceId: 'device-1',
        revokedAt: Date.now(),
        revokedBy: 'admin',
        signature: 'sig',
        reason: 'lost',
      };

      registry.addRevocation(revocation);

      expect(registry.isRevoked('device-1')).toBe(true);
      expect(registry.getRevocation('device-1')).toEqual(revocation);
      expect(registry.getRevokedDeviceIds()).toContain('device-1');
    });

    it('should add revocation without reason', () => {
      const revocation = {
        deviceId: 'device-2',
        revokedAt: Date.now(),
        revokedBy: 'admin',
        signature: 'sig',
      };

      registry.addRevocation(revocation);

      expect(registry.isRevoked('device-2')).toBe(true);
      const retrieved = registry.getRevocation('device-2');
      expect(retrieved?.reason).toBeUndefined();
    });

    it('should return null for non-revoked device', () => {
      expect(registry.isRevoked('safe-device')).toBe(false);
      expect(registry.getRevocation('safe-device')).toBeNull();
    });

    it('should get all revocations', () => {
      registry.addRevocation({
        deviceId: 'r1',
        revokedAt: 1000,
        revokedBy: 'admin',
        signature: 's1',
        reason: 'lost',
      });
      registry.addRevocation({
        deviceId: 'r2',
        revokedAt: 2000,
        revokedBy: 'admin',
        signature: 's2',
      });

      const all = registry.getAllRevocations();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.deviceId).sort()).toEqual(['r1', 'r2']);
    });
  });

  describe('Device Info', () => {
    it('should get device info for current device', () => {
      const record = createDeviceRecord({
        deviceId: 'current',
        name: 'Current Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key',
      });
      registry.registerDevice(record);

      const info = registry.getDeviceInfo('current', 'current', 'online');

      expect(info).toBeDefined();
      expect(info?.isCurrentDevice).toBe(true);
      expect(info?.status).toBe('online');
      expect(info?.isRevoked).toBe(false);
    });

    it('should get device info for other device', () => {
      const record = createDeviceRecord({
        deviceId: 'other',
        name: 'Other Device',
        platform: 'ios',
        appVersion: '1.0.0',
        publicSigningKey: 'key',
      });
      registry.registerDevice(record);

      const info = registry.getDeviceInfo('other', 'current', 'syncing');

      expect(info?.isCurrentDevice).toBe(false);
      expect(info?.status).toBe('syncing');
    });

    it('should get device info with default offline status', () => {
      const record = createDeviceRecord({
        deviceId: 'dev',
        name: 'Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key',
      });
      registry.registerDevice(record);

      const info = registry.getDeviceInfo('dev', 'current');
      expect(info?.status).toBe('offline');
    });

    it('should return null for non-existent device info', () => {
      const info = registry.getDeviceInfo('non-existent', 'current');
      expect(info).toBeNull();
    });

    it('should show revoked status in device info', () => {
      const record = createDeviceRecord({
        deviceId: 'revoked-dev',
        name: 'Revoked Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key',
      });
      registry.registerDevice(record);
      registry.addRevocation({
        deviceId: 'revoked-dev',
        revokedAt: Date.now(),
        revokedBy: 'admin',
        signature: 'sig',
      });

      const info = registry.getDeviceInfo('revoked-dev', 'current');
      expect(info?.isRevoked).toBe(true);
    });

    it('should get all device info', () => {
      const d1 = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      const d2 = createDeviceRecord({
        deviceId: 'd2',
        name: 'D2',
        platform: 'ios',
        appVersion: '1',
        publicSigningKey: 'k2',
      });
      registry.registerDevice(d1);
      registry.registerDevice(d2);

      const statuses = new Map([['d1', 'online' as const]]);
      const allInfo = registry.getAllDeviceInfo('d1', statuses);

      expect(allInfo).toHaveLength(2);
      const info1 = allInfo.find((i) => i.deviceId === 'd1');
      const info2 = allInfo.find((i) => i.deviceId === 'd2');
      expect(info1?.isCurrentDevice).toBe(true);
      expect(info1?.status).toBe('online');
      expect(info2?.isCurrentDevice).toBe(false);
      expect(info2?.status).toBe('offline');
    });

    it('should get all device info with default empty statuses', () => {
      const d1 = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      registry.registerDevice(d1);

      const allInfo = registry.getAllDeviceInfo('d1');
      expect(allInfo[0]?.status).toBe('offline');
    });
  });

  describe('Active device count and isEmpty', () => {
    it('should count active devices excluding revoked', () => {
      const d1 = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      const d2 = createDeviceRecord({
        deviceId: 'd2',
        name: 'D2',
        platform: 'ios',
        appVersion: '1',
        publicSigningKey: 'k2',
      });
      registry.registerDevice(d1);
      registry.registerDevice(d2);

      expect(registry.getActiveDeviceCount()).toBe(2);

      registry.addRevocation({
        deviceId: 'd1',
        revokedAt: Date.now(),
        revokedBy: 'admin',
        signature: 'sig',
      });

      expect(registry.getActiveDeviceCount()).toBe(1);
    });

    it('should report empty registry', () => {
      expect(registry.isEmpty()).toBe(true);

      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      registry.registerDevice(record);

      expect(registry.isEmpty()).toBe(false);
    });
  });

  describe('onChange callback', () => {
    it('should notify on device registration', () => {
      const callback = vi.fn();
      registry.onChange(callback);

      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      registry.registerDevice(record);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should notify on lastSeen update', () => {
      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      registry.registerDevice(record);

      const callback = vi.fn();
      registry.onChange(callback);

      registry.updateLastSeen('d1');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should notify on rename', () => {
      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      registry.registerDevice(record);

      const callback = vi.fn();
      registry.onChange(callback);

      registry.renameDevice('d1', 'New Name');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should notify on revocation', () => {
      const callback = vi.fn();
      registry.onChange(callback);

      registry.addRevocation({
        deviceId: 'd1',
        revokedAt: Date.now(),
        revokedBy: 'admin',
        signature: 'sig',
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should notify on import', () => {
      const r1 = new DeviceRegistry();
      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      r1.registerDevice(record);
      const snapshot = r1.export();

      const callback = vi.fn();
      registry.onChange(callback);
      registry.importSnapshot(snapshot);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Import/Export', () => {
    it('should export and import snapshot', async () => {
      const record = createDeviceRecord({
        deviceId: 'device-1',
        name: 'Source Device',
        platform: 'macos',
        appVersion: '1.0.0',
        publicSigningKey: 'key1',
      });
      registry.registerDevice(record);

      const snapshot = registry.export();

      const newRegistry = new DeviceRegistry();
      newRegistry.importSnapshot(snapshot);

      expect(newRegistry.getDevice('device-1')).toEqual(
        registry.getDevice('device-1')
      );
    });

    it('should sync updates between registries', () => {
      const r1 = new DeviceRegistry();

      // Update r1
      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      r1.registerDevice(record);

      // Export full snapshot and import to r2 using importSnapshot
      // Note: For fresh registries, use export() snapshot rather than exportUpdates()
      // because independently initialized registries have conflicting structures
      const snapshot = r1.export();
      const r2 = new DeviceRegistry();
      r2.importSnapshot(snapshot);

      expect(r2.getDevice('d1')).toEqual(r1.getDevice('d1'));
    });

    it('should export and import updates', () => {
      const r1 = new DeviceRegistry();
      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      r1.registerDevice(record);

      // Export updates
      const updates = r1.exportUpdates();
      expect(updates).toBeInstanceOf(Uint8Array);
      expect(updates.length).toBeGreaterThan(0);
    });

    it('should merge via import()', () => {
      const r1 = new DeviceRegistry();
      const record = createDeviceRecord({
        deviceId: 'd1',
        name: 'D1',
        platform: 'macos',
        appVersion: '1',
        publicSigningKey: 'k1',
      });
      r1.registerDevice(record);

      const r2 = new DeviceRegistry();
      const snapshot = r1.export();
      r2.import(snapshot);

      expect(r2.getDevice('d1')).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should return metadata', () => {
      const meta = registry.getMeta();
      expect(meta.version).toBeDefined();
      expect(meta.createdAt).toBeDefined();
    });

    it('should return version/frontiers', () => {
      expect(registry.getVersion()).toBeDefined();
    });
  });
});

describe('createDeviceRecord', () => {
  it('should create record with all fields', () => {
    const before = Date.now();
    const record = createDeviceRecord({
      deviceId: 'test-id',
      name: 'Test Device',
      platform: 'linux',
      appVersion: '2.0.0',
      publicSigningKey: 'pub-key',
      createdBy: 'admin-device',
    });
    const after = Date.now();

    expect(record.deviceId).toBe('test-id');
    expect(record.name).toBe('Test Device');
    expect(record.platform).toBe('linux');
    expect(record.appVersion).toBe('2.0.0');
    expect(record.publicSigningKey).toBe('pub-key');
    expect(record.createdBy).toBe('admin-device');
    expect(record.firstSeen).toBeGreaterThanOrEqual(before);
    expect(record.firstSeen).toBeLessThanOrEqual(after);
    expect(record.lastSeen).toBe(record.firstSeen);
  });

  it('should default createdBy to deviceId', () => {
    const record = createDeviceRecord({
      deviceId: 'self-created',
      name: 'Self',
      platform: 'android',
      appVersion: '1.0.0',
      publicSigningKey: 'key',
    });

    expect(record.createdBy).toBe('self-created');
  });
});
