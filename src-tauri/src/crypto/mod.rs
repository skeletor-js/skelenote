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

pub mod encryption;
pub mod error;
pub mod keys;
pub mod qr;
pub mod stronghold;

// Re-export commonly used items
pub use encryption::{decrypt_bytes, encrypt_bytes};
pub use keys::{derive_sync_key, derive_user_id, generate_mnemonic, mnemonic_to_master_key, validate_mnemonic};
pub use qr::{generate_mnemonic_qr, parse_qr_payload};
pub use stronghold::StrongholdManager;
