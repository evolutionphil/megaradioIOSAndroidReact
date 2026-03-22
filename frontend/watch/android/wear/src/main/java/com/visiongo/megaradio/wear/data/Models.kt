// Models.kt
// Data models for Wear OS app

package com.visiongo.megaradio.wear.data

data class Station(
    val id: String,
    val name: String,
    val country: String? = null,
    val city: String? = null,
    val logoUrl: String? = null,
    val streamUrl: String? = null,
    val genre: String? = null
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
