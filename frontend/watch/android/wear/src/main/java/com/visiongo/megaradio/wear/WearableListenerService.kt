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

                WearDataRepository.applyData(path, dataMap)
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
