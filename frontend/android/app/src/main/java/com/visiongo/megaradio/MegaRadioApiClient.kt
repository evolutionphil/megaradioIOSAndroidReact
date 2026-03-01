package com.visiongo.megaradio

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * API Client for MegaRadio Android Auto
 * Handles all API calls to themegaradio.com
 */
class MegaRadioApiClient {
    
    companion object {
        private const val TAG = "MegaRadioApiClient"
        private const val BASE_URL = "https://themegaradio.com"
        private const val API_KEY = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
        
        // Singleton instance
        @Volatile
        private var instance: MegaRadioApiClient? = null
        
        fun getInstance(): MegaRadioApiClient {
            return instance ?: synchronized(this) {
                instance ?: MegaRadioApiClient().also { instance = it }
            }
        }
    }
    
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()
    
    /**
     * Station data class
     */
    data class Station(
        val id: String,
        val name: String,
        val streamUrl: String,
        val logoUrl: String,
        val country: String,
        val genre: String,
        val tags: String
    )
    
    /**
     * Genre data class
     */
    data class Genre(
        val name: String,
        val slug: String,
        val stationCount: Int
    )
    
    /**
     * Make API request with proper headers
     */
    private fun makeRequest(url: String): String? {
        return try {
            val request = Request.Builder()
                .url(url)
                .addHeader("X-API-Key", API_KEY)
                .addHeader("Content-Type", "application/json")
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                response.body?.string()
            } else {
                Log.e(TAG, "API request failed: ${response.code} - ${response.message}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "API request error: ${e.message}", e)
            null
        }
    }
    
    /**
     * Parse station from JSON object
     */
    private fun parseStation(json: JSONObject): Station {
        val id = json.optString("_id", json.optString("id", ""))
        val name = json.optString("name", "Unknown Station")
        
        // Stream URL - check multiple fields
        var streamUrl = json.optString("url", "")
        if (streamUrl.isEmpty()) {
            streamUrl = json.optString("url_resolved", "")
        }
        if (streamUrl.isEmpty()) {
            streamUrl = json.optString("streamUrl", "")
        }
        
        // Logo URL - check multiple fields with fallback
        var logoUrl = ""
        
        // Check logoAssets first
        val logoAssets = json.optJSONObject("logoAssets")
        if (logoAssets != null) {
            val folder = logoAssets.optString("folder", "")
            val webp96 = logoAssets.optString("webp96", "")
            if (folder.isNotEmpty() && webp96.isNotEmpty()) {
                logoUrl = "$BASE_URL/station-logos/$folder/$webp96"
            }
        }
        
        // Fallback to favicon
        if (logoUrl.isEmpty()) {
            val favicon = json.optString("favicon", "")
            if (favicon.isNotEmpty() && favicon != "null") {
                logoUrl = if (favicon.startsWith("http")) favicon else "$BASE_URL$favicon"
            }
        }
        
        // Fallback to logo
        if (logoUrl.isEmpty()) {
            val logo = json.optString("logo", "")
            if (logo.isNotEmpty() && logo != "null") {
                logoUrl = if (logo.startsWith("http")) logo else "$BASE_URL$logo"
            }
        }
        
        // Final fallback - MegaRadio logo
        if (logoUrl.isEmpty()) {
            logoUrl = "$BASE_URL/logo.png"
        }
        
        val country = json.optString("country", "")
        val genre = json.optString("genre", json.optString("tags", "").split(",").firstOrNull() ?: "")
        val tags = json.optString("tags", "")
        
        return Station(id, name, streamUrl, logoUrl, country, genre, tags)
    }
    
    /**
     * Get popular stations
     * @param country Optional country filter (English name like "Austria")
     * @param limit Number of stations to fetch
     */
    suspend fun getPopularStations(country: String? = null, limit: Int = 50): List<Station> {
        return withContext(Dispatchers.IO) {
            try {
                val url = buildString {
                    append("$BASE_URL/api/stations/popular?limit=$limit&tv=1")
                    if (!country.isNullOrEmpty()) {
                        append("&country=${java.net.URLEncoder.encode(country, "UTF-8")}")
                    }
                }
                
                Log.d(TAG, "Fetching popular stations: $url")
                
                val response = makeRequest(url) ?: return@withContext emptyList()
                val json = JSONObject(response)
                
                // Response can be array or object with stations field
                val stationsArray = if (json.has("stations")) {
                    json.getJSONArray("stations")
                } else {
                    JSONArray(response)
                }
                
                val stations = mutableListOf<Station>()
                for (i in 0 until stationsArray.length()) {
                    try {
                        val stationJson = stationsArray.getJSONObject(i)
                        val station = parseStation(stationJson)
                        if (station.streamUrl.isNotEmpty()) {
                            stations.add(station)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error parsing station at index $i: ${e.message}")
                    }
                }
                
                Log.d(TAG, "Fetched ${stations.size} popular stations")
                stations
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching popular stations: ${e.message}", e)
                emptyList()
            }
        }
    }
    
    /**
     * Get genres list
     * @param country Optional country filter
     * @param limit Number of genres to fetch
     */
    suspend fun getGenres(country: String? = null, limit: Int = 40): List<Genre> {
        return withContext(Dispatchers.IO) {
            try {
                val url = buildString {
                    append("$BASE_URL/api/genres/precomputed?limit=$limit")
                    if (!country.isNullOrEmpty()) {
                        append("&country=${java.net.URLEncoder.encode(country, "UTF-8")}")
                    }
                }
                
                Log.d(TAG, "Fetching genres: $url")
                
                val response = makeRequest(url) ?: return@withContext emptyList()
                val json = JSONObject(response)
                
                val genresArray = if (json.has("genres")) {
                    json.getJSONArray("genres")
                } else if (json.has("data")) {
                    json.getJSONArray("data")
                } else {
                    JSONArray(response)
                }
                
                val genres = mutableListOf<Genre>()
                for (i in 0 until genresArray.length()) {
                    try {
                        val genreJson = genresArray.getJSONObject(i)
                        val genre = Genre(
                            name = genreJson.optString("name", ""),
                            slug = genreJson.optString("slug", genreJson.optString("name", "").lowercase()),
                            stationCount = genreJson.optInt("stationCount", genreJson.optInt("total_stations", 0))
                        )
                        if (genre.name.isNotEmpty()) {
                            genres.add(genre)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error parsing genre at index $i: ${e.message}")
                    }
                }
                
                Log.d(TAG, "Fetched ${genres.size} genres")
                genres
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching genres: ${e.message}", e)
                emptyList()
            }
        }
    }
    
    /**
     * Get stations by genre
     * @param genreSlug Genre slug (e.g., "pop", "rock")
     * @param country Optional country filter (English name)
     * @param limit Number of stations to fetch
     */
    suspend fun getStationsByGenre(genreSlug: String, country: String? = null, limit: Int = 50): List<Station> {
        return withContext(Dispatchers.IO) {
            try {
                val url = buildString {
                    append("$BASE_URL/api/genres/$genreSlug/stations?limit=$limit")
                    if (!country.isNullOrEmpty()) {
                        append("&country=${java.net.URLEncoder.encode(country, "UTF-8")}")
                    }
                }
                
                Log.d(TAG, "Fetching stations for genre $genreSlug: $url")
                
                val response = makeRequest(url) ?: return@withContext emptyList()
                val json = JSONObject(response)
                
                val stationsArray = if (json.has("stations")) {
                    json.getJSONArray("stations")
                } else {
                    JSONArray(response)
                }
                
                val stations = mutableListOf<Station>()
                for (i in 0 until stationsArray.length()) {
                    try {
                        val stationJson = stationsArray.getJSONObject(i)
                        val station = parseStation(stationJson)
                        if (station.streamUrl.isNotEmpty()) {
                            stations.add(station)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error parsing station at index $i: ${e.message}")
                    }
                }
                
                Log.d(TAG, "Fetched ${stations.size} stations for genre $genreSlug")
                stations
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching genre stations: ${e.message}", e)
                emptyList()
            }
        }
    }
    
    /**
     * Search stations
     * @param query Search query
     * @param limit Number of stations to fetch
     */
    suspend fun searchStations(query: String, limit: Int = 30): List<Station> {
        return withContext(Dispatchers.IO) {
            try {
                val encodedQuery = java.net.URLEncoder.encode(query, "UTF-8")
                val url = "$BASE_URL/api/stations/search?q=$encodedQuery&limit=$limit"
                
                Log.d(TAG, "Searching stations: $url")
                
                val response = makeRequest(url) ?: return@withContext emptyList()
                val json = JSONObject(response)
                
                val stationsArray = if (json.has("stations")) {
                    json.getJSONArray("stations")
                } else if (json.has("results")) {
                    json.getJSONArray("results")
                } else {
                    JSONArray(response)
                }
                
                val stations = mutableListOf<Station>()
                for (i in 0 until stationsArray.length()) {
                    try {
                        val stationJson = stationsArray.getJSONObject(i)
                        val station = parseStation(stationJson)
                        if (station.streamUrl.isNotEmpty()) {
                            stations.add(station)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error parsing station at index $i: ${e.message}")
                    }
                }
                
                Log.d(TAG, "Found ${stations.size} stations for query: $query")
                stations
            } catch (e: Exception) {
                Log.e(TAG, "Error searching stations: ${e.message}", e)
                emptyList()
            }
        }
    }
    
    /**
     * Get diverse recommendations
     * @param country Optional country filter
     * @param limit Number of stations to fetch
     */
    suspend fun getDiverseRecommendations(country: String? = null, limit: Int = 20): List<Station> {
        return withContext(Dispatchers.IO) {
            try {
                val url = buildString {
                    append("$BASE_URL/api/recommendations/diverse?limit=$limit")
                    if (!country.isNullOrEmpty()) {
                        append("&country=${java.net.URLEncoder.encode(country, "UTF-8")}")
                    }
                }
                
                Log.d(TAG, "Fetching diverse recommendations: $url")
                
                val response = makeRequest(url) ?: return@withContext emptyList()
                val json = JSONObject(response)
                
                val stationsArray = if (json.has("stations")) {
                    json.getJSONArray("stations")
                } else {
                    JSONArray(response)
                }
                
                val stations = mutableListOf<Station>()
                for (i in 0 until stationsArray.length()) {
                    try {
                        val stationJson = stationsArray.getJSONObject(i)
                        val station = parseStation(stationJson)
                        if (station.streamUrl.isNotEmpty()) {
                            stations.add(station)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error parsing station at index $i: ${e.message}")
                    }
                }
                
                Log.d(TAG, "Fetched ${stations.size} diverse recommendations")
                stations
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching recommendations: ${e.message}", e)
                emptyList()
            }
        }
    }
}
