//! Skelenote Tauri backend
//!
//! Provides cryptographic operations for zero-knowledge sync
//! and local network sync capabilities.

mod crypto;
mod network;

use crypto::{
    derive_sync_key, derive_user_id, encrypt_bytes, decrypt_bytes, generate_mnemonic, generate_mnemonic_qr,
    mnemonic_to_master_key, parse_qr_payload, validate_mnemonic, StrongholdManager,
    derive_signing_key, sign_revocation, verify_revocation, get_public_key_bytes,
};
use network::{LocalSyncServer, MdnsHandle, NetworkState, DiscoveredPeer};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
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
        let stronghold_guard = crypto_state.stronghold.lock().unwrap();
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
        let stronghold_guard = crypto_state.stronghold.lock().unwrap();
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
                network::mdns::MdnsEvent::Error { message } => {
                    let _ = app_handle.emit("local-discovery-error", serde_json::json!({
                        "message": message,
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

// ============================================================================
// Device Management Commands
// ============================================================================

/// Get the Ed25519 public signing key for this device
///
/// Returns the public key as a base64-encoded string.
/// All devices with the same Skeleton Key will have the same signing keypair.
#[tauri::command]
fn device_get_signing_public_key(state: State<'_, CryptoState>) -> Result<String, String> {
    let stronghold_guard = state.stronghold.lock().unwrap();
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
    let stronghold_guard = state.stronghold.lock().unwrap();
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CryptoState {
            stronghold: Mutex::new(None),
            sync_key: Mutex::new(None),
        })
        .setup(|app| {
            // Initialize NetworkState with persistent blocklist
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            let data_dir = app_data_dir.join("data");

            // Create data directory if it doesn't exist
            std::fs::create_dir_all(&data_dir).ok();

            let network_state = NetworkState::with_data_dir(data_dir);

            // Load blocklist from disk in background
            let blocklist = network_state.blocklist.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = blocklist.load().await {
                    eprintln!("[Blocklist] Failed to load from disk: {}", e);
                }
            });

            app.manage(network_state);
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
            // Device Management commands
            device_get_signing_public_key,
            device_sign_revocation,
            device_verify_revocation,
            device_block,
            device_is_blocked,
            device_get_blocked,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
