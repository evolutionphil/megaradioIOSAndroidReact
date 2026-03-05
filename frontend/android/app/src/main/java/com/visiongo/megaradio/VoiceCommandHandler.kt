package com.visiongo.megaradio

import android.content.Intent
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * VoiceCommandHandler - Google Assistant Voice Commands for MegaRadio
 * 
 * Handles voice commands like:
 * - "Hey Google, play MegaRadio"
 * - "Hey Google, play jazz on MegaRadio"
 * - "Hey Google, play [station name]"
 * - "Hey Google, next station"
 * 
 * This class integrates with MediaSessionCompat.Callback for voice control.
 * Google Assistant uses MediaSession for all media app voice commands.
 * 
 * Key Methods:
 * - onPlayFromSearch: Called for "play [query]" commands
 * - onPlay: Called for "play" command
 * - onPause: Called for "pause" command
 * - onSkipToNext: Called for "next" command
 * - onSkipToPrevious: Called for "previous" command
 * - onStop: Called for "stop" command
 */
class VoiceCommandHandler(
    private val service: MegaRadioAutoService,
    private val mediaSession: MediaSessionCompat
) : MediaSessionCompat.Callback() {
    
    companion object {
        private const val TAG = "VoiceCommandHandler"
        
        // Voice command extras
        const val EXTRA_MEDIA_FOCUS = "android.intent.extra.MEDIA_FOCUS"
        const val EXTRA_QUERY = "query"
        const val EXTRA_GENRE = "android.intent.extra.genre"
        const val EXTRA_ARTIST = "android.intent.extra.artist"
        
        // Media focus types
        const val MEDIA_FOCUS_GENRE = "vnd.android.cursor.item/genre"
        const val MEDIA_FOCUS_ARTIST = "vnd.android.cursor.item/artist"
        const val MEDIA_FOCUS_UNSTRUCTURED = "vnd.android.cursor.item/*"
    }
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var apiClient: MegaRadioApiClient
    
    init {
        try {
            apiClient = MegaRadioApiClient.getInstance(service.applicationContext)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get API client: ${e.message}")
        }
    }
    
    /**
     * Handle "Hey Google, play [query] on MegaRadio"
     * This is the main entry point for voice search commands
     */
    override fun onPlayFromSearch(query: String?, extras: Bundle?) {
        Log.d(TAG, "🎤 Voice command: onPlayFromSearch - query: '$query'")
        
        if (extras != null) {
            logExtras(extras)
        }
        
        scope.launch {
            try {
                // Determine search type from extras
                val mediaFocus = extras?.getString(EXTRA_MEDIA_FOCUS)
                val genre = extras?.getString(EXTRA_GENRE)
                val artist = extras?.getString(EXTRA_ARTIST)
                
                when {
                    // Genre-specific search: "play jazz"
                    mediaFocus == MEDIA_FOCUS_GENRE || !genre.isNullOrEmpty() -> {
                        val genreQuery = genre ?: query ?: ""
                        Log.d(TAG, "Searching by genre: $genreQuery")
                        searchAndPlayByGenre(genreQuery)
                    }
                    
                    // Artist/station search: "play BBC Radio"
                    mediaFocus == MEDIA_FOCUS_ARTIST || !artist.isNullOrEmpty() -> {
                        val stationQuery = artist ?: query ?: ""
                        Log.d(TAG, "Searching by station/artist: $stationQuery")
                        searchAndPlayStation(stationQuery)
                    }
                    
                    // General search or empty query
                    query.isNullOrEmpty() -> {
                        Log.d(TAG, "No query - playing popular stations")
                        playPopularStations()
                    }
                    
                    // Unstructured query: "play some music"
                    else -> {
                        Log.d(TAG, "General search: $query")
                        searchAndPlayStation(query)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error handling voice search: ${e.message}", e)
                // Fallback to popular stations
                playPopularStations()
            }
        }
    }
    
    /**
     * Handle "Hey Google, play" (resume playback)
     */
    override fun onPlay() {
        Log.d(TAG, "🎤 Voice command: onPlay")
        service.resumePlayback()
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
    }
    
    /**
     * Handle "Hey Google, pause"
     */
    override fun onPause() {
        Log.d(TAG, "🎤 Voice command: onPause")
        service.pausePlayback()
        updatePlaybackState(PlaybackStateCompat.STATE_PAUSED)
    }
    
    /**
     * Handle "Hey Google, stop"
     */
    override fun onStop() {
        Log.d(TAG, "🎤 Voice command: onStop")
        service.stopPlayback()
        updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
    }
    
    /**
     * Handle "Hey Google, next" / "skip"
     */
    override fun onSkipToNext() {
        Log.d(TAG, "🎤 Voice command: onSkipToNext")
        service.playNextStation()
    }
    
    /**
     * Handle "Hey Google, previous" / "go back"
     */
    override fun onSkipToPrevious() {
        Log.d(TAG, "🎤 Voice command: onSkipToPrevious")
        service.playPreviousStation()
    }
    
    /**
     * Handle "Hey Google, play [mediaId]" from browse tree
     */
    override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
        Log.d(TAG, "🎤 Voice command: onPlayFromMediaId - $mediaId")
        mediaId?.let { service.playStationById(it) }
    }
    
    /**
     * Handle custom actions (can be extended)
     */
    override fun onCustomAction(action: String?, extras: Bundle?) {
        Log.d(TAG, "🎤 Voice command: onCustomAction - $action")
        when (action) {
            "SHUFFLE" -> {
                // Shuffle stations
                Log.d(TAG, "Shuffle mode requested")
            }
            "FAVORITE" -> {
                // Add current to favorites
                Log.d(TAG, "Add to favorites requested")
            }
        }
    }
    
    // MARK: - Search and Play Methods
    
    private suspend fun searchAndPlayStation(query: String) {
        Log.d(TAG, "Searching stations for: '$query'")
        
        // First try cache
        val cachedStations = apiClient.getPopularStationsCached(null, 100)
        
        // Filter by query
        val matchingStation = cachedStations.find { station ->
            station.name.contains(query, ignoreCase = true) ||
            station.genre.contains(query, ignoreCase = true) ||
            station.tags.contains(query, ignoreCase = true)
        }
        
        if (matchingStation != null) {
            Log.d(TAG, "Found matching station: ${matchingStation.name}")
            service.playStation(matchingStation)
            return
        }
        
        // If not in cache, try API search
        val searchResults = apiClient.searchStations(query, 5)
        if (searchResults.isNotEmpty()) {
            Log.d(TAG, "Found via API search: ${searchResults.first().name}")
            service.playStation(searchResults.first())
        } else {
            // Fallback to popular
            Log.d(TAG, "No results - playing popular")
            playPopularStations()
        }
    }
    
    private suspend fun searchAndPlayByGenre(genre: String) {
        Log.d(TAG, "Searching by genre: '$genre'")
        
        // Map common genre names to slugs
        val genreSlug = mapGenreToSlug(genre)
        
        // Get stations by genre
        val stations = apiClient.getStationsByGenre(genreSlug, 20)
        
        if (stations.isNotEmpty()) {
            Log.d(TAG, "Found ${stations.size} stations for genre: $genre")
            // Play first station from genre
            service.playStation(stations.first())
            // Update browse list with genre stations
            service.updateCurrentPlaylist(stations)
        } else {
            Log.d(TAG, "No stations for genre - trying station search")
            searchAndPlayStation(genre)
        }
    }
    
    private suspend fun playPopularStations() {
        Log.d(TAG, "Playing popular stations")
        val stations = apiClient.getPopularStationsCached(null, 50)
        if (stations.isNotEmpty()) {
            service.playStation(stations.first())
            service.updateCurrentPlaylist(stations)
        }
    }
    
    // MARK: - Helper Methods
    
    private fun mapGenreToSlug(genre: String): String {
        val mappings = mapOf(
            "pop" to "pop",
            "rock" to "rock",
            "jazz" to "jazz",
            "classical" to "classical",
            "electronic" to "electronic",
            "dance" to "electronic",
            "hip hop" to "hip-hop",
            "hip-hop" to "hip-hop",
            "rap" to "hip-hop",
            "country" to "country",
            "r&b" to "r-n-b",
            "rnb" to "r-n-b",
            "news" to "news",
            "talk" to "talk",
            "sports" to "sports",
            "türkçe" to "turkish",
            "turkish" to "turkish"
        )
        return mappings[genre.lowercase()] ?: genre.lowercase().replace(" ", "-")
    }
    
    private fun updatePlaybackState(state: Int) {
        val stateBuilder = PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_STOP or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH
            )
            .setState(state, 0, 1f)
        
        mediaSession.setPlaybackState(stateBuilder.build())
    }
    
    private fun logExtras(extras: Bundle) {
        Log.d(TAG, "Voice command extras:")
        for (key in extras.keySet()) {
            Log.d(TAG, "  $key: ${extras.get(key)}")
        }
    }
}

/*
 * SUPPORTED GOOGLE ASSISTANT VOICE COMMANDS:
 * 
 * General Playback:
 * - "Hey Google, play MegaRadio"
 * - "Hey Google, open MegaRadio"
 * - "Hey Google, listen to MegaRadio"
 * 
 * Station Search:
 * - "Hey Google, play [station name] on MegaRadio"
 * - "Hey Google, play BBC Radio on MegaRadio"
 * - "Hey Google, play Virgin Radio"
 * 
 * Genre Search:
 * - "Hey Google, play jazz on MegaRadio"
 * - "Hey Google, play pop music on MegaRadio"
 * - "Hey Google, play rock radio"
 * - "Hey Google, play electronic music"
 * 
 * Controls:
 * - "Hey Google, pause"
 * - "Hey Google, resume"
 * - "Hey Google, next station"
 * - "Hey Google, previous station"
 * - "Hey Google, stop"
 * - "Hey Google, skip"
 * 
 * Volume (handled by system):
 * - "Hey Google, volume up"
 * - "Hey Google, volume down"
 * - "Hey Google, set volume to 50%"
 */
