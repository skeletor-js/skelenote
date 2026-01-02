//! TCP Server for Local Network Sync
//!
//! Listens for incoming peer connections on a dynamic port.
//! Revoked devices are rejected at the TCP handshake level.
//! Includes heartbeat mechanism for detecting stale connections.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::tcp::OwnedWriteHalf;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};

use super::blocklist::DeviceBlocklist;
use super::protocol::{
    decode_message, encode_message, AckPayload, HelloPayload, MessageType, ProtocolError,
    HEADER_SIZE,
};
use super::state::{ConnectedPeer, ServerHandle};

/// Heartbeat interval in seconds
const HEARTBEAT_INTERVAL_SECS: u64 = 30;

/// Connection is considered stale if no pong received within this many seconds
const HEARTBEAT_TIMEOUT_SECS: u64 = 90;

/// Events emitted by the server
#[derive(Debug, Clone)]
pub enum ServerEvent {
    /// A new peer connected
    PeerConnected {
        device_id: String,
        device_name: String,
        address: String,
    },
    /// A peer disconnected
    PeerDisconnected {
        device_id: String,
    },
    /// Received a message from a peer
    MessageReceived {
        device_id: String,
        msg_type: u8,
        payload: Vec<u8>,
    },
    /// Server error
    Error {
        message: String,
    },
}

/// Local sync TCP server
pub struct LocalSyncServer {
    /// This device's ID
    device_id: String,
    /// This device's name
    device_name: String,
    /// This device's fingerprint
    fingerprint: String,
}

impl LocalSyncServer {
    /// Start the server on an available port
    ///
    /// Returns a tuple of (ServerHandle, event receiver, port)
    pub async fn start(
        device_id: String,
        device_name: String,
        fingerprint: String,
        connected_peers: Arc<RwLock<HashMap<String, ConnectedPeer>>>,
        peer_streams: Arc<RwLock<HashMap<String, Arc<Mutex<OwnedWriteHalf>>>>>,
        blocklist: DeviceBlocklist,
    ) -> Result<(ServerHandle, mpsc::Receiver<ServerEvent>, u16), std::io::Error> {
        // Bind to any available port
        let listener = TcpListener::bind("0.0.0.0:0").await?;
        let port = listener.local_addr()?.port();

        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        let (event_tx, event_rx) = mpsc::channel(100);

        let server = LocalSyncServer {
            device_id,
            device_name,
            fingerprint,
        };

        // Spawn the accept loop
        tokio::spawn(server.accept_loop(
            listener,
            shutdown_rx,
            event_tx,
            connected_peers,
            peer_streams,
            blocklist,
        ));

        let handle = ServerHandle { shutdown_tx, port };
        Ok((handle, event_rx, port))
    }

    /// Main accept loop for incoming connections
    async fn accept_loop(
        self,
        listener: TcpListener,
        mut shutdown_rx: oneshot::Receiver<()>,
        event_tx: mpsc::Sender<ServerEvent>,
        connected_peers: Arc<RwLock<HashMap<String, ConnectedPeer>>>,
        peer_streams: Arc<RwLock<HashMap<String, Arc<Mutex<OwnedWriteHalf>>>>>,
        blocklist: DeviceBlocklist,
    ) {
        loop {
            tokio::select! {
                // Check for shutdown signal
                _ = &mut shutdown_rx => {
                    break;
                }
                // Accept new connections
                result = listener.accept() => {
                    match result {
                        Ok((stream, addr)) => {
                            let event_tx = event_tx.clone();
                            let connected_peers = connected_peers.clone();
                            let peer_streams = peer_streams.clone();
                            let device_id = self.device_id.clone();
                            let device_name = self.device_name.clone();
                            let fingerprint = self.fingerprint.clone();
                            let blocklist = blocklist.clone();

                            // Handle each connection in a separate task
                            tokio::spawn(async move {
                                if let Err(e) = handle_connection(
                                    stream,
                                    addr,
                                    device_id,
                                    device_name,
                                    fingerprint,
                                    event_tx,
                                    connected_peers,
                                    peer_streams,
                                    blocklist,
                                ).await {
                                    eprintln!("Connection error: {}", e);
                                }
                            });
                        }
                        Err(e) => {
                            let _ = event_tx.send(ServerEvent::Error {
                                message: format!("Accept error: {}", e),
                            }).await;
                        }
                    }
                }
            }
        }
    }
}

/// Handle a single peer connection
async fn handle_connection(
    mut stream: TcpStream,
    addr: SocketAddr,
    our_device_id: String,
    our_device_name: String,
    our_fingerprint: String,
    event_tx: mpsc::Sender<ServerEvent>,
    connected_peers: Arc<RwLock<HashMap<String, ConnectedPeer>>>,
    peer_streams: Arc<RwLock<HashMap<String, Arc<Mutex<OwnedWriteHalf>>>>>,
    blocklist: DeviceBlocklist,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Read the initial HELLO message
    let mut buffer = vec![0u8; 4096];
    let mut read_buffer = Vec::new();

    // Wait for HELLO with timeout
    let n = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        stream.read(&mut buffer),
    ).await??;

    if n == 0 {
        return Err("Connection closed before HELLO".into());
    }

    read_buffer.extend_from_slice(&buffer[..n]);

    // Decode the HELLO message
    let (message, _) = decode_message(&read_buffer)?;

    if message.msg_type != MessageType::Hello {
        return Err(format!("Expected HELLO, got {:?}", message.msg_type).into());
    }

    let hello: HelloPayload = serde_json::from_slice(&message.payload)?;

    // Verify fingerprint matches
    if hello.fingerprint != our_fingerprint {
        // Send rejection
        let ack = AckPayload {
            accepted: false,
            reason: Some("Fingerprint mismatch".to_string()),
        };
        let ack_bytes = serde_json::to_vec(&ack)?;
        let response = encode_message(MessageType::Ack, &ack_bytes);
        stream.write_all(&response).await?;
        return Err("Fingerprint mismatch - different Skeleton Key".into());
    }

    // Check if device is blocked/revoked
    if blocklist.is_blocked(&hello.device_id).await {
        println!(
            "[Server] Rejecting connection from blocked device: {}",
            hello.device_id
        );
        let ack = AckPayload {
            accepted: false,
            reason: Some("Device has been revoked".to_string()),
        };
        let ack_bytes = serde_json::to_vec(&ack)?;
        let response = encode_message(MessageType::Ack, &ack_bytes);
        stream.write_all(&response).await?;
        return Err("Device has been revoked".into());
    }

    // Send our HELLO response
    let our_hello = HelloPayload {
        device_id: our_device_id.clone(),
        device_name: our_device_name.clone(),
        protocol_version: 1,
        encrypted: true,
        fingerprint: our_fingerprint.clone(),
    };
    let hello_bytes = serde_json::to_vec(&our_hello)?;
    let response = encode_message(MessageType::Hello, &hello_bytes);
    stream.write_all(&response).await?;

    // Send ACK
    let ack = AckPayload {
        accepted: true,
        reason: None,
    };
    let ack_bytes = serde_json::to_vec(&ack)?;
    let ack_response = encode_message(MessageType::Ack, &ack_bytes);
    stream.write_all(&ack_response).await?;

    // Add to connected peers info
    let peer_device_id = hello.device_id.clone();
    let peer_device_name = hello.device_name.clone();
    {
        let mut peers = connected_peers.write().await;
        peers.insert(peer_device_id.clone(), ConnectedPeer {
            device_id: peer_device_id.clone(),
            device_name: peer_device_name.clone(),
            address: addr.to_string(),
            connected_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        });
    }

    // Split the stream into read and write halves
    // This prevents deadlock: read loop won't block writes
    let (mut read_half, write_half) = stream.into_split();
    let write_half = Arc::new(Mutex::new(write_half));

    // Heartbeat tracking
    let last_pong = Arc::new(RwLock::new(Instant::now()));

    // Store write half for sending
    {
        let mut streams = peer_streams.write().await;
        streams.insert(peer_device_id.clone(), write_half.clone());
    }

    // Notify frontend
    let _ = event_tx.send(ServerEvent::PeerConnected {
        device_id: peer_device_id.clone(),
        device_name: peer_device_name,
        address: addr.to_string(),
    }).await;

    // Spawn heartbeat task
    let write_half_for_heartbeat = write_half.clone();
    let last_pong_for_heartbeat = last_pong.clone();
    let device_id_for_heartbeat = peer_device_id.clone();
    let shutdown_flag = Arc::new(RwLock::new(false));
    let shutdown_flag_for_heartbeat = shutdown_flag.clone();
    tokio::spawn(async move {
        heartbeat_loop(
            write_half_for_heartbeat,
            last_pong_for_heartbeat,
            shutdown_flag_for_heartbeat,
            device_id_for_heartbeat,
        ).await;
    });

    // Main message loop using read half (no lock contention with writes)
    read_buffer.clear();
    loop {
        let n = match read_half.read(&mut buffer).await {
            Ok(0) => break, // Connection closed
            Ok(n) => n,
            Err(e) => {
                eprintln!("Read error: {}", e);
                break;
            }
        };

        read_buffer.extend_from_slice(&buffer[..n]);

        // Process all complete messages in the buffer
        loop {
            if read_buffer.len() < HEADER_SIZE {
                break;
            }

            match decode_message(&read_buffer) {
                Ok((message, consumed)) => {
                    // Handle ping/pong internally
                    match message.msg_type {
                        MessageType::Ping => {
                            let pong = encode_message(MessageType::Pong, &[]);
                            let mut s = write_half.lock().await;
                            let _ = s.write_all(&pong).await;
                        }
                        MessageType::Pong => {
                            // Update heartbeat tracking
                            *last_pong.write().await = Instant::now();
                        }
                        _ => {
                            // Forward other messages to frontend
                            let _ = event_tx.send(ServerEvent::MessageReceived {
                                device_id: peer_device_id.clone(),
                                msg_type: message.msg_type as u8,
                                payload: message.payload,
                            }).await;
                        }
                    }

                    // Remove processed bytes
                    read_buffer.drain(..consumed);
                }
                Err(ProtocolError::MessageTooShort { .. }) |
                Err(ProtocolError::PayloadLengthMismatch { .. }) => {
                    // Need more data
                    break;
                }
                Err(ProtocolError::MessageTooLarge { size, max }) => {
                    // Disconnect immediately - likely DoS attempt
                    eprintln!(
                        "Disconnecting peer {} - message too large: {} bytes (max {})",
                        peer_device_id, size, max
                    );
                    return Ok(());
                }
                Err(e) => {
                    eprintln!("Protocol error: {}", e);
                    break;
                }
            }
        }
    }

    // Signal heartbeat loop to stop
    *shutdown_flag.write().await = true;

    // Remove from connected peers and streams
    {
        let mut peers = connected_peers.write().await;
        peers.remove(&peer_device_id);
    }
    {
        let mut streams = peer_streams.write().await;
        streams.remove(&peer_device_id);
    }

    // Notify frontend
    let _ = event_tx.send(ServerEvent::PeerDisconnected {
        device_id: peer_device_id,
    }).await;

    Ok(())
}

/// Heartbeat loop to detect stale connections (server-side)
///
/// Sends periodic pings and checks for pong responses.
async fn heartbeat_loop(
    write_stream: Arc<Mutex<OwnedWriteHalf>>,
    last_pong: Arc<RwLock<Instant>>,
    shutdown_flag: Arc<RwLock<bool>>,
    device_id: String,
) {
    let mut interval = tokio::time::interval(Duration::from_secs(HEARTBEAT_INTERVAL_SECS));

    loop {
        interval.tick().await;

        // Check for shutdown
        if *shutdown_flag.read().await {
            break;
        }

        // Check if connection is stale (no pong received recently)
        let elapsed = last_pong.read().await.elapsed();
        if elapsed > Duration::from_secs(HEARTBEAT_TIMEOUT_SECS) {
            println!(
                "[Server Heartbeat] Connection to {} stale - no pong for {:?}",
                device_id, elapsed
            );
            break;
        }

        // Send ping
        let ping_msg = encode_message(MessageType::Ping, &[]);
        let mut stream = write_stream.lock().await;
        if let Err(e) = stream.write_all(&ping_msg).await {
            println!("[Server Heartbeat] Failed to send ping to {}: {}", device_id, e);
            break;
        }
    }
}
