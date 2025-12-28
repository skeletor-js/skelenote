//! mDNS Service Discovery for Local Network Sync
//!
//! Uses mDNS/Bonjour to advertise this device and discover peers on the local network.
//! Only peers with matching fingerprints (same Skeleton Key) are reported.

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

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
    /// An error occurred
    Error { message: String },
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
    /// Start mDNS advertisement and discovery
    ///
    /// - `device_id`: Unique identifier for this device
    /// - `device_name`: Human-readable device name
    /// - `port`: TCP port the server is listening on
    /// - `fingerprint`: Key fingerprint for peer filtering
    /// - `our_fingerprint`: Our fingerprint for filtering discovered peers
    pub fn start(
        device_id: String,
        device_name: String,
        port: u16,
        fingerprint: String,
    ) -> Result<(Self, mpsc::Receiver<MdnsEvent>), String> {
        // Create the mDNS daemon
        let daemon = ServiceDaemon::new().map_err(|e| format!("Failed to create mDNS daemon: {}", e))?;

        // Create a unique instance name
        let instance_name = format!("{}._skelenote._tcp.local.", device_id);

        // Build TXT records
        let mut properties = HashMap::new();
        properties.insert("fp".to_string(), fingerprint.clone());
        properties.insert("v".to_string(), "1".to_string());
        properties.insert("id".to_string(), device_id.clone());
        properties.insert("name".to_string(), device_name.clone());

        // Register our service
        let service_info = ServiceInfo::new(
            SERVICE_TYPE,
            &device_id,
            &format!("{}.local.", hostname::get().unwrap_or_default().to_string_lossy()),
            (),
            port,
            properties,
        ).map_err(|e| format!("Failed to create service info: {}", e))?;

        daemon
            .register(service_info)
            .map_err(|e| format!("Failed to register mDNS service: {}", e))?;

        // Start browsing for other services
        let receiver = daemon
            .browse(SERVICE_TYPE)
            .map_err(|e| format!("Failed to start mDNS browse: {}", e))?;

        let (event_tx, event_rx) = mpsc::channel(100);
        let shutdown = Arc::new(RwLock::new(false));
        let shutdown_clone = shutdown.clone();
        let our_device_id = device_id.clone();
        let our_fingerprint = fingerprint.clone();

        // Spawn the event handler
        tokio::spawn(async move {
            Self::browse_loop(receiver, event_tx, our_device_id, our_fingerprint, shutdown_clone).await;
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
        shutdown: Arc<RwLock<bool>>,
    ) {
        loop {
            // Check for shutdown
            if *shutdown.read().await {
                break;
            }

            // Use recv_timeout to allow periodic shutdown checks
            match receiver.recv_timeout(std::time::Duration::from_millis(500)) {
                Ok(event) => {
                    match event {
                        ServiceEvent::ServiceResolved(info) => {
                            // Extract properties
                            let properties = info.get_properties();
                            let fp = properties.get("fp").map(|v| v.val_str().to_string());
                            let id = properties.get("id").map(|v| v.val_str().to_string());
                            let name = properties.get("name").map(|v| v.val_str().to_string());

                            // Skip our own service
                            if let Some(ref peer_id) = id {
                                if peer_id == &our_device_id {
                                    continue;
                                }
                            }

                            // Filter by fingerprint - only show peers with same key
                            if let Some(ref peer_fp) = fp {
                                if peer_fp != &our_fingerprint {
                                    continue;
                                }
                            } else {
                                // No fingerprint = skip
                                continue;
                            }

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
