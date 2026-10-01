package com.visiongo.megaradio.wear.launchtest

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.LayerDrawable
import android.os.Build
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.util.TypedValue
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt
import org.junit.Assert.*
import org.junit.Test

/** Exercises the installed release from another process; no activity/clock/startup hooks. */
class ColdLaunchTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val automation = instrumentation.uiAutomation
    private val fixture = instrumentation.targetContext
    private val target: Context by lazy { fixture.createPackageContext(APP, 0) }
    private val output = File(fixture.getExternalFilesDir(null), "cold-launch-api${Build.VERSION.SDK_INT}")
    private val density by lazy { target.resources.displayMetrics.density }

    @Test fun launchThemeUsesBlackBackgroundAndFixed48dpLauncherIcon() {
        output.mkdirs()
        val context = target
        val launch = fixture.packageManager.getLaunchIntentForPackage(APP)!!
        val info = fixture.packageManager.getActivityInfo(launch.component!!, 0)
        val theme = context.resources.newTheme().apply { applyStyle(info.themeResource, true) }
        fun attribute(name: String) = context.resources.getIdentifier(name, "attr", APP)
        val background = TypedValue()
        assertTrue(theme.resolveAttribute(attribute("windowSplashScreenBackground"), background, true))
        assertEquals(Color.BLACK, background.data)
        val icon = TypedValue()
        assertTrue(theme.resolveAttribute(attribute("windowSplashScreenAnimatedIcon"), icon, true))
        if (Build.VERSION.SDK_INT >= 31) {
            val platformIcon = TypedValue()
            assertTrue(theme.resolveAttribute(android.R.attr.windowSplashScreenAnimatedIcon, platformIcon, true))
            assertEquals(icon.resourceId, platformIcon.resourceId)
            val iconBackground = TypedValue()
            assertTrue(theme.resolveAttribute(android.R.attr.windowSplashScreenIconBackgroundColor, iconBackground, true))
            assertNotEquals("Native splash must not enlarge the icon without a distinct background", Color.TRANSPARENT, iconBackground.data)
            assertNotEquals(Color.BLACK, iconBackground.data)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            val behavior = TypedValue()
            assertTrue(theme.resolveAttribute(android.R.attr.windowSplashScreenBehavior, behavior, true))
            assertEquals("All cold-start entry points should show the icon", 1, behavior.data)
        }
        val layer = context.getDrawable(icon.resourceId) as LayerDrawable
        val size = (48 * density).roundToInt()
        assertEquals(size, layer.getLayerWidth(0))
        assertEquals(size, layer.getLayerHeight(0))

        // API30's compat container is90dp; the logo itself must remain48dp inside it.
        val viewport = (90 * density).roundToInt()
        val actual = Bitmap.createBitmap(viewport, viewport, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(actual).apply { drawColor(Color.BLACK) }
        layer.setBounds(0, 0, viewport, viewport)
        layer.draw(canvas)
        val bounds = visibleBounds(actual)!!
        assertEquals(size.toDouble(), bounds.width().toDouble(), 2.0)
        assertEquals(size.toDouble(), bounds.height().toDouble(), 2.0)
        assertEquals(viewport / 2.0, bounds.exactCenterX().toDouble(), 1.0)
        assertEquals(viewport / 2.0, bounds.exactCenterY().toDouble(), 1.0)
        save(actual, "theme-drawable.png")
        actual.recycle()
    }

    @Test fun processColdLaunchShowsCircularLauncherOnBlackThenHome() {
        output.mkdirs()
        val device = UiDevice.getInstance(instrumentation)
        device.wakeUp()
        device.pressHome()
        device.waitForIdle()
        shell("am force-stop $APP")
        assertTrue("Target process must be absent before cold start", shell("pidof $APP").trim().isEmpty())
        val launch = fixture.packageManager.getLaunchIntentForPackage(APP)
        assertNotNull("Signed MegaRadio release must already be installed", launch)
        val expected = renderLauncher(96)
        val frames = mutableListOf<Frame>()
        val initialFrames = mutableListOf<Bitmap>()
        val samplerReady = CountDownLatch(1)
        val executor = Executors.newSingleThreadExecutor()
        val started = SystemClock.elapsedRealtime()
        var reachedHome = false
        val capture = executor.submit {
            samplerReady.countDown()
            var frameIndex = 0
            while (!Thread.currentThread().isInterrupted && SystemClock.elapsedRealtime() - started < 45_000) {
                val bitmap = automation.takeScreenshot() ?: continue
                val elapsed = SystemClock.elapsedRealtime() - started
                val candidate = analyze(bitmap, expected)
                if (candidate != null && frames.size < 80) {
                    frames.add(Frame(elapsed, candidate, bitmap))
                } else if (frameIndex < 3) {
                    initialFrames.add(bitmap)
                } else {
                    bitmap.recycle()
                }
                frameIndex++
                if (frameIndex % 3 == 0 && containsText(automation.rootInActiveWindow, "Genres")) {
                    val homeImage = automation.takeScreenshot()
                    if (homeImage != null) {
                        val homeBounds = visibleBounds(homeImage)
                        if (homeBounds != null && homeBounds.width() > homeImage.width / 2) {
                            save(homeImage, "home.png")
                            reachedHome = true
                        }
                        homeImage.recycle()
                        if (reachedHome) break
                    }
                }
            }
        }
        try {
            assertTrue(samplerReady.await(3, TimeUnit.SECONDS))
            fixture.startActivity(launch!!.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            capture.get(55, TimeUnit.SECONDS)
            automation.takeScreenshot()?.let { save(it, "last.png"); it.recycle() }
            initialFrames.forEachIndexed { index, bitmap -> save(bitmap, "initial-$index.png") }
            frames.forEachIndexed { index, frame -> save(frame.bitmap, "native-$index-${frame.timeMs}ms.png") }
            File(output, "measurements.txt").writeText(buildString {
                appendLine("api=${Build.VERSION.SDK_INT} density=$density processAbsentBeforeLaunch=true home=$reachedHome")
                frames.forEach { appendLine("timeMs=${it.timeMs} widthDp=${it.info.widthDp} heightDp=${it.info.heightDp} similarityError=${it.info.error}") }
            })
            assertTrue("Home was not shown; see ${output.absolutePath}", reachedHome)
            assertTrue("No native branded splash frame captured; see ${output.absolutePath}", frames.isNotEmpty())
            val representative = frames.sortedBy { it.info.widthDp }[frames.size / 2].info
            assertEquals("Native icon width in dp", 48.0, representative.widthDp.toDouble(), 2.0)
            assertEquals("Native icon height in dp", 48.0, representative.heightDp.toDouble(), 2.0)
        } finally {
            capture.cancel(true)
            executor.shutdownNow()
            executor.awaitTermination(3, TimeUnit.SECONDS)
            frames.forEach { it.bitmap.recycle() }
            initialFrames.forEach { it.recycle() }
            expected.recycle()
        }
    }

    private fun renderLauncher(size: Int): Bitmap {
        val icon = fixture.packageManager.getApplicationIcon(APP)
        return Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).also {
            val canvas = Canvas(it).apply { drawColor(Color.BLACK) }
            icon.setBounds(0, 0, size, size)
            icon.draw(canvas)
        }
    }

    private fun analyze(bitmap: Bitmap, expected: Bitmap): IconFrame? {
        val bounds = visibleBounds(bitmap) ?: return null
        val width = bounds.width() / density
        val height = bounds.height() / density
        if (width !in 35f..72f || height !in 35f..72f || abs(width - height) > 2f) return null
        if (abs(bounds.exactCenterX() - bitmap.width / 2f) > density * 2) return null
        if (abs(bounds.exactCenterY() - bitmap.height / 2f) > density * 2) return null
        val crop = Bitmap.createBitmap(bitmap, bounds.left, bounds.top, bounds.width(), bounds.height())
        val normalized = Bitmap.createScaledBitmap(crop, expected.width, expected.height, true)
        var error = 0.0
        var outsideCircle = 0
        val normalizedPixels = IntArray(normalized.width * normalized.height)
        val expectedPixels = IntArray(expected.width * expected.height)
        normalized.getPixels(normalizedPixels, 0, normalized.width, 0, 0, normalized.width, normalized.height)
        expected.getPixels(expectedPixels, 0, expected.width, 0, 0, expected.width, expected.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) {
            val actual = normalizedPixels[y * normalized.width + x]
            val wanted = expectedPixels[y * expected.width + x]
            error += abs(Color.red(actual) - Color.red(wanted)) +
                abs(Color.green(actual) - Color.green(wanted)) + abs(Color.blue(actual) - Color.blue(wanted))
            val dx = x + 0.5f - expected.width / 2f
            val dy = y + 0.5f - expected.height / 2f
            if (dx * dx + dy * dy > (expected.width / 2f + 1) * (expected.width / 2f + 1) && lit(actual)) outsideCircle++
        }
        error /= expected.width * expected.height * 3
        if (normalized !== crop) normalized.recycle()
        crop.recycle()
        return if (error < 25 && outsideCircle < 8) IconFrame(width, height, error) else null
    }

    private fun visibleBounds(bitmap: Bitmap): Rect? {
        var left = bitmap.width
        var top = bitmap.height
        var right = -1
        var bottom = -1
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        for (y in 0 until bitmap.height) for (x in 0 until bitmap.width) {
            if (lit(pixels[y * bitmap.width + x])) {
                left = minOf(left, x); top = minOf(top, y)
                right = maxOf(right, x); bottom = maxOf(bottom, y)
            }
        }
        return if (right >= left) Rect(left, top, right + 1, bottom + 1) else null
    }

    private fun lit(color: Int) = max(Color.red(color), max(Color.green(color), Color.blue(color))) > 32

    private fun containsText(node: AccessibilityNodeInfo?, text: String): Boolean {
        if (node == null) return false
        if (node.text?.toString() == text) return true
        for (i in 0 until node.childCount) if (containsText(node.getChild(i), text)) return true
        return false
    }

    private fun shell(command: String): String = ParcelFileDescriptor.AutoCloseInputStream(
        automation.executeShellCommand(command)
    ).bufferedReader().use { it.readText() }

    private fun save(bitmap: Bitmap, name: String) {
        File(output, name).outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private data class IconFrame(val widthDp: Float, val heightDp: Float, val error: Double)
    private data class Frame(val timeMs: Long, val info: IconFrame, val bitmap: Bitmap)

    companion object { private const val APP = "com.megaradio" }
}
