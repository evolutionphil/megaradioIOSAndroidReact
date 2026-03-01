package com.visiongo.megaradio

import android.content.Intent
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.media.MediaBrowserServiceCompat
import kotlinx.coroutines.*

/**
 * MegaRadio Android Auto Service
 * Provides media browsing and playback for Android Auto
 * Now with real API integration!
 */
class MegaRadioAutoService : MediaBrowserServiceCompat() {

    companion object {
        private const val TAG = "MegaRadioAutoService"
        
        // Media IDs for browsing hierarchy
        private const val MEDIA_ROOT_ID = "root"
        private const val MEDIA_POPULAR_ID = "popular"
        private const val MEDIA_GENRES_ID = "genres"
        private const val MEDIA_DISCOVER_ID = "discover"
        private const val MEDIA_SEARCH_ID = "search"
        private const val MEDIA_SEARCH_RESULTS_ID = "search_results"
        
        // Prefixes for media items
        private const val STATION_PREFIX = "station:"
        private const val GENRE_PREFIX = "genre:"
        private const val SEARCH_PREFIX = "search_query:"
    }

    private lateinit var mediaSession: MediaSessionCompat
    private lateinit var stateBuilder: PlaybackStateCompat.Builder
    private val apiClient = MegaRadioApiClient.getInstance()
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // Cache for stations and genres
    private var cachedPopularStations: List<MegaRadioApiClient.Station> = emptyList()
    private var cachedGenres: List<MegaRadioApiClient.Genre> = emptyList()
    private var cachedGenreStations: MutableMap<String, List<MegaRadioApiClient.Station>> = mutableMapOf()
    
    // Current playback state
    private var currentStation: MegaRadioApiClient.Station? = null
    private var selectedCountry: String? = null // User's selected country

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Android Auto Service created")

        // Initialize media session
        mediaSession = MediaSessionCompat(this, TAG).apply {
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )
            
            stateBuilder = PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_STOP or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID or
                    PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH
                )
            setPlaybackState(stateBuilder.build())
            
            setCallback(MediaSessionCallback())
            isActive = true
        }

        sessionToken = mediaSession.sessionToken
        
        // Pre-fetch data
        preloadData()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Android Auto Service destroyed")
        serviceScope.cancel()
        mediaSession.release()
    }

    /**
     * Pre-load popular stations and genres for faster browsing
     */
    private fun preloadData() {
        serviceScope.launch {
            try {
                Log.d(TAG, "Preloading data...")
                
                // Fetch popular stations
                cachedPopularStations = apiClient.getPopularStations(selectedCountry, 50)
                Log.d(TAG, "Preloaded ${cachedPopularStations.size} popular stations")
                
                // Fetch genres
                cachedGenres = apiClient.getGenres(selectedCountry, 40)
                Log.d(TAG, "Preloaded ${cachedGenres.size} genres")
                
            } catch (e: Exception) {
                Log.e(TAG, "Error preloading data: ${e.message}", e)
            }
        }
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot {
        Log.d(TAG, "onGetRoot called from: $clientPackageName")
        return BrowserRoot(MEDIA_ROOT_ID, null)
    }

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>
    ) {
        Log.d(TAG, "onLoadChildren: $parentId")
        
        // Detach result so we can load async
        result.detach()
        
        serviceScope.launch {
            val items = when (parentId) {
                MEDIA_ROOT_ID -> loadRootItems()
                MEDIA_POPULAR_ID -> loadPopularStations()
                MEDIA_GENRES_ID -> loadGenres()
                MEDIA_DISCOVER_ID -> loadDiscoverStations()
                else -> {
                    when {
                        parentId.startsWith(GENRE_PREFIX) -> {
                            val genreSlug = parentId.removePrefix(GENRE_PREFIX)
                            loadGenreStations(genreSlug)
                        }
                        else -> mutableListOf()
                    }
                }
            }
            
            result.sendResult(items)
        }
    }

    /**
     * Load root menu items
     */
    private fun loadRootItems(): MutableList<MediaBrowserCompat.MediaItem> {
        Log.d(TAG, "Loading root items")
        
        val items = mutableListOf<MediaBrowserCompat.MediaItem>()
        
        // Popular Stations
        items.add(createBrowsableItem(
            MEDIA_POPULAR_ID,
            "Popüler İstasyonlar",
            "En çok dinlenen radyolar",
            "https://themegaradio.com/logo.png"
        ))
        
        // Genres
        items.add(createBrowsableItem(
            MEDIA_GENRES_ID,
            "Türler",
            "Müzik türlerine göre radyolar",
            "https://themegaradio.com/logo.png"
        ))
        
        // Discover
        items.add(createBrowsableItem(
            MEDIA_DISCOVER_ID,
            "Keşfet",
            "Farklı türlerden öneriler",
            "https://themegaradio.com/logo.png"
        ))
        
        return items
    }

    /**
     * Load popular stations from API
     */
    private suspend fun loadPopularStations(): MutableList<MediaBrowserCompat.MediaItem> {
        Log.d(TAG, "Loading popular stations")
        
        // Refresh cache if empty
        if (cachedPopularStations.isEmpty()) {
            cachedPopularStations = apiClient.getPopularStations(selectedCountry, 50)
        }
        
        return cachedPopularStations.map { station ->
            createPlayableItem(
                "${STATION_PREFIX}${station.id}",
                station.name,
                station.country,
                station.logoUrl,
                station.streamUrl
            )
        }.toMutableList()
    }

    /**
     * Load genres from API
     */
    private suspend fun loadGenres(): MutableList<MediaBrowserCompat.MediaItem> {
        Log.d(TAG, "Loading genres")
        
        // Refresh cache if empty
        if (cachedGenres.isEmpty()) {
            cachedGenres = apiClient.getGenres(selectedCountry, 40)
        }
        
        return cachedGenres.map { genre ->
            createBrowsableItem(
                "${GENRE_PREFIX}${genre.slug}",
                genre.name,
                "${genre.stationCount} istasyon",
                "https://themegaradio.com/logo.png"
            )
        }.toMutableList()
    }

    /**
     * Load stations for a specific genre
     */
    private suspend fun loadGenreStations(genreSlug: String): MutableList<MediaBrowserCompat.MediaItem> {
        Log.d(TAG, "Loading stations for genre: $genreSlug")
        
        // Check cache first
        val cached = cachedGenreStations[genreSlug]
        val stations = if (cached != null && cached.isNotEmpty()) {
            cached
        } else {
            val fetched = apiClient.getStationsByGenre(genreSlug, selectedCountry, 50)
            cachedGenreStations[genreSlug] = fetched
            fetched
        }
        
        return stations.map { station ->
            createPlayableItem(
                "${STATION_PREFIX}${station.id}",
                station.name,
                station.country,
                station.logoUrl,
                station.streamUrl
            )
        }.toMutableList()
    }

    /**
     * Load diverse/discover stations
     */
    private suspend fun loadDiscoverStations(): MutableList<MediaBrowserCompat.MediaItem> {
        Log.d(TAG, "Loading discover stations")
        
        val stations = apiClient.getDiverseRecommendations(selectedCountry, 30)
        
        return stations.map { station ->
            createPlayableItem(
                "${STATION_PREFIX}${station.id}",
                station.name,
                "${station.genre} • ${station.country}",
                station.logoUrl,
                station.streamUrl
            )
        }.toMutableList()
    }

    /**
     * Create a browsable media item (folder)
     */
    private fun createBrowsableItem(
        mediaId: String,
        title: String,
        subtitle: String,
        iconUri: String
    ): MediaBrowserCompat.MediaItem {
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(mediaId)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIconUri(android.net.Uri.parse(iconUri))
            .build()
        
        return MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
        )
    }

    /**
     * Create a playable media item (station)
     */
    private fun createPlayableItem(
        mediaId: String,
        title: String,
        subtitle: String,
        iconUri: String,
        mediaUri: String
    ): MediaBrowserCompat.MediaItem {
        val extras = Bundle().apply {
            putString("streamUrl", mediaUri)
        }
        
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(mediaId)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIconUri(android.net.Uri.parse(iconUri))
            .setMediaUri(android.net.Uri.parse(mediaUri))
            .setExtras(extras)
            .build()
        
        return MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
        )
    }

    /**
     * Find station by ID from all caches
     */
    private fun findStationById(stationId: String): MegaRadioApiClient.Station? {
        // Check popular stations
        cachedPopularStations.find { it.id == stationId }?.let { return it }
        
        // Check genre stations
        cachedGenreStations.values.forEach { stations ->
            stations.find { it.id == stationId }?.let { return it }
        }
        
        return null
    }

    /**
     * Media session callbacks for playback control
     */
    inner class MediaSessionCallback : MediaSessionCompat.Callback() {
        
        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
            Log.d(TAG, "onPlayFromMediaId: $mediaId")
            
            mediaId ?: return
            
            if (mediaId.startsWith(STATION_PREFIX)) {
                val stationId = mediaId.removePrefix(STATION_PREFIX)
                val station = findStationById(stationId)
                
                if (station != null) {
                    playStation(station)
                } else {
                    // Station not in cache, try to get stream URL from extras
                    val streamUrl = extras?.getString("streamUrl")
                    if (!streamUrl.isNullOrEmpty()) {
                        // Create a minimal station object
                        val minimalStation = MegaRadioApiClient.Station(
                            id = stationId,
                            name = "Radio Station",
                            streamUrl = streamUrl,
                            logoUrl = "https://themegaradio.com/logo.png",
                            country = "",
                            genre = "",
                            tags = ""
                        )
                        playStation(minimalStation)
                    }
                }
            }
        }
        
        override fun onPlay() {
            Log.d(TAG, "onPlay")
            currentStation?.let { playStation(it) }
        }
        
        override fun onPause() {
            Log.d(TAG, "onPause")
            updatePlaybackState(PlaybackStateCompat.STATE_PAUSED)
            // Send pause intent to React Native
            sendPlaybackCommand("pause")
        }
        
        override fun onStop() {
            Log.d(TAG, "onStop")
            updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
            // Send stop intent to React Native
            sendPlaybackCommand("stop")
        }
        
        override fun onSkipToNext() {
            Log.d(TAG, "onSkipToNext")
            // Get next station from current list
            currentStation?.let { current ->
                val currentIndex = cachedPopularStations.indexOfFirst { it.id == current.id }
                if (currentIndex >= 0 && currentIndex < cachedPopularStations.size - 1) {
                    playStation(cachedPopularStations[currentIndex + 1])
                } else if (cachedPopularStations.isNotEmpty()) {
                    playStation(cachedPopularStations[0])
                }
            }
        }
        
        override fun onSkipToPrevious() {
            Log.d(TAG, "onSkipToPrevious")
            // Get previous station from current list
            currentStation?.let { current ->
                val currentIndex = cachedPopularStations.indexOfFirst { it.id == current.id }
                if (currentIndex > 0) {
                    playStation(cachedPopularStations[currentIndex - 1])
                } else if (cachedPopularStations.isNotEmpty()) {
                    playStation(cachedPopularStations.last())
                }
            }
        }
        
        override fun onPlayFromSearch(query: String?, extras: Bundle?) {
            Log.d(TAG, "onPlayFromSearch: $query")
            
            if (query.isNullOrEmpty()) return
            
            serviceScope.launch {
                val results = apiClient.searchStations(query, 10)
                if (results.isNotEmpty()) {
                    playStation(results.first())
                }
            }
        }
    }

    /**
     * Play a station
     */
    private fun playStation(station: MegaRadioApiClient.Station) {
        Log.d(TAG, "Playing station: ${station.name} - ${station.streamUrl}")
        
        currentStation = station
        
        // Update metadata
        val metadata = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, "${STATION_PREFIX}${station.id}")
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, station.name)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, station.country)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, station.genre)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, station.name)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, station.country)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM_ART_URI, station.logoUrl)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON_URI, station.logoUrl)
            .build()
        
        mediaSession.setMetadata(metadata)
        
        // Update playback state
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
        
        // Send play command to React Native with station info
        sendPlayStationCommand(station)
    }

    /**
     * Update playback state
     */
    private fun updatePlaybackState(state: Int) {
        val playbackState = stateBuilder
            .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
            .build()
        mediaSession.setPlaybackState(playbackState)
    }

    /**
     * Send playback command to React Native
     */
    private fun sendPlaybackCommand(command: String) {
        val intent = Intent("com.visiongo.megaradio.PLAYBACK_COMMAND").apply {
            putExtra("command", command)
        }
        sendBroadcast(intent)
    }

    /**
     * Send play station command to React Native
     */
    private fun sendPlayStationCommand(station: MegaRadioApiClient.Station) {
        val intent = Intent("com.visiongo.megaradio.PLAY_STATION").apply {
            putExtra("stationId", station.id)
            putExtra("stationName", station.name)
            putExtra("streamUrl", station.streamUrl)
            putExtra("logoUrl", station.logoUrl)
            putExtra("country", station.country)
            putExtra("genre", station.genre)
        }
        sendBroadcast(intent)
        Log.d(TAG, "Sent PLAY_STATION broadcast for: ${station.name}")
    }

    /**
     * Set selected country for filtering
     */
    fun setSelectedCountry(country: String?) {
        if (selectedCountry != country) {
            selectedCountry = country
            // Clear caches when country changes
            cachedPopularStations = emptyList()
            cachedGenres = emptyList()
            cachedGenreStations.clear()
            // Preload new data
            preloadData()
        }
    }
}
