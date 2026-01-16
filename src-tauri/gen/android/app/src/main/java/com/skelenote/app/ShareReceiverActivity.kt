package com.skelenote.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Activity that receives share intents from other apps.
 *
 * Workflow:
 * 1. Receives ACTION_SEND intent with text/URL
 * 2. Saves to a JSON file in the app's files directory (accessible by Rust)
 * 3. Launches MainActivity to process the share
 * 4. Finishes immediately (Theme.NoDisplay)
 *
 * Storage format matches iOS PendingShare struct:
 * { "type": "url"|"text", "url": "...", "text": "...", "timestamp": 123456 }
 *
 * File location: {filesDir}/pending_shares.json
 * This file is read by Rust via share_get_pending_android() command.
 */
class ShareReceiverActivity : Activity() {

    companion object {
        const val SHARES_FILENAME = "pending_shares.json"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        handleShareIntent(intent)

        // Launch main app to process the share
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("from_share", true)
        }
        startActivity(mainIntent)

        finish()
    }

    private fun handleShareIntent(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return

        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return

        // Determine if it's a URL or plain text
        val isUrl = sharedText.startsWith("http://") || sharedText.startsWith("https://")

        val shareObject = JSONObject().apply {
            put("type", if (isUrl) "url" else "text")
            if (isUrl) {
                put("url", sharedText)
                // Subject often contains page title
                intent.getStringExtra(Intent.EXTRA_SUBJECT)?.let { put("text", it) }
            } else {
                put("text", sharedText)
            }
            put("timestamp", System.currentTimeMillis().toDouble())
        }

        // Save to file in app's files directory (accessible by Rust)
        val sharesFile = File(filesDir, SHARES_FILENAME)
        val existingJson = if (sharesFile.exists()) {
            try {
                sharesFile.readText()
            } catch (e: Exception) {
                "[]"
            }
        } else {
            "[]"
        }

        val sharesArray = try {
            JSONArray(existingJson)
        } catch (e: Exception) {
            JSONArray()
        }
        sharesArray.put(shareObject)

        try {
            sharesFile.writeText(sharesArray.toString())
        } catch (e: Exception) {
            // Log error but don't crash
            e.printStackTrace()
        }
    }
}
