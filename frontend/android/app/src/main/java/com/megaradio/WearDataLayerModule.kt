// WearDataLayerModule.kt
// React Native native module for Wear OS Data Layer communication.
// Exposes methods to send data TO the watch and receives commands FROM the watch.

package com.megaradio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.NodeClient

class WearDataLayerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        private const val TAG = "WearDataLayer"
        const val MODULE_NAME = "WearDataLayer"
    }

    private var dataClient: DataClient? = null
    private var nodeClient: NodeClient? = null
    private var receiver: BroadcastReceiver? = null

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    override fun initialize() {
        super.initialize()
        try {
            dataClient = Wearable.getDataClient(reactApplicationContext)
            nodeClient = Wearable.getNodeClient(reactApplicationContext)
            registerReceiver()
            Log.d(TAG, "WearDataLayerModule initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize: $e")
        }
    }

    /**
     * Register a BroadcastReceiver to listen for commands from WearDataLayerListenerService.
     * Forwards them to React Native as JS events.
     */
    private fun registerReceiver() {
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val command = intent?.getStringExtra(WearDataLayerListenerService.EXTRA_COMMAND) ?: return
                val data = intent.getStringExtra(WearDataLayerListenerService.EXTRA_DATA) ?: ""

                Log.d(TAG, "Received wear command: $command, data: $data")

                val params = Arguments.createMap().apply {
                    putString("command", command)
                    putString("data", data)
                }

                sendEvent("onWearCommand", params)
            }
        }

        val filter = IntentFilter(WearDataLayerListenerService.ACTION_WEAR_COMMAND)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactApplicationContext.registerReceiver(receiver, filter)
        }
    }

    /**
     * Send a JS event to React Native.
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event: $e")
        }
    }

    // ==============================
    // Methods called FROM React Native
    // ==============================

    /**
     * Check if a Wear OS device is connected.
     */
    @ReactMethod
    fun isWearConnected(promise: Promise) {
        try {
            nodeClient?.connectedNodes?.addOnSuccessListener { nodes ->
                promise.resolve(nodes.isNotEmpty())
            }?.addOnFailureListener { e ->
                Log.e(TAG, "isWearConnected failed: $e")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Send now-playing data to the watch via DataClient.
     */
    @ReactMethod
    fun updateNowPlaying(stationJson: String, isPlaying: Boolean, songTitle: String, artistName: String) {
        try {
            val request = PutDataMapRequest.create("/megaradio/now_playing").apply {
                dataMap.putString("station", stationJson)
                dataMap.putBoolean("isPlaying", isPlaying)
                dataMap.putString("songTitle", songTitle)
                dataMap.putString("artistName", artistName)
                dataMap.putLong("timestamp", System.currentTimeMillis())
            }
            val putDataReq = request.asPutDataRequest().setUrgent()
            dataClient?.putDataItem(putDataReq)
            Log.d(TAG, "Now playing sent to watch")
        } catch (e: Exception) {
            Log.e(TAG, "updateNowPlaying failed: $e")
        }
    }

    /**
     * Send favorites list to the watch.
     */
    @ReactMethod
    fun updateFavorites(favoritesJson: String) {
        sendDataToWatch("/megaradio/favorites", favoritesJson)
    }

    /**
     * Send stations list to the watch.
     */
    @ReactMethod
    fun updateStations(stationsJson: String) {
        sendDataToWatch("/megaradio/stations", stationsJson)
    }

    /**
     * Send genres list to the watch.
     */
    @ReactMethod
    fun updateGenres(genresJson: String) {
        sendDataToWatch("/megaradio/genres", genresJson)
    }

    /**
     * Send countries list to the watch.
     */
    @ReactMethod
    fun updateCountries(countriesJson: String) {
        sendDataToWatch("/megaradio/countries", countriesJson)
    }

    /**
     * Send playback state to watch.
     */
    @ReactMethod
    fun updatePlaybackState(isPlaying: Boolean, songTitle: String, artistName: String) {
        try {
            val nodes = nodeClient?.connectedNodes
            nodes?.addOnSuccessListener { connectedNodes ->
                val messageClient = Wearable.getMessageClient(reactApplicationContext)
                val data = """{"isPlaying":$isPlaying,"songTitle":"$songTitle","artistName":"$artistName"}"""
                connectedNodes.forEach { node ->
                    messageClient.sendMessage(node.id, "/megaradio/playback_state", data.toByteArray())
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "updatePlaybackState failed: $e")
        }
    }

    /**
     * Internal: Generic data sender via DataClient.
     */
    private fun sendDataToWatch(path: String, jsonData: String) {
        try {
            val request = PutDataMapRequest.create(path).apply {
                dataMap.putString("data", jsonData)
                dataMap.putLong("timestamp", System.currentTimeMillis())
            }
            val putDataReq = request.asPutDataRequest().setUrgent()
            dataClient?.putDataItem(putDataReq)
            Log.d(TAG, "Data sent to watch at $path (${jsonData.length} chars)")
        } catch (e: Exception) {
            Log.e(TAG, "sendDataToWatch failed ($path): $e")
        }
    }

    // ==============================
    // Lifecycle
    // ==============================

    override fun onHostResume() {}
    override fun onHostPause() {}

    override fun onHostDestroy() {
        try {
            receiver?.let {
                reactApplicationContext.unregisterReceiver(it)
            }
            receiver = null
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver: $e")
        }
    }

    override fun onCatalystInstanceDestroy() {
        onHostDestroy()
        super.onCatalystInstanceDestroy()
    }
}
