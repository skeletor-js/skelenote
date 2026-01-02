//! TCP Client for Local Network Sync
//!
//! Connects to discovered peers for sync message exchange.
//! Includes heartbeat mechanism for detecting stale connections.

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::net::tcp::OwnedWriteHalf;
use tokio::sync::{mpsc, Mutex, RwLock};

use super::protocol::{decode_message, encode_message, HelloPayload, AckPayload, MessageType, ProtocolError, HEADER_SIZE};

/// Heartbeat interval in seconds
const HEARTBEAT_INTERVAL_SECS: u64 = 30;

/// Connection is considered stale if no pong received within this many seconds
const HEARTBEAT_TIMEOUT_SECS: u64 = 90;

/// Events from a peer connection
#[derive(Debug, Clone)]
pub enum PeerEvent {
    /// Connection established
    Connected,
    /// Connection closed
    Disconnected,
    /// Message received
    MessageReceived {
        msg_type: u8,
        payload: Vec<u8>,
    },
    /// Error occurred
    Error {
        message: String,
    },
}

/// A connection to a remote peer
pub struct PeerConnection {
    /// Remote device ID
    pub device_id: String,
    /// Remote device name
    pub device_name: String,
    /// TCP write stream (wrapped for thread-safety, read half is used by read_loop)
    write_stream: Arc<Mutex<OwnedWriteHalf>>,
}

impl PeerConnection {
    /// Connect to a peer at the given address
    ///
    /// Performs handshake and verifies fingerprint match.
    pub async fn connect(
        addr: SocketAddr,
        our_device_id: String,
        our_device_name: String,
        our_fingerprint: String,
    ) -> Result<(Self, mpsc::Receiver<PeerEvent>), Box<dyn std::error::Error + Send + Sync>> {
        // Connect with timeout
        let mut stream = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            TcpStream::connect(addr),
        ).await??;

        // Send HELLO
        let hello = HelloPayload {
            device_id: our_device_id.clone(),
            device_name: our_device_name.clone(),
            protocol_version: 1,
            encrypted: true,
            fingerprint: our_fingerprint.clone(),
        };
        let hello_bytes = serde_json::to_vec(&hello)?;
        let hello_msg = encode_message(MessageType::Hello, &hello_bytes);

        stream.write_all(&hello_msg).await?;

        // Read response (HELLO + ACK)
        let mut buffer = vec![0u8; 4096];
        let mut read_buffer = Vec::new();

        let n = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            stream.read(&mut buffer),
        ).await??;

        if n == 0 {
            return Err("Connection closed during handshake".into());
        }
        read_buffer.extend_from_slice(&buffer[..n]);

        // Decode peer's HELLO
        let (hello_response, consumed) = decode_message(&read_buffer)?;
        if hello_response.msg_type != MessageType::Hello {
            return Err(format!("Expected HELLO response, got {:?}", hello_response.msg_type).into());
        }

        let peer_hello: HelloPayload = serde_json::from_slice(&hello_response.payload)?;

        // Verify fingerprint
        if peer_hello.fingerprint != our_fingerprint {
            return Err("Peer fingerprint mismatch - different Skeleton Key".into());
        }

        read_buffer.drain(..consumed);

        // Read more if needed for ACK
        if read_buffer.len() < HEADER_SIZE {
            let n = tokio::time::timeout(
                std::time::Duration::from_secs(5),
                stream.read(&mut buffer),
            ).await??;
            read_buffer.extend_from_slice(&buffer[..n]);
        }

        // Decode ACK
        let (ack_msg, _) = decode_message(&read_buffer)?;
        if ack_msg.msg_type != MessageType::Ack {
            return Err(format!("Expected ACK, got {:?}", ack_msg.msg_type).into());
        }

        let ack: AckPayload = serde_json::from_slice(&ack_msg.payload)?;
        if !ack.accepted {
            return Err(format!("Connection rejected: {}", ack.reason.unwrap_or_default()).into());
        }

        // Split the stream into read and write halves
        // This prevents deadlock: read loop won't block writes
        let (read_half, write_half) = stream.into_split();
        let write_stream = Arc::new(Mutex::new(write_half));
        let last_pong = Arc::new(RwLock::new(Instant::now()));

        let (event_tx, event_rx) = mpsc::channel(100);

        let connection = PeerConnection {
            device_id: peer_hello.device_id.clone(),
            device_name: peer_hello.device_name,
            write_stream: write_stream.clone(),
        };

        // Notify connected
        let _ = event_tx.send(PeerEvent::Connected).await;

        // Spawn read loop with the read half (no lock contention with writes)
        let last_pong_for_read = last_pong.clone();
        let event_tx_for_read = event_tx.clone();
        tokio::spawn(async move {
            Self::read_loop(read_half, event_tx_for_read, last_pong_for_read).await;
        });

        // Spawn heartbeat task
        let write_stream_for_heartbeat = write_stream.clone();
        let last_pong_for_heartbeat = last_pong.clone();
        let device_id_for_heartbeat = peer_hello.device_id;
        tokio::spawn(async move {
            Self::heartbeat_loop(
                write_stream_for_heartbeat,
                last_pong_for_heartbeat,
                event_tx,
                device_id_for_heartbeat,
            ).await;
        });

        Ok((connection, event_rx))
    }

    /// Read loop for incoming messages
    /// Takes ownership of the read half (no lock needed since we're the only reader)
    async fn read_loop(
        mut read_half: tokio::net::tcp::OwnedReadHalf,
        event_tx: mpsc::Sender<PeerEvent>,
        last_pong: Arc<RwLock<Instant>>,
    ) {
        let mut buffer = vec![0u8; 4096];
        let mut read_buffer = Vec::new();

        loop {
            let n = match read_half.read(&mut buffer).await {
                Ok(0) => break, // Connection closed
                Ok(n) => n,
                Err(e) => {
                    let _ = event_tx.send(PeerEvent::Error {
                        message: format!("Read error: {}", e),
                    }).await;
                    break;
                }
            };

            read_buffer.extend_from_slice(&buffer[..n]);

            // Process complete messages
            loop {
                if read_buffer.len() < HEADER_SIZE {
                    break;
                }

                match decode_message(&read_buffer) {
                    Ok((message, consumed)) => {
                        // Handle Pong internally for heartbeat tracking
                        if message.msg_type == MessageType::Pong {
                            *last_pong.write().await = Instant::now();
                        } else {
                            // Forward other messages to the event channel
                            let _ = event_tx.send(PeerEvent::MessageReceived {
                                msg_type: message.msg_type as u8,
                                payload: message.payload,
                            }).await;
                        }
                        read_buffer.drain(..consumed);
                    }
                    Err(ProtocolError::MessageTooShort { .. }) |
                    Err(ProtocolError::PayloadLengthMismatch { .. }) => {
                        break;
                    }
                    Err(ProtocolError::MessageTooLarge { size, max }) => {
                        // Disconnect immediately - likely malicious peer
                        let _ = event_tx.send(PeerEvent::Error {
                            message: format!(
                                "Disconnecting - message too large: {} bytes (max {})",
                                size, max
                            ),
                        }).await;
                        return;
                    }
                    Err(e) => {
                        let _ = event_tx.send(PeerEvent::Error {
                            message: format!("Protocol error: {}", e),
                        }).await;
                        break;
                    }
                }
            }
        }

        let _ = event_tx.send(PeerEvent::Disconnected).await;
    }

    /// Heartbeat loop to detect stale connections
    ///
    /// Sends periodic pings and checks for pong responses.
    /// Signals disconnect if connection becomes stale.
    async fn heartbeat_loop(
        write_stream: Arc<Mutex<OwnedWriteHalf>>,
        last_pong: Arc<RwLock<Instant>>,
        event_tx: mpsc::Sender<PeerEvent>,
        device_id: String,
    ) {
        let mut interval = tokio::time::interval(Duration::from_secs(HEARTBEAT_INTERVAL_SECS));

        loop {
            interval.tick().await;

            // Check if connection is stale (no pong received recently)
            let elapsed = last_pong.read().await.elapsed();
            if elapsed > Duration::from_secs(HEARTBEAT_TIMEOUT_SECS) {
                println!(
                    "[Heartbeat] Connection to {} stale - no pong for {:?}",
                    device_id, elapsed
                );
                let _ = event_tx.send(PeerEvent::Error {
                    message: format!("Connection stale - no response for {} seconds", elapsed.as_secs()),
                }).await;
                break;
            }

            // Send ping
            let ping_msg = encode_message(MessageType::Ping, &[]);
            let mut stream = write_stream.lock().await;
            if let Err(e) = stream.write_all(&ping_msg).await {
                println!("[Heartbeat] Failed to send ping to {}: {}", device_id, e);
                break;
            }
        }
    }

    /// Get a clone of the write stream handle for sending messages
    ///
    /// This is needed so the caller can add the stream to NetworkState.peer_streams
    /// for broadcast_sync to work with client-initiated connections.
    pub fn get_write_stream(&self) -> Arc<Mutex<OwnedWriteHalf>> {
        self.write_stream.clone()
    }
}
