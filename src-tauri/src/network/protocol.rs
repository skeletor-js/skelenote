//! Binary Protocol for Local Network Sync
//!
//! Mirrors the TypeScript protocol in src/lib/sync/protocol.ts.
//! Message format: [type: 1 byte][length: 4 bytes LE][payload: N bytes]

use thiserror::Error;

/// Message type constants - must match TypeScript MessageType
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    // Core sync messages (0x01-0x0a)
    /// Client/peer handshake
    Hello = 0x01,
    /// Loro update bytes (encrypted)
    Update = 0x02,
    /// Request full snapshot
    SnapshotRequest = 0x03,
    /// Full Loro snapshot (encrypted)
    Snapshot = 0x04,
    /// Acknowledgment
    Ack = 0x05,
    /// Keep-alive ping
    Ping = 0x06,
    /// Keep-alive pong
    Pong = 0x07,
    /// Request historical updates
    CatchUp = 0x08,
    /// Batch of historical updates
    History = 0x09,
    /// Compaction request
    Compact = 0x0a,

    // Device management messages (0x10-0x14)
    /// Full device registry sync (Loro snapshot)
    DeviceRegistry = 0x10,
    /// Incremental device registry update (Loro update)
    DeviceUpdate = 0x11,
    /// Device revocation message
    DeviceRevoke = 0x12,
    /// Revocation acknowledgment
    DeviceRevokeAck = 0x13,
    /// Device rename request
    DeviceRename = 0x14,
}

impl TryFrom<u8> for MessageType {
    type Error = ProtocolError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            // Core sync messages
            0x01 => Ok(MessageType::Hello),
            0x02 => Ok(MessageType::Update),
            0x03 => Ok(MessageType::SnapshotRequest),
            0x04 => Ok(MessageType::Snapshot),
            0x05 => Ok(MessageType::Ack),
            0x06 => Ok(MessageType::Ping),
            0x07 => Ok(MessageType::Pong),
            0x08 => Ok(MessageType::CatchUp),
            0x09 => Ok(MessageType::History),
            0x0a => Ok(MessageType::Compact),
            // Device management messages
            0x10 => Ok(MessageType::DeviceRegistry),
            0x11 => Ok(MessageType::DeviceUpdate),
            0x12 => Ok(MessageType::DeviceRevoke),
            0x13 => Ok(MessageType::DeviceRevokeAck),
            0x14 => Ok(MessageType::DeviceRename),
            _ => Err(ProtocolError::InvalidMessageType(value)),
        }
    }
}

/// Protocol errors
#[derive(Error, Debug)]
pub enum ProtocolError {
    #[error("Invalid message type: {0}")]
    InvalidMessageType(u8),
    #[error("Message too short: expected at least {expected} bytes, got {actual}")]
    MessageTooShort { expected: usize, actual: usize },
    #[error("Payload length mismatch: header says {header_len} bytes, but only {available} available")]
    PayloadLengthMismatch { header_len: u32, available: usize },
    #[error("Message too large: {size} bytes exceeds {max} byte limit")]
    MessageTooLarge { size: u32, max: u32 },
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Minimum message size (type + length)
pub const HEADER_SIZE: usize = 5;

/// Maximum message size (128 MB) - prevents DoS via memory exhaustion
/// Typical sync messages: 10 KB - 600 KB
/// Large collections (1000+ objects with rich content): 10-50 MB
pub const MAX_MESSAGE_SIZE: u32 = 128 * 1024 * 1024;

/// Encode a message with type prefix and length
///
/// Format: [type: 1 byte][length: 4 bytes little-endian][payload: N bytes]
pub fn encode_message(msg_type: MessageType, payload: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(HEADER_SIZE + payload.len());
    result.push(msg_type as u8);
    result.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    result.extend_from_slice(payload);
    result
}

/// Decoded message with type and payload
#[derive(Debug)]
pub struct Message {
    pub msg_type: MessageType,
    pub payload: Vec<u8>,
}

/// Decode a message from binary format
///
/// Returns the message and the number of bytes consumed
pub fn decode_message(data: &[u8]) -> Result<(Message, usize), ProtocolError> {
    if data.len() < HEADER_SIZE {
        return Err(ProtocolError::MessageTooShort {
            expected: HEADER_SIZE,
            actual: data.len(),
        });
    }

    let msg_type = MessageType::try_from(data[0])?;
    let length = u32::from_le_bytes([data[1], data[2], data[3], data[4]]);

    // Reject messages larger than MAX_MESSAGE_SIZE to prevent DoS
    if length > MAX_MESSAGE_SIZE {
        return Err(ProtocolError::MessageTooLarge {
            size: length,
            max: MAX_MESSAGE_SIZE,
        });
    }

    let total_len = HEADER_SIZE + length as usize;

    if data.len() < total_len {
        return Err(ProtocolError::PayloadLengthMismatch {
            header_len: length,
            available: data.len() - HEADER_SIZE,
        });
    }

    let payload = data[HEADER_SIZE..total_len].to_vec();
    Ok((Message { msg_type, payload }, total_len))
}

/// Hello payload for handshake
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct HelloPayload {
    /// Unique device identifier
    pub device_id: String,
    /// Device name (user-friendly)
    pub device_name: String,
    /// Protocol version
    pub protocol_version: u32,
    /// Whether E2EE is enabled
    pub encrypted: bool,
    /// Key fingerprint for verification
    pub fingerprint: String,
}

/// Acknowledgment payload
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AckPayload {
    /// Whether handshake was accepted
    pub accepted: bool,
    /// Reason if rejected
    pub reason: Option<String>,
}

// ============================================================================
// Device Management Payloads
// ============================================================================

/// Device revocation payload
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceRevokePayload {
    /// Device ID that was revoked
    pub device_id: String,
    /// Unix timestamp (ms) when revocation occurred
    pub revoked_at: u64,
    /// Device ID that performed the revocation
    pub revoked_by: String,
    /// Optional reason for revocation
    pub reason: Option<String>,
    /// Base64-encoded Ed25519 signature
    pub signature: String,
}

/// Device revocation acknowledgment payload
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceRevokeAckPayload {
    /// Device ID that was revoked
    pub device_id: String,
    /// Device ID acknowledging the revocation
    pub acknowledged_by: String,
}

/// Device rename payload
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceRenamePayload {
    /// Device ID being renamed
    pub device_id: String,
    /// New device name
    pub new_name: String,
    /// Unix timestamp (ms) when rename occurred
    pub renamed_at: u64,
}

/// Extended hello payload with device registry info
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExtendedHelloPayload {
    /// Unique device identifier
    pub device_id: String,
    /// Device name (user-friendly)
    pub device_name: String,
    /// Protocol version
    pub protocol_version: u32,
    /// Whether E2EE is enabled
    pub encrypted: bool,
    /// Key fingerprint for verification
    pub fingerprint: String,
    /// Device registry version (Loro lamport clock)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registry_version: Option<u64>,
    /// Base64-encoded Ed25519 public signing key
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signing_public_key: Option<String>,
    /// Device IDs this device knows are revoked
    #[serde(skip_serializing_if = "Option::is_none")]
    pub known_revocations: Option<Vec<String>>,
}

/// Check if a message type is a device management message
#[allow(dead_code)]
pub fn is_device_management_message(msg_type: MessageType) -> bool {
    matches!(
        msg_type,
        MessageType::DeviceRegistry
            | MessageType::DeviceUpdate
            | MessageType::DeviceRevoke
            | MessageType::DeviceRevokeAck
            | MessageType::DeviceRename
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_roundtrip() {
        let payload = b"hello world";
        let encoded = encode_message(MessageType::Update, payload);

        let (decoded, consumed) = decode_message(&encoded).unwrap();

        assert_eq!(decoded.msg_type, MessageType::Update);
        assert_eq!(decoded.payload, payload);
        assert_eq!(consumed, encoded.len());
    }

    #[test]
    fn test_encode_format() {
        let payload = b"test";
        let encoded = encode_message(MessageType::Hello, payload);

        assert_eq!(encoded[0], 0x01); // MessageType::Hello
        assert_eq!(encoded[1..5], [4, 0, 0, 0]); // length = 4 (little-endian)
        assert_eq!(&encoded[5..], b"test");
    }

    #[test]
    fn test_decode_invalid_type() {
        let data = [0xFF, 0, 0, 0, 0]; // Invalid message type
        let result = decode_message(&data);
        assert!(matches!(result, Err(ProtocolError::InvalidMessageType(0xFF))));
    }

    #[test]
    fn test_decode_too_short() {
        let data = [0x01, 0, 0]; // Only 3 bytes
        let result = decode_message(&data);
        assert!(matches!(result, Err(ProtocolError::MessageTooShort { .. })));
    }

    #[test]
    fn test_decode_message_too_large() {
        // Create a header claiming a payload larger than MAX_MESSAGE_SIZE
        let huge_size: u32 = MAX_MESSAGE_SIZE + 1;
        let mut data = vec![0x02]; // MessageType::Update
        data.extend_from_slice(&huge_size.to_le_bytes());
        data.extend_from_slice(&[0u8; 10]); // Some payload bytes

        let result = decode_message(&data);
        assert!(matches!(
            result,
            Err(ProtocolError::MessageTooLarge { size, max })
            if size == huge_size && max == MAX_MESSAGE_SIZE
        ));
    }
}
