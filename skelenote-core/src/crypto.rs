//! Encryption using Skeleton Key (BIP39 + XChaCha20-Poly1305)

use bip39::{Language, Mnemonic};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use hkdf::Hkdf;
use rand::RngCore;
use sha2::{Digest, Sha256};
use thiserror::Error;

/// Crypto errors
#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Invalid mnemonic")]
    InvalidMnemonic,
    #[error("Encryption failed")]
    EncryptionFailed,
    #[error("Decryption failed")]
    DecryptionFailed,
    #[error("Key derivation failed")]
    KeyDerivationFailed,
}

/// Key manager for Skeleton Key operations
pub struct KeyManager {
    /// Master key derived from mnemonic
    master_key: [u8; 32],
}

impl KeyManager {
    /// Generate a new 24-word mnemonic
    pub fn generate_mnemonic() -> String {
        // 256 bits of entropy = 24 words
        let mut entropy = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut entropy);
        let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy).unwrap();
        mnemonic.to_string()
    }

    /// Validate a mnemonic phrase
    pub fn validate_mnemonic(phrase: &str) -> bool {
        Mnemonic::parse_in(Language::English, phrase).is_ok()
    }

    /// Create key manager from mnemonic
    pub fn from_mnemonic(phrase: &str) -> Result<Self, CryptoError> {
        let mnemonic = Mnemonic::parse_in(Language::English, phrase)
            .map_err(|_| CryptoError::InvalidMnemonic)?;

        // Derive master key from mnemonic seed
        let seed = mnemonic.to_seed("");
        let mut master_key = [0u8; 32];
        master_key.copy_from_slice(&seed[..32]);

        Ok(Self { master_key })
    }

    /// Derive a key for a specific purpose using HKDF
    pub fn derive_key(&self, context: &str) -> [u8; 32] {
        let hk = Hkdf::<Sha256>::new(None, &self.master_key);
        let mut okm = [0u8; 32];
        hk.expand(context.as_bytes(), &mut okm)
            .expect("HKDF expand failed");
        okm
    }

    /// Get the sync encryption key
    pub fn sync_key(&self) -> [u8; 32] {
        self.derive_key("skelenote-sync-v1")
    }

    /// Get deterministic user ID (first 16 bytes of derived key)
    pub fn user_id(&self) -> String {
        let key = self.derive_key("skelenote-userid-v1");
        hex::encode(&key[..16])
    }

    /// Get fingerprint for visual verification (first 8 chars of user_id hash)
    pub fn fingerprint(&self) -> String {
        let user_id = self.user_id();
        let mut hasher = Sha256::new();
        hasher.update(user_id.as_bytes());
        let hash = hasher.finalize();
        hex::encode(&hash[..4])
    }

    /// Encrypt data with the sync key
    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let key = self.sync_key();
        encrypt_with_key(&key, data)
    }

    /// Decrypt data with the sync key
    pub fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let key = self.sync_key();
        decrypt_with_key(&key, data)
    }
}

/// Encrypt data with a 32-byte key
pub fn encrypt_with_key(key: &[u8; 32], data: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = XChaCha20Poly1305::new(key.into());

    // Generate random 24-byte nonce
    let mut nonce_bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|_| CryptoError::EncryptionFailed)?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

/// Decrypt data with a 32-byte key
pub fn decrypt_with_key(key: &[u8; 32], data: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if data.len() < 24 {
        return Err(CryptoError::DecryptionFailed);
    }

    let cipher = XChaCha20Poly1305::new(key.into());

    let nonce = XNonce::from_slice(&data[..24]);
    let ciphertext = &data[24..];

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_validate_mnemonic() {
        let mnemonic = KeyManager::generate_mnemonic();
        assert!(KeyManager::validate_mnemonic(&mnemonic));
        assert!(!KeyManager::validate_mnemonic("invalid mnemonic words"));
    }

    #[test]
    fn test_key_derivation_deterministic() {
        let phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

        let km1 = KeyManager::from_mnemonic(phrase).unwrap();
        let km2 = KeyManager::from_mnemonic(phrase).unwrap();

        assert_eq!(km1.user_id(), km2.user_id());
        assert_eq!(km1.sync_key(), km2.sync_key());
    }

    #[test]
    fn test_encrypt_decrypt() {
        let phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
        let km = KeyManager::from_mnemonic(phrase).unwrap();

        let plaintext = b"Hello, Skelenote!";
        let encrypted = km.encrypt(plaintext).unwrap();
        let decrypted = km.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }
}
