# MegaRadio Android TV / Google TV

**Release status:** Android validation and Google Play setup are pending. A
successful JavaScript export or unit test is not a signed, tested TV release.

The app is a thin Leanback-launcher shell that hosts a fullscreen `WebView`
pointed at `https://cdn.themegaradio.com/`, the shared bundle used by Samsung
Tizen and LG webOS. The existing CDN deployment publishes web design updates;
native changes such as Billing, permissions or the host require a new AAB.
The native tvOS app has a separate implementation.

## Project layout

```
android-tv/
├── build.gradle.kts           – root (plugin versions)
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts       – app module
    └── src/main/
        ├── AndroidManifest.xml          – Leanback launcher + TV feature flags
        ├── java/com/megaradio/tv/
        │   ├── MainActivity.kt          – WebView host, D-pad forwarding
        │   └── BuildConfigExtras.kt     – TV_WEB_URL constant
        └── res/
            ├── values/strings.xml
            ├── values/themes.xml
            ├── values/colors.xml
            ├── mipmap-*/                  – launcher icons and TV banner
            └── mipmap-*/                  – add launcher icons here
```

## Build an APK / AAB

```bash
# Run from frontend/tvanddesktop/android-tv with JDK 17 and Android SDK 36.
# Set ANDROID_HOME or create an ignored local.properties with sdk.dir.

# Tests and debug APK for Android TV / Google TV
./gradlew :app:testDebugUnitTest :app:lintDebug
./gradlew :app:assembleDebug
#   ⇒ app/build/outputs/apk/debug/app-debug.apk

# Release AAB; supply the existing Play upload key before uploading.
./gradlew :app:bundleRelease
#   ⇒ app/build/outputs/bundle/release/app-release.aab
```

## MegaRadio brand icon & TV banner

See `LAUNCHER_ASSETS.md` for exact pixel sizes.
Shortcut via Android Studio:

1. File → New → Image Asset → **Launcher Icons (Adaptive)**
2. Foreground: `../../apple-tv-and-macos/web-preview/public/images/logo.png`
3. Background: solid `#0E0E0E`
4. Finish — Studio fills in every `mipmap-*` folder automatically.
5. Repeat with "TV Banner" → writes `drawable-xhdpi/tv_banner.png`.

## D-pad & media key forwarding

`MainActivity.dispatchKeyEvent()` hands every remote keypress — D-pad, Enter,
Back, media keys, Android TV color buttons (red/green/yellow/blue),
channel up/down — directly to the WebView. The existing
`public/js/tv-remote-keys.js` handler inside the shared web bundle already
translates these into in-app focus moves. Validate sidebar-to-content movement,
genre lists, player controls, search and Back on a TV device before release.

The WebView uses origin-scoped message listeners and document-start adapters
for the existing `MegaRadioNative.invoke` and `MegaRadioBridge` protocol.
Only the main frame at the HTTPS CDN origin can call native purchase methods.
External web links leave the WebView; supported System WebView features are
checked before the application starts. Google Play Billing is 8.3.0.

## Stores

| Store              | Target              | Package                  |
|--------------------|---------------------|--------------------------|
| Google Play (TV)   | AAB, leanback       | `com.megaradio`, version code 93; Console TV enrollment pending |

Do not upload this as a second app merely because the scaffold has a separate
application ID. Confirm the Console's form-factor setup, product catalog,
version codes and signing identity first. Fire TV requires its own store and
billing integration; the Google Play purchase flow is not Amazon billing.
