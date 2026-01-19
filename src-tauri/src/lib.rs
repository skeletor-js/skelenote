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
use tauri::Manager;

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
    /// Relative path from vault root (e.g., "Projects/my-note.md")
    path: String,
    /// File content as UTF-8 string
    content: String,
}

/// Read all markdown files from a directory recursively
///
/// Used for Obsidian vault import and bulk markdown import.
/// Returns an array of { path, content } for each .md file.
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

        // Skip directories and non-markdown files
        if !path.is_file() {
            continue;
        }

        let extension = path.extension().and_then(|s| s.to_str());
        if extension != Some("md") && extension != Some("markdown") {
            continue;
        }

        // Skip hidden files and folders (starting with .)
        let relative_path = path.strip_prefix(&root).unwrap_or(path);
        if relative_path
            .components()
            .any(|c| c.as_os_str().to_string_lossy().starts_with('.'))
        {
            continue;
        }

        // Read file content
        match std::fs::read_to_string(path) {
            Ok(content) => {
                files.push(VaultFile {
                    path: relative_path.to_string_lossy().to_string(),
                    content,
                });
            }
            Err(e) => {
                // Log error but continue with other files
                eprintln!("Failed to read {}: {}", path.display(), e);
            }
        }
    }

    // Sort by path for consistent ordering
    files.sort_by(|a, b| a.path.cmp(&b.path));

    println!(
        "[Import] Read {} markdown files from {}",
        files.len(),
        directory
    );
    Ok(files)
}

/// Save an attachment file to local storage
///
/// Saves the file to the app's attachments directory with a UUID prefix.
/// Returns a file:// URL that can be used in BlockNote blocks.
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

    // Generate unique filename: {uuid}_{original_filename}
    let unique_filename = format!("{}_{}", uuid::Uuid::new_v4(), filename);
    let file_path = attachments_dir.join(&unique_filename);

    std::fs::write(&file_path, bytes).map_err(|e| format!("Failed to write attachment: {}", e))?;

    // Return file:// URL
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

    // Shell plugin only available on desktop (provides shell:allow-open for URL handling)
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_shell::init());
    }

    builder
        .manage(CryptoState::new())
        .setup(|app| {
            // Initialize mobile-only plugins
            #[cfg(mobile)]
            {
                app.handle()
                    .plugin(tauri_plugin_barcode_scanner::init())?;
                // Edge-to-edge enables fullscreen mode and injects safe area CSS vars
                app.handle().plugin(tauri_plugin_edge_to_edge::init())?;
                // Biometric authentication (Face ID, Touch ID, fingerprint)
                app.handle().plugin(tauri_plugin_biometric::init())?;
                // Local notifications for reminders
                app.handle().plugin(tauri_plugin_notification::init())?;
                // Deep link handling (skelenote:// URLs)
                app.handle().plugin(tauri_plugin_deep_link::init())?;
            }

            // Initialize Android Keyring for native Keystore access
            #[cfg(target_os = "android")]
            {
                android_keyring::set_android_keyring_credential_builder()
                    .expect("Failed to initialize Android Keyring");
            }

            // Initialize NetworkState with persistent blocklist
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            let data_dir = app_data_dir.join("data");

            // Create data directory if it doesn't exist
            std::fs::create_dir_all(&data_dir).ok();

            let network_state = NetworkState::with_data_dir(data_dir.clone());

            // Load blocklist from disk in background
            let blocklist = network_state.blocklist.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = blocklist.load().await {
                    eprintln!("[Blocklist] Failed to load from disk: {}", e);
                }
            });

            app.manage(network_state);

            // Initialize PairingState with cache file path
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
            crypto::commands::crypto_init,
            crypto::commands::crypto_generate_key,
            crypto::commands::crypto_import_key,
            crypto::commands::crypto_has_key,
            crypto::commands::crypto_encrypt,
            crypto::commands::crypto_decrypt,
            crypto::commands::crypto_generate_qr,
            crypto::commands::crypto_parse_qr,
            crypto::commands::crypto_validate_mnemonic,
            crypto::commands::crypto_get_user_id,
            crypto::commands::crypto_clear_key,
            crypto::commands::device_get_signing_public_key,
            crypto::commands::device_sign_revocation,
            crypto::commands::device_verify_revocation,
            // Network commands
            network::commands::network_start_server,
            network::commands::network_stop_server,
            network::commands::network_get_server_info,
            network::commands::network_get_connected_peers,
            network::commands::network_get_device_info,
            network::commands::network_get_device_id,
            network::commands::network_sync_device_id,
            // mDNS Discovery commands
            network::commands::network_start_discovery,
            network::commands::network_stop_discovery,
            network::commands::network_get_discovered_peers,
            network::commands::network_is_discovery_running,
            // Peer Connection commands
            network::commands::network_connect_to_peer,
            // Sync Relay commands
            network::commands::network_broadcast_sync,
            network::commands::network_peer_count,
            // Device Registry Sync commands
            network::commands::network_broadcast_device_registry,
            network::commands::network_broadcast_device_revoke,
            network::commands::network_broadcast_device_rename,
            // Device Blocklist commands
            network::commands::device_block,
            network::commands::device_is_blocked,
            network::commands::device_get_blocked,
            // Pairing commands
            network::commands::pairing_generate_qr,
            network::commands::pairing_parse_qr,
            network::commands::pairing_connect,
            network::commands::pairing_connect_manual,
            // Cache commands
            network::commands::cache_get_paired_devices,
            network::commands::cache_remove_paired_device,
            network::commands::cache_prune_addresses,
            network::commands::cache_reconnect_all,
            network::commands::cache_reconnect_device,
            // Haptic feedback commands (mobile only)
            haptics::haptic_impact,
            haptics::haptic_notification,
            haptics::haptic_selection,
            // Share extension commands (mobile only)
            mobile::commands::share_get_pending_ios,
            mobile::commands::share_clear_pending_ios,
            mobile::commands::share_get_pending_android,
            mobile::commands::share_clear_pending_android,
            // Background task commands (mobile only)
            mobile::commands::begin_background_task,
            mobile::commands::end_background_task,
            // Icon switching commands
            icon::get_available_icons,
            icon::set_app_icon,
            icon::is_icon_switching_supported,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
