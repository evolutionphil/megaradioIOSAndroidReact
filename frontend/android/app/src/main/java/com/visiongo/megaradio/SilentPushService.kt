package com.visiongo.megaradio

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * SilentPushService - Firebase Cloud Messaging Handler for MegaRadio
 * 
 * Handles silent push notifications (data-only messages) from server
 * to trigger background cache updates for Android Auto.
 * 
 * FCM Payload Format (Server):
 * {
 *   "to": "device_token",
 *   "data": {
 *     "action": "cache_refresh",
 *     "country": "Turkey",
 *     "timestamp": "2025-12-15T10:00:00Z"
 *   },
 *   "android": {
 *     "priority": "normal"  // Use "normal" for silent, "high" for urgent
 *   }
 * }
 * 
 * Supported Actions:
 * - cache_refresh: Full cache refresh (popular + genres)
 * - popular_update: Only update popular stations
 * - genres_update: Only update genres
 * - favorites_sync: Sync user favorites
 * - clear_cache: Clear all cached data
 * 
 * Note: Data-only messages (no "notification" field) are handled by
 * onMessageReceived even when app is in background or killed.
 */
class SilentPushService : FirebaseMessagingService() {
    
    companion object {
        private const val TAG = "SilentPushService"
    }
    
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * Called when FCM token is refreshed
     * Send new token to your server
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed: ${token.take(20)}...")
        
        // Store token locally
        getSharedPreferences("megaradio_prefs", MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply()
        
        // TODO: Send token to your backend server
        // sendTokenToServer(token)
    }
    
    /**
     * Called when a message is received
     * This handles both foreground and background (data-only) messages
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "Message received from: ${remoteMessage.from}")
        Log.d(TAG, "Message data: ${remoteMessage.data}")
        
        // Check if this is a data message (silent push)
        if (remoteMessage.data.isNotEmpty()) {
            handleDataMessage(remoteMessage.data)
        }
        
        // Check if there's a notification payload (not silent)
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "Notification: ${notification.title} - ${notification.body}")
            // This would show a notification - but we're focusing on silent push here
        }
    }
    
    /**
     * Handle data-only message (silent push)
     */
    private fun handleDataMessage(data: Map<String, String>) {
        val action = data["action"] ?: "cache_refresh"
        val country = data["country"]
        val timestamp = data["timestamp"]
        
        Log.d(TAG, "Processing action: $action, country: $country")
        
        serviceScope.launch {
            try {
                // Initialize API client with context
                val apiClient = MegaRadioApiClient.getInstance(applicationContext)
                
                when (action) {
                    "cache_refresh" -> {
                        Log.d(TAG, "🔄 Starting full cache refresh...")
                        apiClient.refreshCacheInBackground(country)
                        Log.d(TAG, "✅ Cache refresh completed")
                    }
                    
                    "popular_update" -> {
                        Log.d(TAG, "🔄 Updating popular stations...")
                        apiClient.getPopularStationsCached(country, 100)
                        Log.d(TAG, "✅ Popular stations updated")
                    }
                    
                    "genres_update" -> {
                        Log.d(TAG, "🔄 Updating genres...")
                        apiClient.getGenresCached(country, 50)
                        Log.d(TAG, "✅ Genres updated")
                    }
                    
                    "favorites_sync" -> {
                        Log.d(TAG, "🔄 Syncing favorites...")
                        syncFavorites(apiClient)
                        Log.d(TAG, "✅ Favorites synced")
                    }
                    
                    "clear_cache" -> {
                        Log.d(TAG, "🗑️ Clearing cache...")
                        apiClient.clearCache()
                        Log.d(TAG, "✅ Cache cleared")
                    }
                    
                    else -> {
                        Log.w(TAG, "Unknown action: $action - performing default refresh")
                        apiClient.refreshCacheInBackground(country)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error handling data message: ${e.message}", e)
            }
        }
    }
    
    /**
     * Sync user favorites from server
     */
    private suspend fun syncFavorites(apiClient: MegaRadioApiClient) {
        // Check if user is logged in
        val prefs = getSharedPreferences("megaradio_prefs", MODE_PRIVATE)
        val token = prefs.getString("auth_token", null)
        
        if (token == null) {
            Log.d(TAG, "No auth token - skipping favorites sync")
            return
        }
        
        // TODO: Fetch favorites with auth token
        // This would typically call an API endpoint like:
        // apiClient.getFavorites(token)
        Log.d(TAG, "Favorites sync with auth token")
    }
}

/*
 * FCM PAYLOAD EXAMPLES (Send from your backend)
 * 
 * 1. Full Cache Refresh (Silent):
 * {
 *   "to": "device_fcm_token",
 *   "data": {
 *     "action": "cache_refresh",
 *     "country": "Turkey"
 *   },
 *   "android": {
 *     "priority": "normal"
 *   }
 * }
 * 
 * 2. Popular Stations Update:
 * {
 *   "to": "device_fcm_token",
 *   "data": {
 *     "action": "popular_update",
 *     "country": "Germany"
 *   }
 * }
 * 
 * 3. Favorites Sync:
 * {
 *   "to": "device_fcm_token",
 *   "data": {
 *     "action": "favorites_sync"
 *   }
 * }
 * 
 * 4. Clear Cache:
 * {
 *   "to": "device_fcm_token",
 *   "data": {
 *     "action": "clear_cache"
 *   }
 * }
 * 
 * FCM HTTP v1 API (Server-side):
 * POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT/messages:send
 * Authorization: Bearer YOUR_ACCESS_TOKEN
 * Content-Type: application/json
 * 
 * {
 *   "message": {
 *     "token": "device_fcm_token",
 *     "data": {
 *       "action": "cache_refresh",
 *       "country": "Turkey"
 *     },
 *     "android": {
 *       "priority": "normal"
 *     }
 *   }
 * }
 */
