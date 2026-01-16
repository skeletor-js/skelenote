//! Skelenote Tauri backend
//!
//! Provides cryptographic operations for zero-knowledge sync
//! and local network sync capabilities.

mod crypto;
mod haptics;
mod network;

use crypto::{
    derive_sync_key, derive_user_id, encrypt_bytes, decrypt_bytes, generate_mnemonic, generate_mnemonic_qr,
    mnemonic_to_master_key, parse_qr_payload, validate_mnemonic, StrongholdManager,
    derive_signing_key, sign_revocation, verify_revocation, get_public_key_bytes,
};
use network::{LocalSyncServer, MdnsHandle, NetworkState, DiscoveredPeer};
use network::cache::{PairedDevicesCache, PairedDevice, KnownAddress};
use network::pairing::{PairingPayload, PairingInfo, get_local_ips};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::RwLock;
use zeroize::Zeroizing;

/// Shared crypto state managed by Tauri
struct CryptoState {
    /// Stronghold manager for secure key storage
    stronghold: Mutex<Option<StrongholdManager>>,
    /// Cached sync key for encryption/decryption (derived from master key)
    sync_key: Mutex<Option<Zeroizing<[u8; 32]>>>,
}

/// Shared pairing state managed by Tauri
#[derive(Clone)]
struct PairingState {
    /// Paired devices cache
    cache: Arc<RwLock<Option<PairedDevicesCache>>>,
    /// Path to cache file
    cache_path: PathBuf,
}

/// Greet command - returns a greeting message
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Skelenote.", name)
}

/// Initialize the crypto subsystem
///
/// Must be called on app startup. Returns true if a Skeleton Key already exists.
/// Guards against double-initialization (e.g., from React StrictMode).
#[tauri::command]
async fn crypto_init(app: AppHandle, state: State<'_, CryptoState>) -> Result<bool, String> {
    // Check if already initialized (guard against double-initialization)
    {
        let guard = state.stronghold.lock()
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
                *state.sync_key.lock()
                    .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))? = Some(sync_key);
            }
            Err(e) => {
                // Key file exists but can't be decrypted - this happens when:
                // - App is set up on a new device with different device key
                // - Key file is corrupted
                // - User data was copied from another device without the mnemonic
                // Log warning and treat as no key so user can re-import their mnemonic
                eprintln!("Warning: Could not decrypt existing key: {}. User will need to re-import Skeleton Key.", e);
                has_key = false;
            }
        }
    }

    *state.stronghold.lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))? = Some(manager);

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
        let stronghold_guard = state.stronghold.lock()
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
    *state.sync_key.lock()
        .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))? = Some(sync_key);

    Ok(())
}

/// Check if a Skeleton Key exists
#[tauri::command]
fn crypto_has_key(state: State<'_, CryptoState>) -> Result<bool, String> {
    let stronghold_guard = state.stronghold.lock()
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
fn crypto_encrypt(data: Vec<u8>, state: State<'_, CryptoState>) -> Result<Vec<u8>, String> {
    let sync_key_guard = state.sync_key.lock()
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
fn crypto_decrypt(data: Vec<u8>, state: State<'_, CryptoState>) -> Result<Vec<u8>, String> {
    let sync_key_guard = state.sync_key.lock()
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
    let stronghold_guard = state.stronghold.lock()
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
fn crypto_clear_key(state: State<'_, CryptoState>) -> Result<(), String> {
    // Clear the cached sync key
    *state.sync_key.lock()
        .map_err(|e| format!("Failed to acquire sync_key lock: {}", e))? = None;

    // Clear the stored master key
    let stronghold_guard = state.stronghold.lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
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

// ============================================================================
// Network Commands - Local Network Sync
// ============================================================================

/// Derive fingerprint from user ID for peer verification
///
/// Returns first 8 characters of SHA-256 hash of user ID.
fn derive_fingerprint(user_id: &str) -> String {
    use sha2::{Sha256, Digest};
    let hash = Sha256::digest(user_id.as_bytes());
    hex::encode(&hash[..4]) // 8 hex chars
}

/// Start the local sync TCP server
///
/// Returns the port number the server is listening on.
#[tauri::command]
async fn network_start_server(
    app: AppHandle,
    crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
    pairing_state: State<'_, PairingState>,
) -> Result<u16, String> {
    // Check if server is already running
    {
        let server = network_state.server.read().await;
        if server.is_some() {
            return Err("Server already running".to_string());
        }
    }

    // Get fingerprint from user ID
    let fingerprint = {
        let stronghold_guard = crypto_state.stronghold.lock()
            .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
        let manager = stronghold_guard
            .as_ref()
            .ok_or("Crypto not initialized - call crypto_init first")?;
        let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
        let user_id = derive_user_id(&master_key);
        derive_fingerprint(&user_id)
    };

    // Store fingerprint
    {
        let mut fp = network_state.fingerprint.write().await;
        *fp = Some(fingerprint.clone());
    }

    // Load paired devices cache
    {
        let device_id = network_state.device_id.read().await.clone();
        let device_name = network_state.device_name.read().await.clone();
        let cache = PairedDevicesCache::load(
            &pairing_state.cache_path,
            device_id.clone(),
            device_name.clone(),
            fingerprint.clone(),
        ).map_err(|e| e.to_string())?;

        let mut cache_guard = pairing_state.cache.write().await;
        *cache_guard = Some(cache);
    }

    // Get device info
    let device_id = network_state.device_id.read().await.clone();
    let device_name = network_state.device_name.read().await.clone();
    let connected_peers = network_state.connected_peers.clone();
    let peer_streams = network_state.peer_streams.clone();
    let blocklist = network_state.blocklist.clone();

    // Start the server (passing blocklist for revoked device filtering)
    let (handle, mut event_rx, port) = LocalSyncServer::start(
        device_id,
        device_name,
        fingerprint,
        connected_peers,
        peer_streams,
        blocklist,
    ).await.map_err(|e| e.to_string())?;

    // Store the server handle
    {
        let mut server = network_state.server.write().await;
        *server = Some(handle);
    }

    // Spawn event handler to emit events to frontend
    let app_handle = app.clone();
    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            match event {
                network::server::ServerEvent::PeerConnected { device_id, device_name, address } => {
                    let _ = app_handle.emit("local-peer-connected", serde_json::json!({
                        "deviceId": device_id,
                        "deviceName": device_name,
                        "address": address,
                    }));
                }
                network::server::ServerEvent::PeerDisconnected { device_id } => {
                    let _ = app_handle.emit("local-peer-disconnected", serde_json::json!({
                        "deviceId": device_id,
                    }));
                }
                network::server::ServerEvent::MessageReceived { device_id, msg_type, payload } => {
                    let _ = app_handle.emit("local-sync-message", serde_json::json!({
                        "deviceId": device_id,
                        "msgType": msg_type,
                        "payload": payload,
                    }));
                }
                network::server::ServerEvent::Error { message } => {
                    let _ = app_handle.emit("local-sync-error", serde_json::json!({
                        "message": message,
                    }));
                }
            }
        }
    });

    Ok(port)
}

/// Stop the local sync TCP server
#[tauri::command]
async fn network_stop_server(
    network_state: State<'_, NetworkState>,
) -> Result<(), String> {
    let mut server = network_state.server.write().await;
    if let Some(handle) = server.take() {
        // Send shutdown signal (receiver will be dropped, causing the accept loop to exit)
        let _ = handle.shutdown_tx.send(());
    }
    Ok(())
}

/// Get server info (running status and port)
#[tauri::command]
async fn network_get_server_info(
    network_state: State<'_, NetworkState>,
) -> Result<network::state::ServerInfo, String> {
    Ok(network_state.get_server_info().await)
}

/// Get list of connected peers
#[tauri::command]
async fn network_get_connected_peers(
    network_state: State<'_, NetworkState>,
) -> Result<Vec<network::state::ConnectedPeer>, String> {
    let peers = network_state.connected_peers.read().await;
    Ok(peers.values().cloned().collect())
}

/// Get this device's info
#[tauri::command]
async fn network_get_device_info(
    network_state: State<'_, NetworkState>,
) -> Result<serde_json::Value, String> {
    let device_id = network_state.device_id.read().await.clone();
    let device_name = network_state.device_name.read().await.clone();
    let fingerprint = network_state.fingerprint.read().await.clone();
    let server_info = network_state.get_server_info().await;

    Ok(serde_json::json!({
        "deviceId": device_id,
        "deviceName": device_name,
        "fingerprint": fingerprint,
        "server": server_info,
    }))
}

/// Get this device's unique ID
///
/// Returns the device ID used for P2P identification.
/// Call network_sync_device_id after crypto_init to ensure persistent ID is loaded.
#[tauri::command]
async fn network_get_device_id(
    network_state: State<'_, NetworkState>,
) -> Result<String, String> {
    Ok(network_state.device_id.read().await.clone())
}

/// Synchronize device ID with persistent storage
///
/// This should be called after crypto_init to ensure the device ID persists
/// across app restarts. If a persisted ID exists, it updates NetworkState.
/// If no persisted ID exists, it saves the current NetworkState ID.
#[tauri::command]
async fn network_sync_device_id(
    crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
) -> Result<String, String> {
    // Check if we have a persisted device ID (hold lock briefly, release before await)
    let persisted_id_result: Result<Option<String>, String> = {
        let stronghold_guard = crypto_state.stronghold.lock()
            .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
        let manager = stronghold_guard
            .as_ref()
            .ok_or("Crypto not initialized - call crypto_init first")?;

        if manager.has_device_id() {
            let id = manager.get_device_id().map_err(|e| e.to_string())?;
            Ok(Some(id))
        } else {
            Ok(None)
        }
    };

    match persisted_id_result? {
        Some(persisted_id) => {
            // Load persisted device ID into NetworkState
            *network_state.device_id.write().await = persisted_id.clone();
            println!("[DeviceID] Loaded persisted device ID: {}", persisted_id);
            Ok(persisted_id)
        }
        None => {
            // Get current device ID from NetworkState
            let current_id = network_state.device_id.read().await.clone();

            // Persist it (re-acquire lock, no await after)
            {
                let stronghold_guard = crypto_state.stronghold.lock()
                    .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
                let manager = stronghold_guard
                    .as_ref()
                    .ok_or("Crypto not initialized")?;
                manager.store_device_id(&current_id).map_err(|e| e.to_string())?;
            }

            println!("[DeviceID] Persisted new device ID: {}", current_id);
            Ok(current_id)
        }
    }
}

// ============================================================================
// mDNS Discovery Commands
// ============================================================================

/// Start mDNS discovery and advertising
///
/// Advertises this device on the local network and starts browsing for peers.
/// Requires the TCP server to be running first (to know the port to advertise).
#[tauri::command]
async fn network_start_discovery(
    app: AppHandle,
    crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
) -> Result<(), String> {
    // Check if already running
    if network_state.is_mdns_running().await {
        return Err("mDNS discovery already running".to_string());
    }

    // Get server port - server must be running
    let port = {
        let server = network_state.server.read().await;
        server
            .as_ref()
            .map(|h| h.port)
            .ok_or("Server must be running before starting discovery")?
    };

    // Get fingerprint from user ID
    let fingerprint = {
        let stronghold_guard = crypto_state.stronghold.lock()
            .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
        let manager = stronghold_guard
            .as_ref()
            .ok_or("Crypto not initialized - call crypto_init first")?;
        let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
        let user_id = derive_user_id(&master_key);
        derive_fingerprint(&user_id)
    };

    // Get device info
    let device_id = network_state.device_id.read().await.clone();
    let device_name = network_state.device_name.read().await.clone();
    let discovered_peers = network_state.discovered_peers.clone();

    // Start mDNS (passing blocklist for revoked device filtering)
    let blocklist = network_state.blocklist.clone();
    let (handle, mut event_rx) = MdnsHandle::start(
        device_id,
        device_name,
        port,
        fingerprint,
        blocklist,
    )?;

    // Store the handle
    {
        let mut mdns = network_state.mdns.write().await;
        mdns.handle = Some(handle);
    }

    // Spawn event handler to emit events to frontend and update discovered peers
    let app_handle = app.clone();
    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            match event {
                network::mdns::MdnsEvent::PeerDiscovered(peer) => {
                    // Add to discovered peers map
                    {
                        let mut peers = discovered_peers.write().await;
                        peers.insert(peer.device_id.clone(), peer.clone());
                    }
                    // Emit to frontend
                    let _ = app_handle.emit("local-peer-discovered", serde_json::json!({
                        "deviceId": peer.device_id,
                        "deviceName": peer.device_name,
                        "addresses": peer.addresses,
                        "port": peer.port,
                        "fingerprint": peer.fingerprint,
                    }));
                }
                network::mdns::MdnsEvent::PeerLost { device_id } => {
                    // Remove from discovered peers map
                    {
                        let mut peers = discovered_peers.write().await;
                        peers.remove(&device_id);
                    }
                    // Emit to frontend
                    let _ = app_handle.emit("local-peer-lost", serde_json::json!({
                        "deviceId": device_id,
                    }));
                }
            }
        }
    });

    Ok(())
}

/// Stop mDNS discovery and advertising
#[tauri::command]
async fn network_stop_discovery(
    network_state: State<'_, NetworkState>,
) -> Result<(), String> {
    // Take the handle
    let handle = {
        let mut mdns = network_state.mdns.write().await;
        mdns.handle.take()
    };

    // Stop if running
    if let Some(handle) = handle {
        handle.stop().await?;
    }

    // Clear discovered peers
    {
        let mut peers = network_state.discovered_peers.write().await;
        peers.clear();
    }

    Ok(())
}

/// Get list of discovered peers on the local network
#[tauri::command]
async fn network_get_discovered_peers(
    network_state: State<'_, NetworkState>,
) -> Result<Vec<DiscoveredPeer>, String> {
    let peers = network_state.discovered_peers.read().await;
    Ok(peers.values().cloned().collect())
}

/// Check if mDNS discovery is running
#[tauri::command]
async fn network_is_discovery_running(
    network_state: State<'_, NetworkState>,
) -> Result<bool, String> {
    Ok(network_state.is_mdns_running().await)
}

// ============================================================================
// Peer Connection Commands
// ============================================================================

/// Connect to a discovered peer by device ID
#[tauri::command]
async fn network_connect_to_peer(
    device_id: String,
    app: tauri::AppHandle,
    network_state: State<'_, NetworkState>,
) -> Result<(), String> {
    use std::net::SocketAddr;
    use network::client::PeerConnection;
    use network::protocol::MessageType;

    println!("[Connect] Attempting to connect to peer: {}", device_id);

    // Get the peer info from discovered peers
    let peer = {
        let peers = network_state.discovered_peers.read().await;
        peers.get(&device_id).cloned()
    };

    let peer = peer.ok_or_else(|| format!("Peer not found: {}", device_id))?;
    println!("[Connect] Found peer: {} at {:?}:{}", peer.device_name, peer.addresses, peer.port);

    // Check if device is blocked/revoked
    if network_state.is_device_blocked(&device_id).await {
        println!("[Connect] Refusing to connect to blocked device: {}", device_id);
        return Err("Device has been revoked".to_string());
    }

    // Get our device info
    let our_device_id = network_state.device_id.read().await.clone();
    let our_device_name = network_state.device_name.read().await.clone();
    let our_fingerprint = network_state.fingerprint.read().await
        .clone()
        .ok_or("No fingerprint set - start discovery first")?;

    // Try each address until one works
    let mut last_error = String::from("No addresses to try");
    for addr_str in &peer.addresses {
        // Parse the IP address and add the port
        let addr: SocketAddr = match format!("{}:{}", addr_str, peer.port).parse() {
            Ok(a) => a,
            Err(e) => {
                println!("[Connect] Invalid address {}: {}", addr_str, e);
                continue;
            }
        };

        println!("[Connect] Trying {}...", addr);

        match PeerConnection::connect(
            addr,
            our_device_id.clone(),
            our_device_name.clone(),
            our_fingerprint.clone(),
        ).await {
            Ok((connection, mut event_rx)) => {
                println!("[Connect] Connected to {} ({})", connection.device_name, connection.device_id);

                let peer_device_id = connection.device_id.clone();
                let peer_device_name = connection.device_name.clone();

                // Store in connected peers
                {
                    let mut peers = network_state.connected_peers.write().await;
                    peers.insert(peer_device_id.clone(), network::state::ConnectedPeer {
                        device_id: peer_device_id.clone(),
                        device_name: peer_device_name.clone(),
                        address: addr.to_string(),
                        connected_at: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    });
                }

                // Store the write stream in peer_streams so broadcast_sync can send to it
                let write_stream = connection.get_write_stream();
                network_state.add_peer_write_stream_arc(peer_device_id.clone(), write_stream).await;
                println!("[Connect] Added write stream to peer_streams for {}", peer_device_id);

                // Emit connected event
                println!("[Connect] Emitting local-peer-connected event for {}", peer_device_id);
                match app.emit("local-peer-connected", serde_json::json!({
                    "deviceId": peer_device_id.clone(),
                    "deviceName": peer_device_name.clone(),
                    "address": addr.to_string(),
                })) {
                    Ok(()) => println!("[Connect] Event emitted successfully"),
                    Err(e) => println!("[Connect] Failed to emit event: {:?}", e),
                }

                // Spawn event handler for incoming messages
                let app_clone = app.clone();
                let peer_id_clone = peer_device_id.clone();
                let connected_peers = network_state.connected_peers.clone();
                let peer_streams = network_state.peer_streams.clone();
                tokio::spawn(async move {
                    while let Some(event) = event_rx.recv().await {
                        match event {
                            network::client::PeerEvent::MessageReceived { msg_type, payload } => {
                                if msg_type == MessageType::Update as u8 {
                                    let _ = app_clone.emit("local-sync-message", serde_json::json!({
                                        "deviceId": peer_id_clone,
                                        "msgType": msg_type,
                                        "payload": payload,
                                    }));
                                }
                            }
                            network::client::PeerEvent::Disconnected => {
                                // Remove from connected peers
                                {
                                    let mut peers = connected_peers.write().await;
                                    peers.remove(&peer_id_clone);
                                }
                                // Remove from peer streams
                                {
                                    let mut streams = peer_streams.write().await;
                                    streams.remove(&peer_id_clone);
                                }
                                let _ = app_clone.emit("local-peer-disconnected", serde_json::json!({
                                    "deviceId": peer_id_clone,
                                }));
                                break;
                            }
                            network::client::PeerEvent::Error { message } => {
                                eprintln!("[Connect] Peer error: {}", message);
                            }
                            _ => {}
                        }
                    }
                });

                return Ok(());
            }
            Err(e) => {
                println!("[Connect] Failed to connect to {}: {}", addr, e);
                last_error = e.to_string();
            }
        }
    }

    Err(format!("Failed to connect to peer: {}", last_error))
}

// ============================================================================
// Sync Relay Commands
// ============================================================================

/// Broadcast sync data to all connected local peers
///
/// The data should be encrypted Loro update bytes.
/// Returns the number of peers the data was sent to.
#[tauri::command]
async fn network_broadcast_sync(
    data: Vec<u8>,
    network_state: State<'_, NetworkState>,
) -> Result<usize, String> {
    let count = network_state.broadcast_sync(&data).await;
    Ok(count)
}

/// Get number of connected peers for sync
#[tauri::command]
async fn network_peer_count(
    network_state: State<'_, NetworkState>,
) -> Result<usize, String> {
    Ok(network_state.peer_count().await)
}

/// Broadcast device registry to all connected local peers
///
/// The data should be Loro snapshot bytes of the device registry.
/// Returns the number of peers the data was sent to.
#[tauri::command]
async fn network_broadcast_device_registry(
    data: Vec<u8>,
    network_state: State<'_, NetworkState>,
) -> Result<usize, String> {
    use crate::network::protocol::MessageType;
    let count = network_state.broadcast_raw(MessageType::DeviceRegistry, &data).await;
    Ok(count)
}

/// Broadcast device revocation to all connected local peers
///
/// The payload should be a JSON-stringified DeviceRevokePayload.
/// Validates the payload structure before broadcasting.
/// Returns the number of peers the message was sent to.
#[tauri::command]
async fn network_broadcast_device_revoke(
    payload: String,
    network_state: State<'_, NetworkState>,
) -> Result<usize, String> {
    use crate::network::protocol::{DeviceRevokePayload, MessageType};

    // Parse and validate the payload structure
    let revoke: DeviceRevokePayload = serde_json::from_str(&payload)
        .map_err(|e| format!("Invalid revoke payload: {}", e))?;

    // Re-serialize the validated struct
    let data = serde_json::to_vec(&revoke)
        .map_err(|e| format!("Failed to serialize revoke payload: {}", e))?;

    let count = network_state.broadcast_raw(MessageType::DeviceRevoke, &data).await;
    Ok(count)
}

/// Broadcast device rename to all connected local peers
///
/// The payload should be a JSON-stringified DeviceRenamePayload.
/// Validates the payload structure before broadcasting.
/// Returns the number of peers the message was sent to.
#[tauri::command]
async fn network_broadcast_device_rename(
    payload: String,
    network_state: State<'_, NetworkState>,
) -> Result<usize, String> {
    use crate::network::protocol::{DeviceRenamePayload, MessageType};

    // Parse and validate the payload structure
    let rename: DeviceRenamePayload = serde_json::from_str(&payload)
        .map_err(|e| format!("Invalid rename payload: {}", e))?;

    // Re-serialize the validated struct
    let data = serde_json::to_vec(&rename)
        .map_err(|e| format!("Failed to serialize rename payload: {}", e))?;

    let count = network_state.broadcast_raw(MessageType::DeviceRename, &data).await;
    Ok(count)
}

// ============================================================================
// Device Management Commands
// ============================================================================

/// Get the Ed25519 public signing key for this device
///
/// Returns the public key as a base64-encoded string.
/// All devices with the same Skeleton Key will have the same signing keypair.
#[tauri::command]
fn device_get_signing_public_key(state: State<'_, CryptoState>) -> Result<String, String> {
    let stronghold_guard = state.stronghold.lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    let manager = stronghold_guard
        .as_ref()
        .ok_or("Crypto not initialized - call crypto_init first")?;

    let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
    let signing_key = derive_signing_key(&master_key);
    let public_key_bytes = get_public_key_bytes(&signing_key);

    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, public_key_bytes))
}

/// Sign a device revocation
///
/// Creates an Ed25519 signature over the canonical revocation message.
/// Returns the signature as a base64-encoded string.
#[tauri::command]
fn device_sign_revocation(
    device_id: String,
    revoked_at: u64,
    revoked_by: String,
    state: State<'_, CryptoState>,
) -> Result<String, String> {
    let stronghold_guard = state.stronghold.lock()
        .map_err(|e| format!("Failed to acquire stronghold lock: {}", e))?;
    let manager = stronghold_guard
        .as_ref()
        .ok_or("Crypto not initialized - call crypto_init first")?;

    let master_key = manager.get_master_key().map_err(|e| e.to_string())?;
    let signing_key = derive_signing_key(&master_key);
    let signature = sign_revocation(&signing_key, &device_id, revoked_at, &revoked_by);

    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, signature))
}

/// Verify a device revocation signature
///
/// Checks that the signature is valid for the given revocation parameters.
/// Returns true if valid, false otherwise.
#[tauri::command]
fn device_verify_revocation(
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

    match verify_revocation(&public_key_bytes, &device_id, revoked_at, &revoked_by, &signature_bytes) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Block a device from P2P connections
///
/// Adds a device to the local blocklist. Blocked devices are filtered from
/// mDNS discovery and rejected at TCP handshake.
#[tauri::command]
async fn device_block(
    device_id: String,
    network_state: State<'_, NetworkState>,
) -> Result<(), String> {
    network_state
        .block_device(device_id.clone())
        .await
        .map_err(|e| format!("Failed to block device: {}", e))?;

    // Also remove from connected peers and close the connection if connected
    {
        let mut connected = network_state.connected_peers.write().await;
        connected.remove(&device_id);
    }
    {
        let mut streams = network_state.peer_streams.write().await;
        streams.remove(&device_id);
    }

    println!("[Device] Blocked device: {}", device_id);
    Ok(())
}

/// Check if a device is blocked
#[tauri::command]
async fn device_is_blocked(
    device_id: String,
    network_state: State<'_, NetworkState>,
) -> Result<bool, String> {
    Ok(network_state.is_device_blocked(&device_id).await)
}

/// Get all blocked device IDs
#[tauri::command]
async fn device_get_blocked(
    network_state: State<'_, NetworkState>,
) -> Result<Vec<String>, String> {
    Ok(network_state.blocklist.get_blocked().await)
}

// ============================================================================
// Attachment Storage Commands
// ============================================================================

/// Save an attachment file to local storage
///
/// Saves the file to the app's attachments directory with a UUID prefix.
/// Returns a file:// URL that can be used in BlockNote blocks.
#[tauri::command]
async fn save_attachment(
    app: AppHandle,
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

    std::fs::write(&file_path, bytes)
        .map_err(|e| format!("Failed to write attachment: {}", e))?;

    // Return file:// URL
    Ok(format!("file://{}", file_path.display()))
}

// ============================================================================
// Import Commands - Vault/Folder Reading
// ============================================================================

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

    println!("[Import] Read {} markdown files from {}", files.len(), directory);
    Ok(files)
}

// ============================================================================
// Pairing Helper Functions
// ============================================================================

/// Connect to a peer using direct IP and port
///
/// Helper function used by both pairing and reconnection flows.
async fn connect_to_peer_direct(
    ip: String,
    port: u16,
    our_device_id: String,
    our_device_name: String,
    our_fingerprint: String,
    app: Option<tauri::AppHandle>,
    network_state: &NetworkState,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use std::net::SocketAddr;
    use network::client::PeerConnection;
    use network::protocol::MessageType;

    // Parse address
    let addr: SocketAddr = format!("{}:{}", ip, port).parse()?;

    println!("[ConnectDirect] Attempting to connect to {}:{}", ip, port);

    // Connect
    let (connection, mut event_rx) = PeerConnection::connect(
        addr,
        our_device_id,
        our_device_name,
        our_fingerprint,
    ).await?;

    println!("[ConnectDirect] Connected to {} ({})", connection.device_name, connection.device_id);

    let peer_device_id = connection.device_id.clone();
    let peer_device_name = connection.device_name.clone();

    // Check if device is blocked
    if network_state.is_device_blocked(&peer_device_id).await {
        println!("[ConnectDirect] Device is blocked: {}", peer_device_id);
        return Err("Device has been revoked".into());
    }

    // Store in connected peers
    {
        let mut peers = network_state.connected_peers.write().await;
        peers.insert(peer_device_id.clone(), network::state::ConnectedPeer {
            device_id: peer_device_id.clone(),
            device_name: peer_device_name.clone(),
            address: addr.to_string(),
            connected_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        });
    }

    // Store the write stream
    let write_stream = connection.get_write_stream();
    network_state.add_peer_write_stream_arc(peer_device_id.clone(), write_stream).await;

    // Emit connected event if app handle provided
    if let Some(app) = app {
        let _ = app.emit("local-peer-connected", serde_json::json!({
            "deviceId": peer_device_id.clone(),
            "deviceName": peer_device_name.clone(),
            "address": addr.to_string(),
        }));

        // Spawn event handler for incoming messages
        let peer_id_clone = peer_device_id.clone();
        let connected_peers = network_state.connected_peers.clone();
        let peer_streams = network_state.peer_streams.clone();
        tokio::spawn(async move {
            while let Some(event) = event_rx.recv().await {
                match event {
                    network::client::PeerEvent::MessageReceived { msg_type, payload } => {
                        if msg_type == MessageType::Update as u8 {
                            let _ = app.emit("local-sync-message", serde_json::json!({
                                "deviceId": peer_id_clone,
                                "msgType": msg_type,
                                "payload": payload,
                            }));
                        }
                    }
                    network::client::PeerEvent::Disconnected => {
                        println!("[ConnectDirect] Peer disconnected: {}", peer_id_clone);
                        // Remove from connected peers
                        {
                            let mut peers = connected_peers.write().await;
                            peers.remove(&peer_id_clone);
                        }
                        // Remove from peer streams
                        {
                            let mut streams = peer_streams.write().await;
                            streams.remove(&peer_id_clone);
                        }
                        let _ = app.emit("local-peer-disconnected", serde_json::json!({
                            "deviceId": peer_id_clone,
                        }));
                        break;
                    }
                    network::client::PeerEvent::Error { message } => {
                        println!("[ConnectDirect] Peer error: {}", message);
                    }
                    _ => {}
                }
            }
        });
    }

    Ok(())
}

// ============================================================================
// Pairing Commands
// ============================================================================

/// Response from QR generation command
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct QrCodeResponse {
    /// Base64-encoded PNG image
    png_base64: String,
    /// Raw payload URL
    payload: String,
    /// Device fingerprint (for visual verification)
    fingerprint: String,
    /// Connection details for manual entry
    manual_details: ManualPairingDetails,
}

/// Connection details for manual pairing (no camera needed)
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ManualPairingDetails {
    /// List of IP addresses to try
    ips: Vec<String>,
    /// TCP port
    port: u16,
    /// Device code (fingerprint, formatted like A1B2-C3D4)
    code: String,
    /// Device name
    device_name: String,
}

/// Generate QR code for pairing this device
#[tauri::command]
async fn pairing_generate_qr(
    _crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
) -> Result<QrCodeResponse, String> {
    // Get device info
    let device_id = network_state.device_id.read().await.clone();
    let device_name = network_state.device_name.read().await.clone();

    // Get fingerprint
    let fingerprint = {
        let fp_guard = network_state.fingerprint.read().await;
        fp_guard.clone().ok_or("Fingerprint not set - server must be started first")?
    };

    // Get server port
    let server_info = network_state.get_server_info().await;
    let port = server_info.port.ok_or("Server not running - call network_start_server first")?;

    // Get local IPs
    let ips = get_local_ips().map_err(|e| e.to_string())?;

    // Create payload
    let payload_struct = PairingPayload::new(
        ips.clone(),
        port,
        fingerprint.clone(),
        device_id,
        device_name.clone()
    );

    // Generate URL
    let url = payload_struct.to_url().map_err(|e| e.to_string())?;

    // Generate QR code PNG
    let png_bytes = payload_struct.to_qr_png().map_err(|e| e.to_string())?;

    // Encode PNG as base64
    use base64::{engine::general_purpose::STANDARD, Engine};
    let png_base64 = STANDARD.encode(&png_bytes);

    // Format fingerprint for display (e.g., "a1b2c3d4" -> "A1B2-C3D4")
    let formatted_code = fingerprint.to_uppercase().chars()
        .collect::<Vec<_>>()
        .chunks(4)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-");

    Ok(QrCodeResponse {
        png_base64,
        payload: url,
        fingerprint: fingerprint.clone(),
        manual_details: ManualPairingDetails {
            ips,
            port,
            code: formatted_code,
            device_name,
        },
    })
}

/// Parse a QR code payload and validate fingerprint
#[tauri::command]
async fn pairing_parse_qr(
    payload: String,
    network_state: State<'_, NetworkState>,
) -> Result<PairingInfo, String> {
    // Parse payload
    let payload_struct = PairingPayload::from_url(&payload).map_err(|e| e.to_string())?;

    // Get our fingerprint
    let our_fingerprint = {
        let fp_guard = network_state.fingerprint.read().await;
        fp_guard.clone().ok_or("Fingerprint not set - server must be started first")?
    };

    // Create pairing info with fingerprint check
    let info = PairingInfo::from_payload(payload_struct, &our_fingerprint);

    Ok(info)
}

/// Connect to a device using manual connection details
///
/// For pairing without scanning QR code - user enters IP, port, and code manually.
#[tauri::command]
async fn pairing_connect_manual(
    ip: String,
    port: u16,
    code: String,
    app: AppHandle,
    _crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
    pairing_state: State<'_, PairingState>,
) -> Result<(), String> {
    // Remove any formatting from code (e.g., "A1B2-C3D4" -> "a1b2c3d4")
    let clean_code = code.replace("-", "").replace(" ", "").to_lowercase();

    // Get our fingerprint
    let our_fingerprint = {
        let fp_guard = network_state.fingerprint.read().await;
        fp_guard.clone().ok_or("Fingerprint not set - server must be started first")?
    };

    // Verify fingerprint matches
    if clean_code != our_fingerprint {
        return Err("Device code doesn't match - devices must use same Skeleton Key".to_string());
    }

    let our_device_id = network_state.device_id.read().await.clone();
    let our_device_name = network_state.device_name.read().await.clone();

    // Try connecting
    println!("[PairingManual] Attempting connection to {}:{}", ip, port);

    match connect_to_peer_direct(
        ip.clone(),
        port,
        our_device_id.clone(),
        our_device_name.clone(),
        our_fingerprint.clone(),
        Some(app.clone()),
        &network_state,
    ).await {
        Ok(_) => {
            println!("[PairingManual] Successfully connected to {}:{}", ip, port);

            // Get device info from the connection (we don't know device_id or name yet)
            // Actually, after connection, we can get it from connected_peers
            let peer_info = {
                let peers = network_state.connected_peers.read().await;
                // Find the peer we just connected to by address
                peers.values().find(|p| p.address == format!("{}:{}", ip, port)).cloned()
            };

            if let Some(peer) = peer_info {
                // Add to paired devices cache
                let mut cache_guard = pairing_state.cache.write().await;
                if let Some(cache) = cache_guard.as_mut() {
                    let mut device = PairedDevice::new(
                        peer.device_id.clone(),
                        peer.device_name.clone(),
                        our_fingerprint,
                        vec![KnownAddress::new(ip.clone(), port)],
                    );
                    // Record initial connection success
                    device.record_connection_success(&ip, port);
                    cache.add_device(device);

                    // Save cache to disk
                    if let Err(e) = cache.save(&pairing_state.cache_path) {
                        eprintln!("[PairingManual] Failed to save cache: {}", e);
                    }
                }
            }

            Ok(())
        }
        Err(e) => {
            Err(format!("Failed to connect to {}:{}: {}", ip, port, e))
        }
    }
}

/// Connect to a device using pairing info
#[tauri::command]
async fn pairing_connect(
    info: PairingInfo,
    app: AppHandle,
    _crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
    pairing_state: State<'_, PairingState>,
) -> Result<(), String> {
    // Verify fingerprint matches
    if !info.fingerprint_match {
        return Err("Fingerprint mismatch - devices must use same Skeleton Key".to_string());
    }

    let our_device_id = network_state.device_id.read().await.clone();
    let our_device_name = network_state.device_name.read().await.clone();
    let our_fingerprint = network_state.fingerprint.read().await.clone()
        .ok_or("Fingerprint not set")?;

    // Try connecting to each IP address
    let mut last_error: Option<Box<dyn std::error::Error + Send + Sync>> = None;
    for ip in &info.ips {
        println!("[Pairing] Attempting connection to {}:{}", ip, info.port);

        match connect_to_peer_direct(
            ip.clone(),
            info.port,
            our_device_id.clone(),
            our_device_name.clone(),
            our_fingerprint.clone(),
            Some(app.clone()),
            &network_state,
        ).await {
            Ok(_) => {
                println!("[Pairing] Successfully connected to {}:{}", ip, info.port);

                // Add to paired devices cache
                let mut cache_guard = pairing_state.cache.write().await;
                if let Some(cache) = cache_guard.as_mut() {
                    let mut device = PairedDevice::new(
                        info.device_id.clone(),
                        info.device_name.clone(),
                        info.fingerprint.clone(),
                        vec![KnownAddress::new(ip.clone(), info.port)],
                    );
                    // Record initial connection success
                    device.record_connection_success(ip, info.port);
                    cache.add_device(device);

                    // Save cache to disk
                    if let Err(e) = cache.save(&pairing_state.cache_path) {
                        eprintln!("[Pairing] Failed to save cache: {}", e);
                    }
                }

                return Ok(());
            }
            Err(e) => {
                println!("[Pairing] Failed to connect to {}:{}: {}", ip, info.port, e);
                last_error = Some(e);
            }
        }
    }

    Err(format!(
        "Failed to connect to device - tried {} addresses. Last error: {}",
        info.ips.len(),
        last_error.map(|e| e.to_string()).unwrap_or_else(|| "unknown".to_string())
    ))
}

/// Get all paired devices with current connection status
#[derive(Debug, serde::Serialize)]
struct PairedDeviceWithStatus {
    #[serde(flatten)]
    device: PairedDevice,
    connected: bool,
}

#[tauri::command]
async fn cache_get_paired_devices(
    pairing_state: State<'_, PairingState>,
    network_state: State<'_, NetworkState>,
) -> Result<Vec<PairedDeviceWithStatus>, String> {
    let cache_guard = pairing_state.cache.read().await;
    let cache = cache_guard.as_ref().ok_or("Cache not initialized")?;

    // Get connected peer IDs
    let connected_peers = network_state.connected_peers.read().await;

    // Map devices to include connection status
    let devices = cache.devices.iter().map(|device| {
        let connected = connected_peers.contains_key(&device.id);
        PairedDeviceWithStatus {
            device: device.clone(),
            connected,
        }
    }).collect();

    Ok(devices)
}

/// Remove a paired device
#[tauri::command]
async fn cache_remove_paired_device(
    device_id: String,
    pairing_state: State<'_, PairingState>,
) -> Result<(), String> {
    let mut cache_guard = pairing_state.cache.write().await;
    let cache = cache_guard.as_mut().ok_or("Cache not initialized")?;

    cache.remove_device(&device_id).map_err(|e| e.to_string())?;

    // Save cache to disk
    cache.save(&pairing_state.cache_path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Prune dead addresses from all paired devices
///
/// Removes addresses with >10 consecutive failures and limits each device to 5 addresses.
/// Should be called periodically after reconnection attempts.
#[tauri::command]
async fn cache_prune_addresses(
    pairing_state: State<'_, PairingState>,
) -> Result<(), String> {
    let mut cache_guard = pairing_state.cache.write().await;
    let cache = cache_guard.as_mut().ok_or("Cache not initialized")?;

    println!("[Cache] Pruning dead addresses from {} devices", cache.devices.len());
    cache.prune_all_addresses();

    // Save cache to disk
    cache.save(&pairing_state.cache_path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Reconnect to all paired devices
#[tauri::command]
async fn cache_reconnect_all(
    app: AppHandle,
    _crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
    pairing_state: State<'_, PairingState>,
) -> Result<(), String> {
    // Release cache read lock to allow writes during connection attempts
    let devices = {
        let cache_guard = pairing_state.cache.read().await;
        let cache = cache_guard.as_ref().ok_or("Cache not initialized")?;
        cache.devices.clone()
    };

    let fingerprint = network_state.fingerprint.read().await.clone()
        .ok_or("Fingerprint not set")?;
    let device_id = network_state.device_id.read().await.clone();
    let device_name = network_state.device_name.read().await.clone();

    // Get references we need to pass into tasks
    let connected_peers = network_state.connected_peers.clone();
    let peer_streams = network_state.peer_streams.clone();
    let blocklist = network_state.blocklist.clone();

    // Try connecting to each paired device in parallel (with concurrency limit)
    let mut tasks = Vec::new();

    for device in devices {
        let addresses: Vec<_> = device.prioritized_addresses().into_iter().map(|a| a.clone()).collect();
        let target_device_id = device.id.clone();
        let fp = fingerprint.clone();
        let dev_id = device_id.clone();
        let dev_name = device_name.clone();
        let app_clone = app.clone();
        let connected_peers_clone = connected_peers.clone();
        let peer_streams_clone = peer_streams.clone();
        let blocklist_clone = blocklist.clone();
        let pairing_state_clone = pairing_state.inner().clone();

        let task = tokio::spawn(async move {
            use std::net::SocketAddr;
            use network::client::PeerConnection;

            // Emit connecting status
            let _ = app_clone.emit("paired-device-status", serde_json::json!({
                "deviceId": target_device_id,
                "status": "connecting",
            }));

            let mut connected = false;
            let mut last_error: Option<String> = None;

            // Try each address in priority order
            for addr_info in addresses {
                let ip = addr_info.ip.clone();
                let port = addr_info.port;

                let addr: SocketAddr = match format!("{}:{}", ip, port).parse() {
                    Ok(a) => a,
                    Err(e) => {
                        println!("[Reconnect] Invalid address {}:{}: {}", ip, port, e);
                        // Record failure in cache
                        {
                            let mut cache_guard = pairing_state_clone.cache.write().await;
                            if let Some(cache) = cache_guard.as_mut() {
                                let _ = cache.record_connection_failure(&target_device_id, &ip, port);
                            }
                        }
                        continue;
                    }
                };

                // Check if device is blocked
                if blocklist_clone.is_blocked(&target_device_id).await {
                    println!("[Reconnect] Device is blocked: {}", target_device_id);
                    last_error = Some("Device has been revoked".to_string());
                    break;
                }

                match PeerConnection::connect(addr, dev_id.clone(), dev_name.clone(), fp.clone()).await {
                    Ok((connection, _event_rx)) => {
                        let peer_device_id = connection.device_id.clone();
                        let peer_device_name = connection.device_name.clone();

                        // Store in connected peers
                        {
                            let mut peers = connected_peers_clone.write().await;
                            peers.insert(peer_device_id.clone(), network::state::ConnectedPeer {
                                device_id: peer_device_id.clone(),
                                device_name: peer_device_name.clone(),
                                address: addr.to_string(),
                                connected_at: std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs(),
                            });
                        }

                        // Store the write stream
                        let write_stream = connection.get_write_stream();
                        {
                            let mut streams = peer_streams_clone.write().await;
                            streams.insert(peer_device_id.clone(), write_stream);
                        }

                        // Record success in cache
                        {
                            let mut cache_guard = pairing_state_clone.cache.write().await;
                            if let Some(cache) = cache_guard.as_mut() {
                                let _ = cache.record_connection_success(&target_device_id, &ip, port);
                                // Save cache to disk
                                if let Err(e) = cache.save(&pairing_state_clone.cache_path) {
                                    eprintln!("[Reconnect] Failed to save cache: {}", e);
                                }
                            }
                        }

                        // Emit connected event
                        let _ = app_clone.emit("local-peer-connected", serde_json::json!({
                            "deviceId": peer_device_id.clone(),
                            "deviceName": peer_device_name.clone(),
                            "address": addr.to_string(),
                        }));

                        // Emit connected status
                        let _ = app_clone.emit("paired-device-status", serde_json::json!({
                            "deviceId": target_device_id,
                            "status": "connected",
                        }));

                        println!("[Reconnect] Successfully connected to device {} at {}:{}", target_device_id, ip, port);
                        connected = true;
                        break;
                    }
                    Err(e) => {
                        println!("[Reconnect] Failed to connect to device {} at {}:{}: {}", target_device_id, ip, port, e);
                        last_error = Some(e.to_string());

                        // Record failure in cache
                        {
                            let mut cache_guard = pairing_state_clone.cache.write().await;
                            if let Some(cache) = cache_guard.as_mut() {
                                let _ = cache.record_connection_failure(&target_device_id, &ip, port);
                            }
                        }
                    }
                }
            }

            if !connected {
                // Emit offline status
                let _ = app_clone.emit("paired-device-status", serde_json::json!({
                    "deviceId": target_device_id,
                    "status": "offline",
                    "error": last_error,
                }));
            }

            // Save cache to disk after all attempts
            {
                let mut cache_guard = pairing_state_clone.cache.write().await;
                if let Some(cache) = cache_guard.as_mut() {
                    if let Err(e) = cache.save(&pairing_state_clone.cache_path) {
                        eprintln!("[Reconnect] Failed to save cache: {}", e);
                    }
                }
            }

            if connected {
                Ok(())
            } else {
                Err(format!("Failed to connect: {}", last_error.unwrap_or_else(|| "No addresses available".to_string())))
            }
        });

        tasks.push(task);

        // Limit concurrency to 3 connections at a time
        if tasks.len() >= 3 {
            break;
        }
    }

    // Wait for all tasks to complete (but don't fail if some fail)
    for task in tasks {
        let _ = task.await;
    }

    Ok(())
}

/// Reconnect to a specific paired device
#[tauri::command]
async fn cache_reconnect_device(
    device_id: String,
    app: AppHandle,
    _crypto_state: State<'_, CryptoState>,
    network_state: State<'_, NetworkState>,
    pairing_state: State<'_, PairingState>,
) -> Result<(), String> {
    // Get device info and addresses
    let addresses = {
        let cache_guard = pairing_state.cache.read().await;
        let cache = cache_guard.as_ref().ok_or("Cache not initialized")?;

        let device = cache.get_device(&device_id)
            .ok_or_else(|| format!("Device not found: {}", device_id))?;

        device.prioritized_addresses().into_iter().map(|a| (a.ip.clone(), a.port)).collect::<Vec<_>>()
    };

    let fingerprint = network_state.fingerprint.read().await.clone()
        .ok_or("Fingerprint not set")?;
    let our_device_id = network_state.device_id.read().await.clone();
    let our_device_name = network_state.device_name.read().await.clone();

    // Emit connecting status
    let _ = app.emit("paired-device-status", serde_json::json!({
        "deviceId": device_id,
        "status": "connecting",
    }));

    // Try each address in priority order
    let address_count = addresses.len();
    let mut last_error: Option<Box<dyn std::error::Error + Send + Sync>> = None;

    for (ip, port) in &addresses {
        match connect_to_peer_direct(
            ip.clone(),
            *port,
            our_device_id.clone(),
            our_device_name.clone(),
            fingerprint.clone(),
            Some(app.clone()),
            &network_state,
        ).await {
            Ok(_) => {
                println!("[Reconnect] Successfully connected to {} at {}:{}", device_id, ip, port);

                // Record success in cache
                {
                    let mut cache_guard = pairing_state.cache.write().await;
                    if let Some(cache) = cache_guard.as_mut() {
                        let _ = cache.record_connection_success(&device_id, ip, *port);
                        // Save cache to disk
                        if let Err(e) = cache.save(&pairing_state.cache_path) {
                            eprintln!("[Reconnect] Failed to save cache: {}", e);
                        }
                    }
                }

                // Emit connected status
                let _ = app.emit("paired-device-status", serde_json::json!({
                    "deviceId": device_id,
                    "status": "connected",
                }));

                return Ok(());
            }
            Err(e) => {
                println!("[Reconnect] Failed to connect to {} at {}:{}: {}", device_id, ip, port, e);
                last_error = Some(e);

                // Record failure in cache
                {
                    let mut cache_guard = pairing_state.cache.write().await;
                    if let Some(cache) = cache_guard.as_mut() {
                        let _ = cache.record_connection_failure(&device_id, ip, *port);
                    }
                }
            }
        }
    }

    // Save cache to disk after all attempts
    {
        let mut cache_guard = pairing_state.cache.write().await;
        if let Some(cache) = cache_guard.as_mut() {
            if let Err(e) = cache.save(&pairing_state.cache_path) {
                eprintln!("[Reconnect] Failed to save cache: {}", e);
            }
        }
    }

    // Emit offline status
    let error_msg = last_error.as_ref().map(|e| e.to_string()).unwrap_or_else(|| "unknown".to_string());
    let _ = app.emit("paired-device-status", serde_json::json!({
        "deviceId": device_id,
        "status": "offline",
        "error": error_msg.clone(),
    }));

    Err(format!(
        "Failed to connect to device {} - tried {} addresses. Last error: {}",
        device_id,
        address_count,
        error_msg
    ))
}

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
        .manage(CryptoState {
            stronghold: Mutex::new(None),
            sync_key: Mutex::new(None),
        })
        .setup(|app| {
            // Initialize mobile-only plugins
            #[cfg(mobile)]
            {
                app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
                // Edge-to-edge enables fullscreen mode and injects safe area CSS vars
                app.handle().plugin(tauri_plugin_edge_to_edge::init())?;
                // Biometric authentication (Face ID, Touch ID, fingerprint)
                app.handle().plugin(tauri_plugin_biometric::init())?;
            }

            // Initialize Android Keyring for native Keystore access
            #[cfg(target_os = "android")]
            {
                android_keyring::set_android_keyring_credential_builder()
                    .expect("Failed to initialize Android Keyring");
            }

            // Initialize NetworkState with persistent blocklist
            let app_data_dir = app.path().app_data_dir()
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
            let pairing_state = PairingState {
                cache: Arc::new(RwLock::new(None)),
                cache_path,
            };

            app.manage(pairing_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // Crypto commands
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
            // Network commands
            network_start_server,
            network_stop_server,
            network_get_server_info,
            network_get_connected_peers,
            network_get_device_info,
            network_get_device_id,
            network_sync_device_id,
            // mDNS Discovery commands
            network_start_discovery,
            network_stop_discovery,
            network_get_discovered_peers,
            network_is_discovery_running,
            // Peer Connection commands
            network_connect_to_peer,
            // Sync Relay commands
            network_broadcast_sync,
            network_peer_count,
            // Device Registry Sync commands
            network_broadcast_device_registry,
            network_broadcast_device_revoke,
            network_broadcast_device_rename,
            // Device Management commands
            device_get_signing_public_key,
            device_sign_revocation,
            device_verify_revocation,
            device_block,
            device_is_blocked,
            device_get_blocked,
            // Attachment Storage commands
            save_attachment,
            // Import commands
            read_vault_directory,
            // Pairing commands
            pairing_generate_qr,
            pairing_parse_qr,
            pairing_connect,
            pairing_connect_manual,
            // Cache commands
            cache_get_paired_devices,
            cache_remove_paired_device,
            cache_prune_addresses,
            cache_reconnect_all,
            cache_reconnect_device,
            // Haptic feedback commands (mobile only)
            haptics::haptic_impact,
            haptics::haptic_notification,
            haptics::haptic_selection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
