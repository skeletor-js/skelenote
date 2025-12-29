/**
 * Tauri Commands for Device Management
 *
 * TypeScript bindings for the Rust device management commands.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Get the Ed25519 public signing key for this device
 *
 * Returns the public key as a base64-encoded string.
 * All devices with the same Skeleton Key will have the same signing keypair.
 */
export async function getSigningPublicKey(): Promise<string> {
  return invoke<string>('device_get_signing_public_key');
}

/**
 * Sign a device revocation
 *
 * Creates an Ed25519 signature over the canonical revocation message.
 *
 * @param deviceId - The device ID being revoked
 * @param revokedAt - Unix timestamp (ms) of revocation
 * @param revokedBy - Device ID performing the revocation
 * @returns Base64-encoded signature
 */
export async function signRevocation(
  deviceId: string,
  revokedAt: number,
  revokedBy: string
): Promise<string> {
  return invoke<string>('device_sign_revocation', {
    deviceId,
    revokedAt,
    revokedBy,
  });
}

/**
 * Verify a device revocation signature
 *
 * @param deviceId - The device ID that was revoked
 * @param revokedAt - Unix timestamp (ms) of revocation
 * @param revokedBy - Device ID that performed the revocation
 * @param signature - Base64-encoded Ed25519 signature
 * @param publicKey - Base64-encoded Ed25519 public key
 * @returns True if signature is valid
 */
export async function verifyRevocation(
  deviceId: string,
  revokedAt: number,
  revokedBy: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  return invoke<boolean>('device_verify_revocation', {
    deviceId,
    revokedAt,
    revokedBy,
    signature,
    publicKey,
  });
}

/**
 * Create a signed revocation record
 *
 * Convenience function that signs a revocation and returns a complete record.
 *
 * @param deviceId - The device ID to revoke
 * @param revokedBy - This device's ID (the revoker)
 * @param reason - Optional reason for revocation
 */
export async function createSignedRevocation(
  deviceId: string,
  revokedBy: string,
  reason?: string
): Promise<{
  deviceId: string;
  revokedAt: number;
  revokedBy: string;
  reason?: string;
  signature: string;
}> {
  const revokedAt = Date.now();
  const signature = await signRevocation(deviceId, revokedAt, revokedBy);

  return {
    deviceId,
    revokedAt,
    revokedBy,
    reason,
    signature,
  };
}
