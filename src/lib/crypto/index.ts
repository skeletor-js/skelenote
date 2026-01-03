/**
 * Crypto module for zero-knowledge sync
 *
 * Provides end-to-end encryption using the Skeleton Key.
 * All cryptographic operations are performed in the Rust backend.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Check if running in Tauri environment
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Initialize the crypto subsystem
 *
 * Must be called on app startup. This sets up the key storage
 * and loads any existing Skeleton Key.
 *
 * @returns true if a Skeleton Key already exists, false if first run
 */
export async function initCrypto(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  try {
    return await invoke<boolean>('crypto_init');
  } catch (err) {
    console.error('[Crypto] initCrypto failed:', err);
    throw err;
  }
}

/**
 * Generate a new Skeleton Key (BIP39 mnemonic)
 *
 * Returns 24 words that the user must save securely.
 * This does NOT store the key - call importKey() to store it.
 *
 * @returns 24-word mnemonic phrase
 */
export async function generateKey(): Promise<string> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    return await invoke<string>('crypto_generate_key');
  } catch (err) {
    console.error('[Crypto] generateKey failed:', err);
    throw err;
  }
}

/**
 * Import and store a Skeleton Key from mnemonic
 *
 * Validates the mnemonic, derives the master key, and stores it
 * securely for future use.
 *
 * @param mnemonic - 24-word BIP39 mnemonic phrase
 * @throws Error if mnemonic is invalid
 */
export async function importKey(mnemonic: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    await invoke<void>('crypto_import_key', { mnemonic });
  } catch (err) {
    console.error('[Crypto] importKey failed:', err);
    throw err;
  }
}

/**
 * Check if a Skeleton Key exists
 *
 * @returns true if a key has been imported/generated
 */
export async function hasKey(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  try {
    return await invoke<boolean>('crypto_has_key');
  } catch (err) {
    console.error('[Crypto] hasKey failed:', err);
    return false;
  }
}

/**
 * Encrypt data for sync transmission
 *
 * Encrypts the provided data using XChaCha20-Poly1305 with the
 * sync key derived from the Skeleton Key.
 *
 * @param data - Plaintext bytes to encrypt (e.g., Loro update)
 * @returns Encrypted bytes (nonce + ciphertext + auth tag)
 * @throws Error if no Skeleton Key is available
 */
export async function encrypt(data: Uint8Array): Promise<Uint8Array> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    const result = await invoke<number[]>('crypto_encrypt', {
      data: Array.from(data),
    });
    return new Uint8Array(result);
  } catch (err) {
    console.error('[Crypto] encrypt failed:', err);
    throw err;
  }
}

/**
 * Decrypt data received from sync
 *
 * Decrypts data that was encrypted with encrypt().
 *
 * @param data - Encrypted bytes to decrypt
 * @returns Decrypted plaintext bytes
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export async function decrypt(data: Uint8Array): Promise<Uint8Array> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    const result = await invoke<number[]>('crypto_decrypt', {
      data: Array.from(data),
    });
    return new Uint8Array(result);
  } catch (err) {
    console.error('[Crypto] decrypt failed:', err);
    throw err;
  }
}

/**
 * Generate a QR code for the Skeleton Key
 *
 * Creates an SVG QR code that can be scanned to transfer
 * the Skeleton Key to another device.
 *
 * @param mnemonic - The mnemonic phrase to encode
 * @returns SVG as a base64 data URI (can be used in img src)
 */
export async function generateQR(mnemonic: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    return await invoke<string>('crypto_generate_qr', { mnemonic });
  } catch (err) {
    console.error('[Crypto] generateQR failed:', err);
    throw err;
  }
}

/**
 * Parse a QR code payload to extract the mnemonic
 *
 * Extracts the mnemonic from a scanned QR code payload.
 *
 * @param payload - The raw QR code data
 * @returns The mnemonic phrase
 * @throws Error if payload format is invalid
 */
export async function parseQR(payload: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    return await invoke<string>('crypto_parse_qr', { payload });
  } catch (err) {
    console.error('[Crypto] parseQR failed:', err);
    throw err;
  }
}

/**
 * Validate a mnemonic phrase
 *
 * Checks if the provided string is a valid BIP39 mnemonic.
 *
 * @param mnemonic - The phrase to validate
 * @returns true if valid BIP39 mnemonic
 */
export async function validateMnemonic(mnemonic: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  try {
    return await invoke<boolean>('crypto_validate_mnemonic', { mnemonic });
  } catch (err) {
    console.error('[Crypto] validateMnemonic failed:', err);
    return false;
  }
}

/**
 * Get the derived user ID from the Skeleton Key
 *
 * Returns a deterministic user ID that is the same for all devices
 * with the same Skeleton Key. This ensures they sync to the same room.
 *
 * @returns UUID-like user ID derived from the Skeleton Key
 * @throws Error if no Skeleton Key is available
 */
export async function getDerivedUserId(): Promise<string> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    return await invoke<string>('crypto_get_user_id');
  } catch (err) {
    console.error('[Crypto] getDerivedUserId failed:', err);
    throw err;
  }
}

/**
 * Clear the Skeleton Key and all secrets
 *
 * Removes the master key from secure storage.
 * After calling this, the app will show the Skeleton Key setup screen.
 */
export async function clearKey(): Promise<void> {
  if (!isTauri()) {
    throw new Error('Crypto operations require Tauri environment');
  }
  try {
    await invoke<void>('crypto_clear_key');
  } catch (err) {
    console.error('[Crypto] clearKey failed:', err);
    throw err;
  }
}
