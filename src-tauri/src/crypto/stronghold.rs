//! Secure key storage for the Skeleton Key
//!
//! Stores the master key encrypted to a file in the app's data directory.
//! The encryption uses XChaCha20-Poly1305 with a device-specific key derived
//! from the app's installation path.

use std::fs;
use std::path::PathBuf;
use zeroize::Zeroizing;

use super::encryption::{decrypt_bytes, encrypt_bytes};
use super::error::StrongholdError;
use super::keys::MASTER_KEY_LEN;

/// Filename for storing the encrypted master key
const MASTER_KEY_FILE: &str = "skeleton_key.enc";

/// Filename for storing the device ID
const DEVICE_ID_FILE: &str = "device_id";

/// Manages secure key storage
pub struct StrongholdManager {
    data_dir: PathBuf,
    /// Device-specific encryption key (derived from path)
    device_key: [u8; 32],
}

impl StrongholdManager {
    /// Initialize the key storage manager
    pub fn new(app_data_dir: PathBuf) -> Result<Self, StrongholdError> {
        // Ensure the directory exists
        fs::create_dir_all(&app_data_dir).map_err(|e| {
            StrongholdError::InitFailed(format!("Failed to create directory: {}", e))
        })?;

        // Derive a device-specific key from the path
        // This ensures keys are tied to this installation
        let device_key = derive_device_key(&app_data_dir);

        Ok(Self {
            data_dir: app_data_dir,
            device_key,
        })
    }

    /// Check if a master key (Skeleton Key) exists
    pub fn has_master_key(&self) -> bool {
        self.key_path().exists()
    }

    /// Store master key (encrypted)
    pub fn store_master_key(&self, master_key: &[u8; MASTER_KEY_LEN]) -> Result<(), StrongholdError> {
        let encrypted = encrypt_bytes(&self.device_key, master_key)
            .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;

        fs::write(self.key_path(), encrypted)
            .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;

        Ok(())
    }

    /// Retrieve master key (decrypted)
    pub fn get_master_key(&self) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, StrongholdError> {
        let encrypted = fs::read(self.key_path())
            .map_err(|e| StrongholdError::RetrieveFailed(e.to_string()))?;

        let decrypted = decrypt_bytes(&self.device_key, &encrypted)
            .map_err(|e| StrongholdError::RetrieveFailed(e.to_string()))?;

        if decrypted.len() != MASTER_KEY_LEN {
            return Err(StrongholdError::InvalidKeyLength);
        }

        let mut key = Zeroizing::new([0u8; MASTER_KEY_LEN]);
        key.copy_from_slice(&decrypted);
        Ok(key)
    }

    /// Store device ID (for future multi-device identification)
    #[allow(dead_code)]
    pub fn store_device_id(&self, device_id: &str) -> Result<(), StrongholdError> {
        fs::write(self.device_id_path(), device_id)
            .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;
        Ok(())
    }

    /// Get device ID
    #[allow(dead_code)]
    pub fn get_device_id(&self) -> Result<String, StrongholdError> {
        fs::read_to_string(self.device_id_path())
            .map_err(|e| StrongholdError::RetrieveFailed(e.to_string()))
    }

    /// Check if device ID exists
    #[allow(dead_code)]
    pub fn has_device_id(&self) -> bool {
        self.device_id_path().exists()
    }

    /// Clear all secrets (for testing or reset)
    pub fn clear(&self) -> Result<(), StrongholdError> {
        if self.key_path().exists() {
            fs::remove_file(self.key_path())
                .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;
        }
        if self.device_id_path().exists() {
            fs::remove_file(self.device_id_path())
                .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;
        }
        Ok(())
    }

    fn key_path(&self) -> PathBuf {
        self.data_dir.join(MASTER_KEY_FILE)
    }

    fn device_id_path(&self) -> PathBuf {
        self.data_dir.join(DEVICE_ID_FILE)
    }
}

/// Derive a device-specific key from the app's data directory path
///
/// This ties the encrypted key to this specific installation.
fn derive_device_key(path: &PathBuf) -> [u8; 32] {
    use sha2::{Digest, Sha256};

    let mut hasher = Sha256::new();
    hasher.update(b"skelenote-device-key-v1:");
    hasher.update(path.to_string_lossy().as_bytes());

    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}
