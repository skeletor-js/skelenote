use serde::{Deserialize, Serialize};

/// Relay protocol messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Message {
    /// Join a sync room
    Join { room: String },
    /// Leave the current room
    Leave,
    /// Encrypted sync payload
    Sync { payload: Vec<u8> },
    /// Acknowledge receipt (optional)
    Ack { id: String },
}
