//! TCP Server for Local Network Sync
//!
//! Listens for incoming peer connections on a dynamic port.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, RwLock};

use super::protocol::{decode_message, encode_message, HelloPayload, AckPayload, MessageType, ProtocolError, HEADER_SIZE};
use super::state::{ConnectedPeer, ServerHandle};

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
    /// Port the server is listening on
    port: u16,
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
    ) -> Result<(ServerHandle, mpsc::Receiver<ServerEvent>, u16), std::io::Error> {
        // Bind to any available port
        let listener = TcpListener::bind("0.0.0.0:0").await?;
        let port = listener.local_addr()?.port();

        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        let (event_tx, event_rx) = mpsc::channel(100);

        let server = LocalSyncServer {
            port,
            device_id,
            device_name,
            fingerprint,
        };

        // Spawn the accept loop
        tokio::spawn(server.accept_loop(listener, shutdown_rx, event_tx, connected_peers));

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
                            let device_id = self.device_id.clone();
                            let device_name = self.device_name.clone();
                            let fingerprint = self.fingerprint.clone();

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

    // Add to connected peers
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

    // Notify frontend
    let _ = event_tx.send(ServerEvent::PeerConnected {
        device_id: peer_device_id.clone(),
        device_name: peer_device_name,
        address: addr.to_string(),
    }).await;

    // Main message loop
    read_buffer.clear();
    loop {
        let n = match stream.read(&mut buffer).await {
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
                            let _ = stream.write_all(&pong).await;
                        }
                        MessageType::Pong => {
                            // Ignore pong
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
                Err(e) => {
                    eprintln!("Protocol error: {}", e);
                    break;
                }
            }
        }
    }

    // Remove from connected peers
    {
        let mut peers = connected_peers.write().await;
        peers.remove(&peer_device_id);
    }

    // Notify frontend
    let _ = event_tx.send(ServerEvent::PeerDisconnected {
        device_id: peer_device_id,
    }).await;

    Ok(())
}
