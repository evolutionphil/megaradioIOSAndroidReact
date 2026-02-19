// Theme.kt
// Wear OS Theme with MegaRadio colors

package com.visiongo.megaradio.wear.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Colors

// MegaRadio Colors
val AccentPink = Color(0xFFFF4199)
val BackgroundBlack = Color(0xFF000000)
val SurfaceDark = Color(0xFF262626)
val TextWhite = Color(0xFFFFFFFF)
val TextGray = Color(0xFF888888)

private val WearColors = Colors(
    primary = AccentPink,
    primaryVariant = AccentPink,
    secondary = AccentPink,
    secondaryVariant = AccentPink,
    background = BackgroundBlack,
    surface = SurfaceDark,
    error = Color(0xFFCF6679),
    onPrimary = TextWhite,
    onSecondary = TextWhite,
    onBackground = TextWhite,
    onSurface = TextWhite,
    onError = BackgroundBlack
)

@Composable
fun MegaRadioWearTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colors = WearColors,
        content = content
    )
}
