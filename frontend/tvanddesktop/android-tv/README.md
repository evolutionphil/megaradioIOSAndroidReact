# MegaRadio Android TV / Google TV / Fire TV

> **Status (Faz 2)**: ✅ Web preview shared with Apple TV — pixel-perfect.

## Same Web Bundle as Apple TV

Both Apple TV and Android TV share the **identical** React + TS + Vite bundle
(`../apple-tv-and-macos/web-preview/`). On Android TV the renderer is wrapped
in a Leanback-launcher Activity hosting a fullscreen `WebView`.

Symlinks: `web-preview/src` and `web-preview/public` point to the Apple TV source.
This guarantees feature parity by construction — change once, both targets pick it up.

## Native Shell (Faz 2A — needs Android Studio)

```kotlin
// MainActivity.kt
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.domStorageEnabled = true
            loadUrl("https://themegaradio.com/tv")
        }
        setContentView(webView)
    }

    // D-pad → JS keyboard events
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Forward DPAD_UP/DOWN/LEFT/RIGHT/CENTER + COLOR buttons to web layer
        return super.dispatchKeyEvent(event)
    }
}
```

### AndroidManifest.xml
```xml
<uses-feature android:name="android.software.leanback" android:required="true" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />

<application android:banner="@drawable/banner">
  <activity android:name=".MainActivity" android:exported="true">
    <intent-filter>
      <action android:name="android.intent.action.MAIN" />
      <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    </intent-filter>
  </activity>
</application>
```

## Color buttons (Android TV-only)

The web bundle already handles `KeyEvent.KEYCODE_PROG_RED/GREEN/YELLOW/BLUE`
via `public/js/tv-remote-keys.js`. No additional native code required.

## Stores
- Google Play TV — bundle: `com.megaradio.tv`
- Amazon Appstore (Fire TV) — same APK with Amazon-specific TV banner
- Hisense Vidaa — TWA-style packaging (Faz 2B)
