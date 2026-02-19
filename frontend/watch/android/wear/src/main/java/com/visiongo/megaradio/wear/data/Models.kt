// Models.kt
// Data models for Wear OS app

package com.visiongo.megaradio.wear.data

data class Station(
    val id: String,
    val name: String,
    val country: String? = null,
    val city: String? = null,
    val logoUrl: String? = null
) {
    val locationText: String
        get() = when {
            country != null && city != null -> "$country, $city"
            country != null -> country
            else -> ""
        }
}

data class Genre(
    val id: String,
    val name: String
)

data class Country(
    val code: String,
    val name: String
)

// App State
data class AppState(
    val currentStation: Station? = null,
    val isPlaying: Boolean = false,
    val favorites: List<Station> = emptyList(),
    val genres: List<Genre> = emptyList(),
    val countries: List<Country> = emptyList(),
    val isPhoneConnected: Boolean = false
)
