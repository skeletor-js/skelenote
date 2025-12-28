//! Skelenote Tauri backend
//!
//! Provides cryptographic operations for zero-knowledge sync.

mod crypto;

use crypto::{
    derive_sync_key, derive_user_id, encrypt_bytes, decrypt_bytes, generate_mnemonic, generate_mnemonic_qr,
    mnemonic_to_master_key, parse_qr_payload, validate_mnemonic, StrongholdManager,
};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use zeroize::Zeroizing;

/// Shared crypto state managed by Tauri
struct CryptoState {
    /// Stronghold manager for secure key storage
    stronghold: Mutex<Option<StrongholdManager>>,
    /// Cached sync key for encryption/decryption (derived from master key)
    sync_key: Mutex<Option<Zeroizing<[u8; 32]>>>,
}

/// Greet command - returns a greeting message
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Skelenote.", name)
}

/// Initialize the crypto subsystem
///
/// Must be called on app startup. Returns true if a Skeleton Key already exists.
#[tauri::command]
async fn crypto_init(app: AppHandle, state: State<'_, CryptoState>) -> Result<bool, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = StrongholdManager::new(app_data).map_err(|e| e.to_string())?;

    let has_key = manager.has_master_key();

    // If key exists, derive sync key and cache it
    if has_key {
        let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
        let sync_key = derive_sync_key(&master_key);
        *state.sync_key.lock().unwrap() = Some(sync_key);
    }

    *state.stronghold.lock().unwrap() = Some(manager);

    Ok(has_key)
}

/// Generate a new Skeleton Key (BIP39 mnemonic)
///
/// Returns 24 words that must be saved by the user.
/// This does NOT store the key - call crypto_import_key to store it.
#[tauri::command]
fn crypto_generate_key() -> Result<String, String> {
    generate_mnemonic().map_err(|e| e.to_string())
}

/// Import and store a Skeleton Key from mnemonic
///
/// Derives the master key from the mnemonic and stores it securely in Stronghold.
#[tauri::command]
async fn crypto_import_key(
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
        let stronghold_guard = state.stronghold.lock().unwrap();
        let manager = stronghold_guard
            .as_ref()
            .ok_or("Crypto not initialized - call crypto_init first")?;
        manager
            .store_master_key(&master_key)
            .map_err(|e| e.to_string())?;
    }

    // Derive and cache sync key
    let sync_key = derive_sync_key(&master_key);
    *state.sync_key.lock().unwrap() = Some(sync_key);

    Ok(())
}

/// Check if a Skeleton Key exists
#[tauri::command]
fn crypto_has_key(state: State<'_, CryptoState>) -> bool {
    let stronghold_guard = state.stronghold.lock().unwrap();
    stronghold_guard
        .as_ref()
        .map(|m| m.has_master_key())
        .unwrap_or(false)
}

/// Encrypt data for sync transmission
///
/// Returns encrypted bytes that can be sent to the sync server.
#[tauri::command]
fn crypto_encrypt(data: Vec<u8>, state: State<'_, CryptoState>) -> Result<Vec<u8>, String> {
    let sync_key_guard = state.sync_key.lock().unwrap();
    let key = sync_key_guard
        .as_ref()
        .ok_or("No Skeleton Key available - import or generate one first")?;

    encrypt_bytes(key, &data).map_err(|e| e.to_string())
}

/// Decrypt data received from sync
///
/// Returns decrypted plaintext bytes.
#[tauri::command]
fn crypto_decrypt(data: Vec<u8>, state: State<'_, CryptoState>) -> Result<Vec<u8>, String> {
    let sync_key_guard = state.sync_key.lock().unwrap();
    let key = sync_key_guard
        .as_ref()
        .ok_or("No Skeleton Key available - import or generate one first")?;

    decrypt_bytes(key, &data).map_err(|e| e.to_string())
}

/// Generate a QR code for the Skeleton Key
///
/// Returns an SVG as a base64 data URI that can be used in an <img> src.
#[tauri::command]
fn crypto_generate_qr(mnemonic: String) -> Result<String, String> {
    generate_mnemonic_qr(&mnemonic).map_err(|e| e.to_string())
}

/// Parse a QR code payload to extract the mnemonic
///
/// Returns the mnemonic string if the payload is valid.
#[tauri::command]
fn crypto_parse_qr(payload: String) -> Result<String, String> {
    parse_qr_payload(&payload).map_err(|e| e.to_string())
}

/// Validate a mnemonic phrase
///
/// Returns true if the mnemonic is a valid BIP39 phrase.
#[tauri::command]
fn crypto_validate_mnemonic(mnemonic: String) -> bool {
    validate_mnemonic(&mnemonic)
}

/// Get the derived user ID from the Skeleton Key
///
/// Returns a deterministic user ID derived from the master key.
/// All devices with the same Skeleton Key will get the same user ID,
/// ensuring they connect to the same sync room.
#[tauri::command]
fn crypto_get_user_id(state: State<'_, CryptoState>) -> Result<String, String> {
    let stronghold_guard = state.stronghold.lock().unwrap();
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
fn crypto_clear_key(state: State<'_, CryptoState>) -> Result<(), String> {
    // Clear the cached sync key
    *state.sync_key.lock().unwrap() = None;

    // Clear the stored master key
    let stronghold_guard = state.stronghold.lock().unwrap();
    if let Some(manager) = stronghold_guard.as_ref() {
        manager.clear().map_err(|e| e.to_string())?;
    }

    Ok(())
}

// NOTE: Global Hotkey Quick Capture (Cmd+Shift+Space) - DEPRIORITIZED
//
// A separate floating quick capture window was attempted but deprioritized due to:
// 1. Standard Tauri windows cannot appear over fullscreen macOS apps
// 2. tauri-nspanel (NSPanel solution) crashes with "cannot catch foreign exceptions"
// 3. Transparent windows with rounded corners require macOS private API
//
// The in-app QuickCapture modal (via Cmd+K Command Palette) works and is the
// recommended approach for now.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(CryptoState {
            stronghold: Mutex::new(None),
            sync_key: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            crypto_init,
            crypto_generate_key,
            crypto_import_key,
            crypto_has_key,
            crypto_encrypt,
            crypto_decrypt,
            crypto_generate_qr,
            crypto_parse_qr,
            crypto_validate_mnemonic,
            crypto_get_user_id,
            crypto_clear_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
