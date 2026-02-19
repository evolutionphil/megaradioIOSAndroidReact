// Screens.kt
// All screen composables for Wear OS

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.*
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
            // Logo icon placeholder
            Icon(
                imageVector = androidx.compose.material.icons.Icons.Default.MusicNote,
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
                    color = TextWhite,
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
    onGenresClick: () -> Unit,
    onCountriesClick: () -> Unit,
    onFavoritesClick: () -> Unit
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
            Text(
                text = "MegaRadio",
                color = AccentPink,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        item {
            MenuButton(text = "Genres", onClick = onGenresClick)
        }
        
        item {
            MenuButton(text = "Country", onClick = onCountriesClick)
        }
        
        item {
            MenuButton(text = "Favorites", onClick = onFavoritesClick)
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
        
        items(genres) { genre ->
            ListRowButton(
                text = genre.name,
                onClick = { onGenreClick(genre) }
            )
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
        
        items(countries) { country ->
            ListRowButton(
                text = country.name,
                onClick = { onCountryClick(country) }
            )
        }
    }
}

// ========================================
// STATIONS SCREEN (Generic)
// ========================================
@Composable
fun StationsScreen(
    title: String,
    stations: List<Station>,
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
        
        items(stations) { station ->
            StationRowButton(
                text = station.name,
                onClick = { onStationClick(station) }
            )
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
                        imageVector = androidx.compose.material.icons.Icons.Default.HeartBroken,
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
                }
            }
        } else {
            items(favorites) { station ->
                StationRowButton(
                    text = station.name,
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
                    .size(64.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF9C27B0)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = station?.name?.take(2)?.uppercase() ?: "MR",
                    color = TextWhite,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Station Name
            Text(
                text = station?.name ?: "Unknown",
                color = TextWhite,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            
            // Location
            Text(
                text = station?.locationText ?: "",
                color = TextGray,
                fontSize = 11.sp,
                maxLines = 1
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Playback Controls
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Previous Button
                Button(
                    onClick = onPreviousClick,
                    modifier = Modifier.size(40.dp, 36.dp),
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = SurfaceDark
                    ),
                    shape = RoundedCornerShape(50)
                ) {
                    Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.SkipPrevious,
                        contentDescription = "Previous",
                        tint = TextWhite,
                        modifier = Modifier.size(16.dp)
                    )
                }
                
                // Play/Pause Button
                Button(
                    onClick = onPlayPauseClick,
                    modifier = Modifier.size(52.dp, 44.dp),
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = SurfaceDark
                    ),
                    shape = RoundedCornerShape(50)
                ) {
                    Icon(
                        imageVector = if (isPlaying) 
                            androidx.compose.material.icons.Icons.Default.Pause 
                        else 
                            androidx.compose.material.icons.Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = TextWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }
                
                // Next Button
                Button(
                    onClick = onNextClick,
                    modifier = Modifier.size(40.dp, 36.dp),
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = SurfaceDark
                    ),
                    shape = RoundedCornerShape(50)
                ) {
                    Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.SkipNext,
                        contentDescription = "Next",
                        tint = TextWhite,
                        modifier = Modifier.size(16.dp)
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
fun MenuButton(
    text: String,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .padding(vertical = 4.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = SurfaceDark
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = text,
                color = TextWhite,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
            Icon(
                imageVector = androidx.compose.material.icons.Icons.Default.ChevronRight,
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
        colors = ButtonDefaults.buttonColors(
            backgroundColor = SurfaceDark
        ),
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
                imageVector = androidx.compose.material.icons.Icons.Default.ChevronRight,
                contentDescription = "Go",
                tint = TextGray,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

@Composable
fun StationRowButton(
    text: String,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .padding(vertical = 3.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = SurfaceDark
        ),
        shape = RoundedCornerShape(10.dp)
    ) {
        Text(
            text = text,
            color = TextWhite,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp, horizontal = 4.dp),
            textAlign = TextAlign.Start
        )
    }
}
