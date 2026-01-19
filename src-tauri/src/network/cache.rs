//! Paired Devices Cache
//!
//! Manages the cache of explicitly paired devices for QR-based pairing.
//! Replaces mDNS auto-discovery with persistent paired device list.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

/// Cache file version for future migration
pub const CACHE_VERSION: u32 = 1;

/// Errors that can occur during cache operations
#[derive(Error, Debug)]
pub enum CacheError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Device not found: {0}")]
    DeviceNotFound(String),
}

/// Information about a known network address for a device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnownAddress {
    /// IP address
    pub ip: String,
    /// TCP port
    pub port: u16,
    /// Unix timestamp (ms) when last used successfully
    pub last_used: u64,
    /// Number of successful connections via this address
    pub success_count: u32,
    /// Number of consecutive failures
    pub fail_count: u32,
}

impl KnownAddress {
    /// Create a new address entry
    pub fn new(ip: String, port: u16) -> Self {
        Self {
            ip,
            port,
            last_used: current_timestamp(),
            success_count: 0,
            fail_count: 0,
        }
    }

    /// Calculate success rate (0.0 to 1.0)
    pub fn success_rate(&self) -> f64 {
        let total = self.success_count + self.fail_count;
        if total == 0 {
            0.0
        } else {
            self.success_count as f64 / total as f64
        }
    }

    /// Record a successful connection
    pub fn record_success(&mut self) {
        self.success_count += 1;
        self.fail_count = 0; // Reset consecutive failures
        self.last_used = current_timestamp();
    }

    /// Record a failed connection attempt
    pub fn record_failure(&mut self) {
        self.fail_count += 1;
    }

    /// Check if this address should be removed (too many failures)
    pub fn should_prune(&self) -> bool {
        self.fail_count > 10
    }
}

/// Information about a paired device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairedDevice {
    /// Device UUID (immutable identifier)
    pub id: String,
    /// Human-readable name (can change)
    pub name: String,
    /// Key fingerprint for verification (should match ours)
    pub fingerprint: String,
    /// Known network addresses
    pub known_addresses: Vec<KnownAddress>,
    /// Unix timestamp (ms) when device was paired
    pub paired_at: u64,
    /// Unix timestamp (ms) of last successful connection, or None
    pub last_connected: Option<u64>,
    /// Unix timestamp (ms) of last time we saw this device
    pub last_seen: Option<u64>,
}

impl PairedDevice {
    /// Create a new paired device
    pub fn new(
        id: String,
        name: String,
        fingerprint: String,
        addresses: Vec<KnownAddress>,
    ) -> Self {
        Self {
            id,
            name,
            fingerprint,
            known_addresses: addresses,
            paired_at: current_timestamp(),
            last_connected: None,
            last_seen: None,
        }
    }

    /// Get addresses sorted by priority (most likely to succeed first)
    pub fn prioritized_addresses(&self) -> Vec<&KnownAddress> {
        let mut addrs: Vec<&KnownAddress> = self.known_addresses.iter().collect();

        addrs.sort_by(|a, b| {
            // 1. Last successful address (most recent last_used with successes)
            if a.success_count > 0 && b.success_count > 0 {
                return b.last_used.cmp(&a.last_used);
            }
            if a.success_count > 0 {
                return std::cmp::Ordering::Less;
            }
            if b.success_count > 0 {
                return std::cmp::Ordering::Greater;
            }

            // 2. Highest success rate
            let rate_cmp = b
                .success_rate()
                .partial_cmp(&a.success_rate())
                .unwrap_or(std::cmp::Ordering::Equal);
            if rate_cmp != std::cmp::Ordering::Equal {
                return rate_cmp;
            }

            // 3. Most recently used
            b.last_used.cmp(&a.last_used)
        });

        addrs
    }

    /// Add or update an address
    pub fn add_or_update_address(&mut self, ip: String, port: u16) {
        // Check if address already exists
        if let Some(addr) = self
            .known_addresses
            .iter_mut()
            .find(|a| a.ip == ip && a.port == port)
        {
            addr.last_used = current_timestamp();
            return;
        }

        // Add new address
        self.known_addresses.push(KnownAddress::new(ip, port));

        // Prune if we have too many addresses
        self.prune_addresses();
    }

    /// Remove addresses with too many consecutive failures
    pub fn prune_addresses(&mut self) {
        // Remove addresses with >10 consecutive failures
        self.known_addresses.retain(|addr| !addr.should_prune());

        // Keep maximum 5 addresses (prune oldest unused)
        if self.known_addresses.len() > 5 {
            self.known_addresses
                .sort_by(|a, b| b.last_used.cmp(&a.last_used));
            self.known_addresses.truncate(5);
        }
    }

    /// Record successful connection
    pub fn record_connection_success(&mut self, ip: &str, port: u16) {
        if let Some(addr) = self
            .known_addresses
            .iter_mut()
            .find(|a| a.ip == ip && a.port == port)
        {
            addr.record_success();
        }
        self.last_connected = Some(current_timestamp());
        self.last_seen = Some(current_timestamp());
    }

    /// Record failed connection attempt
    pub fn record_connection_failure(&mut self, ip: &str, port: u16) {
        if let Some(addr) = self
            .known_addresses
            .iter_mut()
            .find(|a| a.ip == ip && a.port == port)
        {
            addr.record_failure();
        }
    }
}

/// Information about this device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThisDevice {
    /// This device's UUID
    pub id: String,
    /// This device's name
    pub name: String,
    /// This device's fingerprint
    pub fingerprint: String,
}

/// Cache of paired devices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairedDevicesCache {
    /// Cache format version
    pub version: u32,
    /// Information about this device
    pub this_device: ThisDevice,
    /// List of paired devices
    pub devices: Vec<PairedDevice>,
}

impl PairedDevicesCache {
    /// Create a new empty cache
    pub fn new(device_id: String, device_name: String, fingerprint: String) -> Self {
        Self {
            version: CACHE_VERSION,
            this_device: ThisDevice {
                id: device_id,
                name: device_name,
                fingerprint,
            },
            devices: Vec::new(),
        }
    }

    /// Load cache from file, or create new if doesn't exist
    pub fn load(
        path: &PathBuf,
        device_id: String,
        device_name: String,
        fingerprint: String,
    ) -> Result<Self, CacheError> {
        if !path.exists() {
            println!("[Cache] No cache file found, creating new");
            return Ok(Self::new(device_id, device_name, fingerprint));
        }

        let data = std::fs::read_to_string(path)?;
        let mut cache: PairedDevicesCache = serde_json::from_str(&data)?;

        // Update this device info (may have changed)
        cache.this_device.id = device_id;
        cache.this_device.name = device_name;
        cache.this_device.fingerprint = fingerprint;

        println!("[Cache] Loaded {} paired devices", cache.devices.len());
        Ok(cache)
    }

    /// Save cache to file
    pub fn save(&self, path: &PathBuf) -> Result<(), CacheError> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let data = serde_json::to_string_pretty(self)?;
        std::fs::write(path, data)?;
        println!("[Cache] Saved {} paired devices", self.devices.len());
        Ok(())
    }

    /// Add a new paired device
    pub fn add_device(&mut self, device: PairedDevice) {
        // Check if device already exists (by ID)
        if let Some(existing) = self.devices.iter_mut().find(|d| d.id == device.id) {
            // Update existing device
            existing.name = device.name;
            existing.fingerprint = device.fingerprint;
            // Merge addresses
            for addr in device.known_addresses {
                existing.add_or_update_address(addr.ip, addr.port);
            }
            println!("[Cache] Updated existing device: {}", device.id);
        } else {
            // Add new device
            println!("[Cache] Added new device: {} ({})", device.name, device.id);
            self.devices.push(device);
        }
    }

    /// Remove a paired device
    pub fn remove_device(&mut self, device_id: &str) -> Result<(), CacheError> {
        let initial_len = self.devices.len();
        self.devices.retain(|d| d.id != device_id);

        if self.devices.len() == initial_len {
            return Err(CacheError::DeviceNotFound(device_id.to_string()));
        }

        println!("[Cache] Removed device: {}", device_id);
        Ok(())
    }

    /// Get a paired device by ID
    pub fn get_device(&self, device_id: &str) -> Option<&PairedDevice> {
        self.devices.iter().find(|d| d.id == device_id)
    }

    /// Get a mutable reference to a paired device by ID
    pub fn get_device_mut(&mut self, device_id: &str) -> Option<&mut PairedDevice> {
        self.devices.iter_mut().find(|d| d.id == device_id)
    }

    /// Update device name
    #[allow(dead_code)]
    pub fn update_device_name(
        &mut self,
        device_id: &str,
        new_name: String,
    ) -> Result<(), CacheError> {
        let device = self
            .get_device_mut(device_id)
            .ok_or_else(|| CacheError::DeviceNotFound(device_id.to_string()))?;
        device.name = new_name;
        println!("[Cache] Updated device name: {}", device_id);
        Ok(())
    }

    /// Record successful connection
    pub fn record_connection_success(
        &mut self,
        device_id: &str,
        ip: &str,
        port: u16,
    ) -> Result<(), CacheError> {
        let device = self
            .get_device_mut(device_id)
            .ok_or_else(|| CacheError::DeviceNotFound(device_id.to_string()))?;
        device.record_connection_success(ip, port);
        Ok(())
    }

    /// Record failed connection attempt
    pub fn record_connection_failure(
        &mut self,
        device_id: &str,
        ip: &str,
        port: u16,
    ) -> Result<(), CacheError> {
        let device = self
            .get_device_mut(device_id)
            .ok_or_else(|| CacheError::DeviceNotFound(device_id.to_string()))?;
        device.record_connection_failure(ip, port);
        Ok(())
    }

    /// Prune all devices' addresses
    pub fn prune_all_addresses(&mut self) {
        for device in &mut self.devices {
            device.prune_addresses();
        }
    }
}

/// Get current Unix timestamp in milliseconds
fn current_timestamp() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_address_success_rate() {
        let mut addr = KnownAddress::new("192.168.1.1".to_string(), 12345);
        assert_eq!(addr.success_rate(), 0.0);

        addr.record_success();
        assert_eq!(addr.success_rate(), 1.0);

        addr.record_failure();
        assert_eq!(addr.success_rate(), 0.5);
    }

    #[test]
    fn test_address_prioritization() {
        let mut device = PairedDevice::new(
            "device1".to_string(),
            "Device 1".to_string(),
            "abc123".to_string(),
            vec![],
        );

        // Add addresses with different success rates
        let mut addr1 = KnownAddress::new("192.168.1.1".to_string(), 12345);
        addr1.success_count = 5;
        addr1.fail_count = 1;
        addr1.last_used = 1000;

        let mut addr2 = KnownAddress::new("192.168.1.2".to_string(), 12345);
        addr2.success_count = 10;
        addr2.fail_count = 0;
        addr2.last_used = 2000; // Most recent successful

        let mut addr3 = KnownAddress::new("192.168.1.3".to_string(), 12345);
        addr3.success_count = 0;
        addr3.fail_count = 3;
        addr3.last_used = 500;

        device.known_addresses = vec![addr1, addr2, addr3];

        let prioritized = device.prioritized_addresses();

        // Should be ordered: addr2 (most recent + successful), addr1 (successful), addr3 (failed)
        assert_eq!(prioritized[0].ip, "192.168.1.2");
        assert_eq!(prioritized[1].ip, "192.168.1.1");
        assert_eq!(prioritized[2].ip, "192.168.1.3");
    }

    #[test]
    fn test_cache_add_update_device() {
        let mut cache = PairedDevicesCache::new(
            "this-device".to_string(),
            "This Device".to_string(),
            "abc123".to_string(),
        );

        // Add a device
        let device1 = PairedDevice::new(
            "device1".to_string(),
            "Device 1".to_string(),
            "def456".to_string(),
            vec![KnownAddress::new("192.168.1.1".to_string(), 12345)],
        );
        cache.add_device(device1.clone());
        assert_eq!(cache.devices.len(), 1);

        // Update same device (should not duplicate)
        let device1_updated = PairedDevice::new(
            "device1".to_string(),
            "Device 1 Updated".to_string(),
            "def456".to_string(),
            vec![KnownAddress::new("192.168.1.2".to_string(), 12345)],
        );
        cache.add_device(device1_updated);
        assert_eq!(cache.devices.len(), 1);
        assert_eq!(cache.devices[0].name, "Device 1 Updated");
        assert_eq!(cache.devices[0].known_addresses.len(), 2); // Merged addresses
    }
}
