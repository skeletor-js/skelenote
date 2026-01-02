//! Secure key storage for the Skeleton Key
//!
//! Stores the master key encrypted to a file in the app's data directory.
//! The encryption uses XChaCha20-Poly1305 with a device-specific key stored
//! securely in the OS keychain (macOS Keychain, Windows Credential Manager,
//! or Linux Secret Service).

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

/// Keychain service name for storing the device encryption key
const KEYCHAIN_SERVICE: &str = "com.skelenote.app";

/// Keychain account name for the device key
const KEYCHAIN_ACCOUNT: &str = "device-encryption-key";

/// Manages secure key storage
pub struct StrongholdManager {
    data_dir: PathBuf,
    /// Device-specific encryption key (stored in OS keychain)
    device_key: [u8; 32],
}

impl StrongholdManager {
    /// Initialize the key storage manager
    ///
    /// The device encryption key is stored securely in the OS keychain:
    /// - macOS: Keychain Services
    /// - Windows: Credential Manager
    /// - Linux: Secret Service (libsecret)
    pub fn new(app_data_dir: PathBuf) -> Result<Self, StrongholdError> {
        // Ensure the directory exists
        fs::create_dir_all(&app_data_dir).map_err(|e| {
            StrongholdError::InitFailed(format!("Failed to create directory: {}", e))
        })?;

        // Get or create device key from OS keychain
        let device_key = get_or_create_device_key(&app_data_dir)?;

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
    ///
    /// This removes:
    /// - The encrypted master key file
    /// - The device ID file
    /// - The device encryption key from the OS keychain
    pub fn clear(&self) -> Result<(), StrongholdError> {
        if self.key_path().exists() {
            fs::remove_file(self.key_path())
                .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;
        }
        if self.device_id_path().exists() {
            fs::remove_file(self.device_id_path())
                .map_err(|e| StrongholdError::StoreFailed(e.to_string()))?;
        }
        // Also clear the device key from the OS keychain
        clear_device_key_from_keychain(&self.data_dir)?;
        Ok(())
    }

    fn key_path(&self) -> PathBuf {
        self.data_dir.join(MASTER_KEY_FILE)
    }

    fn device_id_path(&self) -> PathBuf {
        self.data_dir.join(DEVICE_ID_FILE)
    }
}

/// Get or create a device-specific encryption key
///
/// Attempts to use the OS keychain first for maximum security.
/// Falls back to path-based derivation if keychain is unavailable.
fn get_or_create_device_key(app_data_dir: &PathBuf) -> Result<[u8; 32], StrongholdError> {
    // Try keychain first
    match get_key_from_keychain(app_data_dir) {
        Ok(key) => return Ok(key),
        Err(e) => {
            // Log the error but continue with fallback
            eprintln!("Keychain unavailable, using fallback: {}", e);
        }
    }

    // Fallback: derive key from path + a stored random salt
    // This is less secure than keychain but still provides device-binding
    get_or_create_fallback_key(app_data_dir)
}

/// Try to get/create key from OS keychain
fn get_key_from_keychain(app_data_dir: &PathBuf) -> Result<[u8; 32], String> {
    use keyring::Entry;
    use rand::RngCore;
    use sha2::{Digest, Sha256};

    // Create a unique account name that includes a hash of the data directory
    let path_hash = {
        let mut hasher = Sha256::new();
        hasher.update(app_data_dir.to_string_lossy().as_bytes());
        let result = hasher.finalize();
        hex::encode(&result[..8])
    };
    let account_name = format!("{}-{}", KEYCHAIN_ACCOUNT, path_hash);

    let entry = Entry::new(KEYCHAIN_SERVICE, &account_name)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    // Helper to decode and return key from hex
    let decode_key = |key_hex: &str| -> Result<[u8; 32], String> {
        let key_bytes = hex::decode(key_hex)
            .map_err(|e| format!("Invalid key in keychain: {}", e))?;
        if key_bytes.len() != 32 {
            return Err("Invalid key length in keychain".to_string());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        Ok(key)
    };

    match entry.get_password() {
        Ok(key_hex) => {
            let key = decode_key(&key_hex)?;
            println!("Retrieved device key from OS keychain");
            Ok(key)
        }
        Err(keyring::Error::NoEntry) => {
            // Generate new random key
            let mut key = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut key);
            let key_hex = hex::encode(&key);

            match entry.set_password(&key_hex) {
                Ok(()) => {
                    println!("Created new device encryption key in OS keychain");
                    Ok(key)
                }
                Err(e) => {
                    // Handle race condition: another thread may have created the key
                    // Try to retrieve it again
                    if let Ok(existing_hex) = entry.get_password() {
                        let existing_key = decode_key(&existing_hex)?;
                        println!("Retrieved device key from OS keychain (after race)");
                        Ok(existing_key)
                    } else {
                        Err(format!("Failed to store key in keychain: {}", e))
                    }
                }
            }
        }
        Err(e) => Err(format!("Keychain access failed: {}", e)),
    }
}

/// Fallback key storage using a salt file + path derivation
fn get_or_create_fallback_key(app_data_dir: &PathBuf) -> Result<[u8; 32], StrongholdError> {
    use rand::RngCore;
    use sha2::{Digest, Sha256};

    let salt_file = app_data_dir.join(".device_salt");

    // Get or create the random salt
    let salt: [u8; 32] = if salt_file.exists() {
        let salt_bytes = fs::read(&salt_file)
            .map_err(|e| StrongholdError::InitFailed(format!("Failed to read salt: {}", e)))?;
        if salt_bytes.len() != 32 {
            return Err(StrongholdError::InitFailed("Invalid salt length".to_string()));
        }
        let mut salt = [0u8; 32];
        salt.copy_from_slice(&salt_bytes);
        salt
    } else {
        // Generate new random salt
        let mut salt = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);
        fs::write(&salt_file, &salt)
            .map_err(|e| StrongholdError::InitFailed(format!("Failed to write salt: {}", e)))?;
        println!("Created new device salt file (keychain fallback mode)");
        salt
    };

    // Derive key from salt + path
    let mut hasher = Sha256::new();
    hasher.update(b"skelenote-device-key-v2:");
    hasher.update(&salt);
    hasher.update(app_data_dir.to_string_lossy().as_bytes());

    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    Ok(key)
}

/// Clear the device key from storage
///
/// Called when clearing all secrets (logout/reset).
/// Clears both keychain entry (if available) and fallback salt file.
fn clear_device_key_from_keychain(app_data_dir: &PathBuf) -> Result<(), StrongholdError> {
    use keyring::Entry;
    use sha2::{Digest, Sha256};

    // Try to clear from keychain (ignore errors - might not be available)
    let path_hash = {
        let mut hasher = Sha256::new();
        hasher.update(app_data_dir.to_string_lossy().as_bytes());
        let result = hasher.finalize();
        hex::encode(&result[..8])
    };
    let account_name = format!("{}-{}", KEYCHAIN_ACCOUNT, path_hash);

    if let Ok(entry) = Entry::new(KEYCHAIN_SERVICE, &account_name) {
        let _ = entry.delete_credential(); // Ignore errors
    }

    // Also clear the fallback salt file
    let salt_file = app_data_dir.join(".device_salt");
    if salt_file.exists() {
        fs::remove_file(&salt_file)
            .map_err(|e| StrongholdError::StoreFailed(format!("Failed to remove salt file: {}", e)))?;
    }

    Ok(())
}
