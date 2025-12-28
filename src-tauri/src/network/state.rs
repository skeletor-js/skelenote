//! Network State Management
//!
//! Shared state for the local network sync system, managed by Tauri.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

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
    /// Connected peers
    pub connected_peers: Arc<RwLock<HashMap<String, ConnectedPeer>>>,
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
