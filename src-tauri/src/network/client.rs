//! TCP Client for Local Network Sync
//!
//! Connects to discovered peers for sync message exchange.

use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::net::tcp::OwnedWriteHalf;
use tokio::sync::{mpsc, Mutex};

use super::protocol::{decode_message, encode_message, HelloPayload, AckPayload, MessageType, ProtocolError, HEADER_SIZE};

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
    /// Remote address
    pub address: SocketAddr,
    /// TCP write stream (wrapped for thread-safety, read half is used by read_loop)
    write_stream: Arc<Mutex<OwnedWriteHalf>>,
    /// When the connection was established
    pub connected_at: u64,
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

        let (event_tx, event_rx) = mpsc::channel(100);

        let connection = PeerConnection {
            device_id: peer_hello.device_id,
            device_name: peer_hello.device_name,
            address: addr,
            write_stream: write_stream.clone(),
            connected_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        // Notify connected
        let _ = event_tx.send(PeerEvent::Connected).await;

        // Spawn read loop with the read half (no lock contention with writes)
        tokio::spawn(async move {
            Self::read_loop(read_half, event_tx).await;
        });

        Ok((connection, event_rx))
    }

    /// Read loop for incoming messages
    /// Takes ownership of the read half (no lock needed since we're the only reader)
    async fn read_loop(mut read_half: tokio::net::tcp::OwnedReadHalf, event_tx: mpsc::Sender<PeerEvent>) {
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
                        let _ = event_tx.send(PeerEvent::MessageReceived {
                            msg_type: message.msg_type as u8,
                            payload: message.payload,
                        }).await;
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

    /// Send a message to the peer
    pub async fn send(&self, msg_type: MessageType, payload: &[u8]) -> Result<(), std::io::Error> {
        let message = encode_message(msg_type, payload);
        let mut stream = self.write_stream.lock().await;
        stream.write_all(&message).await
    }

    /// Send a ping to check if the connection is alive
    pub async fn ping(&self) -> Result<(), std::io::Error> {
        self.send(MessageType::Ping, &[]).await
    }

    /// Close the connection
    pub async fn close(&self) -> Result<(), std::io::Error> {
        let mut stream = self.write_stream.lock().await;
        stream.shutdown().await
    }

    /// Get a clone of the write stream handle for sending messages
    ///
    /// This is needed so the caller can add the stream to NetworkState.peer_streams
    /// for broadcast_sync to work with client-initiated connections.
    pub fn get_write_stream(&self) -> Arc<Mutex<OwnedWriteHalf>> {
        self.write_stream.clone()
    }
}
