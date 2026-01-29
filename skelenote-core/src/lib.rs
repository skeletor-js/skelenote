//! Skelenote Core - Headless Productivity Backend
//!
//! A headless productivity backend with MCP interface.
//! Users can connect any frontend - TUI is just the default.

pub mod config;
pub mod crypto;
pub mod index;
pub mod mcp;
pub mod notes;
pub mod tasks;
pub mod vault;

pub use config::Config;
pub use vault::Vault;
