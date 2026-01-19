//! Local Network Sync Module
//!
//! Provides peer-to-peer sync over the local network using mDNS discovery and TCP connections.
//! All data stays on the local network - no external servers involved.

pub mod blocklist;
pub mod cache;
pub mod client;
pub mod commands;
pub mod mdns;
pub mod pairing;
pub mod protocol;
pub mod server;
pub mod state;

pub use server::LocalSyncServer;
pub use state::NetworkState;

// Re-export PairingState for lib.rs state management
pub use commands::PairingState;
