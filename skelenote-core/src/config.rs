//! Configuration management

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Skelenote configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Vault root path
    #[serde(skip)]
    pub vault_path: PathBuf,

    /// Daily notes folder name
    #[serde(default = "default_daily_folder")]
    pub daily_folder: String,

    /// Inbox folder name
    #[serde(default = "default_inbox_folder")]
    pub inbox_folder: String,

    /// Archive folder name
    #[serde(default = "default_archive_folder")]
    pub archive_folder: String,

    /// Default editor command
    #[serde(default = "default_editor")]
    pub editor: String,

    /// Embedding model configuration
    #[serde(default)]
    pub embeddings: EmbeddingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingConfig {
    /// Use local model (default) or cloud API
    #[serde(default = "default_local")]
    pub local: bool,

    /// Local model name (for Ollama)
    #[serde(default = "default_local_model")]
    pub local_model: String,

    /// Cloud API endpoint (optional)
    pub cloud_endpoint: Option<String>,

    /// Cloud API key (optional)
    pub cloud_api_key: Option<String>,
}

impl Default for EmbeddingConfig {
    fn default() -> Self {
        Self {
            local: true,
            local_model: "nomic-embed-text".to_string(),
            cloud_endpoint: None,
            cloud_api_key: None,
        }
    }
}

fn default_daily_folder() -> String {
    "daily".to_string()
}

fn default_inbox_folder() -> String {
    "inbox".to_string()
}

fn default_archive_folder() -> String {
    "archive".to_string()
}

fn default_editor() -> String {
    std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string())
}

fn default_local() -> bool {
    true
}

fn default_local_model() -> String {
    "nomic-embed-text".to_string()
}

impl Config {
    /// Load config from vault, or create default
    pub fn load_or_create(vault_path: &Path) -> anyhow::Result<Self> {
        let config_path = vault_path.join(".skelenote").join("config.toml");

        let mut config = if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            toml::from_str(&content)?
        } else {
            Self::default()
        };

        config.vault_path = vault_path.to_path_buf();
        Ok(config)
    }

    /// Save config to vault
    pub fn save(&self) -> anyhow::Result<()> {
        let config_dir = self.vault_path.join(".skelenote");
        std::fs::create_dir_all(&config_dir)?;

        let config_path = config_dir.join("config.toml");
        let content = toml::to_string_pretty(self)?;
        std::fs::write(config_path, content)?;
        Ok(())
    }

    /// Get the daily notes folder path
    pub fn daily_path(&self) -> PathBuf {
        self.vault_path.join(&self.daily_folder)
    }

    /// Get the inbox folder path
    pub fn inbox_path(&self) -> PathBuf {
        self.vault_path.join(&self.inbox_folder)
    }

    /// Get the archive folder path
    pub fn archive_path(&self) -> PathBuf {
        self.vault_path.join(&self.archive_folder)
    }

    /// Get the hidden .skelenote folder path
    pub fn skelenote_path(&self) -> PathBuf {
        self.vault_path.join(".skelenote")
    }

    /// Get the index database path
    pub fn index_path(&self) -> PathBuf {
        self.skelenote_path().join("index.db")
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            vault_path: PathBuf::new(),
            daily_folder: default_daily_folder(),
            inbox_folder: default_inbox_folder(),
            archive_folder: default_archive_folder(),
            editor: default_editor(),
            embeddings: EmbeddingConfig::default(),
        }
    }
}
