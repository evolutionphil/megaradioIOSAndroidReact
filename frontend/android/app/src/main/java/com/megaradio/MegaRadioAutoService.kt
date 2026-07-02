package com.megaradio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.media.MediaBrowserServiceCompat
import android.net.Uri
import org.json.JSONArray

class MegaRadioAutoService : MediaBrowserServiceCompat() {

    companion object {
        private const val TAG = "MegaRadioAuto"

        const val MEDIA_ROOT_ID = "megaradio_root"
        const val MEDIA_FAVORITES = "megaradio_favorites"
        const val MEDIA_RECENT = "megaradio_recent"
        const val MEDIA_POPULAR = "megaradio_popular"
        const val MEDIA_GENRES = "megaradio_genres"

        const val GENRE_POP = "genre_pop"
        const val GENRE_ROCK = "genre_rock"
        const val GENRE_JAZZ = "genre_jazz"
        const val GENRE_CLASSICAL = "genre_classical"
        const val GENRE_ELECTRONIC = "genre_electronic"
        const val GENRE_HIPHOP = "genre_hiphop"
        const val GENRE_TURKISH = "genre_turkish"
        const val GENRE_NEWS = "genre_news"

        const val ASYNC_STORAGE_FAVORITES_KEY = "megaradio_android_auto_favorites"

        // Content style hint keys (from MediaConstants)
        const val CONTENT_STYLE_BROWSABLE_HINT = "android.media.browse.CONTENT_STYLE_BROWSABLE_HINT"
        const val CONTENT_STYLE_PLAYABLE_HINT = "android.media.browse.CONTENT_STYLE_PLAYABLE_HINT"
        const val CONTENT_STYLE_SUPPORTED = "android.media.browse.CONTENT_STYLE_SUPPORTED"
        const val CONTENT_STYLE_LIST = 1
        const val CONTENT_STYLE_GRID = 2
    }

    private var mediaSession: MediaSessionCompat? = null
    private var mediaPlayer: MediaPlayer? = null
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    private var currentStation: StationInfo? = null
    private var currentCategoryStations: List<StationInfo> = emptyList()
    private var currentStationIndex: Int = -1

    private val allStations = mutableMapOf<String, StationInfo>()
    private val categoryStationsMap = mutableMapOf<String, List<StationInfo>>()

    // ── Lifecycle ────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "MegaRadioAutoService created")
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        initStationsData()
        initMediaSession()
    }

    override fun onDestroy() {
        Log.d(TAG, "MegaRadioAutoService destroyed")
        stopPlayback()
        mediaSession?.release()
        mediaSession = null
        super.onDestroy()
    }

    // ── Station Data ────────────────────────────────────────

    private fun initStationsData() {
        val popularStations = listOf(
            StationInfo("pop_1", "Power FM", "Hit Radyosu", "https://listen.powerapp.com.tr/powerfm/abr/playlist.m3u8"),
            StationInfo("pop_2", "Virgin Radio Turkey", "Today's Best Music", "https://live.virginradio.com.tr/vrt"),
            StationInfo("pop_3", "Kral FM", "Turk Muziginin Kalbi", "https://stream.kralfm.com.tr/kralfm"),
            StationInfo("pop_4", "Joy FM", "Joy Turk", "https://stream.joyfm.com.tr/joyfm"),
            StationInfo("pop_5", "Metro FM", "Metro FM", "https://listen.powerapp.com.tr/metrofm/abr/playlist.m3u8"),
            StationInfo("pop_6", "Slow Turk", "Slow Turk", "https://stream.slowturk.com.tr/slowturk"),
            StationInfo("pop_7", "TRT FM", "TRT FM", "https://trtfm.radyotvonline.com/"),
            StationInfo("pop_8", "Number One FM", "Number One", "https://stream.numberone.com.tr/")
        )

        val popGenre = listOf(
            StationInfo("pop_power", "Power FM", "Pop Hits", "https://listen.powerapp.com.tr/powerfm/abr/playlist.m3u8"),
            StationInfo("pop_virgin", "Virgin Radio", "Pop Music", "https://live.virginradio.com.tr/vrt"),
            StationInfo("pop_joy", "Joy FM", "Pop Turk", "https://stream.joyfm.com.tr/joyfm")
        )

        val rockGenre = listOf(
            StationInfo("rock_1", "Rock FM", "Rock Music", "https://rockfm.stream")
        )

        val turkishGenre = listOf(
            StationInfo("turk_kral", "Kral FM", "Turk Muzigi", "https://stream.kralfm.com.tr/kralfm"),
            StationInfo("turk_slow", "Slow Turk", "Slow Turkce", "https://stream.slowturk.com.tr/slowturk")
        )

        categoryStationsMap[MEDIA_POPULAR] = popularStations
        categoryStationsMap[GENRE_POP] = popGenre
        categoryStationsMap[GENRE_ROCK] = rockGenre
        categoryStationsMap[GENRE_TURKISH] = turkishGenre

        for ((_, stations) in categoryStationsMap) {
            for (station in stations) {
                allStations[station.id] = station
            }
        }
    }

    // ── MediaSession ────────────────────────────────────────

    private fun initMediaSession() {
        try {
            mediaSession = MediaSessionCompat(this, "MegaRadioAutoSession").apply {
                setFlags(
                    MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                    MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
                )
                setCallback(AutoSessionCallback())
                setPlaybackState(buildState(PlaybackStateCompat.STATE_NONE))
                isActive = true
            }
            sessionToken = mediaSession?.sessionToken
            Log.d(TAG, "MediaSession initialized with full callback")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing MediaSession", e)
        }
    }

    private fun buildState(state: Int, position: Long = 0L): PlaybackStateCompat {
        return PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_STOP or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID
            )
            .setState(state, position, 1.0f)
            .build()
    }

    private fun updateState(state: Int) {
        mediaSession?.setPlaybackState(buildState(state))
    }

    private fun updateMetadata(station: StationInfo) {
        mediaSession?.setMetadata(
            MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, station.id)
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, station.name)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, station.subtitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "MegaRadio")
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, -1L)
                .build()
        )
    }

    // ── Audio Focus ─────────────────────────────────────────

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        when (change) {
            AudioManager.AUDIOFOCUS_LOSS -> stopPlayback()
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                mediaPlayer?.takeIf { it.isPlaying }?.pause()
                updateState(PlaybackStateCompat.STATE_PAUSED)
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                mediaPlayer?.takeIf { !it.isPlaying }?.start()
                updateState(PlaybackStateCompat.STATE_PLAYING)
            }
        }
    }

    private fun requestFocus(): Boolean {
        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setOnAudioFocusChangeListener(focusListener)
                .build()
            audioFocusRequest = req
            audioManager?.requestAudioFocus(req)
        } else {
            @Suppress("DEPRECATION")
            audioManager?.requestAudioFocus(
                focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN
            )
        }
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    private fun releaseFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager?.abandonAudioFocus(focusListener)
        }
    }

    // ── Playback ────────────────────────────────────────────

    private fun playStation(station: StationInfo) {
        try {
            Log.d(TAG, "Playing: ${station.name} -> ${station.streamUrl}")
            if (!requestFocus()) {
                Log.w(TAG, "Audio focus denied")
                return
            }

            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(station.streamUrl)
                setOnPreparedListener { mp ->
                    mp.start()
                    updateState(PlaybackStateCompat.STATE_PLAYING)
                    Log.d(TAG, "Now playing: ${station.name}")
                }
                setOnErrorListener { _, what, extra ->
                    Log.e(TAG, "MediaPlayer error what=$what extra=$extra")
                    updateState(PlaybackStateCompat.STATE_ERROR)
                    true
                }
                setOnCompletionListener {
                    Log.w(TAG, "Stream ended/disconnected")
                    updateState(PlaybackStateCompat.STATE_STOPPED)
                }
                prepareAsync()
            }

            currentStation = station
            updateState(PlaybackStateCompat.STATE_BUFFERING)
            updateMetadata(station)
        } catch (e: Exception) {
            Log.e(TAG, "playStation error", e)
            updateState(PlaybackStateCompat.STATE_ERROR)
        }
    }

    private fun stopPlayback() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
        } catch (_: Exception) {}
        mediaPlayer = null
        releaseFocus()
        updateState(PlaybackStateCompat.STATE_STOPPED)
    }

    // ── MediaSession Callback ───────────────────────────────

    inner class AutoSessionCallback : MediaSessionCompat.Callback() {

        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
            Log.d(TAG, "onPlayFromMediaId: $mediaId")
            if (mediaId.isNullOrEmpty() || mediaId == "no_fav") return

            // Find station in indexed map or in favorites
            val station = allStations[mediaId] ?: loadFavorites().find { it.id == mediaId }
            if (station == null) {
                Log.w(TAG, "Station not found: $mediaId")
                return
            }

            // Resolve skip-next/prev context
            resolveCategory(mediaId)
            playStation(station)
        }

        override fun onPlay() {
            Log.d(TAG, "onPlay")
            mediaPlayer?.let {
                if (!it.isPlaying && requestFocus()) {
                    it.start()
                    updateState(PlaybackStateCompat.STATE_PLAYING)
                }
            } ?: currentStation?.let { playStation(it) }
        }

        override fun onPause() {
            Log.d(TAG, "onPause")
            mediaPlayer?.takeIf { it.isPlaying }?.pause()
            updateState(PlaybackStateCompat.STATE_PAUSED)
        }

        override fun onStop() {
            Log.d(TAG, "onStop")
            stopPlayback()
        }

        override fun onSkipToNext() {
            Log.d(TAG, "onSkipToNext")
            if (currentCategoryStations.isNotEmpty() && currentStationIndex >= 0) {
                currentStationIndex = (currentStationIndex + 1) % currentCategoryStations.size
                playStation(currentCategoryStations[currentStationIndex])
            }
        }

        override fun onSkipToPrevious() {
            Log.d(TAG, "onSkipToPrevious")
            if (currentCategoryStations.isNotEmpty() && currentStationIndex >= 0) {
                currentStationIndex = if (currentStationIndex > 0)
                    currentStationIndex - 1
                else
                    currentCategoryStations.size - 1
                playStation(currentCategoryStations[currentStationIndex])
            }
        }
    }

    private fun resolveCategory(mediaId: String) {
        // Check built-in categories
        for ((_, stations) in categoryStationsMap) {
            val idx = stations.indexOfFirst { it.id == mediaId }
            if (idx >= 0) {
                currentCategoryStations = stations
                currentStationIndex = idx
                return
            }
        }
        // Check favorites
        val favs = loadFavorites()
        val idx = favs.indexOfFirst { it.id == mediaId }
        if (idx >= 0) {
            currentCategoryStations = favs
            currentStationIndex = idx
        }
    }

    // ── Favorites (React Native AsyncStorage) ───────────────

    private fun loadFavorites(): List<StationInfo> {
        val result = mutableListOf<StationInfo>()
        try {
            val prefs = applicationContext.getSharedPreferences(
                "RN_AsyncLocalStorage", Context.MODE_PRIVATE
            )
            val json = prefs.getString(ASYNC_STORAGE_FAVORITES_KEY, null) ?: return result
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                result.add(StationInfo(
                    id = obj.optString("id", ""),
                    name = obj.optString("name", "Unknown"),
                    subtitle = obj.optString("country", ""),
                    streamUrl = obj.optString("streamUrl", ""),
                    favicon = obj.optString("favicon", "")
                ))
            }
        } catch (e: Exception) {
            Log.e(TAG, "loadFavorites error", e)
        }
        return result
    }

    // ── Browse Tree ─────────────────────────────────────────

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot {
        Log.d(TAG, "onGetRoot from: $clientPackageName")
        val extras = Bundle().apply {
            putBoolean(CONTENT_STYLE_SUPPORTED, true)
            putInt(CONTENT_STYLE_BROWSABLE_HINT, CONTENT_STYLE_GRID)
            putInt(CONTENT_STYLE_PLAYABLE_HINT, CONTENT_STYLE_LIST)
        }
        return BrowserRoot(MEDIA_ROOT_ID, extras)
    }

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>
    ) {
        Log.d(TAG, "onLoadChildren: $parentId")
        result.detach()

        val items = mutableListOf<MediaBrowserCompat.MediaItem>()

        when (parentId) {
            MEDIA_ROOT_ID -> {
                items.add(browsable(MEDIA_FAVORITES, "Favoriler", "Favori radyolariniz", "ic_heart"))
                items.add(browsable(MEDIA_RECENT, "Son Calinanlar", "Son dinlediginiz", "ic_clock"))
                items.add(browsable(MEDIA_POPULAR, "Populer", "En populer radyolar", "ic_star"))
                items.add(browsable(MEDIA_GENRES, "Turler", "Ture gore radyolar", "ic_music"))
            }
            MEDIA_GENRES -> {
                items.add(browsable(GENRE_POP, "Pop", "Pop muzik radyolari", "ic_music"))
                items.add(browsable(GENRE_ROCK, "Rock", "Rock muzik radyolari", "ic_music"))
                items.add(browsable(GENRE_JAZZ, "Jazz", "Jazz muzik radyolari", "ic_music"))
                items.add(browsable(GENRE_CLASSICAL, "Klasik", "Klasik muzik radyolari", "ic_music"))
                items.add(browsable(GENRE_ELECTRONIC, "Elektronik", "Elektronik muzik", "ic_music"))
                items.add(browsable(GENRE_HIPHOP, "Hip-Hop", "Hip-Hop radyolari", "ic_music"))
                items.add(browsable(GENRE_TURKISH, "Turkce", "Turkce muzik radyolari", "ic_music"))
                items.add(browsable(GENRE_NEWS, "Haber", "Haber radyolari", "ic_music"))
            }
            MEDIA_FAVORITES -> {
                val favs = loadFavorites()
                if (favs.isEmpty()) {
                    items.add(playable("no_fav", "Henuz favori yok", "Uygulamadan ekleyin", ""))
                } else {
                    favs.forEach { items.add(playable(it.id, it.name, it.subtitle, it.streamUrl, it.favicon)) }
                }
            }
            MEDIA_RECENT -> {
                items.add(playable("recent_1", "NRJ Turkey", "Son dinlenen", "https://nrj.com/stream"))
            }
            MEDIA_POPULAR -> {
                categoryStationsMap[MEDIA_POPULAR]?.forEach {
                    items.add(playable(it.id, it.name, it.subtitle, it.streamUrl, it.favicon))
                }
            }
            GENRE_POP, GENRE_ROCK, GENRE_JAZZ, GENRE_CLASSICAL,
            GENRE_ELECTRONIC, GENRE_HIPHOP, GENRE_TURKISH, GENRE_NEWS -> {
                categoryStationsMap[parentId]?.forEach {
                    items.add(playable(it.id, it.name, it.subtitle, it.streamUrl, it.favicon))
                }
            }
            else -> Log.w(TAG, "Unknown parentId: $parentId")
        }

        result.sendResult(items)
    }

    // ── MediaItem Builders ──────────────────────────────────

    private fun browsable(id: String, title: String, sub: String, iconRes: String = ""): MediaBrowserCompat.MediaItem {
        val descBuilder = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(sub)
        if (iconRes.isNotEmpty()) {
            descBuilder.setIconUri(Uri.parse("android.resource://com.megaradio/drawable/$iconRes"))
        }
        return MediaBrowserCompat.MediaItem(descBuilder.build(), MediaBrowserCompat.MediaItem.FLAG_BROWSABLE)
    }

    private fun playable(id: String, title: String, sub: String, url: String, icon: String = ""): MediaBrowserCompat.MediaItem {
        val extras = Bundle().apply { putString("stream_url", url) }
        val descBuilder = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(sub)
            .setMediaUri(Uri.parse(url))
            .setExtras(extras)
        if (icon.isNotEmpty()) {
            descBuilder.setIconUri(Uri.parse(icon))
        }
        return MediaBrowserCompat.MediaItem(descBuilder.build(), MediaBrowserCompat.MediaItem.FLAG_PLAYABLE)
    }

    // ── Data Class ──────────────────────────────────────────

    data class StationInfo(
        val id: String,
        val name: String,
        val subtitle: String,
        val streamUrl: String,
        val favicon: String = ""
    )
}
