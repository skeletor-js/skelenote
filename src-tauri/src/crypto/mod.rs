//! Cryptography module for zero-knowledge sync
//!
//! This module provides end-to-end encryption for Skelenote's sync system.
//! The server never has access to plaintext data - it only stores and relays
//! encrypted blobs.
//!
//! ## Architecture
//!
//! - **Skeleton Key**: BIP39 mnemonic (24 words) presented to the user
//! - **Master Key**: Derived from mnemonic, stored in Stronghold
//! - **Sync Key**: Derived from master key via HKDF for encrypting sync data
//! - **Encryption**: XChaCha20-Poly1305 with random 192-bit nonces

pub mod commands;
pub mod encryption;
pub mod error;
pub mod keys;
pub mod qr;
pub mod signing;
pub mod stronghold;

// Re-export commonly used items
pub use encryption::{decrypt_bytes, encrypt_bytes};
pub use keys::{derive_sync_key, derive_user_id, generate_mnemonic, mnemonic_to_master_key, validate_mnemonic};
pub use qr::{generate_mnemonic_qr, parse_qr_payload};
pub use signing::{derive_signing_key, sign_revocation, verify_revocation, get_public_key_bytes};
pub use stronghold::StrongholdManager;

// Re-export commands for easy access from lib.rs
pub use commands::{
    crypto_clear_key, crypto_decrypt, crypto_encrypt, crypto_generate_key, crypto_generate_qr,
    crypto_get_user_id, crypto_has_key, crypto_import_key, crypto_init, crypto_parse_qr,
    crypto_validate_mnemonic, device_get_signing_public_key, device_sign_revocation,
    device_verify_revocation, CryptoState,
};
