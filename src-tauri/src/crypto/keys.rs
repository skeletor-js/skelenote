//! Key generation and derivation for zero-knowledge sync
//!
//! Uses BIP39 mnemonics for user-friendly key backup and HKDF for deriving
//! purpose-specific keys from the master key.

use bip39::{Language, Mnemonic};
use hkdf::Hkdf;
use sha2::Sha256;
use zeroize::Zeroizing;

use super::error::CryptoError;

/// Master key length (256 bits)
pub const MASTER_KEY_LEN: usize = 32;

/// Sync encryption key length (256 bits)
pub const SYNC_KEY_LEN: usize = 32;

/// Domain separation string for sync key derivation
const SYNC_KEY_DOMAIN: &[u8] = b"skelenote-sync-v1";

/// Context info for HKDF expansion
const SYNC_KEY_INFO: &[u8] = b"sync-encryption";

/// Domain separation string for user ID derivation
const USER_ID_DOMAIN: &[u8] = b"skelenote-userid-v1";

/// Context info for user ID derivation
const USER_ID_INFO: &[u8] = b"user-id";

/// Generate a new BIP39 mnemonic (24 words = 256 bits entropy)
///
/// Returns a space-separated string of 24 English words that can be
/// used to derive the master key.
pub fn generate_mnemonic() -> Result<String, CryptoError> {
    // Generate 32 bytes of entropy for a 24-word mnemonic
    let mut entropy = [0u8; 32];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut entropy);

    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy)?;
    Ok(mnemonic.to_string())
}

/// Derive master key from BIP39 mnemonic
///
/// Uses an empty passphrase for simplicity (no recovery mechanism).
/// The master key is wrapped in Zeroizing to ensure it's cleared from
/// memory when dropped.
pub fn mnemonic_to_master_key(mnemonic: &str) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, CryptoError> {
    let mnemonic = Mnemonic::parse_normalized(mnemonic)?;

    // BIP39 seed derivation with empty passphrase
    let seed = mnemonic.to_seed("");

    // Use first 32 bytes of the 64-byte seed as master key
    let mut master_key = Zeroizing::new([0u8; MASTER_KEY_LEN]);
    master_key.copy_from_slice(&seed[..MASTER_KEY_LEN]);

    Ok(master_key)
}

/// Derive sync encryption key from master key using HKDF
///
/// Uses HKDF-SHA256 with domain separation to derive a key specifically
/// for encrypting sync data. This allows deriving other keys for different
/// purposes in the future without changing the master key.
pub fn derive_sync_key(master_key: &[u8; MASTER_KEY_LEN]) -> Zeroizing<[u8; SYNC_KEY_LEN]> {
    let hkdf = Hkdf::<Sha256>::new(Some(SYNC_KEY_DOMAIN), master_key);

    let mut sync_key = Zeroizing::new([0u8; SYNC_KEY_LEN]);
    hkdf.expand(SYNC_KEY_INFO, &mut *sync_key)
        .expect("HKDF expand should not fail with valid key length");

    sync_key
}

/// Validate a mnemonic phrase without deriving keys
///
/// Returns true if the mnemonic is a valid BIP39 phrase.
pub fn validate_mnemonic(mnemonic: &str) -> bool {
    Mnemonic::parse_normalized(mnemonic).is_ok()
}

/// Derive a deterministic user ID from master key
///
/// The user ID is used as the sync room identifier, so devices with the
/// same skeleton key automatically sync to the same room.
/// Returns a UUID-like string derived from the master key.
pub fn derive_user_id(master_key: &[u8; MASTER_KEY_LEN]) -> String {
    let hkdf = Hkdf::<Sha256>::new(Some(USER_ID_DOMAIN), master_key);

    let mut id_bytes = [0u8; 16]; // 128 bits for UUID
    hkdf.expand(USER_ID_INFO, &mut id_bytes)
        .expect("HKDF expand should not fail with valid key length");

    // Format as UUID v4-like string (but deterministically derived)
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        u32::from_be_bytes([id_bytes[0], id_bytes[1], id_bytes[2], id_bytes[3]]),
        u16::from_be_bytes([id_bytes[4], id_bytes[5]]),
        u16::from_be_bytes([id_bytes[6], id_bytes[7]]),
        u16::from_be_bytes([id_bytes[8], id_bytes[9]]),
        u64::from_be_bytes([0, 0, id_bytes[10], id_bytes[11], id_bytes[12], id_bytes[13], id_bytes[14], id_bytes[15]])
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_mnemonic() {
        let mnemonic = generate_mnemonic().unwrap();
        let words: Vec<&str> = mnemonic.split_whitespace().collect();
        assert_eq!(words.len(), 24);
    }

    #[test]
    fn test_mnemonic_roundtrip() {
        let mnemonic = generate_mnemonic().unwrap();
        let key1 = mnemonic_to_master_key(&mnemonic).unwrap();
        let key2 = mnemonic_to_master_key(&mnemonic).unwrap();
        assert_eq!(*key1, *key2);
    }

    #[test]
    fn test_validate_mnemonic() {
        let mnemonic = generate_mnemonic().unwrap();
        assert!(validate_mnemonic(&mnemonic));
        assert!(!validate_mnemonic("invalid mnemonic phrase"));
    }

    #[test]
    fn test_derive_sync_key_deterministic() {
        let mnemonic = generate_mnemonic().unwrap();
        let master_key = mnemonic_to_master_key(&mnemonic).unwrap();
        let sync_key1 = derive_sync_key(&master_key);
        let sync_key2 = derive_sync_key(&master_key);
        assert_eq!(*sync_key1, *sync_key2);
    }
}
