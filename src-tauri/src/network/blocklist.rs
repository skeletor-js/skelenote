//! Device Blocklist for P2P Connections
//!
//! Manages a local blocklist of revoked device IDs for immediate enforcement.
//! The blocklist is checked at mDNS discovery and TCP connection layers.
//!
//! The blocklist is persisted to disk so revocations survive app restarts.
//! It syncs with the device registry CRDT but provides immediate local enforcement.

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Error type for blocklist operations
#[derive(Debug, thiserror::Error)]
pub enum BlocklistError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Persisted blocklist data
#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct BlocklistData {
    /// Revoked device IDs
    revoked_device_ids: Vec<String>,
    /// Last updated timestamp (Unix ms)
    updated_at: u64,
}

/// Device blocklist for P2P connection enforcement
#[derive(Debug)]
pub struct DeviceBlocklist {
    /// Set of blocked device IDs
    blocked: Arc<RwLock<HashSet<String>>>,
    /// Path to the blocklist file (if persistence is enabled)
    file_path: Option<PathBuf>,
}

impl DeviceBlocklist {
    /// Create a new empty blocklist (no persistence)
    pub fn new() -> Self {
        Self {
            blocked: Arc::new(RwLock::new(HashSet::new())),
            file_path: None,
        }
    }

    /// Create a blocklist with persistence to the given file
    pub fn with_persistence(file_path: PathBuf) -> Self {
        Self {
            blocked: Arc::new(RwLock::new(HashSet::new())),
            file_path: Some(file_path),
        }
    }

    /// Load the blocklist from disk
    pub async fn load(&self) -> Result<(), BlocklistError> {
        let Some(ref path) = self.file_path else {
            return Ok(());
        };

        if !path.exists() {
            return Ok(());
        }

        let contents = tokio::fs::read_to_string(path).await?;
        let data: BlocklistData = serde_json::from_str(&contents)?;

        let mut blocked = self.blocked.write().await;
        blocked.clear();
        for id in data.revoked_device_ids {
            blocked.insert(id);
        }

        println!(
            "[Blocklist] Loaded {} blocked devices from disk",
            blocked.len()
        );
        Ok(())
    }

    /// Save the blocklist to disk
    pub async fn save(&self) -> Result<(), BlocklistError> {
        let Some(ref path) = self.file_path else {
            return Ok(());
        };

        let blocked = self.blocked.read().await;
        let data = BlocklistData {
            revoked_device_ids: blocked.iter().cloned().collect(),
            updated_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        };

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let contents = serde_json::to_string_pretty(&data)?;
        tokio::fs::write(path, contents).await?;

        println!("[Blocklist] Saved {} blocked devices to disk", blocked.len());
        Ok(())
    }

    /// Check if a device ID is blocked
    pub async fn is_blocked(&self, device_id: &str) -> bool {
        let blocked = self.blocked.read().await;
        blocked.contains(device_id)
    }

    /// Block a device ID (adds to blocklist and persists)
    pub async fn block(&self, device_id: String) -> Result<(), BlocklistError> {
        {
            let mut blocked = self.blocked.write().await;
            if blocked.contains(&device_id) {
                return Ok(()); // Already blocked
            }
            blocked.insert(device_id.clone());
        }

        println!("[Blocklist] Blocked device: {}", device_id);
        self.save().await
    }

    /// Block multiple device IDs
    #[allow(dead_code)]
    pub async fn block_many(&self, device_ids: Vec<String>) -> Result<(), BlocklistError> {
        {
            let mut blocked = self.blocked.write().await;
            for id in device_ids {
                blocked.insert(id);
            }
        }

        self.save().await
    }

    /// Get all blocked device IDs
    pub async fn get_blocked(&self) -> Vec<String> {
        let blocked = self.blocked.read().await;
        blocked.iter().cloned().collect()
    }

    /// Get count of blocked devices
    #[allow(dead_code)]
    pub async fn count(&self) -> usize {
        let blocked = self.blocked.read().await;
        blocked.len()
    }

    /// Clear the blocklist (for testing)
    #[cfg(test)]
    pub async fn clear(&self) {
        let mut blocked = self.blocked.write().await;
        blocked.clear();
    }
}

impl Default for DeviceBlocklist {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for DeviceBlocklist {
    fn clone(&self) -> Self {
        Self {
            blocked: self.blocked.clone(),
            file_path: self.file_path.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_blocklist_basic() {
        let blocklist = DeviceBlocklist::new();

        assert!(!blocklist.is_blocked("device-1").await);

        blocklist.block("device-1".to_string()).await.unwrap();
        assert!(blocklist.is_blocked("device-1").await);
        assert!(!blocklist.is_blocked("device-2").await);
    }

    #[tokio::test]
    async fn test_blocklist_persistence() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("blocklist.json");

        // Create and populate blocklist
        let blocklist = DeviceBlocklist::with_persistence(file_path.clone());
        blocklist.block("device-1".to_string()).await.unwrap();
        blocklist.block("device-2".to_string()).await.unwrap();

        // Create new blocklist from same file
        let blocklist2 = DeviceBlocklist::with_persistence(file_path);
        blocklist2.load().await.unwrap();

        assert!(blocklist2.is_blocked("device-1").await);
        assert!(blocklist2.is_blocked("device-2").await);
        assert!(!blocklist2.is_blocked("device-3").await);
    }

    #[tokio::test]
    async fn test_blocklist_block_many() {
        let blocklist = DeviceBlocklist::new();

        blocklist
            .block_many(vec![
                "device-1".to_string(),
                "device-2".to_string(),
                "device-3".to_string(),
            ])
            .await
            .unwrap();

        assert!(blocklist.is_blocked("device-1").await);
        assert!(blocklist.is_blocked("device-2").await);
        assert!(blocklist.is_blocked("device-3").await);
        assert_eq!(blocklist.count().await, 3);
    }
}
