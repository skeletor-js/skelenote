//! Local Network Sync Module
//!
//! Provides peer-to-peer sync over the local network using mDNS discovery and TCP connections.
//! All data stays on the local network - no external servers involved.

pub mod protocol;
pub mod server;
pub mod client;
pub mod state;
pub mod mdns;
pub mod peers;

pub use server::LocalSyncServer;
pub use state::{NetworkState, DiscoveredPeer};
pub use mdns::MdnsHandle;
pub use peers::{PeerManager, PeerManagerEvent};
