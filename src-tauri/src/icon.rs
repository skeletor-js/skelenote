//! App Icon Switching Module
//!
//! Provides runtime app icon switching across platforms:
//! - macOS: NSApplication.setApplicationIconImage (dock icon, session only)
//! - iOS: UIApplication.setAlternateIconName (persistent, requires Info.plist config)
//! - Android: PackageManager activity alias switching (persistent)
//! - Windows/Linux: Not supported (no-op)
//!
//! Note: The macOS dock icon size issue is fixed via tauri.macos.conf.json which
//! uses icons with proper Apple HIG padding (icons/macos/). Runtime switching
//! uses the dark/light icons which also work correctly.

use serde::{Deserialize, Serialize};
use tauri::Manager;

/// Available icon variant info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconVariant {
    /// Unique identifier (e.g., "dark", "light")
    pub id: String,
    /// Display name
    pub name: String,
}

/// Get list of available icon variants
#[tauri::command]
pub fn get_available_icons() -> Vec<IconVariant> {
    vec![
        IconVariant {
            id: "dark".to_string(),
            name: "Dark".to_string(),
        },
        IconVariant {
            id: "light".to_string(),
            name: "Light".to_string(),
        },
    ]
}

/// Set the app icon
///
/// Changes the app icon to the specified variant.
/// Platform behavior:
/// - macOS: Changes dock icon (session only, reverts on restart)
/// - iOS: Changes home screen icon (persistent, shows system prompt)
/// - Android: Changes launcher icon (persistent)
/// - Windows/Linux: No-op (not supported)
#[tauri::command]
pub async fn set_app_icon(app: tauri::AppHandle, icon_name: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        set_macos_dock_icon(&app, &icon_name)?;
    }

    #[cfg(target_os = "ios")]
    {
        set_ios_alternate_icon(&icon_name)?;
    }

    #[cfg(target_os = "android")]
    {
        set_android_launcher_icon(&app, &icon_name)?;
    }

    // Windows and Linux: no-op
    #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
    {
        let _ = app;
        let _ = icon_name;
    }

    Ok(())
}

/// Check if icon switching is supported on the current platform
#[tauri::command]
pub fn is_icon_switching_supported() -> bool {
    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
    {
        true
    }
    #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
    {
        false
    }
}

// ============================================================================
// macOS Implementation
// ============================================================================

#[cfg(target_os = "macos")]
fn set_macos_dock_icon(app: &tauri::AppHandle, icon_name: &str) -> Result<(), String> {
    use objc::{class, msg_send, sel, sel_impl};
    use objc::runtime::Object;
    use std::ffi::CString;

    // Determine the icon file path based on icon_name
    let icon_subdir = match icon_name {
        "light" => "light",
        "dark" | _ => "dark",
    };

    // Get the resource directory
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    println!("[Icon] Resource dir: {}", resource_dir.display());

    // Use the 128x128@2x PNG (256x256 pixels) for crisp Retina display
    // This gives us precise control over the icon size
    let icon_path = resource_dir
        .join("icons")
        .join(icon_subdir)
        .join("128x128@2x.png");

    println!("[Icon] Looking for icon at: {}", icon_path.display());

    if !icon_path.exists() {
        // Fallback to icns if PNG not found
        let icns_path = resource_dir.join("icons").join(icon_subdir).join("icon.icns");
        if icns_path.exists() {
            println!("[Icon] PNG not found, falling back to icns");
            return set_macos_dock_icon_from_path(&icns_path);
        }
        return Err(format!("Icon file not found: {}", icon_path.display()));
    }

    println!("[Icon] Found icon file, loading...");
    set_macos_dock_icon_from_path(&icon_path)
}

#[cfg(target_os = "macos")]
fn set_macos_dock_icon_from_path(icon_path: &std::path::Path) -> Result<(), String> {
    use objc::{class, msg_send, sel, sel_impl};
    use objc::runtime::Object;
    use std::ffi::CString;

    let icon_path_str = icon_path.to_string_lossy().to_string();
    let c_path = CString::new(icon_path_str.clone())
        .map_err(|_| "Invalid icon path")?;

    unsafe {
        // Get NSApplication shared instance
        let ns_app_class = class!(NSApplication);
        let ns_app: *mut Object = msg_send![ns_app_class, sharedApplication];

        if ns_app.is_null() {
            return Err("Failed to get NSApplication".to_string());
        }

        // Create NSString for the path
        let ns_string_class = class!(NSString);
        let path_nsstring: *mut Object = msg_send![
            ns_string_class,
            stringWithUTF8String: c_path.as_ptr()
        ];

        if path_nsstring.is_null() {
            return Err("Failed to create NSString for path".to_string());
        }

        // Load the image from file
        let ns_image_class = class!(NSImage);
        let image: *mut Object = msg_send![ns_image_class, alloc];
        let image: *mut Object = msg_send![image, initWithContentsOfFile: path_nsstring];

        if image.is_null() {
            return Err(format!("Failed to load image from: {}", icon_path_str));
        }

        // Set the application icon
        let _: () = msg_send![ns_app, setApplicationIconImage: image];

        // Release the image
        let _: () = msg_send![image, release];

        println!("[Icon] macOS dock icon set from: {}", icon_path_str);
    }

    Ok(())
}

// ============================================================================
// iOS Implementation
// ============================================================================

#[cfg(target_os = "ios")]
fn set_ios_alternate_icon(icon_name: &str) -> Result<(), String> {
    use objc::{class, msg_send, sel, sel_impl};
    use objc::runtime::Object;
    use std::ffi::CString;

    // Map icon name to iOS alternate icon name
    // "dark" = primary icon (nil), "light" = "AppIcon-Light"
    let alternate_icon_name: Option<&str> = match icon_name {
        "dark" => None, // Primary icon
        "light" => Some("AppIcon-Light"),
        _ => None,
    };

    unsafe {
        // Get UIApplication shared instance
        let ui_app_class = class!(UIApplication);
        let app: *mut Object = msg_send![ui_app_class, sharedApplication];

        if app.is_null() {
            return Err("Failed to get UIApplication".to_string());
        }

        // Check if alternate icons are supported
        let supports_alternate: bool = msg_send![app, supportsAlternateIcons];
        if !supports_alternate {
            return Err("Alternate icons not supported on this device".to_string());
        }

        // Create NSString for the icon name (or nil for primary)
        let icon_nsstring: *mut Object = if let Some(name) = alternate_icon_name {
            let c_name = CString::new(name).map_err(|_| "Invalid icon name")?;
            let ns_string_class = class!(NSString);
            msg_send![ns_string_class, stringWithUTF8String: c_name.as_ptr()]
        } else {
            std::ptr::null_mut()
        };

        // Call setAlternateIconName:completionHandler:
        // Note: We pass nil for the completion handler for simplicity
        // In production, you might want to handle errors via the completion handler
        let _: () = msg_send![
            app,
            setAlternateIconName: icon_nsstring
            completionHandler: std::ptr::null::<Object>()
        ];

        println!("[Icon] iOS alternate icon set to: {}", icon_name);
    }

    Ok(())
}

// ============================================================================
// Android Implementation
// ============================================================================

#[cfg(target_os = "android")]
fn set_android_launcher_icon(_app: &tauri::AppHandle, icon_name: &str) -> Result<(), String> {
    // Android icon switching uses a JavaScript bridge approach:
    // 1. This Rust command acknowledges the request
    // 2. The frontend stores the preference in localStorage
    // 3. The frontend calls window.__TAURI_INVOKE__('plugin:icon|set_icon', {iconName})
    //    which triggers the WebView to notify the native side
    // 4. MainActivity has a WebViewClient that handles the icon switch via IconSwitcher
    //
    // The actual icon switching happens in IconSwitcher.kt called from MainActivity.
    // See: src-tauri/gen/android/app/src/main/java/com/skelenote/app/IconSwitcher.kt

    println!("[Icon] Android icon preference acknowledged: {}", icon_name);

    // The preference is already stored in localStorage by the frontend.
    // MainActivity will read it and apply the icon on next app restart,
    // or we can trigger an immediate switch via the WebView bridge.

    Ok(())
}
