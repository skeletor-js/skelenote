//! Error types for the crypto module

#![allow(dead_code)]

use thiserror::Error;

/// Errors that can occur during cryptographic operations
#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Invalid mnemonic phrase")]
    InvalidMnemonic,

    #[error("Invalid key length")]
    InvalidKeyLength,

    #[error("Encryption failed")]
    EncryptionFailed,

    #[error("Decryption failed - data may be corrupted or wrong key")]
    DecryptionFailed,

    #[error("Invalid ciphertext format")]
    InvalidCiphertext,

    #[error("Key derivation failed")]
    KeyDerivationFailed,
}

/// Errors that can occur during Stronghold operations
#[derive(Error, Debug)]
pub enum StrongholdError {
    #[error("Stronghold initialization failed: {0}")]
    InitFailed(String),

    #[error("Failed to store secret: {0}")]
    StoreFailed(String),

    #[error("Failed to retrieve secret: {0}")]
    RetrieveFailed(String),

    #[error("Secret not found")]
    NotFound,

    #[error("Invalid key length in storage")]
    InvalidKeyLength,

    #[error("Invalid data format")]
    InvalidData,

    #[error("Failed to save snapshot: {0}")]
    SaveFailed(String),

    #[error("Failed to load snapshot: {0}")]
    LoadFailed(String),
}

/// Errors that can occur during QR code operations
#[derive(Error, Debug)]
pub enum QrError {
    #[error("QR code generation failed: {0}")]
    GenerationFailed(String),

    #[error("Invalid QR payload format")]
    InvalidFormat,
}

impl From<bip39::Error> for CryptoError {
    fn from(_: bip39::Error) -> Self {
        CryptoError::InvalidMnemonic
    }
}
