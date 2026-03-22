// PhoneConnectivityService.kt
// Handles sending commands FROM Wear OS watch TO the Android phone

package com.visiongo.megaradio.wear.data

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.NodeClient
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

class PhoneConnectivityService(private val context: Context) {

    companion object {
        private const val TAG = "PhoneConnectivity"

        // Message paths - commands sent TO the phone
        const val PATH_PLAY = "/megaradio/command/play"
        const val PATH_PAUSE = "/megaradio/command/pause"
        const val PATH_RESUME = "/megaradio/command/resume"
        const val PATH_NEXT = "/megaradio/command/next"
        const val PATH_PREVIOUS = "/megaradio/command/previous"
        const val PATH_TOGGLE_FAVORITE = "/megaradio/command/toggle_favorite"
        const val PATH_REQUEST_DATA = "/megaradio/command/request_data"
    }

    private val messageClient: MessageClient = Wearable.getMessageClient(context)
    private val nodeClient: NodeClient = Wearable.getNodeClient(context)

    /**
     * Check if the phone is connected via Bluetooth.
     * Updates the WearDataRepository singleton.
     */
    suspend fun checkPhoneConnection(): Boolean {
        return try {
            val nodes = nodeClient.connectedNodes.await()
            val connected = nodes.isNotEmpty()
            WearDataRepository.setPhoneConnected(connected)
            Log.d(TAG, "Phone connected: $connected (${nodes.size} nodes)")
            connected
        } catch (e: Exception) {
            Log.e(TAG, "Error checking phone connection: $e")
            WearDataRepository.setPhoneConnected(false)
            false
        }
    }

    /**
     * Send play command to phone with a station ID.
     */
    suspend fun sendPlayCommand(stationId: String): Boolean {
        return sendMessageToPhone(PATH_PLAY, stationId.toByteArray())
    }

    /**
     * Send pause command to phone.
     */
    suspend fun sendPauseCommand(): Boolean {
        return sendMessageToPhone(PATH_PAUSE, null)
    }

    /**
     * Send resume command to phone.
     */
    suspend fun sendResumeCommand(): Boolean {
        return sendMessageToPhone(PATH_RESUME, null)
    }

    /**
     * Send next station command to phone.
     */
    suspend fun sendNextCommand(): Boolean {
        return sendMessageToPhone(PATH_NEXT, null)
    }

    /**
     * Send previous station command to phone.
     */
    suspend fun sendPreviousCommand(): Boolean {
        return sendMessageToPhone(PATH_PREVIOUS, null)
    }

    /**
     * Send toggle favorite command with station ID.
     */
    suspend fun sendToggleFavorite(stationId: String): Boolean {
        return sendMessageToPhone(PATH_TOGGLE_FAVORITE, stationId.toByteArray())
    }

    /**
     * Request all data from phone (stations, favorites, genres, countries).
     */
    suspend fun requestAllData(): Boolean {
        val payload = JSONObject().apply {
            put("type", "all")
        }
        return sendMessageToPhone(PATH_REQUEST_DATA, payload.toString().toByteArray())
    }

    /**
     * Request stations filtered by genre.
     */
    suspend fun requestStationsByGenre(genreId: String): Boolean {
        val payload = JSONObject().apply {
            put("type", "genre_stations")
            put("genreId", genreId)
        }
        return sendMessageToPhone(PATH_REQUEST_DATA, payload.toString().toByteArray())
    }

    /**
     * Request stations filtered by country.
     */
    suspend fun requestStationsByCountry(countryCode: String): Boolean {
        val payload = JSONObject().apply {
            put("type", "country_stations")
            put("countryCode", countryCode)
        }
        return sendMessageToPhone(PATH_REQUEST_DATA, payload.toString().toByteArray())
    }

    /**
     * Internal: sends a message to all connected phone nodes.
     */
    private suspend fun sendMessageToPhone(path: String, data: ByteArray?): Boolean {
        return try {
            val nodes = nodeClient.connectedNodes.await()
            if (nodes.isEmpty()) {
                Log.w(TAG, "No connected phone nodes for message: $path")
                WearDataRepository.setPhoneConnected(false)
                return false
            }

            WearDataRepository.setPhoneConnected(true)
            var success = true
            nodes.forEach { node ->
                try {
                    messageClient.sendMessage(node.id, path, data).await()
                    Log.d(TAG, "Message sent to ${node.displayName}: $path")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send message to ${node.displayName}: $e")
                    success = false
                }
            }
            success
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message ($path): $e")
            false
        }
    }
}
