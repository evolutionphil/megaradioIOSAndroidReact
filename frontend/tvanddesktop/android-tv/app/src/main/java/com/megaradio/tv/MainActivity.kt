package com.megaradio.tv

import android.annotation.SuppressLint
import android.app.SearchManager
import android.content.Intent
import android.content.ActivityNotFoundException
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.FragmentActivity
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * MegaRadio Android TV / Google TV / Fire TV shell.
 *
 * A full-screen WebView hosting the shared TV web bundle. The same JS engine
 * that runs on Samsung Tizen and webOS handles spatial navigation
 * and audio playback — we only need to funnel hardware remote events through
 * so the existing tv-remote-keys.js handler can dispatch them.
 */
class MainActivity : FragmentActivity() {

    private lateinit var webView: WebView
    private val billingService by lazy { BillingService(this) }
    private var nativeBridge: MegaRadioNativeBridge? = null
    private var recommendationsBridge: MegaRadioBridge? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Full-screen immersive — hide system bars on TV
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Origin-scoped messaging and document-start injection prevent another
        // website or an embedded frame from calling the native billing API.
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) ||
            !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            setContentView(TextView(this).apply {
                text = getString(R.string.webview_update_required)
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.parseColor("#0E0E0E"))
                textSize = 22f
                gravity = android.view.Gravity.CENTER
                setPadding(48, 48, 48, 48)
            })
            return
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0E0E0E"))
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
                loadWithOverviewMode = true
                useWideViewPort = true
                allowFileAccess = false
                allowContentAccess = false
                userAgentString = "$userAgentString MegaRadioAndroidTV/1.0"
            }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val uri = request?.url ?: return true
                    if (TvNavigationPolicy.isTrusted(uri.toString())) return false
                    if (request.isForMainFrame && uri.scheme in listOf("https", "http")) {
                        try {
                            startActivity(Intent(Intent.ACTION_VIEW, uri))
                        } catch (_: ActivityNotFoundException) {
                            // Many TVs have no browser. Keep the radio app open.
                        }
                    }
                    return true
                }

                @Deprecated("Used by older Android framework versions")
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean =
                    !TvNavigationPolicy.isTrusted(url)

                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    if (!TvNavigationPolicy.isTrusted(url)) view?.stopLoading()
                }
            }
            webChromeClient = WebChromeClient()
            val recommendations = MegaRadioBridge(this@MainActivity)
            recommendationsBridge = recommendations
            val purchases = MegaRadioNativeBridge(this@MainActivity, this, billingService)
            nativeBridge = purchases
            val allowedOrigins = setOf(BuildConfigExtras.TV_ORIGIN)
            WebViewCompat.addWebMessageListener(this, "MegaRadioNativeTransport", allowedOrigins) {
                    _, message, sourceOrigin, isMainFrame, _ ->
                if (isMainFrame && TvNavigationPolicy.isTrusted(sourceOrigin.toString())) {
                    message.data?.let(purchases::invoke)
                }
            }
            WebViewCompat.addWebMessageListener(this, "MegaRadioRecommendationsTransport", allowedOrigins) {
                    _, message, sourceOrigin, isMainFrame, _ ->
                if (isMainFrame && TvNavigationPolicy.isTrusted(sourceOrigin.toString())) {
                    message.data?.let(recommendations::onContinueListening)
                }
            }
            // Preserve the existing CDN protocol without exposing a Java object
            // to every frame. Installed before the shared app's first script.
            WebViewCompat.addDocumentStartJavaScript(this, """
                if (window === window.top) {
                    window.MegaRadioPlatform = { platform: 'androidtv' };
                    window.MegaRadioNative = {
                        platform: 'androidtv',
                        invoke: function (payload) { window.MegaRadioNativeTransport.postMessage(payload); }
                    };
                    window.MegaRadioBridge = {
                        onContinueListening: function (payload) {
                            window.MegaRadioRecommendationsTransport.postMessage(payload);
                        }
                    };
                }
            """.trimIndent(), allowedOrigins)
            systemUiVisibility = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_FULLSCREEN
            loadUrl(intentToUrl(intent) ?: BuildConfigExtras.TV_WEB_URL)
        }

        setContentView(webView)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Hot-route Assistant SEARCH / deep-links without recreating the WebView.
        if (::webView.isInitialized) intentToUrl(intent)?.let { webView.loadUrl(it) }
    }

    /**
     * Converts the incoming intent into a deep-link URL that the web layer's
     * `window.__MR_HANDLE_DEEP_LINK__` helper already knows how to open.
     *
     *   SEARCH(jazz)                → https://…/tv#/search?q=jazz
     *   VIEW megaradio://play?…     → https://…/tv#/radio-playing?station=<id>
     *   VIEW megaradio://genre/jazz → https://…/tv#/genre-list/jazz
     */
    private fun intentToUrl(intent: Intent?): String? {
        if (intent == null) return null
        val base = BuildConfigExtras.TV_WEB_URL.removeSuffix("/")
        return when (intent.action) {
            Intent.ACTION_SEARCH -> {
                val q = intent.getStringExtra(SearchManager.QUERY).orEmpty()
                if (q.isBlank()) null else "$base#/search?q=${Uri.encode(q)}"
            }
            Intent.ACTION_VIEW -> {
                val data = intent.data ?: return null
                if (data.scheme != "megaradio") return null
                when (data.host) {
                    "play"   -> data.getQueryParameter("station")?.takeIf { it.isNotBlank() }
                        ?.let { "$base#/radio-playing?station=${Uri.encode(it)}" }
                    "genre"  -> data.pathSegments.firstOrNull()?.takeIf { it.isNotBlank() }
                        ?.let { "$base#/genre-list/${Uri.encode(it)}" }
                    "home"   -> base
                    "search" -> data.getQueryParameter("q")?.let { "$base#/search?q=${Uri.encode(it)}" }
                    else     -> null
                }
            }
            else -> null
        }
    }

    /**
     * Forward TV remote keys (D-pad, Media, Color, Back) directly into the
     * WebView so the JS spatial-nav engine can handle them. We do NOT swallow
     * the event — letting the WebView dispatch it means `keydown` fires in JS
     * exactly as it would on Samsung / webOS.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        return when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_MEDIA_PLAY,
            KeyEvent.KEYCODE_MEDIA_PAUSE,
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
            KeyEvent.KEYCODE_MEDIA_STOP,
            KeyEvent.KEYCODE_MEDIA_NEXT,
            KeyEvent.KEYCODE_MEDIA_PREVIOUS,
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD,
            KeyEvent.KEYCODE_MEDIA_REWIND,
            KeyEvent.KEYCODE_PROG_RED,
            KeyEvent.KEYCODE_PROG_GREEN,
            KeyEvent.KEYCODE_PROG_YELLOW,
            KeyEvent.KEYCODE_PROG_BLUE,
            KeyEvent.KEYCODE_CHANNEL_UP,
            KeyEvent.KEYCODE_CHANNEL_DOWN -> super.dispatchKeyEvent(event)
            KeyEvent.KEYCODE_BACK -> {
                if (::webView.isInitialized && event.action == KeyEvent.ACTION_DOWN && webView.canGoBack()) {
                    webView.goBack()
                    true
                } else super.dispatchKeyEvent(event)
            }
            else -> super.dispatchKeyEvent(event)
        }
    }

    override fun onPause() {
        super.onPause()
        // Keep audio playing in the background by NOT pausing the WebView.
        // onPause() would stop media playback.
    }

    override fun onDestroy() {
        nativeBridge?.close()
        recommendationsBridge?.close()
        billingService.close()
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
