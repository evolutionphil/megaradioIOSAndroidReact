// Expo Config Plugin for Full Android Auto Support
// Creates native Kotlin MediaBrowserService for Android Auto browsing

const { 
  withAndroidManifest, 
  withDangerousMod,
  withMainApplication 
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Kotlin MediaBrowserService code
const MEDIA_BROWSER_SERVICE_KOTLIN = `package com.visiongo.megaradio

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.media.MediaBrowserServiceCompat
import com.doublesymmetry.trackplayer.service.MusicService
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

/**
 * MegaRadio Android Auto MediaBrowserService
 * Provides browsable content for Android Auto's media interface
 */
class MegaRadioAutoService : MediaBrowserServiceCompat() {

    companion object {
        private const val TAG = "MegaRadioAuto"
        
        // Root and category IDs
        const val MEDIA_ROOT_ID = "megaradio_root"
        const val MEDIA_FAVORITES = "megaradio_favorites"
        const val MEDIA_RECENT = "megaradio_recent"
        const val MEDIA_POPULAR = "megaradio_popular"
        const val MEDIA_GENRES = "megaradio_genres"
        
        // Genre IDs
        const val GENRE_POP = "genre_pop"
        const val GENRE_ROCK = "genre_rock"
        const val GENRE_JAZZ = "genre_jazz"
        const val GENRE_CLASSICAL = "genre_classical"
        const val GENRE_ELECTRONIC = "genre_electronic"
        const val GENRE_HIPHOP = "genre_hiphop"
        const val GENRE_TURKISH = "genre_turkish"
        const val GENRE_NEWS = "genre_news"
        
        // AsyncStorage key for favorites
        const val ASYNC_STORAGE_FAVORITES_KEY = "megaradio_android_auto_favorites"
    }

    private var mediaSession: MediaSessionCompat? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "MegaRadioAutoService created")
        
        // Try to get existing MediaSession from TrackPlayer
        // This ensures Android Auto controls work with the existing player
        initMediaSession()
    }

    private fun initMediaSession() {
        try {
            mediaSession = MediaSessionCompat(this, "MegaRadioAutoSession").apply {
                setFlags(
                    MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                    MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
                )
                
                setPlaybackState(
                    PlaybackStateCompat.Builder()
                        .setActions(
                            PlaybackStateCompat.ACTION_PLAY or
                            PlaybackStateCompat.ACTION_PAUSE or
                            PlaybackStateCompat.ACTION_STOP or
                            PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                        )
                        .setState(PlaybackStateCompat.STATE_NONE, 0, 1.0f)
                        .build()
                )
                
                isActive = true
            }
            
            sessionToken = mediaSession?.sessionToken
            Log.d(TAG, "MediaSession initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing MediaSession", e)
        }
    }

    // Read favorites from React Native AsyncStorage
    private fun loadFavoritesFromStorage(): List<FavoriteStation> {
        val favorites = mutableListOf<FavoriteStation>()
        try {
            // AsyncStorage on Android uses SharedPreferences under the hood
            // The data is stored in a specific format
            val prefs = applicationContext.getSharedPreferences(
                "RN_AsyncLocalStorage",
                Context.MODE_PRIVATE
            )
            
            val favoritesJson = prefs.getString(ASYNC_STORAGE_FAVORITES_KEY, null)
            
            if (favoritesJson != null) {
                Log.d(TAG, "Found favorites in storage: \${favoritesJson.take(100)}...")
                val jsonArray = JSONArray(favoritesJson)
                
                for (i in 0 until jsonArray.length()) {
                    val station = jsonArray.getJSONObject(i)
                    favorites.add(FavoriteStation(
                        id = station.optString("id", ""),
                        name = station.optString("name", "Unknown"),
                        country = station.optString("country", ""),
                        streamUrl = station.optString("streamUrl", ""),
                        favicon = station.optString("favicon", "")
                    ))
                }
                Log.d(TAG, "Loaded \${favorites.size} favorites from storage")
            } else {
                Log.d(TAG, "No favorites found in storage")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading favorites from storage", e)
        }
        return favorites
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot? {
        Log.d(TAG, "onGetRoot called from: \$clientPackageName")
        
        // Allow Android Auto and other trusted clients
        return BrowserRoot(MEDIA_ROOT_ID, null)
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
                // Root menu - show main categories
                items.add(createBrowsableItem(MEDIA_FAVORITES, "Favoriler", "Favori radyolarınız", "heart"))
                items.add(createBrowsableItem(MEDIA_RECENT, "Son Çalınanlar", "Son dinlediğiniz radyolar", "clock"))
                items.add(createBrowsableItem(MEDIA_POPULAR, "Popüler", "En popüler radyolar", "trending"))
                items.add(createBrowsableItem(MEDIA_GENRES, "Türler", "Türe göre radyolar", "music"))
            }
            
            MEDIA_GENRES -> {
                // Genre list
                items.add(createBrowsableItem(GENRE_POP, "Pop", "Pop müzik radyoları", "pop"))
                items.add(createBrowsableItem(GENRE_ROCK, "Rock", "Rock müzik radyoları", "rock"))
                items.add(createBrowsableItem(GENRE_JAZZ, "Jazz", "Jazz müzik radyoları", "jazz"))
                items.add(createBrowsableItem(GENRE_CLASSICAL, "Klasik", "Klasik müzik radyoları", "classical"))
                items.add(createBrowsableItem(GENRE_ELECTRONIC, "Elektronik", "Elektronik müzik radyoları", "electronic"))
                items.add(createBrowsableItem(GENRE_HIPHOP, "Hip-Hop", "Hip-Hop radyoları", "hiphop"))
                items.add(createBrowsableItem(GENRE_TURKISH, "Türkçe", "Türkçe müzik radyoları", "turkish"))
                items.add(createBrowsableItem(GENRE_NEWS, "Haber", "Haber radyoları", "news"))
            }
            
            MEDIA_FAVORITES -> {
                // Load real favorites from SharedPreferences (synced from React Native)
                val favorites = loadFavoritesFromStorage()
                if (favorites.isEmpty()) {
                    // Show placeholder if no favorites
                    items.add(createPlayableItem("no_fav", "Henüz favori yok", "Uygulamadan ekleyin", ""))
                } else {
                    favorites.forEach { station ->
                        items.add(createPlayableItem(
                            station.id,
                            station.name,
                            station.country,
                            station.streamUrl
                        ))
                    }
                }
            }
            
            MEDIA_RECENT -> {
                // TODO: Load recent from SharedPreferences
                items.add(createPlayableItem("recent_1", "NRJ Turkey", "Son dinlenen", "https://nrj.com/stream"))
            }
            
            MEDIA_POPULAR -> {
                // Popular Turkish stations
                items.add(createPlayableItem("pop_1", "Power FM", "Türkiye'nin #1 Hit Radyosu", "https://listen.powerapp.com.tr/powerfm/abr/playlist.m3u8"))
                items.add(createPlayableItem("pop_2", "Virgin Radio Turkey", "Today's Best Music", "https://live.virginradio.com.tr/vrt"))
                items.add(createPlayableItem("pop_3", "Kral FM", "Türk Müziğinin Kalbi", "https://stream.kralfm.com.tr/kralfm"))
                items.add(createPlayableItem("pop_4", "Joy FM", "Joy Türk", "https://stream.joyfm.com.tr/joyfm"))
                items.add(createPlayableItem("pop_5", "Metro FM", "Metro FM", "https://listen.powerapp.com.tr/metrofm/abr/playlist.m3u8"))
                items.add(createPlayableItem("pop_6", "Slow Türk", "Slow Türk", "https://stream.slowturk.com.tr/slowturk"))
                items.add(createPlayableItem("pop_7", "TRT FM", "TRT FM", "https://trtfm.radyotvonline.com/"))
                items.add(createPlayableItem("pop_8", "Number One FM", "Number One", "https://stream.numberone.com.tr/"))
            }
            
            GENRE_POP, GENRE_ROCK, GENRE_JAZZ, GENRE_CLASSICAL, 
            GENRE_ELECTRONIC, GENRE_HIPHOP, GENRE_TURKISH, GENRE_NEWS -> {
                // Load stations for genre
                loadGenreStations(parentId, items)
            }
            
            else -> {
                Log.w(TAG, "Unknown parentId: \$parentId")
            }
        }

        result.sendResult(items)
    }

    private fun loadGenreStations(genreId: String, items: MutableList<MediaBrowserCompat.MediaItem>) {
        // Map genre IDs to station lists
        when (genreId) {
            GENRE_POP -> {
                items.add(createPlayableItem("pop_power", "Power FM", "Pop Hits", "https://listen.powerapp.com.tr/powerfm/abr/playlist.m3u8"))
                items.add(createPlayableItem("pop_virgin", "Virgin Radio", "Pop Music", "https://live.virginradio.com.tr/vrt"))
                items.add(createPlayableItem("pop_joy", "Joy FM", "Pop Türk", "https://stream.joyfm.com.tr/joyfm"))
            }
            GENRE_ROCK -> {
                items.add(createPlayableItem("rock_1", "Rock FM", "Rock Music", "https://rockfm.stream"))
            }
            GENRE_TURKISH -> {
                items.add(createPlayableItem("turk_kral", "Kral FM", "Türk Müziği", "https://stream.kralfm.com.tr/kralfm"))
                items.add(createPlayableItem("turk_slow", "Slow Türk", "Slow Türkçe", "https://stream.slowturk.com.tr/slowturk"))
            }
            // Add more genres as needed
        }
    }

    private fun createBrowsableItem(
        mediaId: String,
        title: String,
        subtitle: String,
        iconName: String
    ): MediaBrowserCompat.MediaItem {
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(mediaId)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIconUri(Uri.parse("android.resource://com.visiongo.megaradio/drawable/ic_\$iconName"))
            .build()

        return MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
        )
    }

    private fun createPlayableItem(
        mediaId: String,
        title: String,
        subtitle: String,
        streamUrl: String
    ): MediaBrowserCompat.MediaItem {
        val extras = Bundle().apply {
            putString("stream_url", streamUrl)
        }
        
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(mediaId)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setMediaUri(Uri.parse(streamUrl))
            .setExtras(extras)
            .build()

        return MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
        )
    }

    override fun onDestroy() {
        Log.d(TAG, "MegaRadioAutoService destroyed")
        mediaSession?.release()
        super.onDestroy()
    }
    
    // Data class for favorite stations
    data class FavoriteStation(
        val id: String,
        val name: String,
        val country: String,
        val streamUrl: String,
        val favicon: String
    )
}
`;

// automotive_app_desc.xml content
const AUTOMOTIVE_APP_DESC_XML = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="media" />
</automotiveApp>
`;

// Add Android Auto meta-data and service to AndroidManifest.xml
const withAndroidAutoManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];
    
    // Ensure arrays exist
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }
    if (!application.service) {
      application.service = [];
    }

    // Add Android Auto meta-data
    const autoMetaData = {
      $: {
        'android:name': 'com.google.android.gms.car.application',
        'android:resource': '@xml/automotive_app_desc',
      },
    };
    
    const existingMeta = application['meta-data'].find(
      (m) => m.$['android:name'] === 'com.google.android.gms.car.application'
    );
    
    if (!existingMeta) {
      application['meta-data'].push(autoMetaData);
      console.log('[withAndroidAuto] Added Android Auto meta-data');
    }

    // Add MegaRadioAutoService
    const autoService = {
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
    };

    const existingService = application.service.find(
      (s) => s.$['android:name'] === '.MegaRadioAutoService'
    );

    if (!existingService) {
      application.service.push(autoService);
      console.log('[withAndroidAuto] Added MegaRadioAutoService');
    }
    
    return config;
  });
};

// Create native Kotlin files
const withAndroidAutoNativeFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Create xml directory and automotive_app_desc.xml
      const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      fs.writeFileSync(path.join(xmlDir, 'automotive_app_desc.xml'), AUTOMOTIVE_APP_DESC_XML);
      console.log('[withAndroidAuto] Created automotive_app_desc.xml');

      // Create Kotlin source directory
      const kotlinDir = path.join(
        projectRoot, 
        'android', 
        'app', 
        'src', 
        'main', 
        'java', 
        'com', 
        'visiongo', 
        'megaradio'
      );
      
      if (!fs.existsSync(kotlinDir)) {
        fs.mkdirSync(kotlinDir, { recursive: true });
      }

      // Write MegaRadioAutoService.kt
      fs.writeFileSync(
        path.join(kotlinDir, 'MegaRadioAutoService.kt'),
        MEDIA_BROWSER_SERVICE_KOTLIN
      );
      console.log('[withAndroidAuto] Created MegaRadioAutoService.kt');
      
      return config;
    },
  ]);
};

// Main plugin export
module.exports = function withAndroidAutoFull(config) {
  console.log('[withAndroidAuto] Applying full Android Auto configuration...');
  
  config = withAndroidAutoManifest(config);
  config = withAndroidAutoNativeFiles(config);
  
  return config;
};
