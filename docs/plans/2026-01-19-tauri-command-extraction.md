# Tauri Command Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract 55 Tauri commands from lib.rs (2,309 lines) into domain modules, reducing lib.rs to ~150 lines of pure orchestration.

**Architecture:** Move commands to their domain modules following the existing haptics/icon pattern. Commands are thin Tauri wrappers around business logic that already lives in domain modules. State structs move with their commands.

**Tech Stack:** Rust, Tauri 2.0, tokio async

---

## Overview

| Module | Commands | State/Types Moved |
|--------|----------|-------------------|
| crypto/commands.rs | 11 | CryptoState |
| network/commands.rs | 30 | PairingState, helpers, response types |
| mobile/commands.rs | 6 | PendingShare |
| lib.rs (keep) | 3 | VaultFile (trivial) |
| **Total** | **50** + 3 kept = 53 unique | (+ haptics 3, icon 3 = 58 total registered) |

---

## Task 1: Create crypto/commands.rs

**Files:**
- Create: `src-tauri/src/crypto/commands.rs`
- Modify: `src-tauri/src/crypto/mod.rs`
- Modify: `src-tauri/src/lib.rs`

### Step 1.1: Create crypto/commands.rs with CryptoState and all crypto commands

Create `src-tauri/src/crypto/commands.rs`:

```rust
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
```

### Step 1.2: Update crypto/mod.rs to export commands

Add to `src-tauri/src/crypto/mod.rs`:

```rust
pub mod commands;

// Re-export commands for easy access from lib.rs
pub use commands::{
    crypto_clear_key, crypto_decrypt, crypto_encrypt, crypto_generate_key, crypto_generate_qr,
    crypto_get_user_id, crypto_has_key, crypto_import_key, crypto_init, crypto_parse_qr,
    crypto_validate_mnemonic, device_get_signing_public_key, device_sign_revocation,
    device_verify_revocation, CryptoState,
};
```

### Step 1.3: Verify crypto commands compile

Run: `cd src-tauri && cargo check`

Expected: Compilation succeeds (warnings about unused items in lib.rs are OK)

### Step 1.4: Commit crypto extraction

```bash
git add src-tauri/src/crypto/commands.rs src-tauri/src/crypto/mod.rs
git commit -m "refactor(tauri): extract crypto commands to crypto/commands.rs

Move CryptoState and 14 crypto/device-signing commands to crypto module.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create network/commands.rs

**Files:**
- Create: `src-tauri/src/network/commands.rs`
- Modify: `src-tauri/src/network/mod.rs`

### Step 2.1: Create network/commands.rs with all network, pairing, cache, and device-blocklist commands

This is a large file (~900 lines). Create `src-tauri/src/network/commands.rs` with:

1. **PairingState** struct
2. **Helper functions**: `derive_fingerprint`, `connect_to_peer_direct`
3. **Response types**: `QrCodeResponse`, `ManualPairingDetails`, `PairedDeviceWithStatus`
4. **Server commands** (7): network_start_server, network_stop_server, network_get_server_info, network_get_connected_peers, network_get_device_info, network_get_device_id, network_sync_device_id
5. **Discovery commands** (4): network_start_discovery, network_stop_discovery, network_get_discovered_peers, network_is_discovery_running
6. **Connection commands** (1): network_connect_to_peer
7. **Broadcast commands** (5): network_broadcast_sync, network_peer_count, network_broadcast_device_registry, network_broadcast_device_revoke, network_broadcast_device_rename
8. **Device blocklist commands** (3): device_block, device_is_blocked, device_get_blocked
9. **Pairing commands** (4): pairing_generate_qr, pairing_parse_qr, pairing_connect, pairing_connect_manual
10. **Cache commands** (5): cache_get_paired_devices, cache_remove_paired_device, cache_prune_addresses, cache_reconnect_all, cache_reconnect_device

The file content is extensive - copy the exact implementations from lib.rs lines 255-1854, updating:
- Add `pub` to all command functions
- Update imports to use `super::` and `crate::crypto::CryptoState`
- Move PairingState struct definition here

### Step 2.2: Update network/mod.rs to export commands

Add to `src-tauri/src/network/mod.rs`:

```rust
pub mod commands;

pub use commands::{
    // State
    PairingState,
    // Server commands
    network_start_server, network_stop_server, network_get_server_info,
    network_get_connected_peers, network_get_device_info, network_get_device_id,
    network_sync_device_id,
    // Discovery commands
    network_start_discovery, network_stop_discovery, network_get_discovered_peers,
    network_is_discovery_running,
    // Connection commands
    network_connect_to_peer,
    // Broadcast commands
    network_broadcast_sync, network_peer_count, network_broadcast_device_registry,
    network_broadcast_device_revoke, network_broadcast_device_rename,
    // Device blocklist commands
    device_block, device_is_blocked, device_get_blocked,
    // Pairing commands
    pairing_generate_qr, pairing_parse_qr, pairing_connect, pairing_connect_manual,
    // Cache commands
    cache_get_paired_devices, cache_remove_paired_device, cache_prune_addresses,
    cache_reconnect_all, cache_reconnect_device,
};
```

### Step 2.3: Verify network commands compile

Run: `cd src-tauri && cargo check`

### Step 2.4: Commit network extraction

```bash
git add src-tauri/src/network/commands.rs src-tauri/src/network/mod.rs
git commit -m "refactor(tauri): extract network commands to network/commands.rs

Move PairingState and 29 network/pairing/cache/device commands to network module.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create mobile/commands.rs

**Files:**
- Create: `src-tauri/src/mobile/mod.rs`
- Create: `src-tauri/src/mobile/commands.rs`
- Modify: `src-tauri/src/lib.rs`

### Step 3.1: Create mobile module directory and files

Create `src-tauri/src/mobile/mod.rs`:

```rust
//! Mobile-specific functionality (iOS/Android)

pub mod commands;

pub use commands::{
    begin_background_task, end_background_task,
    share_clear_pending_android, share_clear_pending_ios,
    share_get_pending_android, share_get_pending_ios,
};
```

Create `src-tauri/src/mobile/commands.rs` with the share and background task commands from lib.rs lines 1856-2158.

### Step 3.2: Verify mobile commands compile

Run: `cd src-tauri && cargo check`

### Step 3.3: Commit mobile extraction

```bash
git add src-tauri/src/mobile/
git commit -m "refactor(tauri): extract mobile commands to mobile/commands.rs

Move 6 iOS/Android share and background task commands to mobile module.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update lib.rs to use extracted commands

**Files:**
- Modify: `src-tauri/src/lib.rs`

### Step 4.1: Rewrite lib.rs to import and register commands

Replace lib.rs with a minimal orchestration file (~150 lines):

```rust
//! Skelenote Tauri backend
//!
//! Provides cryptographic operations for zero-knowledge sync
//! and local network sync capabilities.

mod crypto;
mod haptics;
mod icon;
mod mobile;
mod network;

use crypto::CryptoState;
use network::{NetworkState, PairingState};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

// ============================================================================
// Utility Commands (trivial, stay in lib.rs)
// ============================================================================

/// Greet command - returns a greeting message
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Skelenote.", name)
}

/// A file from an Obsidian vault or markdown folder
#[derive(serde::Serialize)]
struct VaultFile {
    path: String,
    content: String,
}

/// Read all markdown files from a directory recursively
#[tauri::command]
async fn read_vault_directory(directory: String) -> Result<Vec<VaultFile>, String> {
    use std::path::Path;
    use walkdir::WalkDir;

    let root = Path::new(&directory);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", directory));
    }

    let mut files = Vec::new();

    for entry in WalkDir::new(&root)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let extension = path.extension().and_then(|s| s.to_str());
        if extension != Some("md") && extension != Some("markdown") {
            continue;
        }

        let relative_path = path.strip_prefix(&root).unwrap_or(path);
        if relative_path
            .components()
            .any(|c| c.as_os_str().to_string_lossy().starts_with('.'))
        {
            continue;
        }

        match std::fs::read_to_string(path) {
            Ok(content) => {
                files.push(VaultFile {
                    path: relative_path.to_string_lossy().to_string(),
                    content,
                });
            }
            Err(e) => {
                eprintln!("Failed to read {}: {}", path.display(), e);
            }
        }
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));
    println!("[Import] Read {} markdown files from {}", files.len(), directory);
    Ok(files)
}

/// Save an attachment file to local storage
#[tauri::command]
async fn save_attachment(
    app: tauri::AppHandle,
    bytes: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let attachments_dir = app_data.join("attachments");
    std::fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to create attachments dir: {}", e))?;

    let unique_filename = format!("{}_{}", uuid::Uuid::new_v4(), filename);
    let file_path = attachments_dir.join(&unique_filename);

    std::fs::write(&file_path, bytes)
        .map_err(|e| format!("Failed to write attachment: {}", e))?;

    Ok(format!("file://{}", file_path.display()))
}

// ============================================================================
// Application Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_shell::init());
    }

    builder
        .manage(CryptoState::new())
        .setup(|app| {
            #[cfg(mobile)]
            {
                app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
                app.handle().plugin(tauri_plugin_edge_to_edge::init())?;
                app.handle().plugin(tauri_plugin_biometric::init())?;
                app.handle().plugin(tauri_plugin_notification::init())?;
                app.handle().plugin(tauri_plugin_deep_link::init())?;
            }

            #[cfg(target_os = "android")]
            {
                android_keyring::set_android_keyring_credential_builder()
                    .expect("Failed to initialize Android Keyring");
            }

            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            let data_dir = app_data_dir.join("data");
            std::fs::create_dir_all(&data_dir).ok();

            let network_state = NetworkState::with_data_dir(data_dir.clone());
            let blocklist = network_state.blocklist.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = blocklist.load().await {
                    eprintln!("[Blocklist] Failed to load from disk: {}", e);
                }
            });
            app.manage(network_state);

            let cache_path = data_dir.join("paired_devices.json");
            let pairing_state = PairingState::new(cache_path);
            app.manage(pairing_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Utility commands
            greet,
            save_attachment,
            read_vault_directory,
            // Crypto commands
            crypto::crypto_init,
            crypto::crypto_generate_key,
            crypto::crypto_import_key,
            crypto::crypto_has_key,
            crypto::crypto_encrypt,
            crypto::crypto_decrypt,
            crypto::crypto_generate_qr,
            crypto::crypto_parse_qr,
            crypto::crypto_validate_mnemonic,
            crypto::crypto_get_user_id,
            crypto::crypto_clear_key,
            crypto::device_get_signing_public_key,
            crypto::device_sign_revocation,
            crypto::device_verify_revocation,
            // Network commands
            network::network_start_server,
            network::network_stop_server,
            network::network_get_server_info,
            network::network_get_connected_peers,
            network::network_get_device_info,
            network::network_get_device_id,
            network::network_sync_device_id,
            network::network_start_discovery,
            network::network_stop_discovery,
            network::network_get_discovered_peers,
            network::network_is_discovery_running,
            network::network_connect_to_peer,
            network::network_broadcast_sync,
            network::network_peer_count,
            network::network_broadcast_device_registry,
            network::network_broadcast_device_revoke,
            network::network_broadcast_device_rename,
            network::device_block,
            network::device_is_blocked,
            network::device_get_blocked,
            network::pairing_generate_qr,
            network::pairing_parse_qr,
            network::pairing_connect,
            network::pairing_connect_manual,
            network::cache_get_paired_devices,
            network::cache_remove_paired_device,
            network::cache_prune_addresses,
            network::cache_reconnect_all,
            network::cache_reconnect_device,
            // Haptic commands
            haptics::haptic_impact,
            haptics::haptic_notification,
            haptics::haptic_selection,
            // Mobile commands
            mobile::share_get_pending_ios,
            mobile::share_clear_pending_ios,
            mobile::share_get_pending_android,
            mobile::share_clear_pending_android,
            mobile::begin_background_task,
            mobile::end_background_task,
            // Icon commands
            icon::get_available_icons,
            icon::set_app_icon,
            icon::is_icon_switching_supported,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 4.2: Verify full compilation

Run: `cd src-tauri && cargo build`

### Step 4.3: Run Rust tests

Run: `cd src-tauri && cargo test`

### Step 4.4: Commit lib.rs refactor

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor(tauri): slim lib.rs to pure orchestration

lib.rs now only contains:
- 3 trivial utility commands (greet, save_attachment, read_vault_directory)
- Tauri app builder and state initialization
- Command registration from domain modules

Reduced from 2,309 lines to ~150 lines.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Verification and Cleanup

### Step 5.1: Run full test suite

```bash
cd src-tauri && cargo test
pnpm tauri:dev  # Manual verification - app should start normally
```

### Step 5.2: Verify line counts

```bash
wc -l src-tauri/src/lib.rs
# Expected: ~150 lines

wc -l src-tauri/src/crypto/commands.rs
# Expected: ~250 lines

wc -l src-tauri/src/network/commands.rs
# Expected: ~900 lines

wc -l src-tauri/src/mobile/commands.rs
# Expected: ~200 lines
```

### Step 5.3: Final commit with summary

```bash
git add -A
git commit -m "refactor(tauri): complete command extraction to domain modules

Summary:
- lib.rs: 2,309 → ~150 lines (pure orchestration)
- crypto/commands.rs: 14 commands + CryptoState
- network/commands.rs: 29 commands + PairingState + helpers
- mobile/commands.rs: 6 commands (share + background tasks)
- haptics.rs: 3 commands (unchanged)
- icon.rs: 3 commands (unchanged)

Total: 55 commands extracted, 3 trivial kept in lib.rs

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

| Metric | Before | After |
|--------|--------|-------|
| lib.rs lines | 2,309 | ~150 |
| Commands in lib.rs | 55 | 3 |
| `cargo test` | Pass | Pass |
| `cargo build` | Pass | Pass |
| App launches | Yes | Yes |

---

## Notes

- **PairingState needs constructor**: Add `PairingState::new(cache_path: PathBuf)` method
- **CryptoState needs Default**: Already provided via `CryptoState::new()`
- **Import paths**: Commands use `crate::crypto::CryptoState` to access cross-module state
- **Conditional compilation**: Mobile commands retain `#[cfg(target_os = "...")]` attributes
