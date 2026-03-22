// MegaRadioWearApp.kt
// Main composable with navigation - connected to WearViewModel and phone data

package com.visiongo.megaradio.wear.presentation

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
                    navController.navigate("genre_stations/${genre.id}/${genre.name}")
                }
            )
        }

        // Genre Stations
        composable(Routes.GENRE_STATIONS) { backStackEntry ->
            val genreName = backStackEntry.arguments?.getString("genreName") ?: ""
            StationsScreen(
                title = genreName,
                stations = filteredStations,
                isLoading = isLoading,
                onStationClick = { station ->
                    viewModel.playStation(station)
                    navController.navigate(Routes.NOW_PLAYING)
                }
            )
        }

        // Countries List
        composable(Routes.COUNTRIES) {
            CountriesScreen(
                countries = countries,
                onCountryClick = { country ->
                    viewModel.requestStationsByCountry(country.code)
                    navController.navigate("country_stations/${country.code}/${country.name}")
                }
            )
        }

        // Country Stations
        composable(Routes.COUNTRY_STATIONS) { backStackEntry ->
            val countryName = backStackEntry.arguments?.getString("countryName") ?: ""
            StationsScreen(
                title = countryName,
                stations = filteredStations,
                isLoading = isLoading,
                onStationClick = { station ->
                    viewModel.playStation(station)
                    navController.navigate(Routes.NOW_PLAYING)
                }
            )
        }

        // Favorites
        composable(Routes.FAVORITES) {
            FavoritesScreen(
                favorites = favorites,
                onStationClick = { station ->
                    viewModel.playStation(station)
                    navController.navigate(Routes.NOW_PLAYING)
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
