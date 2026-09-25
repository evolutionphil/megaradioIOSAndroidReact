# MegaRadio Wear OS

This is a phone companion, not a standalone streaming player. It receives
stations, favorites, genres, countries and current playback from the Android
phone app and sends playback commands through Google Play Services Data Layer.

Build from this directory with JDK 17 and Android SDK 36 installed:

```sh
./gradlew :wear:assembleDebug :wear:lintDebug
./gradlew :wear:bundleRelease
```

The root project and Gradle wrapper are included. The Wear target API is 35.
Set `ANDROID_HOME` or an ignored `local.properties` containing `sdk.dir`.

Before a Play release, use the existing `com.megaradio` signing identity and a
version code compatible with the phone listing's Wear track. Data Layer requires
the same application ID and signing identity on phone and watch. The release
bundle must use the existing upload key. Pair a phone and watch for end-to-end
validation; test disconnected state, reconnect, playback controls and updates
to favorites and catalogs. These checks have not yet been completed.

Wear store screenshots must show the real watch interface without device frames
or promotional overlays. The current UI includes English-only labels; localized
store copy must not imply that all watch UI languages have been implemented.
