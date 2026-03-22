// WearDataLayerListenerService.kt
// Phone-side service that receives commands from Wear OS watch
// and sends back data via the Wearable Data Layer API.

package com.megaradio

import android.content.Intent
import android.util.Log
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/**
 * Runs on the PHONE. Listens for messages sent by the Wear OS watch
 * and broadcasts them as local intents so the React Native layer
 * (WearDataLayerModule) can handle them.
 */
class WearDataLayerListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "WearPhoneListener"

        // Action broadcasted to WearDataLayerModule
        const val ACTION_WEAR_COMMAND = "com.megaradio.WEAR_COMMAND"
        const val EXTRA_COMMAND = "command"
        const val EXTRA_DATA = "data"
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        super.onMessageReceived(messageEvent)
        val path = messageEvent.path
        val data = messageEvent.data?.let { String(it) } ?: ""

        Log.d(TAG, "Message received from watch: path=$path, data=$data")

        when (path) {
            "/megaradio/command/play" -> {
                broadcastCommand("play", data) // data = stationId
            }
            "/megaradio/command/pause" -> {
                broadcastCommand("pause", "")
            }
            "/megaradio/command/resume" -> {
                broadcastCommand("resume", "")
            }
            "/megaradio/command/next" -> {
                broadcastCommand("next", "")
            }
            "/megaradio/command/previous" -> {
                broadcastCommand("previous", "")
            }
            "/megaradio/command/toggle_favorite" -> {
                broadcastCommand("toggle_favorite", data) // data = stationId
            }
            "/megaradio/command/request_data" -> {
                broadcastCommand("request_data", data) // data = JSON with type
            }
            else -> {
                Log.w(TAG, "Unknown command path: $path")
            }
        }
    }

    private fun broadcastCommand(command: String, data: String) {
        val intent = Intent(ACTION_WEAR_COMMAND).apply {
            putExtra(EXTRA_COMMAND, command)
            putExtra(EXTRA_DATA, data)
            setPackage(packageName)
        }
        sendBroadcast(intent)
        Log.d(TAG, "Broadcast sent: command=$command")
    }
}
