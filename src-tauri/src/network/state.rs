//! Network State Management
//!
//! Shared state for the local network sync system, managed by Tauri.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::net::tcp::OwnedWriteHalf;
use tokio::sync::{RwLock, Mutex};

use super::protocol::{encode_message, MessageType};

/// Information about a discovered peer
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DiscoveredPeer {
    /// Unique device identifier
    pub device_id: String,
    /// User-friendly device name
    pub device_name: String,
    /// IP addresses (may have multiple)
    pub addresses: Vec<String>,
    /// TCP port for sync
    pub port: u16,
    /// Key fingerprint for verification
    pub fingerprint: String,
    /// When the peer was last seen
    pub last_seen: u64,
}

/// Information about a connected peer
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConnectedPeer {
    /// Unique device identifier
    pub device_id: String,
    /// User-friendly device name
    pub device_name: String,
    /// Remote address
    pub address: String,
    /// When the connection was established
    pub connected_at: u64,
}

/// A handle to an active peer connection (for sending messages)
#[allow(dead_code)]
pub struct PeerStream {
    pub device_id: String,
    pub stream: Arc<Mutex<OwnedWriteHalf>>,
}

/// Server information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ServerInfo {
    /// Whether the server is running
    pub running: bool,
    /// Port the server is listening on
    pub port: Option<u16>,
}

/// Handle to control the running server
pub struct ServerHandle {
    /// Shutdown signal sender
    pub shutdown_tx: tokio::sync::oneshot::Sender<()>,
    /// Port the server is listening on
    pub port: u16,
}

/// Handle to control mDNS discovery (stored separately due to ownership)
pub struct MdnsHolder {
    /// The mDNS handle (wrapped in Option so we can take it for shutdown)
    pub handle: Option<super::mdns::MdnsHandle>,
}

/// Shared network state managed by Tauri
pub struct NetworkState {
    /// Server handle (if running)
    pub server: Arc<RwLock<Option<ServerHandle>>>,
    /// mDNS holder (contains the handle for shutdown)
    pub mdns: Arc<RwLock<MdnsHolder>>,
    /// Discovered peers (from mDNS)
    pub discovered_peers: Arc<RwLock<HashMap<String, DiscoveredPeer>>>,
    /// Connected peers (info only)
    pub connected_peers: Arc<RwLock<HashMap<String, ConnectedPeer>>>,
    /// Active peer write streams for sending messages (read halves are used by read loops)
    pub peer_streams: Arc<RwLock<HashMap<String, Arc<Mutex<OwnedWriteHalf>>>>>,
    /// This device's fingerprint (derived from Skeleton Key)
    pub fingerprint: Arc<RwLock<Option<String>>>,
    /// This device's ID
    pub device_id: Arc<RwLock<String>>,
    /// This device's name
    pub device_name: Arc<RwLock<String>>,
}

impl NetworkState {
    /// Create a new NetworkState with default values
    pub fn new() -> Self {
        Self {
            server: Arc::new(RwLock::new(None)),
            mdns: Arc::new(RwLock::new(MdnsHolder { handle: None })),
            discovered_peers: Arc::new(RwLock::new(HashMap::new())),
            connected_peers: Arc::new(RwLock::new(HashMap::new())),
            peer_streams: Arc::new(RwLock::new(HashMap::new())),
            fingerprint: Arc::new(RwLock::new(None)),
            device_id: Arc::new(RwLock::new(generate_device_id())),
            device_name: Arc::new(RwLock::new(get_device_name())),
        }
    }

    /// Check if mDNS is running
    pub async fn is_mdns_running(&self) -> bool {
        let mdns = self.mdns.read().await;
        mdns.handle.is_some()
    }

    /// Get server info
    pub async fn get_server_info(&self) -> ServerInfo {
        let server = self.server.read().await;
        match &*server {
            Some(handle) => ServerInfo {
                running: true,
                port: Some(handle.port),
            },
            None => ServerInfo {
                running: false,
                port: None,
            },
        }
    }

    /// Add a peer write stream for sending messages
    ///
    /// The TcpStream should be split using `into_split()` first, and only the
    /// write half should be passed here. The read half is used by the read loop.
    pub async fn add_peer_write_stream(&self, device_id: String, write_half: OwnedWriteHalf) {
        let mut streams = self.peer_streams.write().await;
        streams.insert(device_id, Arc::new(Mutex::new(write_half)));
    }

    /// Add a peer write stream from an Arc (for client-initiated connections)
    ///
    /// Client connections already have their write half wrapped in Arc<Mutex<OwnedWriteHalf>>,
    /// so we can just clone the Arc and add it directly.
    pub async fn add_peer_write_stream_arc(&self, device_id: String, write_half: Arc<Mutex<OwnedWriteHalf>>) {
        let mut streams = self.peer_streams.write().await;
        streams.insert(device_id, write_half);
    }

    /// Remove a peer stream
    pub async fn remove_peer_stream(&self, device_id: &str) {
        let mut streams = self.peer_streams.write().await;
        streams.remove(device_id);
    }

    /// Broadcast sync data to all connected peers
    ///
    /// Returns the number of peers the data was sent to.
    pub async fn broadcast_sync(&self, data: &[u8]) -> usize {
        let streams = self.peer_streams.read().await;
        println!("[NetworkState] broadcast_sync called, {} peers in peer_streams, {} bytes to send",
            streams.len(), data.len());

        if streams.is_empty() {
            println!("[NetworkState] No peers to broadcast to!");
            return 0;
        }

        let message = encode_message(MessageType::Update, data);
        let mut sent_count = 0;

        for (device_id, stream) in streams.iter() {
            println!("[NetworkState] Sending {} bytes to {}", message.len(), device_id);
            let mut s = stream.lock().await;
            match s.write_all(&message).await {
                Ok(()) => {
                    println!("[NetworkState] Successfully sent to {}", device_id);
                    sent_count += 1;
                }
                Err(e) => {
                    eprintln!("[NetworkState] Failed to send to {}: {}", device_id, e);
                }
            }
        }

        println!("[NetworkState] Broadcast complete, sent to {} peers", sent_count);
        sent_count
    }

    /// Get number of connected peer streams
    pub async fn peer_count(&self) -> usize {
        let streams = self.peer_streams.read().await;
        streams.len()
    }
}

impl Default for NetworkState {
    fn default() -> Self {
        Self::new()
    }
}

/// Generate a unique device ID
fn generate_device_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let random: u64 = rand::random();
    format!("{:x}-{:x}", timestamp, random)
}

/// Get the device name from the system
fn get_device_name() -> String {
    // Try to get hostname
    if let Ok(hostname) = hostname::get() {
        if let Some(name) = hostname.to_str() {
            return name.to_string();
        }
    }
    "Unknown Device".to_string()
}
