package com.visiongo.megaradio.wear.data

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject

/**
 * Singleton repository that holds all data received from the phone.
 * Both the WearableListenerService and the PhoneConnectivityService write here.
 * The UI (ViewModel) observes the StateFlows.
 */
object WearDataRepository {

    private const val TAG = "WearDataRepo"

    private val _stations = MutableStateFlow<List<Station>>(emptyList())
    val stations: StateFlow<List<Station>> = _stations

    private val _favorites = MutableStateFlow<List<Station>>(emptyList())
    val favorites: StateFlow<List<Station>> = _favorites

    private val _genres = MutableStateFlow<List<Genre>>(emptyList())
    val genres: StateFlow<List<Genre>> = _genres

    private val _countries = MutableStateFlow<List<Country>>(emptyList())
    val countries: StateFlow<List<Country>> = _countries

    private val _nowPlaying = MutableStateFlow<Station?>(null)
    val nowPlaying: StateFlow<Station?> = _nowPlaying

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private val _songTitle = MutableStateFlow("")
    val songTitle: StateFlow<String> = _songTitle

    private val _artistName = MutableStateFlow("")
    val artistName: StateFlow<String> = _artistName

    private val _isPhoneConnected = MutableStateFlow(false)
    val isPhoneConnected: StateFlow<Boolean> = _isPhoneConnected

    fun setPhoneConnected(connected: Boolean) {
        _isPhoneConnected.value = connected
    }

    fun updateStations(json: String) {
        _stations.value = parseStations(json)
        Log.d(TAG, "Stations updated: ${_stations.value.size}")
    }

    fun updateFavorites(json: String) {
        _favorites.value = parseStations(json)
        Log.d(TAG, "Favorites updated: ${_favorites.value.size}")
    }

    fun updateGenres(json: String) {
        _genres.value = parseGenres(json)
        Log.d(TAG, "Genres updated: ${_genres.value.size}")
    }

    fun updateCountries(json: String) {
        _countries.value = parseCountries(json)
        Log.d(TAG, "Countries updated: ${_countries.value.size}")
    }

    fun updateNowPlaying(stationJson: String?, isPlaying: Boolean, songTitle: String, artistName: String) {
        _nowPlaying.value = parseStation(stationJson)
        _isPlaying.value = isPlaying
        _songTitle.value = songTitle
        _artistName.value = artistName
        Log.d(TAG, "Now playing updated: ${_nowPlaying.value?.name}, playing=$isPlaying")
    }

    fun updatePlaybackState(json: String) {
        try {
            val obj = JSONObject(json)
            _isPlaying.value = obj.optBoolean("isPlaying", false)
            val song = obj.optString("songTitle", "")
            val artist = obj.optString("artistName", "")
            if (song.isNotEmpty()) _songTitle.value = song
            if (artist.isNotEmpty()) _artistName.value = artist
            Log.d(TAG, "Playback state updated: playing=${_isPlaying.value}")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing playback state: $e")
        }
    }

    // ---- Parsers ----

    private fun parseStations(json: String): List<Station> {
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                Station(
                    id = obj.optString("id", ""),
                    name = obj.optString("name", ""),
                    country = obj.optString("country", null),
                    city = obj.optString("city", null),
                    logoUrl = obj.optString("logoUrl", null),
                    streamUrl = obj.optString("streamUrl", null),
                    genre = obj.optString("genre", null)
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing stations: $e")
            emptyList()
        }
    }

    private fun parseStation(json: String?): Station? {
        if (json.isNullOrEmpty()) return null
        return try {
            val obj = JSONObject(json)
            Station(
                id = obj.optString("id", ""),
                name = obj.optString("name", ""),
                country = obj.optString("country", null),
                city = obj.optString("city", null),
                logoUrl = obj.optString("logoUrl", null),
                streamUrl = obj.optString("streamUrl", null),
                genre = obj.optString("genre", null)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing station: $e")
            null
        }
    }

    private fun parseGenres(json: String): List<Genre> {
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                Genre(
                    id = obj.optString("id", obj.optString("slug", "")),
                    name = obj.optString("name", "")
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing genres: $e")
            emptyList()
        }
    }

    private fun parseCountries(json: String): List<Country> {
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                Country(
                    code = obj.optString("code", ""),
                    name = obj.optString("name", "")
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing countries: $e")
            emptyList()
        }
    }
}
