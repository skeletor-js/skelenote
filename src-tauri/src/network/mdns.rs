//! mDNS Service Discovery for Local Network Sync
//!
//! Uses mDNS/Bonjour to advertise this device and discover peers on the local network.
//! Only peers with matching fingerprints (same Skeleton Key) are reported.
//! Revoked devices are filtered out using the device blocklist.

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use super::blocklist::DeviceBlocklist;
use super::state::DiscoveredPeer;

/// Service type for Skelenote local sync
const SERVICE_TYPE: &str = "_skelenote._tcp.local.";

/// Events from mDNS discovery
#[derive(Debug, Clone)]
pub enum MdnsEvent {
    /// A peer was discovered
    PeerDiscovered(DiscoveredPeer),
    /// A peer was lost
    PeerLost { device_id: String },
}

/// Handle for the mDNS service
pub struct MdnsHandle {
    /// The service daemon
    daemon: ServiceDaemon,
    /// Our service instance name
    instance_name: String,
    /// Shutdown flag
    shutdown: Arc<RwLock<bool>>,
}

impl MdnsHandle {
    /// Get local IPv4 addresses for mDNS advertisement
    fn get_local_ips() -> Vec<IpAddr> {
        let mut ips = Vec::new();

        // Try using local-ip-address crate
        if let Ok(ip) = local_ip_address::local_ip() {
            if let IpAddr::V4(ipv4) = ip {
                println!("[mDNS] Found primary local IP: {}", ipv4);
                ips.push(IpAddr::V4(ipv4));
            }
        }

        // Also try to get all local IPs
        if let Ok(list) = local_ip_address::list_afinet_netifas() {
            for (name, ip) in list {
                if let IpAddr::V4(ipv4) = ip {
                    // Skip loopback and already-added IPs
                    if !ipv4.is_loopback() && !ips.contains(&IpAddr::V4(ipv4)) {
                        println!("[mDNS] Found interface {} with IP: {}", name, ipv4);
                        ips.push(IpAddr::V4(ipv4));
                    }
                }
            }
        }

        ips
    }

    /// Start mDNS advertisement and discovery
    ///
    /// - `device_id`: Unique identifier for this device
    /// - `device_name`: Human-readable device name
    /// - `port`: TCP port the server is listening on
    /// - `fingerprint`: Key fingerprint for peer filtering
    /// - `blocklist`: Device blocklist for filtering revoked peers
    pub fn start(
        device_id: String,
        device_name: String,
        port: u16,
        fingerprint: String,
        blocklist: DeviceBlocklist,
    ) -> Result<(Self, mpsc::Receiver<MdnsEvent>), String> {
        // Create the mDNS daemon
        println!("[mDNS] Creating ServiceDaemon...");
        let daemon = ServiceDaemon::new().map_err(|e| format!("Failed to create mDNS daemon: {}", e))?;
        println!("[mDNS] ServiceDaemon created successfully");

        // Create a unique instance name
        let instance_name = format!("{}._skelenote._tcp.local.", device_id);

        // Get hostname - ensure it ends with exactly ".local."
        let hostname = hostname::get().unwrap_or_default();
        let hostname_raw = hostname.to_string_lossy();
        let hostname_str = if hostname_raw.ends_with(".local") {
            format!("{}.", hostname_raw)
        } else if hostname_raw.ends_with(".local.") {
            hostname_raw.to_string()
        } else {
            format!("{}.local.", hostname_raw)
        };

        // Get local IP addresses
        let local_ips = Self::get_local_ips();
        println!("[mDNS] Starting discovery:");
        println!("[mDNS]   device_id: {}", device_id);
        println!("[mDNS]   device_name: {}", device_name);
        println!("[mDNS]   hostname: {}", hostname_str);
        println!("[mDNS]   port: {}", port);
        println!("[mDNS]   fingerprint: {}", fingerprint);
        println!("[mDNS]   instance_name: {}", instance_name);
        println!("[mDNS]   local_ips: {:?}", local_ips);

        if local_ips.is_empty() {
            return Err("No local IP addresses found".to_string());
        }

        // Build TXT records
        let mut properties = HashMap::new();
        properties.insert("fp".to_string(), fingerprint.clone());
        properties.insert("v".to_string(), "1".to_string());
        properties.insert("id".to_string(), device_id.clone());
        properties.insert("name".to_string(), device_name.clone());

        // Register our service with explicit IP addresses
        println!("[mDNS] Creating ServiceInfo with {} IPs...", local_ips.len());
        let service_info = ServiceInfo::new(
            SERVICE_TYPE,
            &device_id,
            &hostname_str,
            &local_ips[..],  // Pass IP addresses explicitly
            port,
            properties,
        ).map_err(|e| format!("Failed to create service info: {}", e))?;
        println!("[mDNS] ServiceInfo created: {}", service_info.get_fullname());
        println!("[mDNS] ServiceInfo addresses: {:?}", service_info.get_addresses());

        println!("[mDNS] Registering service...");
        daemon
            .register(service_info)
            .map_err(|e| format!("Failed to register mDNS service: {}", e))?;
        println!("[mDNS] Service registered successfully!");

        // Start browsing for other services
        println!("[mDNS] Starting browse for {}...", SERVICE_TYPE);
        let receiver = daemon
            .browse(SERVICE_TYPE)
            .map_err(|e| format!("Failed to start mDNS browse: {}", e))?;
        println!("[mDNS] Browse started successfully!");

        let (event_tx, event_rx) = mpsc::channel(100);
        let shutdown = Arc::new(RwLock::new(false));
        let shutdown_clone = shutdown.clone();
        let our_device_id = device_id.clone();
        let our_fingerprint = fingerprint.clone();

        // Spawn the event handler
        tokio::spawn(async move {
            Self::browse_loop(receiver, event_tx, our_device_id, our_fingerprint, blocklist, shutdown_clone).await;
        });

        Ok((
            MdnsHandle {
                daemon,
                instance_name,
                shutdown,
            },
            event_rx,
        ))
    }

    /// Background loop to process mDNS events
    async fn browse_loop(
        receiver: mdns_sd::Receiver<ServiceEvent>,
        event_tx: mpsc::Sender<MdnsEvent>,
        our_device_id: String,
        our_fingerprint: String,
        blocklist: DeviceBlocklist,
        shutdown: Arc<RwLock<bool>>,
    ) {
        loop {
            // Check for shutdown
            if *shutdown.read().await {
                break;
            }

            // Use recv_timeout to allow periodic shutdown checks
            // Short timeout for more responsive discovery
            match receiver.recv_timeout(std::time::Duration::from_millis(100)) {
                Ok(event) => {
                    match &event {
                        ServiceEvent::SearchStarted(stype) => {
                            println!("[mDNS] SearchStarted: {}", stype);
                        }
                        ServiceEvent::ServiceFound(stype, name) => {
                            println!("[mDNS] ServiceFound: {} - {}", stype, name);
                        }
                        ServiceEvent::ServiceResolved(info) => {
                            println!("[mDNS] ServiceResolved: {} addresses={:?}",
                                info.get_fullname(),
                                info.get_addresses());
                        }
                        ServiceEvent::ServiceRemoved(stype, name) => {
                            println!("[mDNS] ServiceRemoved: {} - {}", stype, name);
                        }
                        ServiceEvent::SearchStopped(stype) => {
                            println!("[mDNS] SearchStopped: {}", stype);
                        }
                    }
                    match event {
                        ServiceEvent::ServiceResolved(info) => {
                            println!("[mDNS] Processing resolved service: {}", info.get_fullname());
                            // Extract properties
                            let properties = info.get_properties();
                            let fp = properties.get("fp").map(|v| v.val_str().to_string());
                            let id = properties.get("id").map(|v| v.val_str().to_string());
                            let name = properties.get("name").map(|v| v.val_str().to_string());

                            println!("[mDNS] Service properties: id={:?}, name={:?}, fp={:?}", id, name, fp);
                            println!("[mDNS] Our id={}, our_fp={}", our_device_id, our_fingerprint);

                            // Skip our own service
                            if let Some(ref peer_id) = id {
                                if peer_id == &our_device_id {
                                    println!("[mDNS] Skipping our own service");
                                    continue;
                                }
                            }

                            // Filter by fingerprint - only show peers with same key
                            if let Some(ref peer_fp) = fp {
                                if peer_fp != &our_fingerprint {
                                    println!("[mDNS] Skipping peer with different fingerprint: {} != {}", peer_fp, our_fingerprint);
                                    continue;
                                }
                            } else {
                                // No fingerprint = skip
                                println!("[mDNS] Skipping peer with no fingerprint");
                                continue;
                            }

                            // Check blocklist - filter revoked devices
                            if let Some(ref peer_id) = id {
                                if blocklist.is_blocked(peer_id).await {
                                    println!("[mDNS] Skipping blocked/revoked device: {}", peer_id);
                                    continue;
                                }
                            }

                            println!("[mDNS] Peer passed all filters! Adding to discovered peers");

                            // Build discovered peer info
                            let peer = DiscoveredPeer {
                                device_id: id.unwrap_or_else(|| info.get_fullname().to_string()),
                                device_name: name.unwrap_or_else(|| "Unknown Device".to_string()),
                                addresses: info.get_addresses().iter().map(|a| a.to_string()).collect(),
                                port: info.get_port(),
                                fingerprint: fp.unwrap_or_default(),
                                last_seen: std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs(),
                            };

                            let _ = event_tx.send(MdnsEvent::PeerDiscovered(peer)).await;
                        }
                        ServiceEvent::ServiceRemoved(_, fullname) => {
                            // Extract device ID from fullname
                            // Format: "device_id._skelenote._tcp.local."
                            if let Some(device_id) = fullname.strip_suffix("._skelenote._tcp.local.") {
                                let _ = event_tx.send(MdnsEvent::PeerLost {
                                    device_id: device_id.to_string(),
                                }).await;
                            }
                        }
                        ServiceEvent::SearchStarted(_) => {
                            // Ignore
                        }
                        ServiceEvent::SearchStopped(_) => {
                            // Ignore
                        }
                        _ => {
                            // Ignore other events
                        }
                    }
                }
                Err(flume::RecvTimeoutError::Timeout) => {
                    // Normal timeout, continue
                }
                Err(flume::RecvTimeoutError::Disconnected) => {
                    // Channel closed, exit
                    break;
                }
            }
        }
    }

    /// Stop mDNS advertisement and discovery
    pub async fn stop(self) -> Result<(), String> {
        // Signal shutdown
        *self.shutdown.write().await = true;

        // Unregister our service
        self.daemon
            .unregister(&self.instance_name)
            .map_err(|e| format!("Failed to unregister mDNS service: {}", e))?;

        // Shutdown the daemon
        self.daemon
            .shutdown()
            .map_err(|e| format!("Failed to shutdown mDNS daemon: {}", e))?;

        Ok(())
    }
}
