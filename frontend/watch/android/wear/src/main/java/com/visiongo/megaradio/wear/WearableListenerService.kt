package com.visiongo.megaradio.wear

import android.util.Log
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.visiongo.megaradio.wear.data.WearDataRepository

class MegaRadioWearListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "WearListener"
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        super.onDataChanged(dataEvents)
        Log.d(TAG, "onDataChanged: ${dataEvents.count} events")

        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED) {
                val dataItem = event.dataItem
                val path = dataItem.uri.path ?: return@forEach
                val dataMap = DataMapItem.fromDataItem(dataItem).dataMap

                Log.d(TAG, "Data changed at path: $path")

                when (path) {
                    "/megaradio/stations" -> {
                        val json = dataMap.getString("data") ?: "[]"
                        WearDataRepository.updateStations(json)
                    }
                    "/megaradio/favorites" -> {
                        val json = dataMap.getString("data") ?: "[]"
                        WearDataRepository.updateFavorites(json)
                    }
                    "/megaradio/genres" -> {
                        val json = dataMap.getString("data") ?: "[]"
                        WearDataRepository.updateGenres(json)
                    }
                    "/megaradio/countries" -> {
                        val json = dataMap.getString("data") ?: "[]"
                        WearDataRepository.updateCountries(json)
                    }
                    "/megaradio/now_playing" -> {
                        val stationJson = dataMap.getString("station")
                        val isPlaying = dataMap.getBoolean("isPlaying")
                        val songTitle = dataMap.getString("songTitle") ?: ""
                        val artistName = dataMap.getString("artistName") ?: ""
                        WearDataRepository.updateNowPlaying(stationJson, isPlaying, songTitle, artistName)
                    }
                }
            }
        }
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        super.onMessageReceived(messageEvent)
        val path = messageEvent.path
        Log.d(TAG, "Message received: $path")

        when (path) {
            "/megaradio/playback_state" -> {
                val data = String(messageEvent.data)
                WearDataRepository.updatePlaybackState(data)
            }
        }
    }
}
