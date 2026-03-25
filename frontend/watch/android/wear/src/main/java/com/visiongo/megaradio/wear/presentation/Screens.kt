// Screens.kt
// All screen composables for Wear OS - connected to phone via ViewModel

package com.visiongo.megaradio.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import com.visiongo.megaradio.wear.data.*
import com.visiongo.megaradio.wear.presentation.theme.*
import kotlinx.coroutines.delay

// ========================================
// SPLASH SCREEN
// ========================================
@Composable
fun SplashScreen(onTimeout: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(2000)
        onTimeout()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Filled.MusicNote,
                contentDescription = "Logo",
                tint = AccentPink,
                modifier = Modifier.size(48.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row {
                Text(
                    text = "mega",
                    color = TextWhite,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "radio",
                    color = AccentPink,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Normal
                )
            }
        }
    }
}

// ========================================
// HOME SCREEN
// ========================================
@Composable
fun HomeScreen(
    isPhoneConnected: Boolean,
    nowPlaying: Station?,
    isPlaying: Boolean,
    onGenresClick: () -> Unit,
    onCountriesClick: () -> Unit,
    onFavoritesClick: () -> Unit,
    onNowPlayingClick: () -> Unit,
    onRefreshClick: () -> Unit
) {
    ScalingLazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(
            top = 32.dp,
            bottom = 32.dp
        )
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "MegaRadio",
                    color = AccentPink,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.width(6.dp))
                // Connection indicator
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(if (isPhoneConnected) Color(0xFF4CAF50) else Color(0xFFFF5252))
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Now Playing mini card (if something is playing)
        if (nowPlaying != null) {
            item {
                NowPlayingMiniCard(
                    station = nowPlaying,
                    isPlaying = isPlaying,
                    onClick = onNowPlayingClick
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        item {
            MenuButton(
                text = "Genres",
                icon = Icons.AutoMirrored.Filled.List,
                onClick = onGenresClick
            )
        }

        item {
            MenuButton(
                text = "Country",
                icon = Icons.Filled.Language,
                onClick = onCountriesClick
            )
        }

        item {
            MenuButton(
                text = "Favorites",
                icon = Icons.Filled.Favorite,
                onClick = onFavoritesClick
            )
        }

        if (!isPhoneConnected) {
            item {
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onRefreshClick,
                    modifier = Modifier.size(36.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = SurfaceDark),
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = Icons.Filled.Refresh,
                        contentDescription = "Refresh",
                        tint = TextGray,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Text(
                    text = "No phone connection",
                    color = TextGray,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

// ========================================
// NOW PLAYING MINI CARD (for Home Screen)
// ========================================
@Composable
fun NowPlayingMiniCard(
    station: Station,
    isPlaying: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .padding(vertical = 2.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = Color(0xFF1A1A2E)
        ),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp, horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Station avatar
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(AccentPink.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = station.name.take(1).uppercase(),
                    color = AccentPink,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = station.name,
                    color = TextWhite,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Icon(
                imageVector = if (isPlaying) Icons.Filled.MusicNote else Icons.Filled.PlayArrow,
                contentDescription = if (isPlaying) "Playing" else "Paused",
                tint = AccentPink,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

// ========================================
// GENRES SCREEN
// ========================================
@Composable
fun GenresScreen(
    genres: List<Genre>,
    onGenreClick: (Genre) -> Unit
) {
    ScalingLazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(top = 32.dp, bottom = 32.dp)
    ) {
        item {
            Text(
                text = "Genres",
                color = AccentPink,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (genres.isEmpty()) {
            item { EmptyState(text = "No genres available") }
        } else {
            items(genres, key = { it.id }) { genre ->
                ListRowButton(
                    text = genre.name,
                    onClick = { onGenreClick(genre) }
                )
            }
        }
    }
}

// ========================================
// COUNTRIES SCREEN
// ========================================
@Composable
fun CountriesScreen(
    countries: List<Country>,
    onCountryClick: (Country) -> Unit
) {
    ScalingLazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(top = 32.dp, bottom = 32.dp)
    ) {
        item {
            Text(
                text = "Country",
                color = AccentPink,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (countries.isEmpty()) {
            item { EmptyState(text = "No countries available") }
        } else {
            items(countries, key = { it.code }) { country ->
                ListRowButton(
                    text = country.name,
                    onClick = { onCountryClick(country) }
                )
            }
        }
    }
}

// ========================================
// STATIONS SCREEN (Generic with loading)
// ========================================
@Composable
fun StationsScreen(
    title: String,
    stations: List<Station>,
    isLoading: Boolean = false,
    onStationClick: (Station) -> Unit
) {
    ScalingLazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(top = 32.dp, bottom = 32.dp)
    ) {
        item {
            Text(
                text = title,
                color = AccentPink,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (isLoading) {
            item {
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(32.dp)
                        .padding(top = 16.dp),
                    indicatorColor = AccentPink,
                    strokeWidth = 3.dp
                )
            }
        } else if (stations.isEmpty()) {
            item { EmptyState(text = "No stations found") }
        } else {
            items(stations, key = { it.id }) { station ->
                StationRowButton(
                    station = station,
                    onClick = { onStationClick(station) }
                )
            }
        }
    }
}

// ========================================
// FAVORITES SCREEN
// ========================================
@Composable
fun FavoritesScreen(
    favorites: List<Station>,
    onStationClick: (Station) -> Unit
) {
    ScalingLazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(top = 32.dp, bottom = 32.dp)
    ) {
        item {
            Text(
                text = "Favorites",
                color = AccentPink,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (favorites.isEmpty()) {
            item {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(top = 24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.FavoriteBorder,
                        contentDescription = "No favorites",
                        tint = TextGray,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No favorites yet",
                        color = TextGray,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "Add from your phone",
                        color = TextGray,
                        fontSize = 11.sp
                    )
                }
            }
        } else {
            items(favorites, key = { it.id }) { station ->
                StationRowButton(
                    station = station,
                    onClick = { onStationClick(station) }
                )
            }
        }
    }
}

// ========================================
// NOW PLAYING SCREEN
// ========================================
@Composable
fun NowPlayingScreen(
    station: Station?,
    isPlaying: Boolean,
    songTitle: String = "",
    artistName: String = "",
    onPlayPauseClick: () -> Unit,
    onPreviousClick: () -> Unit,
    onNextClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(16.dp)
        ) {
            // Station Logo Placeholder
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(AccentPink.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = station?.name?.take(2)?.uppercase() ?: "MR",
                    color = AccentPink,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Station Name
            Text(
                text = station?.name ?: "No Station",
                color = TextWhite,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Song Title (if available from metadata)
            if (songTitle.isNotEmpty()) {
                Text(
                    text = songTitle,
                    color = AccentPink,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            // Artist / Location
            Text(
                text = if (artistName.isNotEmpty()) artistName else station?.locationText ?: "",
                color = TextGray,
                fontSize = 11.sp,
                maxLines = 1
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Playback Controls
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Previous Button
                Button(
                    onClick = onPreviousClick,
                    modifier = Modifier.size(38.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = SurfaceDark),
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipPrevious,
                        contentDescription = "Previous",
                        tint = TextWhite,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Play/Pause Button (larger, accent colored)
                Button(
                    onClick = onPlayPauseClick,
                    modifier = Modifier.size(48.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = AccentPink),
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = TextWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }

                // Next Button
                Button(
                    onClick = onNextClick,
                    modifier = Modifier.size(38.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = SurfaceDark),
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipNext,
                        contentDescription = "Next",
                        tint = TextWhite,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

@Composable
fun EmptyState(text: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(top = 16.dp)
    ) {
        Icon(
            imageVector = Icons.Filled.Info,
            contentDescription = null,
            tint = TextGray,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(text = text, color = TextGray, fontSize = 12.sp)
    }
}

@Composable
fun MenuButton(
    text: String,
    icon: ImageVector = Icons.AutoMirrored.Filled.ArrowForward,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .padding(vertical = 4.dp),
        colors = ButtonDefaults.buttonColors(backgroundColor = SurfaceDark),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = AccentPink,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = text,
                    color = TextWhite,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = "Go",
                tint = TextGray,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
fun ListRowButton(
    text: String,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .padding(vertical = 3.dp),
        colors = ButtonDefaults.buttonColors(backgroundColor = SurfaceDark),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp, horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = text,
                color = TextWhite,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = "Go",
                tint = TextGray,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

@Composable
fun StationRowButton(
    station: Station,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .padding(vertical = 3.dp),
        colors = ButtonDefaults.buttonColors(backgroundColor = SurfaceDark),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp, horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Station initial avatar
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(AccentPink.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = station.name.take(1).uppercase(),
                    color = AccentPink,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = station.name,
                    color = TextWhite,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (station.locationText.isNotEmpty()) {
                    Text(
                        text = station.locationText,
                        color = TextGray,
                        fontSize = 10.sp,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
