package com.skelenote.app

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        // Check if launched from share receiver
        // The frontend will check for pending shares via share_get_pending_android()
        val fromShare = intent?.getBooleanExtra("from_share", false) ?: false
        if (fromShare) {
            // App launched from ShareReceiverActivity
            // Frontend will poll for pending shares
        }

        // Deep links are handled automatically by tauri-plugin-deep-link
        // which is configured in AndroidManifest.xml
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)

        // Add JavaScript interface for icon switching
        webView.addJavascriptInterface(IconBridge(this), "AndroidIconBridge")
    }

    /**
     * JavaScript interface for icon switching.
     * Called from frontend via: window.AndroidIconBridge.setIcon("light")
     */
    inner class IconBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun setIcon(iconName: String) {
            activity.runOnUiThread {
                IconSwitcher.setIcon(activity, iconName)
            }
        }

        @JavascriptInterface
        fun getCurrentIcon(): String {
            return IconSwitcher.getCurrentIcon(activity)
        }
    }
}
