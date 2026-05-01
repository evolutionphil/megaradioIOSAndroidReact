package com.megaradio.tv.channels

import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.tvprovider.media.tv.Channel
import androidx.tvprovider.media.tv.ChannelLogoUtils
import androidx.tvprovider.media.tv.PreviewProgram
import androidx.tvprovider.media.tv.TvContractCompat
import com.megaradio.tv.R

/**
 * Publishes a MegaRadio "Continue Listening" Recommendations Channel onto the
 * Android TV home screen. Called once from `MainActivity.onCreate()` the first
 * time the app starts, and again each time the JS layer posts a
 * `CONTINUE_LISTENING_CHANGED` message into the `MegaRadioBridge` interface.
 *
 * Data comes from the WebView via the JS bridge — no duplicated persistence.
 */
object RecommendationsChannel {

    data class RecItem(
        val id: String,
        val title: String,
        val description: String?,
        val iconUrl: String,
        val streamUrl: String,
    )

    fun publish(context: Context, stations: List<RecItem>) {
        val channelId = ensureChannel(context)
        // Wipe old rows
        context.contentResolver.delete(
            TvContractCompat.PreviewPrograms.CONTENT_URI,
            "${TvContractCompat.PreviewPrograms.COLUMN_CHANNEL_ID}=?",
            arrayOf(channelId.toString()),
        )
        stations.take(10).forEach { s ->
            val program = PreviewProgram.Builder()
                .setChannelId(channelId)
                .setType(TvContractCompat.PreviewPrograms.TYPE_STATION)
                .setTitle(s.title)
                .setDescription(s.description ?: "")
                .setPosterArtUri(Uri.parse(s.iconUrl))
                .setPosterArtAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_1_1)
                .setIntent(Intent(Intent.ACTION_VIEW, Uri.parse("megaradio://play?station=${s.id}")))
                .setInternalProviderId(s.id)
                .build()
            context.contentResolver.insert(
                TvContractCompat.PreviewPrograms.CONTENT_URI,
                program.toContentValues(),
            )
        }
    }

    private fun ensureChannel(context: Context): Long {
        val existing = context.contentResolver.query(
            TvContractCompat.Channels.CONTENT_URI,
            arrayOf(TvContractCompat.Channels._ID, TvContractCompat.Channels.COLUMN_INTERNAL_PROVIDER_ID),
            null, null, null,
        )
        existing?.use {
            val idxId = it.getColumnIndex(TvContractCompat.Channels._ID)
            val idxProv = it.getColumnIndex(TvContractCompat.Channels.COLUMN_INTERNAL_PROVIDER_ID)
            while (it.moveToNext()) {
                if (it.getString(idxProv) == "continue_listening_v1") return it.getLong(idxId)
            }
        }
        val channel = Channel.Builder()
            .setType(TvContractCompat.Channels.TYPE_PREVIEW)
            .setDisplayName("Continue Listening")
            .setAppLinkIntentUri(Uri.parse("megaradio://home"))
            .setInternalProviderId("continue_listening_v1")
            .build()
        val uri = context.contentResolver.insert(TvContractCompat.Channels.CONTENT_URI, channel.toContentValues())
            ?: error("Failed to create channel")
        val channelId = ContentUris.parseId(uri)
        ChannelLogoUtils.storeChannelLogo(context, channelId, android.graphics.BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
        TvContractCompat.requestChannelBrowsable(context, channelId)
        return channelId
    }
}
