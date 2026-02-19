// MegaRadioWearApp.kt
// Main composable with navigation

package com.visiongo.megaradio.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.visiongo.megaradio.wear.data.*
import com.visiongo.megaradio.wear.presentation.theme.AccentPink
import kotlinx.coroutines.delay

// Navigation routes
object Routes {
    const val SPLASH = "splash"
    const val HOME = "home"
    const val GENRES = "genres"
    const val GENRE_STATIONS = "genre_stations/{genreId}/{genreName}"
    const val COUNTRIES = "countries"
    const val COUNTRY_STATIONS = "country_stations/{countryCode}/{countryName}"
    const val FAVORITES = "favorites"
    const val NOW_PLAYING = "now_playing/{stationId}"
}

@Composable
fun MegaRadioWearApp() {
    val navController = rememberSwipeDismissableNavController()
    var appState by remember { mutableStateOf(AppState()) }
    
    // Initialize mock data
    LaunchedEffect(Unit) {
        appState = appState.copy(
            genres = listOf(
                Genre("jazz", "Jazz"),
                Genre("slow", "Slow"),
                Genre("dance", "Dance"),
                Genre("hip-hop", "Hip Hop"),
                Genre("pop", "Pop"),
                Genre("rock", "Rock")
            ),
            countries = listOf(
                Country("TR", "Turkey"),
                Country("DE", "Germany"),
                Country("FR", "France"),
                Country("IT", "Italy"),
                Country("US", "USA"),
                Country("GB", "UK")
            ),
            favorites = listOf(
                Station("1", "Metro FM", "Turkey", "Istanbul"),
                Station("2", "Power Türk", "Turkey", "Istanbul")
            )
        )
    }
    
    SwipeDismissableNavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        // Splash Screen
        composable(Routes.SPLASH) {
            SplashScreen(
                onTimeout = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }
        
        // Home Screen
        composable(Routes.HOME) {
            HomeScreen(
                onGenresClick = { navController.navigate(Routes.GENRES) },
                onCountriesClick = { navController.navigate(Routes.COUNTRIES) },
                onFavoritesClick = { navController.navigate(Routes.FAVORITES) }
            )
        }
        
        // Genres List
        composable(Routes.GENRES) {
            GenresScreen(
                genres = appState.genres,
                onGenreClick = { genre ->
                    navController.navigate("genre_stations/${genre.id}/${genre.name}")
                }
            )
        }
        
        // Genre Stations
        composable(Routes.GENRE_STATIONS) { backStackEntry ->
            val genreName = backStackEntry.arguments?.getString("genreName") ?: ""
            StationsScreen(
                title = genreName,
                stations = getMockStations(),
                onStationClick = { station ->
                    appState = appState.copy(currentStation = station, isPlaying = true)
                    navController.navigate("now_playing/${station.id}")
                }
            )
        }
        
        // Countries List
        composable(Routes.COUNTRIES) {
            CountriesScreen(
                countries = appState.countries,
                onCountryClick = { country ->
                    navController.navigate("country_stations/${country.code}/${country.name}")
                }
            )
        }
        
        // Country Stations
        composable(Routes.COUNTRY_STATIONS) { backStackEntry ->
            val countryName = backStackEntry.arguments?.getString("countryName") ?: ""
            StationsScreen(
                title = countryName,
                stations = getMockStations(),
                onStationClick = { station ->
                    appState = appState.copy(currentStation = station, isPlaying = true)
                    navController.navigate("now_playing/${station.id}")
                }
            )
        }
        
        // Favorites
        composable(Routes.FAVORITES) {
            FavoritesScreen(
                favorites = appState.favorites,
                onStationClick = { station ->
                    appState = appState.copy(currentStation = station, isPlaying = true)
                    navController.navigate("now_playing/${station.id}")
                }
            )
        }
        
        // Now Playing
        composable(Routes.NOW_PLAYING) {
            NowPlayingScreen(
                station = appState.currentStation,
                isPlaying = appState.isPlaying,
                onPlayPauseClick = {
                    appState = appState.copy(isPlaying = !appState.isPlaying)
                },
                onPreviousClick = { /* TODO */ },
                onNextClick = { /* TODO */ }
            )
        }
    }
}

// Mock stations helper
private fun getMockStations() = listOf(
    Station("1", "Metro FM", "Turkey", "Istanbul"),
    Station("2", "Power Türk", "Turkey", "Istanbul"),
    Station("3", "CNN Türk", "Turkey", "Ankara"),
    Station("4", "Kral FM", "Turkey", "Istanbul")
)
