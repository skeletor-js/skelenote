package com.skelenote.app

import android.app.Activity
import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View

/**
 * Native haptic feedback helper for Android.
 *
 * Provides static methods that can be called from Rust via JNI.
 * Maps iOS-style haptic types to Android HapticFeedbackConstants.
 *
 * Note: This is a utility class, not a Tauri plugin. It's invoked
 * directly from Rust using JNI to access the root view for haptics.
 */
object HapticsHelper {

    /**
     * Trigger impact haptic feedback.
     *
     * @param activity The Android activity for accessing the root view
     * @param style One of: "light", "medium", "heavy", "soft", "rigid"
     */
    @JvmStatic
    fun impact(activity: Activity, style: String) {
        val rootView = activity.window.decorView.rootView
        val constant = when (style) {
            "light" -> HapticFeedbackConstants.VIRTUAL_KEY
            "medium" -> HapticFeedbackConstants.VIRTUAL_KEY
            "heavy" -> HapticFeedbackConstants.LONG_PRESS
            "soft" -> HapticFeedbackConstants.KEYBOARD_TAP
            "rigid" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                HapticFeedbackConstants.CONFIRM
            } else {
                HapticFeedbackConstants.VIRTUAL_KEY
            }
            else -> HapticFeedbackConstants.VIRTUAL_KEY
        }

        activity.runOnUiThread {
            rootView.performHapticFeedback(
                constant,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            )
        }
    }

    /**
     * Trigger notification haptic feedback.
     *
     * @param activity The Android activity for accessing the root view
     * @param notificationType One of: "success", "warning", "error"
     */
    @JvmStatic
    fun notification(activity: Activity, notificationType: String) {
        val rootView = activity.window.decorView.rootView
        val constant = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            when (notificationType) {
                "success" -> HapticFeedbackConstants.CONFIRM
                "warning" -> HapticFeedbackConstants.REJECT
                "error" -> HapticFeedbackConstants.REJECT
                else -> HapticFeedbackConstants.CONFIRM
            }
        } else {
            // Pre-Android 11 fallback
            when (notificationType) {
                "success" -> HapticFeedbackConstants.VIRTUAL_KEY
                "warning" -> HapticFeedbackConstants.LONG_PRESS
                "error" -> HapticFeedbackConstants.LONG_PRESS
                else -> HapticFeedbackConstants.VIRTUAL_KEY
            }
        }

        activity.runOnUiThread {
            rootView.performHapticFeedback(
                constant,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            )
        }
    }

    /**
     * Trigger selection haptic feedback.
     *
     * Lightest haptic, suitable for continuous feedback during gestures.
     *
     * @param activity The Android activity for accessing the root view
     */
    @JvmStatic
    fun selection(activity: Activity) {
        val rootView = activity.window.decorView.rootView

        activity.runOnUiThread {
            rootView.performHapticFeedback(
                HapticFeedbackConstants.CLOCK_TICK,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            )
        }
    }
}
