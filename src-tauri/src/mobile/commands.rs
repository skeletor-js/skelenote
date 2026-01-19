//! Tauri commands for mobile-specific functionality
//!
//! These commands handle iOS/Android share extensions and background tasks.

// ============================================================================
// Share Extension Types
// ============================================================================

/// Pending share data from iOS Share Extension or Android Share Intent
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct PendingShare {
    #[serde(rename = "type")]
    share_type: String,
    url: Option<String>,
    text: Option<String>,
    timestamp: f64,
}

// ============================================================================
// iOS Share Extension Commands
// ============================================================================

/// Helper to convert NSString to Rust String
#[cfg(target_os = "ios")]
unsafe fn nsstring_to_string(ns_string: *mut objc::runtime::Object) -> Option<String> {
    use objc::{msg_send, sel, sel_impl};

    if ns_string.is_null() {
        return None;
    }

    let utf8: *const i8 = msg_send![ns_string, UTF8String];
    if utf8.is_null() {
        return None;
    }

    let c_str = std::ffi::CStr::from_ptr(utf8);
    c_str.to_str().ok().map(|s| s.to_string())
}

/// Get pending shares from iOS App Groups UserDefaults
///
/// Returns shares saved by the iOS Share Extension from the App Group
/// storage (group.com.skelenote.app).
#[cfg(target_os = "ios")]
#[tauri::command]
pub async fn share_get_pending_ios() -> Result<Vec<PendingShare>, String> {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        // Get NSUserDefaults with App Group suite name
        let ns_string_class = class!(NSString);
        let suite_name: *mut Object = msg_send![
            ns_string_class,
            stringWithUTF8String: b"group.com.skelenote.app\0".as_ptr()
        ];

        let user_defaults_class = class!(NSUserDefaults);
        let defaults: *mut Object = msg_send![user_defaults_class, alloc];
        let defaults: *mut Object = msg_send![defaults, initWithSuiteName: suite_name];

        if defaults.is_null() {
            return Ok(vec![]);
        }

        // Get pendingShares array
        let key: *mut Object = msg_send![
            ns_string_class,
            stringWithUTF8String: b"pendingShares\0".as_ptr()
        ];
        let array: *mut Object = msg_send![defaults, arrayForKey: key];

        if array.is_null() {
            return Ok(vec![]);
        }

        // Get count and iterate
        let count: usize = msg_send![array, count];
        let mut shares = Vec::with_capacity(count);

        for i in 0..count {
            let dict: *mut Object = msg_send![array, objectAtIndex: i];
            if dict.is_null() {
                continue;
            }

            // Extract "type" field
            let type_key: *mut Object =
                msg_send![ns_string_class, stringWithUTF8String: b"type\0".as_ptr()];
            let type_val: *mut Object = msg_send![dict, objectForKey: type_key];
            let share_type = nsstring_to_string(type_val).unwrap_or_default();

            // Extract "url" field
            let url_key: *mut Object =
                msg_send![ns_string_class, stringWithUTF8String: b"url\0".as_ptr()];
            let url_val: *mut Object = msg_send![dict, objectForKey: url_key];
            let url = nsstring_to_string(url_val);

            // Extract "text" field
            let text_key: *mut Object =
                msg_send![ns_string_class, stringWithUTF8String: b"text\0".as_ptr()];
            let text_val: *mut Object = msg_send![dict, objectForKey: text_key];
            let text = nsstring_to_string(text_val);

            // Extract "timestamp" field
            let ts_key: *mut Object =
                msg_send![ns_string_class, stringWithUTF8String: b"timestamp\0".as_ptr()];
            let ts_val: *mut Object = msg_send![dict, objectForKey: ts_key];
            let timestamp: f64 = if !ts_val.is_null() {
                msg_send![ts_val, doubleValue]
            } else {
                0.0
            };

            shares.push(PendingShare {
                share_type,
                url,
                text,
                timestamp,
            });
        }

        Ok(shares)
    }
}

/// Clear pending shares from iOS App Groups UserDefaults
#[cfg(target_os = "ios")]
#[tauri::command]
pub async fn share_clear_pending_ios() -> Result<(), String> {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let ns_string_class = class!(NSString);
        let suite_name: *mut Object = msg_send![
            ns_string_class,
            stringWithUTF8String: b"group.com.skelenote.app\0".as_ptr()
        ];

        let user_defaults_class = class!(NSUserDefaults);
        let defaults: *mut Object = msg_send![user_defaults_class, alloc];
        let defaults: *mut Object = msg_send![defaults, initWithSuiteName: suite_name];

        if !defaults.is_null() {
            let key: *mut Object = msg_send![
                ns_string_class,
                stringWithUTF8String: b"pendingShares\0".as_ptr()
            ];
            let _: () = msg_send![defaults, removeObjectForKey: key];
            let _: () = msg_send![defaults, synchronize];
        }
    }

    Ok(())
}

// ============================================================================
// Android Share Extension Commands
// ============================================================================

/// Get pending shares from Android file storage
///
/// Returns shares saved by the Android ShareReceiverActivity from
/// the app's files directory (pending_shares.json).
///
/// The ShareReceiverActivity writes shares to a JSON file that we read here,
/// avoiding the complexity of JNI/SharedPreferences access.
#[cfg(target_os = "android")]
#[tauri::command]
pub async fn share_get_pending_android(app: tauri::AppHandle) -> Result<Vec<PendingShare>, String> {
    use tauri::Manager;

    // Get the app's data directory (corresponds to Android's filesDir)
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // ShareReceiverActivity writes to filesDir/pending_shares.json
    // On Android, Tauri's app_data_dir maps to the app's internal storage
    // We need to look in the parent directory where Android's filesDir is
    let shares_file = data_dir
        .parent()
        .unwrap_or(&data_dir)
        .join("files")
        .join("pending_shares.json");

    // If file doesn't exist, no pending shares
    if !shares_file.exists() {
        return Ok(vec![]);
    }

    // Read and parse the file
    let json_str = std::fs::read_to_string(&shares_file)
        .map_err(|e| format!("Failed to read shares file: {}", e))?;

    let shares: Vec<PendingShare> = serde_json::from_str(&json_str).unwrap_or_else(|_| vec![]);

    Ok(shares)
}

/// Clear pending shares from Android file storage
#[cfg(target_os = "android")]
#[tauri::command]
pub async fn share_clear_pending_android(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    // Get the app's data directory
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // ShareReceiverActivity writes to filesDir/pending_shares.json
    let shares_file = data_dir
        .parent()
        .unwrap_or(&data_dir)
        .join("files")
        .join("pending_shares.json");

    // Delete the file if it exists
    if shares_file.exists() {
        std::fs::remove_file(&shares_file)
            .map_err(|e| format!("Failed to delete shares file: {}", e))?;
    }

    Ok(())
}

// ============================================================================
// Background Task Commands (iOS)
// ============================================================================

/// Begin a background task to allow sync to complete when app is backgrounded
///
/// iOS grants ~30 seconds for background execution. Call this when entering
/// background while sync is in progress.
///
/// Returns a task ID that must be passed to end_background_task when done.
#[cfg(target_os = "ios")]
#[tauri::command]
pub async fn begin_background_task() -> Result<i64, String> {
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let app_class = class!(UIApplication);
        let app: *mut objc::runtime::Object = msg_send![app_class, sharedApplication];

        // Note: Passing nil as the expiration handler
        // In production, you'd want to properly create a block for cleanup
        let task_id: isize = msg_send![app, beginBackgroundTaskWithExpirationHandler: std::ptr::null::<objc::runtime::Object>()];

        if task_id == 0 {
            // UIBackgroundTaskInvalid
            Err("Failed to begin background task".to_string())
        } else {
            println!("[BackgroundTask] Started task: {}", task_id);
            Ok(task_id as i64)
        }
    }
}

/// End a background task when sync is complete
///
/// Must be called with the task_id returned from begin_background_task
#[cfg(target_os = "ios")]
#[tauri::command]
pub async fn end_background_task(task_id: i64) -> Result<(), String> {
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let app_class = class!(UIApplication);
        let app: *mut objc::runtime::Object = msg_send![app_class, sharedApplication];

        let _: () = msg_send![app, endBackgroundTask: task_id as isize];
        println!("[BackgroundTask] Ended task: {}", task_id);
    }

    Ok(())
}

// ============================================================================
// Stub Implementations (non-mobile platforms)
// ============================================================================

// Stub implementations for non-iOS platforms
#[cfg(not(target_os = "ios"))]
#[tauri::command]
pub async fn share_get_pending_ios() -> Result<Vec<PendingShare>, String> {
    Ok(vec![])
}

#[cfg(not(target_os = "ios"))]
#[tauri::command]
pub async fn share_clear_pending_ios() -> Result<(), String> {
    Ok(())
}

#[cfg(not(target_os = "ios"))]
#[tauri::command]
pub async fn begin_background_task() -> Result<i64, String> {
    // No-op on non-iOS platforms
    Ok(0)
}

#[cfg(not(target_os = "ios"))]
#[tauri::command]
pub async fn end_background_task(_task_id: i64) -> Result<(), String> {
    // No-op on non-iOS platforms
    Ok(())
}

// Stub implementations for non-Android platforms
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn share_get_pending_android(_app: tauri::AppHandle) -> Result<Vec<PendingShare>, String> {
    Ok(vec![])
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn share_clear_pending_android(_app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}
