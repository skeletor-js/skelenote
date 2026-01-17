/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSigningPublicKey,
  signRevocation,
  verifyRevocation,
  createSignedRevocation,
  blockDevice,
  isDeviceBlocked,
  getBlockedDevices,
} from '../commands';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe('Device Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSigningPublicKey', () => {
    it('should invoke device_get_signing_public_key', async () => {
      mockInvoke.mockResolvedValue('mock-public-key');
      const result = await getSigningPublicKey();
      expect(mockInvoke).toHaveBeenCalledWith('device_get_signing_public_key');
      expect(result).toBe('mock-public-key');
    });
  });

  describe('signRevocation', () => {
    it('should invoke device_sign_revocation with correct args', async () => {
      mockInvoke.mockResolvedValue('mock-signature');
      const args = {
        deviceId: 'device-1',
        revokedAt: 1234567890,
        revokedBy: 'device-2',
      };

      const result = await signRevocation(
        args.deviceId,
        args.revokedAt,
        args.revokedBy
      );

      expect(mockInvoke).toHaveBeenCalledWith('device_sign_revocation', args);
      expect(result).toBe('mock-signature');
    });
  });

  describe('verifyRevocation', () => {
    it('should invoke device_verify_revocation with correct args', async () => {
      mockInvoke.mockResolvedValue(true);
      const args = {
        deviceId: 'device-1',
        revokedAt: 1234567890,
        revokedBy: 'device-2',
        signature: 'sig',
        publicKey: 'pub',
      };

      const result = await verifyRevocation(
        args.deviceId,
        args.revokedAt,
        args.revokedBy,
        args.signature,
        args.publicKey
      );

      expect(mockInvoke).toHaveBeenCalledWith('device_verify_revocation', args);
      expect(result).toBe(true);
    });
  });

  describe('createSignedRevocation', () => {
    it('should create a complete revocation record', async () => {
      mockInvoke.mockResolvedValue('mock-signature');

      const result = await createSignedRevocation(
        'target-id',
        'my-id',
        'stolen'
      );

      expect(mockInvoke).toHaveBeenCalledWith('device_sign_revocation', {
        deviceId: 'target-id',
        revokedAt: expect.any(Number),
        revokedBy: 'my-id',
      });

      expect(result).toEqual({
        deviceId: 'target-id',
        revokedAt: expect.any(Number),
        revokedBy: 'my-id',
        reason: 'stolen',
        signature: 'mock-signature',
      });
    });
  });

  describe('blockDevice', () => {
    it('should invoke device_block', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await blockDevice('bad-device');
      expect(mockInvoke).toHaveBeenCalledWith('device_block', {
        deviceId: 'bad-device',
      });
    });
  });

  describe('isDeviceBlocked', () => {
    it('should invoke device_is_blocked', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await isDeviceBlocked('bad-device');
      expect(mockInvoke).toHaveBeenCalledWith('device_is_blocked', {
        deviceId: 'bad-device',
      });
      expect(result).toBe(true);
    });
  });

  describe('getBlockedDevices', () => {
    it('should invoke device_get_blocked', async () => {
      const blocked = ['id1', 'id2'];
      mockInvoke.mockResolvedValue(blocked);
      const result = await getBlockedDevices();
      expect(mockInvoke).toHaveBeenCalledWith('device_get_blocked');
      expect(result).toEqual(blocked);
    });
  });
});
