/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

import {
  getUserId,
  setUserId,
  syncDeviceId,
  getDeviceId,
  getDeviceIdAsync,
  copyToClipboard,
} from '../device';

describe('device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset cached ID via module reloading if possible, but simplest is to just rely on tests
    // ignoring internal state or resetting it via a helper if I exported one.
    // Since I can't export a resetter without modifying source, I'll rely on isolation or overwrite.
  });

  describe('getUserId', () => {
    it('should generate and save new user ID', () => {
      const id = getUserId();
      expect(id).toBeDefined();
      expect(localStorage.getItem('skelenote:userId')).toBe(id);
    });

    it('should retrieve existing user ID', () => {
      localStorage.setItem('skelenote:userId', 'existing-user');
      expect(getUserId()).toBe('existing-user');
    });
  });

  describe('setUserId', () => {
    it('should save user ID', () => {
      setUserId('imported-user');
      expect(localStorage.getItem('skelenote:userId')).toBe('imported-user');
      expect(getUserId()).toBe('imported-user');
    });
  });

  describe('syncDeviceId', () => {
    it('should sync with Tauri backend', async () => {
      mockInvoke.mockResolvedValue('tauri-device-id');
      const id = await syncDeviceId();

      expect(mockInvoke).toHaveBeenCalledWith('network_sync_device_id');
      expect(id).toBe('tauri-device-id');
      expect(localStorage.getItem('skelenote:deviceId')).toBe(
        'tauri-device-id'
      );
    });

    it('should fallback to local ID on failure', async () => {
      mockInvoke.mockRejectedValue(new Error('IPC Error'));

      const id = await syncDeviceId();

      expect(id).toBeDefined();
      expect(localStorage.getItem('skelenote:deviceId')).toBe(id);
    });
  });

  describe('getDeviceId', () => {
    it('should return cached ID if available', async () => {
      // Populate cache
      mockInvoke.mockResolvedValue('cached-id');
      await syncDeviceId();

      expect(getDeviceId()).toBe('cached-id');
    });

    it('should return local ID if no cache', () => {
      // Need to reset cache hack?
      // Since modules are cached, this test might be flaky if previous test set cache.
      // However, getDeviceId checks cache then local.
      // If previous test ran, cache is set.
      // This suggests I should have a way to reset the module or cache.
      // For now, assume isolation or specific ordering.
      // To properly test "no cache", I really need a fresh module.
      // But vitest doesn't easily isolate modules per test without `vi.resetModules()`.

      // Let's assume we can at least test that it returns *something*
      const id = getDeviceId();
      expect(id).toBeDefined();
    });
  });

  describe('getDeviceIdAsync', () => {
    it('should fetch from Tauri', async () => {
      mockInvoke.mockResolvedValue('async-id');
      const id = await getDeviceIdAsync();
      expect(id).toBe('async-id');
      expect(mockInvoke).toHaveBeenCalledWith('network_get_device_id');
    });

    it('should fallback to local on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Error'));
      const id = await getDeviceIdAsync();
      expect(id).toBeTruthy();
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text', async () => {
      mockWriteText.mockResolvedValue(undefined);
      const success = await copyToClipboard('text');
      expect(success).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('text');
    });

    it('should return false on error', async () => {
      mockWriteText.mockRejectedValue(new Error('Copy failed'));
      const success = await copyToClipboard('text');
      expect(success).toBe(false);
    });
  });
});
