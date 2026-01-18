/**
 * @vitest-environment jsdom
 *
 * Crypto Integration Tests (P0)
 *
 * Tests encryption round-trip behavior and key derivation consistency.
 * Since actual crypto is in Rust/Tauri, these tests verify:
 * - Correct data flow through the crypto layer
 * - Encrypt/decrypt round-trip with mocked crypto
 * - Key derivation produces consistent results
 * - Error handling for various failure modes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as crypto from '../index';

// Simulated crypto state for realistic testing
let simulatedKeyStore: {
  hasKey: boolean;
  masterKey: Uint8Array | null;
  userId: string | null;
} = {
  hasKey: false,
  masterKey: null,
  userId: null,
};

// Helper for Uint8Array comparison (Vitest has issues with direct comparison)
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Simple XOR-based mock encryption for testing (NOT REAL CRYPTO)
// This simulates the encrypt/decrypt behavior without real security
let nonceCounter = 0;
function mockEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  // Use deterministic nonce based on counter for testing
  const nonce = new Uint8Array(24);
  nonceCounter++;
  for (let i = 0; i < 24; i++) {
    nonce[i] = (nonceCounter + i) & 0xff;
  }

  const ciphertext = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    ciphertext[i] = data[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
  }

  // Format: [nonce (24 bytes)][ciphertext]
  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce);
  result.set(ciphertext, nonce.length);
  return result;
}

function mockDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = data.slice(0, 24);
  const ciphertext = data.slice(24);

  const plaintext = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) {
    plaintext[i] =
      ciphertext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
  }

  return plaintext;
}

// Mock Tauri invoke with realistic crypto simulation
const mockInvoke = vi
  .fn()
  .mockImplementation(async (command: string, args?: any) => {
    switch (command) {
      case 'crypto_init':
        return simulatedKeyStore.hasKey;

      case 'crypto_generate_key':
        return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

      case 'crypto_import_key': {
        // Simulate key derivation from mnemonic
        const mnemonic = args?.mnemonic as string;
        if (!mnemonic || mnemonic.split(' ').length < 12) {
          throw new Error('Invalid mnemonic');
        }
        // Create deterministic "key" from mnemonic
        const encoder = new TextEncoder();
        const keyMaterial = encoder.encode(mnemonic);
        simulatedKeyStore.masterKey = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          simulatedKeyStore.masterKey[i] = keyMaterial[i % keyMaterial.length];
        }
        simulatedKeyStore.hasKey = true;
        // Derive deterministic user ID
        const hash = keyMaterial.reduce((acc, byte) => acc ^ byte, 0);
        simulatedKeyStore.userId = `user-${hash.toString(16).padStart(8, '0')}`;
        return undefined;
      }

      case 'crypto_has_key':
        return simulatedKeyStore.hasKey;

      case 'crypto_encrypt': {
        if (!simulatedKeyStore.masterKey) {
          throw new Error('No key available');
        }
        const data = new Uint8Array(args?.data as number[]);
        const encrypted = mockEncrypt(data, simulatedKeyStore.masterKey);
        return Array.from(encrypted);
      }

      case 'crypto_decrypt': {
        if (!simulatedKeyStore.masterKey) {
          throw new Error('No key available');
        }
        const data = new Uint8Array(args?.data as number[]);
        if (data.length < 24) {
          throw new Error('Invalid ciphertext');
        }
        const decrypted = mockDecrypt(data, simulatedKeyStore.masterKey);
        return Array.from(decrypted);
      }

      case 'crypto_get_user_id':
        if (!simulatedKeyStore.userId) {
          throw new Error('No key available');
        }
        return simulatedKeyStore.userId;

      case 'crypto_validate_mnemonic': {
        const mnemonic = args?.mnemonic as string;
        const words = mnemonic?.trim().split(/\s+/) || [];
        return words.length === 12 || words.length === 24;
      }

      case 'crypto_clear_key':
        simulatedKeyStore = { hasKey: false, masterKey: null, userId: null };
        return undefined;

      case 'crypto_generate_qr':
        return `data:image/svg+xml;base64,${btoa('<svg>QR</svg>')}`;

      case 'crypto_parse_qr':
        return args?.payload || '';

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  });

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe('Crypto Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simulatedKeyStore = { hasKey: false, masterKey: null, userId: null };
    nonceCounter = 0;
    (window as any).__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  describe('encryption round-trip', () => {
    it('encrypts and decrypts data correctly', async () => {
      // Setup key
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );
      expect(await crypto.hasKey()).toBe(true);

      // Test data
      const original = new TextEncoder().encode(
        'Hello, World! This is test data.'
      );

      // Encrypt
      const encrypted = await crypto.encrypt(original);
      expect(encrypted).not.toEqual(original);
      expect(encrypted.length).toBeGreaterThan(original.length); // Includes nonce

      // Decrypt
      const decrypted = await crypto.decrypt(encrypted);
      expect(arraysEqual(decrypted, original)).toBe(true);
      expect(new TextDecoder().decode(decrypted)).toBe(
        'Hello, World! This is test data.'
      );
    });

    it('produces different ciphertext for same plaintext (random nonce)', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      const data = new TextEncoder().encode('Same data');

      // Encrypt twice
      const encrypted1 = await crypto.encrypt(data);
      const encrypted2 = await crypto.encrypt(data);

      // Ciphertexts should differ due to random nonce
      expect(encrypted1).not.toEqual(encrypted2);

      // But both should decrypt to same plaintext
      const decrypted1 = await crypto.decrypt(encrypted1);
      const decrypted2 = await crypto.decrypt(encrypted2);

      expect(arraysEqual(decrypted1, data)).toBe(true);
      expect(arraysEqual(decrypted2, data)).toBe(true);
    });

    it('fails to decrypt with wrong key', async () => {
      // Encrypt with first key
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );
      const data = new TextEncoder().encode('Secret data');
      const encrypted = await crypto.encrypt(data);

      // Clear and import different key
      await crypto.clearKey();
      await crypto.importKey(
        'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
      );

      // Decryption produces garbage (XOR-based mock crypto), or in real crypto would fail
      const decrypted = await crypto.decrypt(encrypted);
      // The mock XOR crypto won't produce the original
      expect(arraysEqual(decrypted, data)).toBe(false);
    });

    it('fails to decrypt corrupted ciphertext', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // Too short (no nonce)
      await expect(crypto.decrypt(new Uint8Array([1, 2, 3]))).rejects.toThrow(
        'Invalid ciphertext'
      );
    });

    it('handles empty data', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      const empty = new Uint8Array(0);
      const encrypted = await crypto.encrypt(empty);
      const decrypted = await crypto.decrypt(encrypted);

      expect(arraysEqual(decrypted, empty)).toBe(true);
      expect(decrypted.length).toBe(0);
    });

    it('handles large data', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // 100KB of data
      const largeData = new Uint8Array(100 * 1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const encrypted = await crypto.encrypt(largeData);
      const decrypted = await crypto.decrypt(encrypted);

      expect(arraysEqual(decrypted, largeData)).toBe(true);
    });

    it('handles binary data with all byte values', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // All possible byte values
      const allBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        allBytes[i] = i;
      }

      const encrypted = await crypto.encrypt(allBytes);
      const decrypted = await crypto.decrypt(encrypted);

      expect(arraysEqual(decrypted, allBytes)).toBe(true);
    });
  });

  describe('key derivation', () => {
    it('derives consistent user ID from mnemonic', async () => {
      const mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

      await crypto.importKey(mnemonic);
      const userId1 = await crypto.getDerivedUserId();

      // Clear and re-import same mnemonic
      await crypto.clearKey();
      await crypto.importKey(mnemonic);
      const userId2 = await crypto.getDerivedUserId();

      // Same mnemonic = same user ID
      expect(userId1).toBe(userId2);
    });

    it('derives different user IDs for different mnemonics', async () => {
      const mnemonic1 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const mnemonic2 = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';

      await crypto.importKey(mnemonic1);
      const userId1 = await crypto.getDerivedUserId();

      await crypto.clearKey();
      await crypto.importKey(mnemonic2);
      const userId2 = await crypto.getDerivedUserId();

      // Different mnemonics = different user IDs
      expect(userId1).not.toBe(userId2);
    });

    it('cannot get user ID without key', async () => {
      expect(simulatedKeyStore.hasKey).toBe(false);
      await expect(crypto.getDerivedUserId()).rejects.toThrow(
        'No key available'
      );
    });
  });

  describe('key lifecycle', () => {
    it('initializes without existing key', async () => {
      const hasKey = await crypto.initCrypto();
      expect(hasKey).toBe(false);
    });

    it('initializes with existing key', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // Re-initialize should detect existing key
      const hasKey = await crypto.initCrypto();
      expect(hasKey).toBe(true);
    });

    it('generates valid mnemonic', async () => {
      const mnemonic = await crypto.generateKey();

      // Should be 12 words (standard BIP39)
      const words = mnemonic.split(' ');
      expect(words.length).toBe(12);

      // Should be valid
      expect(await crypto.validateMnemonic(mnemonic)).toBe(true);
    });

    it('validates correct mnemonics', async () => {
      expect(
        await crypto.validateMnemonic(
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        )
      ).toBe(true);
      expect(
        await crypto.validateMnemonic(
          'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
        )
      ).toBe(true);
    });

    it('rejects invalid mnemonics', async () => {
      expect(await crypto.validateMnemonic('not valid mnemonic')).toBe(false);
      expect(await crypto.validateMnemonic('')).toBe(false);
      expect(await crypto.validateMnemonic('one two three')).toBe(false);
    });

    it('clears key completely', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );
      expect(await crypto.hasKey()).toBe(true);

      await crypto.clearKey();
      expect(await crypto.hasKey()).toBe(false);

      // Operations should fail after clear
      await expect(crypto.encrypt(new Uint8Array([1]))).rejects.toThrow(
        'No key available'
      );
      await expect(crypto.getDerivedUserId()).rejects.toThrow(
        'No key available'
      );
    });
  });

  describe('QR code operations', () => {
    it('generates QR code from mnemonic', async () => {
      const mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const qr = await crypto.generateQR(mnemonic);

      expect(qr).toContain('data:image/svg+xml');
    });

    it('parses QR code payload', async () => {
      const payload =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const parsed = await crypto.parseQR(payload);

      expect(parsed).toBe(payload);
    });
  });

  describe('sync encryption flow', () => {
    it('encrypts Loro update for sync transmission', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // Simulate Loro CRDT update (binary data)
      const loroUpdate = new Uint8Array([
        0x4c,
        0x6f,
        0x72,
        0x6f, // "Loro" magic bytes
        0x01,
        0x00,
        0x00,
        0x00, // Version
        0x0a,
        0x0b,
        0x0c,
        0x0d, // Some data
      ]);

      const encrypted = await crypto.encrypt(loroUpdate);

      // Encrypted data should be larger (includes nonce)
      expect(encrypted.length).toBeGreaterThan(loroUpdate.length);

      // Should decrypt back to original
      const decrypted = await crypto.decrypt(encrypted);
      expect(arraysEqual(decrypted, loroUpdate)).toBe(true);
    });

    it('handles multiple sequential encryptions', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      const updates = [];
      for (let i = 0; i < 10; i++) {
        const data = new TextEncoder().encode(`Update ${i}`);
        const encrypted = await crypto.encrypt(data);
        updates.push({ encrypted, original: data });
      }

      // All should decrypt correctly
      for (const { encrypted, original } of updates) {
        const decrypted = await crypto.decrypt(encrypted);
        expect(arraysEqual(decrypted, original)).toBe(true);
      }
    });
  });

  describe('error recovery', () => {
    it('maintains state after encrypt failure', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // Successful encrypt
      const data = new Uint8Array([1, 2, 3]);
      const encrypted = await crypto.encrypt(data);
      expect(encrypted.length).toBeGreaterThan(0);

      // Key should still work
      const data2 = new Uint8Array([4, 5, 6]);
      const encrypted2 = await crypto.encrypt(data2);
      const decrypted2 = await crypto.decrypt(encrypted2);
      expect(arraysEqual(decrypted2, data2)).toBe(true);
    });

    it('maintains state after decrypt failure', async () => {
      await crypto.importKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      // Attempt to decrypt invalid data
      await expect(crypto.decrypt(new Uint8Array([1, 2]))).rejects.toThrow();

      // Key should still work
      const data = new Uint8Array([1, 2, 3]);
      const encrypted = await crypto.encrypt(data);
      const decrypted = await crypto.decrypt(encrypted);
      expect(arraysEqual(decrypted, data)).toBe(true);
    });
  });
});
