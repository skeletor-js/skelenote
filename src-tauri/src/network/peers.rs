//! Peer Connection Manager
//!
//! Manages active connections to peers for sync message relay.
//! Includes blocklist checking to prevent connections to revoked devices.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::sync::{mpsc, Mutex, RwLock};

use super::blocklist::DeviceBlocklist;
use super::client::{PeerConnection, PeerEvent};
use super::protocol::{encode_message, MessageType};
use super::state::DiscoveredPeer;

/// Handle to a connected peer (either incoming or outgoing)
pub struct PeerHandle {
    pub device_id: String,
    pub device_name: String,
    /// For outgoing connections, we have a PeerConnection
    connection: Option<Arc<PeerConnection>>,
    /// For incoming connections, we store the stream directly
    stream: Option<Arc<Mutex<TcpStream>>>,
}

impl PeerHandle {
    /// Send a message to this peer
    pub async fn send(&self, msg_type: MessageType, payload: &[u8]) -> Result<(), std::io::Error> {
        if let Some(conn) = &self.connection {
            conn.send(msg_type, payload).await
        } else if let Some(stream) = &self.stream {
            let message = encode_message(msg_type, payload);
            let mut s = stream.lock().await;
            s.write_all(&message).await
        } else {
            Err(std::io::Error::new(std::io::ErrorKind::NotConnected, "No connection"))
        }
    }
}

/// Manages all peer connections
pub struct PeerManager {
    /// Active peer connections (device_id -> handle)
    peers: Arc<RwLock<HashMap<String, PeerHandle>>>,
    /// Our device info
    our_device_id: String,
    our_device_name: String,
    our_fingerprint: String,
    /// Channel for events
    event_tx: mpsc::Sender<PeerManagerEvent>,
    /// Device blocklist for filtering revoked devices
    blocklist: DeviceBlocklist,
}

/// Events from the peer manager
#[derive(Debug, Clone)]
pub enum PeerManagerEvent {
    /// Connected to a peer
    Connected { device_id: String, device_name: String },
    /// Disconnected from a peer
    Disconnected { device_id: String },
    /// Received sync data from a peer
    SyncReceived { device_id: String, payload: Vec<u8> },
    /// Error with a peer
    Error { device_id: Option<String>, message: String },
}

impl PeerManager {
    /// Create a new peer manager
    pub fn new(
        our_device_id: String,
        our_device_name: String,
        our_fingerprint: String,
        event_tx: mpsc::Sender<PeerManagerEvent>,
        blocklist: DeviceBlocklist,
    ) -> Self {
        Self {
            peers: Arc::new(RwLock::new(HashMap::new())),
            our_device_id,
            our_device_name,
            our_fingerprint,
            event_tx,
            blocklist,
        }
    }

    /// Connect to a discovered peer
    pub async fn connect_to_peer(
        &self,
        peer: &DiscoveredPeer,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if already connected
        {
            let peers = self.peers.read().await;
            if peers.contains_key(&peer.device_id) {
                return Ok(()); // Already connected
            }
        }

        // Check if device is blocked/revoked
        if self.blocklist.is_blocked(&peer.device_id).await {
            println!(
                "[PeerManager] Refusing to connect to blocked device: {}",
                peer.device_id
            );
            return Err("Device has been revoked".into());
        }

        // Try each address until one works
        let mut last_error: Option<Box<dyn std::error::Error + Send + Sync>> = None;

        for addr_str in &peer.addresses {
            let addr: SocketAddr = match format!("{}:{}", addr_str, peer.port).parse() {
                Ok(a) => a,
                Err(e) => {
                    last_error = Some(format!("Invalid address {}: {}", addr_str, e).into());
                    continue;
                }
            };

            match PeerConnection::connect(
                addr,
                self.our_device_id.clone(),
                self.our_device_name.clone(),
                self.our_fingerprint.clone(),
            ).await {
                Ok((connection, mut event_rx)) => {
                    let device_id = connection.device_id.clone();
                    let device_name = connection.device_name.clone();
                    let connection = Arc::new(connection);

                    // Store the connection
                    {
                        let mut peers = self.peers.write().await;
                        peers.insert(device_id.clone(), PeerHandle {
                            device_id: device_id.clone(),
                            device_name: device_name.clone(),
                            connection: Some(connection.clone()),
                            stream: None,
                        });
                    }

                    // Notify connected
                    let _ = self.event_tx.send(PeerManagerEvent::Connected {
                        device_id: device_id.clone(),
                        device_name,
                    }).await;

                    // Spawn task to handle events from this connection
                    let peers = self.peers.clone();
                    let event_tx = self.event_tx.clone();
                    let dev_id = device_id.clone();

                    tokio::spawn(async move {
                        while let Some(event) = event_rx.recv().await {
                            match event {
                                PeerEvent::MessageReceived { msg_type, payload } => {
                                    // Forward UPDATE and SNAPSHOT messages
                                    if msg_type == MessageType::Update as u8
                                        || msg_type == MessageType::Snapshot as u8 {
                                        let _ = event_tx.send(PeerManagerEvent::SyncReceived {
                                            device_id: dev_id.clone(),
                                            payload,
                                        }).await;
                                    }
                                }
                                PeerEvent::Disconnected => {
                                    let mut p = peers.write().await;
                                    p.remove(&dev_id);
                                    let _ = event_tx.send(PeerManagerEvent::Disconnected {
                                        device_id: dev_id.clone(),
                                    }).await;
                                    break;
                                }
                                PeerEvent::Error { message } => {
                                    let _ = event_tx.send(PeerManagerEvent::Error {
                                        device_id: Some(dev_id.clone()),
                                        message,
                                    }).await;
                                }
                                _ => {}
                            }
                        }
                    });

                    return Ok(());
                }
                Err(e) => {
                    last_error = Some(e);
                    continue;
                }
            }
        }

        Err(last_error.unwrap_or_else(|| "No addresses to connect to".into()))
    }

    /// Register an incoming connection (from server)
    pub async fn register_incoming(
        &self,
        device_id: String,
        device_name: String,
        stream: TcpStream,
    ) {
        let mut peers = self.peers.write().await;
        peers.insert(device_id.clone(), PeerHandle {
            device_id: device_id.clone(),
            device_name: device_name.clone(),
            connection: None,
            stream: Some(Arc::new(Mutex::new(stream))),
        });
    }

    /// Remove a peer connection
    pub async fn remove_peer(&self, device_id: &str) {
        let mut peers = self.peers.write().await;
        peers.remove(device_id);
    }

    /// Send sync data to all connected peers
    pub async fn broadcast_sync(&self, data: &[u8]) -> usize {
        let peers = self.peers.read().await;
        let mut sent_count = 0;

        for (_, peer) in peers.iter() {
            if let Ok(()) = peer.send(MessageType::Update, data).await {
                sent_count += 1;
            }
        }

        sent_count
    }

    /// Send sync data to a specific peer
    pub async fn send_to_peer(&self, device_id: &str, data: &[u8]) -> Result<(), String> {
        let peers = self.peers.read().await;

        if let Some(peer) = peers.get(device_id) {
            peer.send(MessageType::Update, data).await
                .map_err(|e| e.to_string())
        } else {
            Err(format!("Peer {} not connected", device_id))
        }
    }

    /// Get list of connected peer IDs
    pub async fn get_connected_peers(&self) -> Vec<String> {
        let peers = self.peers.read().await;
        peers.keys().cloned().collect()
    }

    /// Get number of connected peers
    pub async fn peer_count(&self) -> usize {
        let peers = self.peers.read().await;
        peers.len()
    }
}
