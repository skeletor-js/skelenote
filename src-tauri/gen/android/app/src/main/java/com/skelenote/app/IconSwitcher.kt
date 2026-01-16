package com.skelenote.app

import android.app.Activity
import android.content.ComponentName
import android.content.pm.PackageManager

/**
 * Native icon switching helper for Android.
 *
 * Uses activity-alias components defined in AndroidManifest.xml to switch
 * the launcher icon at runtime. Each icon variant has a corresponding alias.
 *
 * Available aliases:
 * - .IconDark (default, enabled)
 * - .IconLight (alternate, disabled by default)
 */
object IconSwitcher {

    private val ICON_ALIASES = listOf("IconDark", "IconLight")

    /**
     * Switch the launcher icon to the specified variant.
     *
     * @param activity The Android activity for accessing PackageManager
     * @param iconName One of: "dark", "light"
     */
    @JvmStatic
    fun setIcon(activity: Activity, iconName: String) {
        val pm = activity.packageManager
        val pkg = activity.packageName

        // Map icon name to alias
        val targetAlias = when (iconName.lowercase()) {
            "light" -> "IconLight"
            else -> "IconDark"
        }

        // Disable all aliases except the target
        ICON_ALIASES.forEach { alias ->
            val componentName = ComponentName(pkg, "$pkg.$alias")
            val newState = if (alias == targetAlias) {
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            } else {
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED
            }

            try {
                pm.setComponentEnabledSetting(
                    componentName,
                    newState,
                    PackageManager.DONT_KILL_APP
                )
            } catch (e: Exception) {
                android.util.Log.e("IconSwitcher", "Failed to set component state for $alias: ${e.message}")
            }
        }

        android.util.Log.i("IconSwitcher", "Launcher icon switched to: $iconName")
    }

    /**
     * Get the currently active icon variant.
     *
     * @param activity The Android activity for accessing PackageManager
     * @return The current icon name ("dark" or "light")
     */
    @JvmStatic
    fun getCurrentIcon(activity: Activity): String {
        val pm = activity.packageManager
        val pkg = activity.packageName

        // Check which alias is enabled
        for (alias in ICON_ALIASES) {
            val componentName = ComponentName(pkg, "$pkg.$alias")
            val state = pm.getComponentEnabledSetting(componentName)

            if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
                (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && alias == "IconDark")) {
                return when (alias) {
                    "IconLight" -> "light"
                    else -> "dark"
                }
            }
        }

        return "dark" // Default
    }
}
