/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from '../index';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe('Crypto Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate Tauri environment by default

    (window as any).__TAURI_INTERNALS__ = {};
  });

  describe('initCrypto', () => {
    it('should invoke crypto_init if in Tauri', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await crypto.initCrypto();
      expect(mockInvoke).toHaveBeenCalledWith('crypto_init');
      expect(result).toBe(true);
    });

    it('should return false if not in Tauri', async () => {
      delete (window as any).__TAURI_INTERNALS__;
      const result = await crypto.initCrypto();
      expect(result).toBe(false);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    it('should invoke crypto_generate_key', async () => {
      mockInvoke.mockResolvedValue('word1 word2');
      const result = await crypto.generateKey();
      expect(mockInvoke).toHaveBeenCalledWith('crypto_generate_key');
      expect(result).toBe('word1 word2');
    });

    it('should throw if invoke fails', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Failed'));
      await expect(crypto.generateKey()).rejects.toThrow('Failed');
      consoleSpy.mockRestore();
    });
  });

  describe('importKey', () => {
    it('should invoke crypto_import_key', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await crypto.importKey('mnemonic');
      expect(mockInvoke).toHaveBeenCalledWith('crypto_import_key', {
        mnemonic: 'mnemonic',
      });
    });
  });

  describe('hasKey', () => {
    it('should return value from invoke', async () => {
      mockInvoke.mockResolvedValue(true);
      expect(await crypto.hasKey()).toBe(true);
    });

    it('should return false on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Failed'));
      expect(await crypto.hasKey()).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('Encryption', () => {
    it('encrypt should invoke crypto_encrypt', async () => {
      const data = new Uint8Array([1, 2]);
      mockInvoke.mockResolvedValue([3, 4]);
      const result = await crypto.encrypt(data);
      expect(mockInvoke).toHaveBeenCalledWith('crypto_encrypt', {
        data: [1, 2],
      });
      expect(result).toEqual(new Uint8Array([3, 4]));
    });

    it('decrypt should invoke crypto_decrypt', async () => {
      const data = new Uint8Array([3, 4]);
      mockInvoke.mockResolvedValue([1, 2]);
      const result = await crypto.decrypt(data);
      expect(mockInvoke).toHaveBeenCalledWith('crypto_decrypt', {
        data: [3, 4],
      });
      expect(result).toEqual(new Uint8Array([1, 2]));
    });
  });

  describe('Helpers', () => {
    it('validateMnemonic should invoke crypto_validate_mnemonic', async () => {
      mockInvoke.mockResolvedValue(true);
      expect(await crypto.validateMnemonic('foo')).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('crypto_validate_mnemonic', {
        mnemonic: 'foo',
      });
    });

    it('getDerivedUserId should invoke crypto_get_user_id', async () => {
      mockInvoke.mockResolvedValue('user-1');
      expect(await crypto.getDerivedUserId()).toBe('user-1');
    });

    it('clearKey should invoke crypto_clear_key', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await crypto.clearKey();
      expect(mockInvoke).toHaveBeenCalledWith('crypto_clear_key');
    });

    it('generateQR should invoke crypto_generate_qr', async () => {
      mockInvoke.mockResolvedValue('svg');
      expect(await crypto.generateQR('mnem')).toBe('svg');
    });

    it('parseQR should invoke crypto_parse_qr', async () => {
      mockInvoke.mockResolvedValue('mnem');
      expect(await crypto.parseQR('payload')).toBe('mnem');
    });
  });
});
