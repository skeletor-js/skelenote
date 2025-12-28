//! XChaCha20-Poly1305 encryption for zero-knowledge sync
//!
//! Uses XChaCha20-Poly1305 AEAD (Authenticated Encryption with Associated Data)
//! for encrypting Loro CRDT updates before transmission.
//!
//! XChaCha20 is preferred over regular ChaCha20 because its 192-bit nonce is
//! large enough to be safely generated randomly without risk of collision,
//! which is critical for distributed systems where devices don't coordinate.

use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;

use super::error::CryptoError;

/// Nonce size for XChaCha20-Poly1305 (192 bits = 24 bytes)
pub const NONCE_LEN: usize = 24;

/// Authentication tag size (128 bits = 16 bytes, included in ciphertext)
pub const TAG_LEN: usize = 16;

/// Encrypted blob format for transmission
///
/// Format: `[nonce: 24 bytes][ciphertext + tag: N + 16 bytes]`
pub struct EncryptedBlob {
    pub nonce: [u8; NONCE_LEN],
    pub ciphertext: Vec<u8>, // Includes 16-byte auth tag
}

impl EncryptedBlob {
    /// Serialize to bytes for transmission
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut result = Vec::with_capacity(NONCE_LEN + self.ciphertext.len());
        result.extend_from_slice(&self.nonce);
        result.extend_from_slice(&self.ciphertext);
        result
    }

    /// Deserialize from bytes
    pub fn from_bytes(data: &[u8]) -> Result<Self, CryptoError> {
        // Minimum size: nonce + tag (no plaintext)
        if data.len() < NONCE_LEN + TAG_LEN {
            return Err(CryptoError::InvalidCiphertext);
        }

        let mut nonce = [0u8; NONCE_LEN];
        nonce.copy_from_slice(&data[..NONCE_LEN]);
        let ciphertext = data[NONCE_LEN..].to_vec();

        Ok(Self { nonce, ciphertext })
    }
}

/// Encrypt plaintext with XChaCha20-Poly1305
///
/// Generates a random 24-byte nonce for each encryption. The nonce is
/// prepended to the ciphertext for transmission.
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<EncryptedBlob, CryptoError> {
    let cipher =
        XChaCha20Poly1305::new_from_slice(key).map_err(|_| CryptoError::EncryptionFailed)?;

    // Generate random nonce (24 bytes is large enough for safe random generation)
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| CryptoError::EncryptionFailed)?;

    Ok(EncryptedBlob {
        nonce: nonce_bytes,
        ciphertext,
    })
}

/// Decrypt ciphertext with XChaCha20-Poly1305
///
/// Verifies the authentication tag and returns the plaintext if valid.
/// Returns an error if the tag doesn't match (wrong key or corrupted data).
pub fn decrypt(key: &[u8; 32], blob: &EncryptedBlob) -> Result<Vec<u8>, CryptoError> {
    let cipher =
        XChaCha20Poly1305::new_from_slice(key).map_err(|_| CryptoError::DecryptionFailed)?;

    let nonce = XNonce::from_slice(&blob.nonce);

    cipher
        .decrypt(nonce, blob.ciphertext.as_slice())
        .map_err(|_| CryptoError::DecryptionFailed)
}

/// Convenience function: encrypt and return bytes
pub fn encrypt_bytes(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let blob = encrypt(key, plaintext)?;
    Ok(blob.to_bytes())
}

/// Convenience function: decrypt from bytes
pub fn decrypt_bytes(key: &[u8; 32], data: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let blob = EncryptedBlob::from_bytes(data)?;
    decrypt(key, &blob)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        key
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = test_key();
        let plaintext = b"Hello, Skelenote!";

        let encrypted = encrypt(&key, plaintext).unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_decrypt_bytes_roundtrip() {
        let key = test_key();
        let plaintext = b"Loro CRDT update bytes";

        let encrypted = encrypt_bytes(&key, plaintext).unwrap();
        let decrypted = decrypt_bytes(&key, &encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_wrong_key_fails() {
        let key1 = test_key();
        let key2 = test_key();
        let plaintext = b"Secret data";

        let encrypted = encrypt(&key1, plaintext).unwrap();
        let result = decrypt(&key2, &encrypted);

        assert!(result.is_err());
    }

    #[test]
    fn test_corrupted_ciphertext_fails() {
        let key = test_key();
        let plaintext = b"Secret data";

        let encrypted = encrypt(&key, plaintext).unwrap();
        let mut bytes = encrypted.to_bytes();
        // Corrupt a byte in the ciphertext
        bytes[NONCE_LEN + 5] ^= 0xFF;

        let result = decrypt_bytes(&key, &bytes);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_plaintext() {
        let key = test_key();
        let plaintext = b"";

        let encrypted = encrypt(&key, plaintext).unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_large_plaintext() {
        let key = test_key();
        let plaintext = vec![0xAB; 1024 * 1024]; // 1MB

        let encrypted = encrypt(&key, &plaintext).unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }
}
