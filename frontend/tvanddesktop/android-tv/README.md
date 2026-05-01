# MegaRadio Android TV / Google TV / Fire TV

**Status**: ✅ Kotlin project scaffolded — open in Android Studio Flamingo+
and run on an Android TV / Fire TV emulator or device.

The app is a thin Leanback-launcher shell that hosts a fullscreen `WebView`
pointed at the same TV web bundle used by Apple TV, Samsung Tizen and webOS.
Changing something in
`../apple-tv-and-macos/web-preview/` updates every TV shell simultaneously.

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
            ├── drawable/README_BANNER.md  – how to add TV banner + icons
            └── mipmap-*/                  – add launcher icons here
```

## Build an APK / AAB

```bash
# First time
cd /app/frontend/tvanddesktop/android-tv

# Supply Gradle wrapper (one-time; Android Studio does this automatically)
gradle wrapper --gradle-version 8.7 --distribution-type all

# Debug APK for sideloading to a Fire TV / Shield / Mi Stick
./gradlew :app:assembleDebug
#   ⇒ app/build/outputs/apk/debug/app-debug.apk

# Release AAB for Google Play (TV)
./gradlew :app:bundleRelease
#   ⇒ app/build/outputs/bundle/release/app-release.aab
```

## MegaRadio brand icon & TV banner

See `app/src/main/res/drawable/README_BANNER.md` for exact pixel sizes.
Shortcut via Android Studio:

1. File → New → Image Asset → **Launcher Icons (Adaptive)**
2. Foreground: `../../apple-tv-and-macos/web-preview/public/images/logo.png`
3. Background: solid `#0E0E0E`
4. Finish — Studio fills in every `mipmap-*` folder automatically.
5. Repeat with "TV Banner" → writes `drawable-xhdpi/tv_banner.png`.

## D-pad & media key forwarding

`MainActivity.dispatchKeyEvent()` hands every remote keypress — D-pad, Enter,
Back, media keys, Fire TV / Android TV color buttons (red/green/yellow/blue),
channel up/down — directly to the WebView. The existing
`public/js/tv-remote-keys.js` handler inside the shared web bundle already
knows how to translate those into in-app focus moves, so we get spatial
navigation out of the box with zero extra Kotlin work.

## Stores

| Store              | Target              | Package                  |
|--------------------|---------------------|--------------------------|
| Google Play (TV)   | AAB, leanback       | `com.megaradio.tv`       |
| Amazon Appstore    | Same APK, Fire TV   | `com.megaradio.tv`       |
| Hisense Vidaa      | TWA wrapper (Faz 3) | `com.megaradio.tv.vidaa` |
