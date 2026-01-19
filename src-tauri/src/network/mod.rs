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

pub use mdns::MdnsHandle;
pub use server::LocalSyncServer;
pub use state::{DiscoveredPeer, NetworkState};

// Re-export commands for easy access from lib.rs
pub use commands::{
    // State
    PairingState,
    // Server commands
    network_start_server, network_stop_server, network_get_server_info,
    network_get_connected_peers, network_get_device_info, network_get_device_id,
    network_sync_device_id,
    // Discovery commands
    network_start_discovery, network_stop_discovery, network_get_discovered_peers,
    network_is_discovery_running,
    // Connection commands
    network_connect_to_peer,
    // Broadcast commands
    network_broadcast_sync, network_peer_count, network_broadcast_device_registry,
    network_broadcast_device_revoke, network_broadcast_device_rename,
    // Device blocklist commands
    device_block, device_is_blocked, device_get_blocked,
    // Pairing commands
    pairing_generate_qr, pairing_parse_qr, pairing_connect, pairing_connect_manual,
    // Cache commands
    cache_get_paired_devices, cache_remove_paired_device, cache_prune_addresses,
    cache_reconnect_all, cache_reconnect_device,
};
