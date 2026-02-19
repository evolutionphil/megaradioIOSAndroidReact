// PhoneConnectivityService.kt
// Handles communication between Android phone and Wear OS watch

package com.visiongo.megaradio.wear.data

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject

class PhoneConnectivityService(private val context: Context) : 
    DataClient.OnDataChangedListener,
    MessageClient.OnMessageReceivedListener {
    
    companion object {
        private const val TAG = "PhoneConnectivity"
        
        // Message paths
        const val PATH_PLAY = "/play"
        const val PATH_PAUSE = "/pause"
        const val PATH_RESUME = "/resume"
        const val PATH_GET_STATIONS = "/get_stations"
        const val PATH_GET_FAVORITES = "/get_favorites"
        const val PATH_GET_GENRES = "/get_genres"
        const val PATH_GET_COUNTRIES = "/get_countries"
        
        // Data paths
        const val PATH_STATIONS_DATA = "/stations"
        const val PATH_FAVORITES_DATA = "/favorites"
        const val PATH_GENRES_DATA = "/genres"
        const val PATH_COUNTRIES_DATA = "/countries"
        const val PATH_NOW_PLAYING = "/now_playing"
    }
    
    private val dataClient: DataClient = Wearable.getDataClient(context)
    private val messageClient: MessageClient = Wearable.getMessageClient(context)
    private val nodeClient: NodeClient = Wearable.getNodeClient(context)
    
    private val _isPhoneConnected = MutableStateFlow(false)
    val isPhoneConnected: StateFlow<Boolean> = _isPhoneConnected
    
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
    
    init {
        dataClient.addListener(this)
        messageClient.addListener(this)
        checkPhoneConnection()
    }
    
    private fun checkPhoneConnection() {
        nodeClient.connectedNodes.addOnSuccessListener { nodes ->
            _isPhoneConnected.value = nodes.isNotEmpty()
            Log.d(TAG, "Phone connected: ${_isPhoneConnected.value}")
        }
    }
    
    // Send play command to phone
    suspend fun sendPlayCommand(stationId: String) {
        val nodes = nodeClient.connectedNodes.await()
        nodes.forEach { node ->
            messageClient.sendMessage(
                node.id,
                PATH_PLAY,
                stationId.toByteArray()
            ).await()
            Log.d(TAG, "Play command sent for station: $stationId")
        }
    }
    
    // Send pause command to phone
    suspend fun sendPauseCommand() {
        val nodes = nodeClient.connectedNodes.await()
        nodes.forEach { node ->
            messageClient.sendMessage(node.id, PATH_PAUSE, null).await()
            Log.d(TAG, "Pause command sent")
        }
    }
    
    // Send resume command to phone
    suspend fun sendResumeCommand() {
        val nodes = nodeClient.connectedNodes.await()
        nodes.forEach { node ->
            messageClient.sendMessage(node.id, PATH_RESUME, null).await()
            Log.d(TAG, "Resume command sent")
        }
    }
    
    // Request stations from phone
    suspend fun requestStations(genre: String? = null, country: String? = null) {
        val nodes = nodeClient.connectedNodes.await()
        val params = JSONObject().apply {
            genre?.let { put("genre", it) }
            country?.let { put("country", it) }
        }
        nodes.forEach { node ->
            messageClient.sendMessage(
                node.id,
                PATH_GET_STATIONS,
                params.toString().toByteArray()
            ).await()
        }
    }
    
    // Request favorites from phone
    suspend fun requestFavorites() {
        val nodes = nodeClient.connectedNodes.await()
        nodes.forEach { node ->
            messageClient.sendMessage(node.id, PATH_GET_FAVORITES, null).await()
        }
    }
    
    // Request genres from phone
    suspend fun requestGenres() {
        val nodes = nodeClient.connectedNodes.await()
        nodes.forEach { node ->
            messageClient.sendMessage(node.id, PATH_GET_GENRES, null).await()
        }
    }
    
    // Request countries from phone
    suspend fun requestCountries() {
        val nodes = nodeClient.connectedNodes.await()
        nodes.forEach { node ->
            messageClient.sendMessage(node.id, PATH_GET_COUNTRIES, null).await()
        }
    }
    
    // Handle data changes from phone
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED) {
                val dataItem = event.dataItem
                when (dataItem.uri.path) {
                    PATH_STATIONS_DATA -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        _stations.value = parseStations(dataMap.getString("data") ?: "[]")
                    }
                    PATH_FAVORITES_DATA -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        _favorites.value = parseStations(dataMap.getString("data") ?: "[]")
                    }
                    PATH_GENRES_DATA -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        _genres.value = parseGenres(dataMap.getString("data") ?: "[]")
                    }
                    PATH_COUNTRIES_DATA -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        _countries.value = parseCountries(dataMap.getString("data") ?: "[]")
                    }
                    PATH_NOW_PLAYING -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        _nowPlaying.value = parseStation(dataMap.getString("station"))
                        _isPlaying.value = dataMap.getBoolean("isPlaying")
                    }
                }
            }
        }
    }
    
    // Handle messages from phone
    override fun onMessageReceived(messageEvent: MessageEvent) {
        Log.d(TAG, "Message received: ${messageEvent.path}")
        when (messageEvent.path) {
            "/playback_state" -> {
                val data = String(messageEvent.data)
                val json = JSONObject(data)
                _isPlaying.value = json.optBoolean("isPlaying", false)
            }
        }
    }
    
    // Parse helpers
    private fun parseStations(json: String): List<Station> {
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                Station(
                    id = obj.getString("id"),
                    name = obj.getString("name"),
                    country = obj.optString("country", null),
                    city = obj.optString("city", null),
                    logoUrl = obj.optString("logoUrl", null)
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
                id = obj.getString("id"),
                name = obj.getString("name"),
                country = obj.optString("country", null),
                city = obj.optString("city", null),
                logoUrl = obj.optString("logoUrl", null)
            )
        } catch (e: Exception) {
            null
        }
    }
    
    private fun parseGenres(json: String): List<Genre> {
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                Genre(
                    id = obj.getString("id"),
                    name = obj.getString("name")
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    private fun parseCountries(json: String): List<Country> {
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                Country(
                    code = obj.getString("code"),
                    name = obj.getString("name")
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    fun cleanup() {
        dataClient.removeListener(this)
        messageClient.removeListener(this)
    }
}

// Extension to await Tasks
private suspend fun <T> com.google.android.gms.tasks.Task<T>.await(): T {
    return kotlinx.coroutines.tasks.await()
}
