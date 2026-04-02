// Expo Config Plugin for Full Android Auto Media App Support
// ============================================================
// Creates a fully compliant Android Auto MediaBrowserService with:
// - Native MediaPlayer for streaming radio
// - Full MediaSessionCompat with Callback (play/pause/skip/playFromMediaId)
// - Content Style Hints (grid for categories, list for stations)
// - Attribution Icon + Accent Color Theme
// - Audio Focus management
// - Favorites loading from React Native AsyncStorage
// - Aggressive cleanup of react-native-carplay navigation artifacts

const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// KOTLIN: MegaRadioAutoService.kt
// ============================================================
const MEDIA_BROWSER_SERVICE_KOTLIN = `package com.megaradio

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
            Log.d(TAG, "Playing: \${station.name} -> \${station.streamUrl}")
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
                    Log.d(TAG, "Now playing: \${station.name}")
                }
                setOnErrorListener { _, what, extra ->
                    Log.e(TAG, "MediaPlayer error what=\$what extra=\$extra")
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
            Log.d(TAG, "onPlayFromMediaId: \$mediaId")
            if (mediaId.isNullOrEmpty() || mediaId == "no_fav") return

            // Find station in indexed map or in favorites
            val station = allStations[mediaId] ?: loadFavorites().find { it.id == mediaId }
            if (station == null) {
                Log.w(TAG, "Station not found: \$mediaId")
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
                    streamUrl = obj.optString("streamUrl", "")
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
        Log.d(TAG, "onGetRoot from: \$clientPackageName")
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
        Log.d(TAG, "onLoadChildren: \$parentId")
        result.detach()

        val items = mutableListOf<MediaBrowserCompat.MediaItem>()

        when (parentId) {
            MEDIA_ROOT_ID -> {
                items.add(browsable(MEDIA_FAVORITES, "Favoriler", "Favori radyolariniz"))
                items.add(browsable(MEDIA_RECENT, "Son Calinanlar", "Son dinlediginiz"))
                items.add(browsable(MEDIA_POPULAR, "Populer", "En populer radyolar"))
                items.add(browsable(MEDIA_GENRES, "Turler", "Ture gore radyolar"))
            }
            MEDIA_GENRES -> {
                items.add(browsable(GENRE_POP, "Pop", "Pop muzik radyolari"))
                items.add(browsable(GENRE_ROCK, "Rock", "Rock muzik radyolari"))
                items.add(browsable(GENRE_JAZZ, "Jazz", "Jazz muzik radyolari"))
                items.add(browsable(GENRE_CLASSICAL, "Klasik", "Klasik muzik radyolari"))
                items.add(browsable(GENRE_ELECTRONIC, "Elektronik", "Elektronik muzik"))
                items.add(browsable(GENRE_HIPHOP, "Hip-Hop", "Hip-Hop radyolari"))
                items.add(browsable(GENRE_TURKISH, "Turkce", "Turkce muzik radyolari"))
                items.add(browsable(GENRE_NEWS, "Haber", "Haber radyolari"))
            }
            MEDIA_FAVORITES -> {
                val favs = loadFavorites()
                if (favs.isEmpty()) {
                    items.add(playable("no_fav", "Henuz favori yok", "Uygulamadan ekleyin", ""))
                } else {
                    favs.forEach { items.add(playable(it.id, it.name, it.subtitle, it.streamUrl)) }
                }
            }
            MEDIA_RECENT -> {
                items.add(playable("recent_1", "NRJ Turkey", "Son dinlenen", "https://nrj.com/stream"))
            }
            MEDIA_POPULAR -> {
                categoryStationsMap[MEDIA_POPULAR]?.forEach {
                    items.add(playable(it.id, it.name, it.subtitle, it.streamUrl))
                }
            }
            GENRE_POP, GENRE_ROCK, GENRE_JAZZ, GENRE_CLASSICAL,
            GENRE_ELECTRONIC, GENRE_HIPHOP, GENRE_TURKISH, GENRE_NEWS -> {
                categoryStationsMap[parentId]?.forEach {
                    items.add(playable(it.id, it.name, it.subtitle, it.streamUrl))
                }
            }
            else -> Log.w(TAG, "Unknown parentId: \$parentId")
        }

        result.sendResult(items)
    }

    // ── MediaItem Builders ──────────────────────────────────

    private fun browsable(id: String, title: String, sub: String): MediaBrowserCompat.MediaItem {
        val desc = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(sub)
            .build()
        return MediaBrowserCompat.MediaItem(desc, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE)
    }

    private fun playable(id: String, title: String, sub: String, url: String): MediaBrowserCompat.MediaItem {
        val extras = Bundle().apply { putString("stream_url", url) }
        val desc = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(sub)
            .setMediaUri(Uri.parse(url))
            .setExtras(extras)
            .build()
        return MediaBrowserCompat.MediaItem(desc, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE)
    }

    // ── Data Class ──────────────────────────────────────────

    data class StationInfo(
        val id: String,
        val name: String,
        val subtitle: String,
        val streamUrl: String
    )
}
`;

// ============================================================
// RESOURCES
// ============================================================

// Monochrome headphone icon for Android Auto attribution
const IC_AUTO_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,3C7.03,3 3,7.03 3,12v7c0,1.1 0.9,2 2,2h2v-9H5v-2c0,-3.87 3.13,-7 7,-7s7,3.13 7,7v2h-2v9h2c1.1,0 2,-0.9 2,-2v-7C21,7.03 16.97,3 12,3z" />
</vector>
`;

// Accent color theme for Android Auto
const AUTO_THEME_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="MegaRadioAutoTheme">
        <item name="colorAccent">#FF4199</item>
    </style>
</resources>
`;

// automotive_app_desc.xml (declares this is a MEDIA app, not NAVIGATION)
const AUTOMOTIVE_APP_DESC_XML = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="media" />
</automotiveApp>
`;

// ============================================================
// MANIFEST MODIFICATIONS
// ============================================================
const withAndroidAutoManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Ensure tools namespace
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    if (!application['meta-data']) application['meta-data'] = [];
    if (!application.service) application.service = [];
    if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = [];

    // ────────────────────────────────────────────────────────
    // CLEANUP: Remove react-native-carplay navigation artifacts
    // ────────────────────────────────────────────────────────
    const NAV_PERMS = [
      'androidx.car.app.NAVIGATION_TEMPLATES',
      'androidx.car.app.MAP_TEMPLATES',
      'androidx.car.app.ACCESS_SURFACE',
    ];

    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'].filter((p) => {
      const name = p.$ && p.$['android:name'];
      if (NAV_PERMS.includes(name)) {
        console.log(`[withAndroidAuto] Removed nav permission: ${name}`);
        return false;
      }
      return true;
    });

    // Block AAR merge of navigation permissions
    NAV_PERMS.forEach((perm) => {
      if (!manifest.manifest['uses-permission'].find(p => p.$?.['android:name'] === perm && p.$?.['tools:node'] === 'remove')) {
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': perm, 'tools:node': 'remove' },
        });
      }
    });

    // Remove carplay services
    application.service = application.service.filter((s) => {
      const name = s.$ && s.$['android:name'];
      if (name && (name.includes('CarPlayService') || name.includes('CarPlayHeadlessTaskService'))) {
        console.log(`[withAndroidAuto] Removed carplay service: ${name}`);
        return false;
      }
      return true;
    });

    // Remove carplay activities
    if (application.activity) {
      application.activity = application.activity.filter((a) => {
        const name = a.$ && a.$['android:name'];
        return !(name && name.includes('carplay'));
      });
    }

    // Remove minCarApiLevel meta-data
    application['meta-data'] = application['meta-data'].filter((m) => {
      return m.$?.['android:name'] !== 'androidx.car.app.minCarApiLevel';
    });

    // Block AAR merge of carplay services
    const blockServices = [
      'org.birkir.carplay.CarPlayService',
      'org.birkir.carplay.CarPlayHeadlessTaskService',
    ];
    blockServices.forEach((svc) => {
      if (!application.service.find(s => s.$?.['android:name'] === svc)) {
        application.service.push({
          $: { 'android:name': svc, 'tools:node': 'remove' },
        });
      }
    });

    // ────────────────────────────────────────────────────────
    // Remove MediaBrowserService intent from TrackPlayer MusicService
    // (our MegaRadioAutoService is the sole MediaBrowserService)
    // ────────────────────────────────────────────────────────
    application.service = application.service.map((s) => {
      if (s.$?.['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService') {
        if (s['intent-filter']) {
          s['intent-filter'] = s['intent-filter'].filter((f) => {
            const actions = f.action || [];
            return !actions.some((a) => a.$?.['android:name'] === 'android.media.browse.MediaBrowserService');
          });
          if (s['intent-filter'].length === 0) delete s['intent-filter'];
        }
        console.log('[withAndroidAuto] Stripped MediaBrowserService intent from MusicService');
      }
      return s;
    });

    // ────────────────────────────────────────────────────────
    // ADD: Android Auto Media App configuration
    // ────────────────────────────────────────────────────────

    // 1. com.google.android.gms.car.application → automotive_app_desc.xml
    if (!application['meta-data'].find(m => m.$?.['android:name'] === 'com.google.android.gms.car.application')) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
      console.log('[withAndroidAuto] Added car.application meta-data');
    }

    // 2. Attribution Icon (monochrome, tintable)
    if (!application['meta-data'].find(m => m.$?.['android:name'] === 'androidx.car.app.TintableAttributionIcon')) {
      application['meta-data'].push({
        $: {
          'android:name': 'androidx.car.app.TintableAttributionIcon',
          'android:resource': '@drawable/ic_auto_icon',
        },
      });
      console.log('[withAndroidAuto] Added TintableAttributionIcon');
    }

    // 3. Accent Color Theme
    if (!application['meta-data'].find(m => m.$?.['android:name'] === 'com.google.android.gms.car.application.theme')) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application.theme',
          'android:resource': '@style/MegaRadioAutoTheme',
        },
      });
      console.log('[withAndroidAuto] Added car.application.theme');
    }

    // 4. MegaRadioAutoService (sole MediaBrowserService)
    // Remove any existing entry first
    application.service = application.service.filter(
      (s) => s.$?.['android:name'] !== '.MegaRadioAutoService'
    );
    application.service.push({
      $: {
        'android:name': '.MegaRadioAutoService',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
          ],
        },
      ],
    });
    console.log('[withAndroidAuto] Added MegaRadioAutoService as sole MediaBrowserService');

    return config;
  });
};

// ============================================================
// NATIVE FILE CREATION
// ============================================================
const withAndroidAutoNativeFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.projectRoot;
      const androidMain = path.join(root, 'android', 'app', 'src', 'main');

      // 1. res/xml/automotive_app_desc.xml
      const xmlDir = path.join(androidMain, 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'automotive_app_desc.xml'), AUTOMOTIVE_APP_DESC_XML);
      console.log('[withAndroidAuto] Created automotive_app_desc.xml');

      // 2. res/drawable/ic_auto_icon.xml (Attribution Icon)
      const drawableDir = path.join(androidMain, 'res', 'drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.writeFileSync(path.join(drawableDir, 'ic_auto_icon.xml'), IC_AUTO_ICON_XML);
      console.log('[withAndroidAuto] Created ic_auto_icon.xml');

      // 3. res/values/auto_theme.xml (Accent Color)
      const valuesDir = path.join(androidMain, 'res', 'values');
      fs.mkdirSync(valuesDir, { recursive: true });
      fs.writeFileSync(path.join(valuesDir, 'auto_theme.xml'), AUTO_THEME_XML);
      console.log('[withAndroidAuto] Created auto_theme.xml');

      // 4. MegaRadioAutoService.kt
      const kotlinDir = path.join(androidMain, 'java', 'com', 'megaradio');
      fs.mkdirSync(kotlinDir, { recursive: true });
      fs.writeFileSync(path.join(kotlinDir, 'MegaRadioAutoService.kt'), MEDIA_BROWSER_SERVICE_KOTLIN);
      console.log('[withAndroidAuto] Created MegaRadioAutoService.kt');

      return config;
    },
  ]);
};

// ============================================================
// MAIN EXPORT
// ============================================================
module.exports = function withAndroidAutoFull(config) {
  console.log('[withAndroidAuto] Applying full Android Auto Media App configuration...');
  config = withAndroidAutoManifest(config);
  config = withAndroidAutoNativeFiles(config);
  return config;
};
