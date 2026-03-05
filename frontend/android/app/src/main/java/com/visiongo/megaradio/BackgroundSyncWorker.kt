package com.visiongo.megaradio

import android.content.Context
import android.util.Log
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * BackgroundSyncWorker - Android Background Sync for MegaRadio
 * 
 * Uses WorkManager to periodically sync cache data in background.
 * This ensures Android Auto has fresh data even when app is killed.
 * 
 * Features:
 * - Periodic sync every 15 minutes (when conditions are met)
 * - Requires network connectivity
 * - Battery efficient (uses JobScheduler under the hood)
 * - Survives app termination
 */
class BackgroundSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    companion object {
        private const val TAG = "BackgroundSyncWorker"
        private const val WORK_NAME = "megaradio_background_sync"
        
        /**
         * Schedule periodic background sync
         * Call this from Application.onCreate() or MainActivity
         */
        fun schedulePeriodicSync(context: Context) {
            Log.d(TAG, "Scheduling periodic background sync...")
            
            // Define constraints
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
            
            // Create periodic work request (minimum 15 minutes)
            val syncRequest = PeriodicWorkRequestBuilder<BackgroundSyncWorker>(
                15, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES // Flex interval for battery optimization
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    1, TimeUnit.MINUTES
                )
                .addTag(WORK_NAME)
                .build()
            
            // Enqueue with KEEP policy (don't replace existing)
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    syncRequest
                )
            
            Log.d(TAG, "✅ Periodic sync scheduled (every 15 min)")
        }
        
        /**
         * Trigger immediate one-time sync
         * Useful when user manually refreshes or on app launch
         */
        fun triggerImmediateSync(context: Context) {
            Log.d(TAG, "Triggering immediate sync...")
            
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val immediateRequest = OneTimeWorkRequestBuilder<BackgroundSyncWorker>()
                .setConstraints(constraints)
                .build()
            
            WorkManager.getInstance(context)
                .enqueue(immediateRequest)
        }
        
        /**
         * Cancel all background sync tasks
         */
        fun cancelSync(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Background sync cancelled")
        }
        
        /**
         * Get sync status
         */
        fun getSyncStatus(context: Context): WorkInfo.State? {
            return try {
                val workInfos = WorkManager.getInstance(context)
                    .getWorkInfosForUniqueWork(WORK_NAME)
                    .get()
                workInfos.firstOrNull()?.state
            } catch (e: Exception) {
                Log.e(TAG, "Error getting sync status: ${e.message}")
                null
            }
        }
    }
    
    override suspend fun doWork(): Result {
        Log.d(TAG, "🔄 Background sync starting...")
        
        return withContext(Dispatchers.IO) {
            try {
                // Initialize API client with context
                val apiClient = MegaRadioApiClient.getInstance(applicationContext)
                
                // Refresh cache in background
                apiClient.refreshCacheInBackground(null) // Global country
                
                Log.d(TAG, "✅ Background sync completed successfully")
                Result.success()
            } catch (e: Exception) {
                Log.e(TAG, "❌ Background sync failed: ${e.message}", e)
                
                // Retry on failure (exponential backoff)
                if (runAttemptCount < 3) {
                    Result.retry()
                } else {
                    Result.failure()
                }
            }
        }
    }
}

/**
 * Foreground sync worker for more urgent updates
 * Shows notification while syncing
 */
class ForegroundSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    companion object {
        private const val TAG = "ForegroundSyncWorker"
        
        fun triggerForegroundSync(context: Context) {
            val request = OneTimeWorkRequestBuilder<ForegroundSyncWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            
            WorkManager.getInstance(context).enqueue(request)
        }
    }
    
    override suspend fun doWork(): Result {
        Log.d(TAG, "Foreground sync starting...")
        
        return withContext(Dispatchers.IO) {
            try {
                val apiClient = MegaRadioApiClient.getInstance(applicationContext)
                apiClient.refreshCacheInBackground(null)
                
                Log.d(TAG, "Foreground sync completed")
                Result.success()
            } catch (e: Exception) {
                Log.e(TAG, "Foreground sync failed: ${e.message}")
                Result.failure()
            }
        }
    }
}
