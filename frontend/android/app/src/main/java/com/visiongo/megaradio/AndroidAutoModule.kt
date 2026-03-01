package com.visiongo.megaradio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native Module to bridge Android Auto events to React Native
 * Listens for broadcasts from MegaRadioAutoService and emits events to JS
 */
class AndroidAutoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "AndroidAutoModule"
        private const val MODULE_NAME = "AndroidAutoModule"
        
        // Broadcast actions
        private const val ACTION_PLAY_STATION = "com.visiongo.megaradio.PLAY_STATION"
        private const val ACTION_PLAYBACK_COMMAND = "com.visiongo.megaradio.PLAYBACK_COMMAND"
        
        // Event names for JS
        private const val EVENT_PLAY_STATION = "AndroidAutoPlayStation"
        private const val EVENT_PLAYBACK_COMMAND = "AndroidAutoPlaybackCommand"
    }
    
    private var isReceiverRegistered = false
    
    private val broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent ?: return
            
            Log.d(TAG, "Received broadcast: ${intent.action}")
            
            when (intent.action) {
                ACTION_PLAY_STATION -> {
                    val params = Arguments.createMap().apply {
                        putString("stationId", intent.getStringExtra("stationId") ?: "")
                        putString("stationName", intent.getStringExtra("stationName") ?: "")
                        putString("streamUrl", intent.getStringExtra("streamUrl") ?: "")
                        putString("logoUrl", intent.getStringExtra("logoUrl") ?: "")
                        putString("country", intent.getStringExtra("country") ?: "")
                        putString("genre", intent.getStringExtra("genre") ?: "")
                    }
                    
                    sendEvent(EVENT_PLAY_STATION, params)
                }
                
                ACTION_PLAYBACK_COMMAND -> {
                    val params = Arguments.createMap().apply {
                        putString("command", intent.getStringExtra("command") ?: "")
                    }
                    
                    sendEvent(EVENT_PLAYBACK_COMMAND, params)
                }
            }
        }
    }
    
    override fun getName(): String = MODULE_NAME
    
    override fun initialize() {
        super.initialize()
        registerReceiver()
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        unregisterReceiver()
    }
    
    private fun registerReceiver() {
        if (isReceiverRegistered) return
        
        try {
            val filter = IntentFilter().apply {
                addAction(ACTION_PLAY_STATION)
                addAction(ACTION_PLAYBACK_COMMAND)
            }
            
            reactApplicationContext.registerReceiver(broadcastReceiver, filter)
            isReceiverRegistered = true
            Log.d(TAG, "Broadcast receiver registered")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register broadcast receiver: ${e.message}", e)
        }
    }
    
    private fun unregisterReceiver() {
        if (!isReceiverRegistered) return
        
        try {
            reactApplicationContext.unregisterReceiver(broadcastReceiver)
            isReceiverRegistered = false
            Log.d(TAG, "Broadcast receiver unregistered")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister broadcast receiver: ${e.message}", e)
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
            Log.d(TAG, "Sent event: $eventName")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event $eventName: ${e.message}", e)
        }
    }
    
    /**
     * Set selected country for Android Auto filtering
     * Called from JS when user changes country
     */
    @ReactMethod
    fun setSelectedCountry(country: String?) {
        Log.d(TAG, "setSelectedCountry: $country")
        
        // Send broadcast to Android Auto service
        val intent = Intent("com.visiongo.megaradio.SET_COUNTRY").apply {
            putExtra("country", country)
        }
        reactApplicationContext.sendBroadcast(intent)
    }
    
    /**
     * Check if Android Auto is connected
     */
    @ReactMethod
    fun isAndroidAutoConnected(promise: Promise) {
        // This is a simplified check - in production you'd check the actual connection
        promise.resolve(true)
    }
    
    /**
     * Required for NativeEventEmitter
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep track of listeners if needed
    }
    
    @ReactMethod
    fun removeListeners(count: Int) {
        // Remove listeners if needed
    }
}
