// MegaRadioWearApp.kt
// Main composable with navigation - connected to WearViewModel and phone data

package com.visiongo.megaradio.wear.presentation

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.material.*
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.visiongo.megaradio.wear.presentation.theme.AccentPink
import com.visiongo.megaradio.wear.presentation.theme.BackgroundBlack
import com.visiongo.megaradio.wear.presentation.theme.TextWhite
import kotlinx.coroutines.launch

// Navigation routes
object Routes {
    const val HOME = "home"
    const val GENRES = "genres"
    const val GENRE_STATIONS = "genre_stations/{genreId}/{genreName}"
    const val COUNTRIES = "countries"
    const val COUNTRY_STATIONS = "country_stations/{countryCode}/{countryName}"
    const val FAVORITES = "favorites"
    const val NOW_PLAYING = "now_playing"
}

@Composable
fun MegaRadioWearApp(viewModel: WearViewModel = viewModel()) {
    val navController = rememberSwipeDismissableNavController()

    // Observe live data from phone
    val genres by viewModel.genres.collectAsState()
    val countries by viewModel.countries.collectAsState()
    val favorites by viewModel.favorites.collectAsState()
    val nowPlaying by viewModel.nowPlaying.collectAsState()
    val isPlaying by viewModel.isPlaying.collectAsState()
    val songTitle by viewModel.songTitle.collectAsState()
    val artistName by viewModel.artistName.collectAsState()
    val isPhoneConnected by viewModel.isPhoneConnected.collectAsState()
    val filteredStations by viewModel.filteredStations.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val playError by viewModel.playError.collectAsState()

    SwipeDismissableNavHost(
        navController = navController,
        startDestination = Routes.HOME
    ) {
        // Home Screen
        composable(Routes.HOME) {
            HomeScreen(
                isPhoneConnected = isPhoneConnected,
                nowPlaying = nowPlaying,
                isPlaying = isPlaying,
                onGenresClick = { navController.navigate(Routes.GENRES) },
                onCountriesClick = { navController.navigate(Routes.COUNTRIES) },
                onFavoritesClick = { navController.navigate(Routes.FAVORITES) },
                onNowPlayingClick = {
                    if (nowPlaying != null) {
                        navController.navigate(Routes.NOW_PLAYING)
                    }
                },
                onRefreshClick = { viewModel.refreshData() }
            )
        }

        // Genres List
        composable(Routes.GENRES) {
            GenresScreen(
                genres = genres,
                onGenreClick = { genre ->
                    viewModel.requestStationsByGenre(genre.id)
                    navController.navigate("genre_stations/${Uri.encode(genre.id)}/${Uri.encode(genre.name)}")
                }
            )
        }

        // Genre Stations
        composable(Routes.GENRE_STATIONS) { backStackEntry ->
            val playScope = rememberCoroutineScope()
            val genreName = backStackEntry.arguments?.getString("genreName") ?: ""
            StationsScreen(
                title = genreName,
                stations = filteredStations,
                isLoading = isLoading,
                error = error,
                playError = playError,
                onStationClick = { station ->
                    playScope.launch {
                        if (viewModel.playStation(station)) navController.navigate(Routes.NOW_PLAYING)
                    }
                }
            )
        }

        // Countries List
        composable(Routes.COUNTRIES) {
            CountriesScreen(
                countries = countries,
                onCountryClick = { country ->
                    // The catalog API filters by country name, not an inferred ISO code.
                    viewModel.requestStationsByCountry(country.name)
                    navController.navigate("country_stations/${Uri.encode(country.code)}/${Uri.encode(country.name)}")
                }
            )
        }

        // Country Stations
        composable(Routes.COUNTRY_STATIONS) { backStackEntry ->
            val playScope = rememberCoroutineScope()
            val countryName = backStackEntry.arguments?.getString("countryName") ?: ""
            StationsScreen(
                title = countryName,
                stations = filteredStations,
                isLoading = isLoading,
                error = error,
                playError = playError,
                onStationClick = { station ->
                    playScope.launch {
                        if (viewModel.playStation(station)) navController.navigate(Routes.NOW_PLAYING)
                    }
                }
            )
        }

        // Favorites
        composable(Routes.FAVORITES) {
            val playScope = rememberCoroutineScope()
            LaunchedEffect(Unit) { viewModel.clearPlaybackError() }
            FavoritesScreen(
                favorites = favorites,
                playError = playError,
                onStationClick = { station ->
                    playScope.launch {
                        if (viewModel.playStation(station)) navController.navigate(Routes.NOW_PLAYING)
                    }
                }
            )
        }

        // Now Playing
        composable(Routes.NOW_PLAYING) {
            NowPlayingScreen(
                station = nowPlaying,
                isPlaying = isPlaying,
                songTitle = songTitle,
                artistName = artistName,
                onPlayPauseClick = { viewModel.togglePlayPause() },
                onPreviousClick = { viewModel.previousStation() },
                onNextClick = { viewModel.nextStation() }
            )
        }
    }
}
