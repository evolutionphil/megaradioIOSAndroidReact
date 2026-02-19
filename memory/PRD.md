# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" with support for iOS, Android, CarPlay, Android Auto, Apple Watch, and Wear OS.

## Tech Stack
- **Main App**: Expo SDK 54, TypeScript, Expo Router, react-native-track-player
- **CarPlay/Android Auto**: @g4rb4g3/react-native-carplay
- **Apple Watch**: SwiftUI (watchOS 9+)
- **Wear OS**: Kotlin + Jetpack Compose for Wear OS
- **API**: MegaRadio API (https://themegaradio.com)

## Watch Apps - February 19, 2025

### ✅ Apple Watch (SwiftUI)
**Dosya Yapısı:** `/app/frontend/watch/ios/MegaRadioWatch/`

| Dosya | İçerik |
|-------|--------|
| `MegaRadioWatchApp.swift` | Entry point, AppState, Models |
| `ContentView.swift` | Splash + Home ekranları |
| `GenresView.swift` | Genres + Genre Stations |
| `CountryView.swift` | Countries + Country Stations |
| `FavoritesView.swift` | Favorites listesi |
| `NowPlayingView.swift` | Player (Play/Pause/Skip) |
| `WatchConnectivityService.swift` | iPhone ↔ Watch iletişimi |

**Toplam:** 858 satır Swift kodu

### ✅ Wear OS (Kotlin + Jetpack Compose)
**Dosya Yapısı:** `/app/frontend/watch/android/wear/`

| Dosya | İçerik |
|-------|--------|
| `MainActivity.kt` | Entry point |
| `MegaRadioWearApp.kt` | Navigation + Routes |
| `Screens.kt` | Tüm ekranlar (8 adet) |
| `Theme.kt` | MegaRadio renkleri |
| `Models.kt` | Data models |
| `PhoneConnectivityService.kt` | Android ↔ Watch iletişimi |
| `build.gradle.kts` | Wear OS dependencies |
| `AndroidManifest.xml` | Permissions |

## 8 Ekran (Her İki Platform)
1. **Splash** - MegaRadio logo
2. **Home** - Genres, Country, Favorites menüsü
3. **Genres** - Tür listesi
4. **Genre Stations** - Seçilen türdeki radyolar
5. **Countries** - Ülke listesi
6. **Country Stations** - Seçilen ülkedeki radyolar
7. **Favorites** - Favori radyolar
8. **Now Playing** - Çalan radyo + kontroller

## İletişim Mimarisi
```
📱 Telefon (Login var)
    ├── API calls (stations, favorites, genres)
    ├── Audio playback (react-native-track-player)
    │
    ├──── WatchConnectivity ────→ 🍎 Apple Watch
    │         (iOS)                   (SwiftUI)
    │
    └──── Wearable Data Layer ──→ ⌚ Wear OS
              (Android)               (Compose)
```

## Kurulum Adımları

### Apple Watch (Xcode)
```bash
cd MegaRadio
npx expo prebuild
open ios/MegaRadio.xcworkspace
# File → New → Target → watchOS App
# watch/ios/MegaRadioWatch/ dosyalarını ekle
```

### Wear OS (Android Studio)
```bash
cd MegaRadio
npx expo prebuild
# Android Studio → Open → android/
# File → New → Module → Wear OS
# watch/android/wear/ içeriğini kopyala
```

## Bekleyen İşler
- **P0**: Apple CarPlay entitlement onayı
- **P0**: Watch apps'i native IDE'lerde build et
- **P2**: Sleep Timer
- **P2**: UI animasyonları

## User Language
Turkish (Türkçe)
