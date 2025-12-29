//! Ed25519 Digital Signatures for Device Management
//!
//! This module provides Ed25519 signing and verification for device revocations.
//! The signing key is derived from the master key (Skeleton Key) using HKDF,
//! ensuring that only devices with the same Skeleton Key can create valid revocations.
//!
//! ## Security Model
//!
//! - Signing keypair is derived deterministically from master key
//! - Each device with the same Skeleton Key derives the same keypair
//! - Revocation messages are signed to prevent forgery
//! - Verification ensures revocations came from a legitimate device

use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use hkdf::Hkdf;
use sha2::Sha256;
use zeroize::Zeroizing;

use super::error::CryptoError;
use super::keys::MASTER_KEY_LEN;

/// Ed25519 signing key length (32 bytes)
pub const SIGNING_KEY_LEN: usize = 32;

/// Ed25519 public key length (32 bytes)
pub const PUBLIC_KEY_LEN: usize = 32;

/// Ed25519 signature length (64 bytes)
pub const SIGNATURE_LEN: usize = 64;

/// Domain separation string for signing key derivation
const SIGNING_KEY_DOMAIN: &[u8] = b"skelenote-signing-v1";

/// Context info for HKDF expansion
const SIGNING_KEY_INFO: &[u8] = b"device-signing";

/// Derive Ed25519 signing key from master key using HKDF
///
/// This creates a deterministic signing key from the Skeleton Key, ensuring
/// that all devices with the same Skeleton Key can create and verify signatures.
pub fn derive_signing_key(master_key: &[u8; MASTER_KEY_LEN]) -> SigningKey {
    let hkdf = Hkdf::<Sha256>::new(Some(SIGNING_KEY_DOMAIN), master_key);

    let mut key_bytes = Zeroizing::new([0u8; SIGNING_KEY_LEN]);
    hkdf.expand(SIGNING_KEY_INFO, &mut *key_bytes)
        .expect("HKDF expand should not fail with valid key length");

    SigningKey::from_bytes(&key_bytes)
}

/// Get the public (verifying) key from a signing key
pub fn get_public_key(signing_key: &SigningKey) -> VerifyingKey {
    signing_key.verifying_key()
}

/// Get public key bytes for storage/transmission
pub fn get_public_key_bytes(signing_key: &SigningKey) -> [u8; PUBLIC_KEY_LEN] {
    signing_key.verifying_key().to_bytes()
}

/// Sign a message with the Ed25519 signing key
///
/// Returns the 64-byte signature.
pub fn sign_message(signing_key: &SigningKey, message: &[u8]) -> [u8; SIGNATURE_LEN] {
    let signature = signing_key.sign(message);
    signature.to_bytes()
}

/// Verify a signature against a message and public key
///
/// Returns Ok(()) if the signature is valid, Err otherwise.
pub fn verify_signature(
    public_key_bytes: &[u8; PUBLIC_KEY_LEN],
    message: &[u8],
    signature_bytes: &[u8; SIGNATURE_LEN],
) -> Result<(), CryptoError> {
    let public_key = VerifyingKey::from_bytes(public_key_bytes)
        .map_err(|e| CryptoError::SignatureError(format!("Invalid public key: {}", e)))?;

    let signature = Signature::from_bytes(signature_bytes);

    public_key
        .verify(message, &signature)
        .map_err(|e| CryptoError::SignatureError(format!("Signature verification failed: {}", e)))
}

/// Create a canonical message for device revocation signing
///
/// Format: "revoke:{deviceId}:{revokedAt}:{revokedBy}"
/// This ensures consistent message format across all implementations.
pub fn create_revocation_message(device_id: &str, revoked_at: u64, revoked_by: &str) -> Vec<u8> {
    format!("revoke:{}:{}:{}", device_id, revoked_at, revoked_by).into_bytes()
}

/// Sign a device revocation
///
/// Creates a signature over the canonical revocation message.
pub fn sign_revocation(
    signing_key: &SigningKey,
    device_id: &str,
    revoked_at: u64,
    revoked_by: &str,
) -> [u8; SIGNATURE_LEN] {
    let message = create_revocation_message(device_id, revoked_at, revoked_by);
    sign_message(signing_key, &message)
}

/// Verify a device revocation signature
///
/// Checks that the signature is valid for the given revocation parameters.
pub fn verify_revocation(
    public_key_bytes: &[u8; PUBLIC_KEY_LEN],
    device_id: &str,
    revoked_at: u64,
    revoked_by: &str,
    signature_bytes: &[u8; SIGNATURE_LEN],
) -> Result<(), CryptoError> {
    let message = create_revocation_message(device_id, revoked_at, revoked_by);
    verify_signature(public_key_bytes, &message, signature_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::keys::{generate_mnemonic, mnemonic_to_master_key};

    #[test]
    fn test_derive_signing_key_deterministic() {
        let mnemonic = generate_mnemonic().unwrap();
        let master_key = mnemonic_to_master_key(&mnemonic).unwrap();

        let key1 = derive_signing_key(&master_key);
        let key2 = derive_signing_key(&master_key);

        assert_eq!(key1.to_bytes(), key2.to_bytes());
    }

    #[test]
    fn test_sign_and_verify() {
        let mnemonic = generate_mnemonic().unwrap();
        let master_key = mnemonic_to_master_key(&mnemonic).unwrap();
        let signing_key = derive_signing_key(&master_key);
        let public_key = get_public_key_bytes(&signing_key);

        let message = b"test message";
        let signature = sign_message(&signing_key, message);

        // Should verify successfully
        assert!(verify_signature(&public_key, message, &signature).is_ok());

        // Should fail with wrong message
        let wrong_message = b"wrong message";
        assert!(verify_signature(&public_key, wrong_message, &signature).is_err());
    }

    #[test]
    fn test_revocation_signing() {
        let mnemonic = generate_mnemonic().unwrap();
        let master_key = mnemonic_to_master_key(&mnemonic).unwrap();
        let signing_key = derive_signing_key(&master_key);
        let public_key = get_public_key_bytes(&signing_key);

        let device_id = "device-123";
        let revoked_at = 1703980800000u64; // Unix timestamp
        let revoked_by = "device-456";

        let signature = sign_revocation(&signing_key, device_id, revoked_at, revoked_by);

        // Should verify successfully
        assert!(verify_revocation(&public_key, device_id, revoked_at, revoked_by, &signature).is_ok());

        // Should fail with different device_id
        assert!(verify_revocation(&public_key, "different-device", revoked_at, revoked_by, &signature).is_err());

        // Should fail with different timestamp
        assert!(verify_revocation(&public_key, device_id, revoked_at + 1, revoked_by, &signature).is_err());
    }

    #[test]
    fn test_different_master_keys_produce_different_signing_keys() {
        let mnemonic1 = generate_mnemonic().unwrap();
        let mnemonic2 = generate_mnemonic().unwrap();

        let master_key1 = mnemonic_to_master_key(&mnemonic1).unwrap();
        let master_key2 = mnemonic_to_master_key(&mnemonic2).unwrap();

        let signing_key1 = derive_signing_key(&master_key1);
        let signing_key2 = derive_signing_key(&master_key2);

        assert_ne!(signing_key1.to_bytes(), signing_key2.to_bytes());
    }

    #[test]
    fn test_cross_key_verification_fails() {
        // Create two different master keys
        let mnemonic1 = generate_mnemonic().unwrap();
        let mnemonic2 = generate_mnemonic().unwrap();

        let master_key1 = mnemonic_to_master_key(&mnemonic1).unwrap();
        let master_key2 = mnemonic_to_master_key(&mnemonic2).unwrap();

        let signing_key1 = derive_signing_key(&master_key1);
        let signing_key2 = derive_signing_key(&master_key2);

        let public_key2 = get_public_key_bytes(&signing_key2);

        // Sign with key1, try to verify with key2's public key
        let message = b"test message";
        let signature = sign_message(&signing_key1, message);

        // Should fail - signature was made with different key
        assert!(verify_signature(&public_key2, message, &signature).is_err());
    }
}
