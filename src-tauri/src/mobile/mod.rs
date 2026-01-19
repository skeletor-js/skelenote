//! Mobile-specific functionality (iOS/Android)
//!
//! This module contains Tauri commands for mobile-only features like
//! share extensions, background tasks, and platform-specific integrations.

pub mod commands;

pub use commands::{
    begin_background_task, end_background_task, share_clear_pending_android,
    share_clear_pending_ios, share_get_pending_android, share_get_pending_ios,
};
