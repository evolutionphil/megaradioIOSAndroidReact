package com.megaradio.tv

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import com.megaradio.tv.channels.RecommendationsChannel
import org.json.JSONArray

/**
 * JavaScript-side interface name: `MegaRadioBridge`
 *
 * Web layer can call:
 *
 *     MegaRadioBridge.onContinueListening(JSON.stringify([{id, name, …}]))
 *
 * to ship its current "Continue Listening" stack into the native side. We
 * hand the parsed list straight to the Recommendations Channel publisher so
 * the Android TV / Google TV home screen rail stays in sync with the user's
 * actual play history — no scraping, no polling.
 */
class MegaRadioBridge(private val ctx: Context) {

    @JavascriptInterface
    fun onContinueListening(json: String) {
        try {
            val arr = JSONArray(json)
            val items = (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                RecommendationsChannel.RecItem(
                    id          = o.optString("id"),
                    title       = o.optString("name"),
                    description = o.optString("description").takeIf { it.isNotBlank() },
                    iconUrl     = o.optString("iconUrl"),
                    streamUrl   = o.optString("streamUrl"),
                )
            }.filter { it.id.isNotBlank() && it.title.isNotBlank() }
            RecommendationsChannel.publish(ctx, items)
            Log.d(TAG, "published ${items.size} continue-listening items to home screen")
        } catch (e: Exception) {
            Log.w(TAG, "onContinueListening parse failed: ${e.message}")
        }
    }

    companion object { private const val TAG = "MegaRadioBridge" }
}
