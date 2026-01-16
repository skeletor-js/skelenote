//! Haptic feedback module for iOS and Android
//!
//! Provides tactile feedback through native platform APIs:
//! - iOS: UIImpactFeedbackGenerator, UINotificationFeedbackGenerator, UISelectionFeedbackGenerator
//! - Android: VibrationEffect via HapticFeedbackConstants

#[cfg(target_os = "ios")]
use objc::{class, msg_send, sel, sel_impl};

/// Impact feedback with specified intensity
///
/// Styles: "light", "medium", "heavy", "soft", "rigid"
#[tauri::command]
pub async fn haptic_impact(style: String) -> Result<(), String> {
    #[cfg(target_os = "ios")]
    {
        unsafe {
            // Map style string to UIImpactFeedbackStyle enum value
            let style_val: isize = match style.as_str() {
                "light" => 0,  // UIImpactFeedbackStyleLight
                "medium" => 1, // UIImpactFeedbackStyleMedium
                "heavy" => 2,  // UIImpactFeedbackStyleHeavy
                "soft" => 3,   // UIImpactFeedbackStyleSoft (iOS 13+)
                "rigid" => 4,  // UIImpactFeedbackStyleRigid (iOS 13+)
                _ => 1,        // Default to medium
            };

            // Create and initialize UIImpactFeedbackGenerator
            let generator_class = class!(UIImpactFeedbackGenerator);
            let generator: *mut objc::runtime::Object =
                msg_send![generator_class, alloc];
            let generator: *mut objc::runtime::Object =
                msg_send![generator, initWithStyle: style_val];

            // Trigger the haptic feedback
            let _: () = msg_send![generator, impactOccurred];

            // Release the generator
            let _: () = msg_send![generator, release];
        }
    }

    #[cfg(target_os = "android")]
    {
        // Android implementation via Tauri's Android plugin system
        // For now, we use a no-op as Android haptics require JNI access through Tauri
        // A full implementation would use tauri::plugin::PluginApi to access the Android View
        let _ = style;
        // TODO: Implement Android haptics via Tauri plugin system
        // This requires creating an Android-specific Tauri plugin that calls
        // View.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP) etc.
    }

    // Desktop platforms: no-op
    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        let _ = style;
    }

    Ok(())
}

/// Notification feedback for success/warning/error outcomes
///
/// Types: "success", "warning", "error"
#[tauri::command]
pub async fn haptic_notification(notification_type: String) -> Result<(), String> {
    #[cfg(target_os = "ios")]
    {
        unsafe {
            // Map notification type to UINotificationFeedbackType enum value
            let type_val: isize = match notification_type.as_str() {
                "success" => 0, // UINotificationFeedbackTypeSuccess
                "warning" => 1, // UINotificationFeedbackTypeWarning
                "error" => 2,   // UINotificationFeedbackTypeError
                _ => 0,         // Default to success
            };

            // Create UINotificationFeedbackGenerator
            let generator_class = class!(UINotificationFeedbackGenerator);
            let generator: *mut objc::runtime::Object = msg_send![generator_class, new];

            // Trigger the notification feedback
            let _: () = msg_send![generator, notificationOccurred: type_val];

            // Release the generator
            let _: () = msg_send![generator, release];
        }
    }

    #[cfg(target_os = "android")]
    {
        // Android: VibrationEffect with pattern based on type
        let _ = notification_type;
        // TODO: Implement Android notification haptics
    }

    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        let _ = notification_type;
    }

    Ok(())
}

/// Selection feedback for UI selection changes
///
/// Lightest haptic, suitable for continuous feedback during gestures
#[tauri::command]
pub async fn haptic_selection() -> Result<(), String> {
    #[cfg(target_os = "ios")]
    {
        unsafe {
            // Create UISelectionFeedbackGenerator
            let generator_class = class!(UISelectionFeedbackGenerator);
            let generator: *mut objc::runtime::Object = msg_send![generator_class, new];

            // Trigger the selection feedback
            let _: () = msg_send![generator, selectionChanged];

            // Release the generator
            let _: () = msg_send![generator, release];
        }
    }

    #[cfg(target_os = "android")]
    {
        // Android: CLOCK_TICK haptic constant
        // TODO: Implement Android selection haptics
    }

    Ok(())
}
