//! Tauri commands for cryptographic operations
//!
//! These commands wrap the crypto module's functionality for the frontend.

use super::{
    decrypt_bytes, derive_signing_key, derive_sync_key, derive_user_id, encrypt_bytes,
    generate_mnemonic, generate_mnemonic_qr, get_public_key_bytes, mnemonic_to_master_key,
    parse_qr_payload, sign_revocation, validate_mnemonic, verify_revocation, StrongholdManager,
};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use zeroize::Zeroizing;

/// Shared crypto state managed by Tauri
pub struct CryptoState {
    /// Stronghold manager for secure key storage
    pub stronghold: Mutex<Option<StrongholdManager>>,
    /// Cached sync key for encryption/decryption (derived from master key)
    pub sync_key: Mutex<Option<Zeroizing<[u8; 32]>>>,
}

impl CryptoState {
    pub fn new() -> Self {
        Self {
            stronghold: Mutex::new(None),
            sync_key: Mutex::new(None),
        }
    }
}

impl Default for CryptoState {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize the crypto subsystem
///
/// Must be called on app startup. Returns true if a Skeleton Key already exists.
/// Guards against double-initialization (e.g., from React StrictMode).
#[tauri::command]
pub async fn crypto_init(app: AppHandle, state: State<'_, CryptoState>) -> Result<bool, String> {
    // Check if already initialized (guard against double-initialization)
    {
        let guard = state
            .stronghold
            .lock()
            .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
        if guard.is_some() {
            // Already initialized, just return the current state
            return Ok(guard.as_ref().unwrap().has_master_key());
        }
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = StrongholdManager::new(app_data).map_err(|e| e.to_string())?;

    let mut has_key = manager.has_master_key();

    // If key exists, try to derive sync key and cache it
    // If decryption fails (e.g., wrong device key on a new device), treat as no key
    if has_key {
        match manager.get_master_key() {
            Ok(master_key) => {
                let sync_key = derive_sync_key(&master_key);
                *state
                    .sync_key
                    .lock()
                    .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))? = Some(sync_key);
            }
            Err(e) => {
                eprintln!(
                    "Warning: Could not decrypt existing key: {}. User will need to re-import Skeleton Key.",
                    e
                );
                has_key = false;
            }
        }
    }

    *state
        .stronghold
        .lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))? = Some(manager);

    Ok(has_key)
}

/// Generate a new Skeleton Key (BIP39 mnemonic)
///
/// Returns 24 words that must be saved by the user.
/// This does NOT store the key - call crypto_import_key to store it.
#[tauri::command]
pub fn crypto_generate_key() -> Result<String, String> {
    generate_mnemonic().map_err(|e| e.to_string())
}

/// Import and store a Skeleton Key from mnemonic
///
/// Derives the master key from the mnemonic and stores it securely in Stronghold.
#[tauri::command]
pub async fn crypto_import_key(
    mnemonic: String,
    state: State<'_, CryptoState>,
) -> Result<(), String> {
    // Validate mnemonic first
    if !validate_mnemonic(&mnemonic) {
        return Err("Invalid mnemonic phrase".to_string());
    }

    // Derive master key from mnemonic
    let master_key = mnemonic_to_master_key(&mnemonic).map_err(|e| e.to_string())?;

    // Store in Stronghold
    {
        let stronghold_guard = state
            .stronghold
            .lock()
            .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
        let manager = stronghold_guard
            .as_ref()
            .ok_or("Crypto not initialized - call crypto_init first")?;
        manager
            .store_master_key(&master_key)
            .map_err(|e| e.to_string())?;
    }

    // Derive and cache sync key
    let sync_key = derive_sync_key(&master_key);
    *state
        .sync_key
        .lock()
        .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))? = Some(sync_key);

    Ok(())
}

/// Check if a Skeleton Key exists
#[tauri::command]
pub fn crypto_has_key(state: State<'_, CryptoState>) -> Result<bool, String> {
    let stronghold_guard = state
        .stronghold
        .lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    Ok(stronghold_guard
        .as_ref()
        .map(|m| m.has_master_key())
        .unwrap_or(false))
}

/// Encrypt data for sync transmission
///
/// Returns encrypted bytes that can be sent to the sync server.
#[tauri::command]
pub fn crypto_encrypt(data: Vec<u8>, state: State<'_, CryptoState>) -> Result<Vec<u8>, String> {
    let sync_key_guard = state
        .sync_key
        .lock()
        .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))?;
    let key = sync_key_guard
        .as_ref()
        .ok_or("No Skeleton Key available - import or generate one first")?;

    encrypt_bytes(key, &data).map_err(|e| e.to_string())
}

/// Decrypt data received from sync
///
/// Returns decrypted plaintext bytes.
#[tauri::command]
pub fn crypto_decrypt(data: Vec<u8>, state: State<'_, CryptoState>) -> Result<Vec<u8>, String> {
    let sync_key_guard = state
        .sync_key
        .lock()
        .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))?;
    let key = sync_key_guard
        .as_ref()
        .ok_or("No Skeleton Key available - import or generate one first")?;

    decrypt_bytes(key, &data).map_err(|e| e.to_string())
}

/// Generate a QR code for the Skeleton Key
///
/// Returns an SVG as a base64 data URI that can be used in an <img> src.
#[tauri::command]
pub fn crypto_generate_qr(mnemonic: String) -> Result<String, String> {
    generate_mnemonic_qr(&mnemonic).map_err(|e| e.to_string())
}

/// Parse a QR code payload to extract the mnemonic
///
/// Returns the mnemonic string if the payload is valid.
#[tauri::command]
pub fn crypto_parse_qr(payload: String) -> Result<String, String> {
    parse_qr_payload(&payload).map_err(|e| e.to_string())
}

/// Validate a mnemonic phrase
///
/// Returns true if the mnemonic is a valid BIP39 phrase.
#[tauri::command]
pub fn crypto_validate_mnemonic(mnemonic: String) -> bool {
    validate_mnemonic(&mnemonic)
}

/// Get the derived user ID from the Skeleton Key
///
/// Returns a deterministic user ID derived from the master key.
/// All devices with the same Skeleton Key will get the same user ID,
/// ensuring they connect to the same sync room.
#[tauri::command]
pub fn crypto_get_user_id(state: State<'_, CryptoState>) -> Result<String, String> {
    let stronghold_guard = state
        .stronghold
        .lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    let manager = stronghold_guard
        .as_ref()
        .ok_or("Crypto not initialized - call crypto_init first")?;

    let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
    Ok(derive_user_id(&master_key))
}

/// Clear the Skeleton Key and all secrets
///
/// This removes the master key from secure storage, effectively "logging out".
/// The app will show the Skeleton Key setup screen on next launch.
#[tauri::command]
pub fn crypto_clear_key(state: State<'_, CryptoState>) -> Result<(), String> {
    // Clear the cached sync key
    *state
        .sync_key
        .lock()
        .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))? = None;

    // Clear the stored master key
    let stronghold_guard = state
        .stronghold
        .lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    if let Some(manager) = stronghold_guard.as_ref() {
        manager.clear().map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ============================================================================
// Device Signing Commands (use crypto state)
// ============================================================================

/// Get the Ed25519 public signing key for this device
///
/// Returns the public key as a base64-encoded string.
/// All devices with the same Skeleton Key will have the same signing keypair.
#[tauri::command]
pub fn device_get_signing_public_key(state: State<'_, CryptoState>) -> Result<String, String> {
    let stronghold_guard = state
        .stronghold
        .lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    let manager = stronghold_guard
        .as_ref()
        .ok_or("Crypto not initialized - call crypto_init first")?;

    let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
    let signing_key = derive_signing_key(&master_key);
    let public_key_bytes = get_public_key_bytes(&signing_key);

    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        public_key_bytes,
    ))
}

/// Sign a device revocation
///
/// Creates an Ed25519 signature over the canonical revocation message.
/// Returns the signature as a base64-encoded string.
#[tauri::command]
pub fn device_sign_revocation(
    device_id: String,
    revoked_at: u64,
    revoked_by: String,
    state: State<'_, CryptoState>,
) -> Result<String, String> {
    let stronghold_guard = state
        .stronghold
        .lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    let manager = stronghold_guard
        .as_ref()
        .ok_or("Crypto not initialized - call crypto_init first")?;

    let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
    let signing_key = derive_signing_key(&master_key);
    let signature = sign_revocation(&signing_key, &device_id, revoked_at, &revoked_by);

    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        signature,
    ))
}

/// Verify a device revocation signature
///
/// Checks that the signature is valid for the given revocation parameters.
/// Returns true if valid, false otherwise.
#[tauri::command]
pub fn device_verify_revocation(
    device_id: String,
    revoked_at: u64,
    revoked_by: String,
    signature: String,
    public_key: String,
) -> Result<bool, String> {
    use base64::Engine;

    // Decode base64 signature
    let signature_bytes: [u8; 64] = base64::engine::general_purpose::STANDARD
        .decode(&signature)
        .map_err(|e| format!("Invalid signature base64: {}", e))?
        .try_into()
        .map_err(|_| "Invalid signature length")?;

    // Decode base64 public key
    let public_key_bytes: [u8; 32] = base64::engine::general_purpose::STANDARD
        .decode(&public_key)
        .map_err(|e| format!("Invalid public key base64: {}", e))?
        .try_into()
        .map_err(|_| "Invalid public key length")?;

    match verify_revocation(
        &public_key_bytes,
        &device_id,
        revoked_at,
        &revoked_by,
        &signature_bytes,
    ) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}
