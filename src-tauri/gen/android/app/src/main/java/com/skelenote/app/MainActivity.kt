package com.skelenote.app

import android.os.Bundle
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
}
