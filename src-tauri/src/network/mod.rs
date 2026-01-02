//! Local Network Sync Module
//!
//! Provides peer-to-peer sync over the local network using mDNS discovery and TCP connections.
//! All data stays on the local network - no external servers involved.

pub mod blocklist;
pub mod client;
pub mod mdns;
pub mod protocol;
pub mod server;
pub mod state;

pub use mdns::MdnsHandle;
pub use server::LocalSyncServer;
pub use state::{DiscoveredPeer, NetworkState};
