package com.visiongo.megaradio.wear.presentation

import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.test.platform.app.InstrumentationRegistry
import com.visiongo.megaradio.wear.data.Country
import com.visiongo.megaradio.wear.data.Genre
import com.visiongo.megaradio.wear.data.Station
import com.visiongo.megaradio.wear.presentation.theme.MegaRadioWearTheme
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Exercises real rendered screens; a missing, obscured or disconnected indicator fails. */
class ScrollIndicatorTest {
    @get:Rule
    val compose = createComposeRule()

    private val stations = List(30) { Station("station-$it", "Station $it", country = "Austria") }

    @Test fun disconnectedHomeShowsMovingIndicator() = verifyIndicator("home-disconnected") {
        HomeScreen(false, null, false, {}, {}, {}, {}, {})
    }

    @Test fun playingHomeShowsMovingIndicator() = verifyIndicator("home-playing") {
        HomeScreen(true, stations.first(), true, {}, {}, {}, {}, {})
    }

    @Test fun genresShowMovingIndicator() = verifyIndicator("genres") {
        GenresScreen(List(30) { Genre("genre-$it", "Genre $it") }) {}
    }

    @Test fun countriesShowMovingIndicator() = verifyIndicator("countries") {
        CountriesScreen(List(30) { Country("country-$it", "Country $it") }) {}
    }

    @Test fun stationsShowMovingIndicator() = verifyIndicator("stations") {
        StationsScreen("Stations", stations) {}
    }

    @Test fun favoritesShowMovingIndicator() = verifyIndicator("favorites") {
        FavoritesScreen(stations) {}
    }

    @Test fun failedStationPlaybackKeepsCachedRowAvailableForRetry() = verifyPlaybackRetry { message, retry ->
        StationsScreen("Stations", stations.take(1), playError = message, onStationClick = { retry() })
    }

    @Test fun failedFavoritePlaybackKeepsCachedRowAvailableForRetry() = verifyPlaybackRetry { message, retry ->
        FavoritesScreen(stations.take(1), playError = message, onStationClick = { retry() })
    }

    private fun verifyPlaybackRetry(screen: @Composable (String?, () -> Unit) -> Unit) {
        val message = mutableStateOf<String?>(null)
        var attempts = 0
        compose.setContent {
            MegaRadioWearTheme {
                screen(message.value) {
                    attempts++
                    message.value = if (attempts == 1) "Open MegaRadio on your phone, then retry." else null
                }
            }
        }
        compose.onNodeWithText(stations.first().name).performClick()
        compose.onNodeWithText(stations.first().name).assertExists().performClick()
        compose.runOnIdle { assertTrue("A failed dispatch must leave the cached station available to retry", attempts == 2) }
    }

    @Test fun longGenreLabelKeepsNavigationInsideRoundScreen() {
        val label = "Alternative and independent music from around the world"
        var selected: String? = null
        compose.setContent {
            MegaRadioWearTheme {
                GenresScreen(listOf(Genre("long", label)) + List(10) { Genre("genre-$it", "Genre $it") }) {
                    selected = it.id
                }
            }
        }
        compose.waitForIdle()
        val row = compose.onNodeWithText(label).assertIsDisplayed()
        assertInsideRoundScreen(row.fetchSemanticsNode().boundsInRoot, "Long genre row")
        saveScreen("responsive-long-genre")
        row.performClick()
        compose.runOnIdle { assertTrue("The long label must retain its navigation action", selected == "long") }
    }

    @Test fun longNowPlayingMetadataKeepsAllPlaybackActionsVisibleOnEntry() {
        val pressed = mutableSetOf<String>()
        compose.setContent {
            MegaRadioWearTheme {
                NowPlayingScreen(
                    Station("long", "MegaRadio international radio with a very long station name"),
                    false,
                    "A very long song title that must remain readable without hiding the controls",
                    "A very long artist name",
                    { pressed += "play" }, { pressed += "previous" }, { pressed += "next" }
                )
            }
        }
        saveScreen("responsive-now-playing-entry")
        compose.onNodeWithText("A very long song title that must remain readable without hiding the controls").assertIsDisplayed()
        saveScreen("responsive-now-playing-metadata")
        compose.waitForIdle()
        listOf("Previous", "Play", "Next").forEach { name ->
            val control = compose.onNodeWithContentDescription(name).assertIsDisplayed()
            assertInsideRoundScreen(control.fetchSemanticsNode().boundsInRoot, name)
            control.performClick()
        }
        saveScreen("responsive-now-playing-controls")
        compose.runOnIdle { assertTrue("All playback actions must remain usable", pressed.size == 3) }
    }

    private fun assertInsideRoundScreen(bounds: androidx.compose.ui.geometry.Rect, name: String) {
        val screen = compose.onRoot().fetchSemanticsNode().boundsInRoot
        val radius = minOf(screen.width, screen.height) / 2f
        val center = screen.center
        listOf(bounds.topLeft, bounds.topRight, bounds.bottomLeft, bounds.bottomRight).forEach { corner ->
            val distance = (corner - center).getDistance()
            assertTrue("$name must fit inside the round display ($bounds in $screen)", distance < radius)
        }
    }

    private fun saveScreen(name: String) {
        val image = compose.onRoot().captureToImage()
        val folder = File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null), "scroll-indicator-tests")
        folder.mkdirs()
        File(folder, "$name.png").outputStream().use {
            image.asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }

    private fun verifyIndicator(name: String, screen: @Composable () -> Unit) {
        // Native indicators appear while scrolling and hide after inactivity.
        // Hold a real drag while advancing the animation clock before each capture.
        compose.mainClock.autoAdvance = false
        compose.setContent { MegaRadioWearTheme { screen() } }
        compose.waitForIdle()
        compose.mainClock.advanceTimeByFrame()
        compose.waitForIdle()
        compose.onNodeWithTag("wear-scroll-list").performTouchInput {
            down(Offset(centerX, height * 0.8f))
            moveTo(Offset(centerX, height * 0.65f), delayMillis = 100)
        }
        compose.mainClock.advanceTimeBy(400)
        compose.waitForIdle()
        compose.onNodeWithTag("wear-scroll-indicator").assertIsDisplayed()
        val before = indicatorCenter("$name-before")
        compose.onNodeWithTag("wear-scroll-list").performTouchInput {
            moveTo(Offset(centerX, height * 0.25f), delayMillis = 300)
        }
        compose.mainClock.advanceTimeBy(400)
        compose.waitForIdle()
        val after = indicatorCenter("$name-after")
        compose.onNodeWithTag("wear-scroll-list").performTouchInput { up() }
        assertTrue("The visible scroll thumb must move downward with $name content ($before -> $after)", after > before + 1f)
    }

    private fun indicatorCenter(name: String): Float {
        val image = compose.onRoot().captureToImage()
        val pixels = image.toPixelMap()
        val ys = mutableListOf<Int>()
        // The native round-watch indicator sits outside the list's 90%-width buttons.
        for (x in (image.width * 0.955f).toInt() until image.width) {
            for (y in (image.height * 0.25f).toInt() until (image.height * 0.75f).toInt()) {
                val pixel = pixels[x, y]
                if (pixel.red > 0.8f && pixel.green > 0.8f && pixel.blue > 0.8f) ys += y
            }
        }
        val folder = File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null), "scroll-indicator-tests")
        folder.mkdirs()
        File(folder, "$name.png").outputStream().use {
            image.asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
        assertTrue("Native scroll thumb must be painted at the screen edge ($name)", ys.size >= 4)
        return ys.average().toFloat()
    }
}
