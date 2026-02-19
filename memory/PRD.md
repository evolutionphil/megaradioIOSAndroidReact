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

---

## Changelog

### December 2025 - Streaming Sorunları Düzeltmesi

#### Düzeltilen Sorunlar:

1. **`/api/now-playing/{id}` Endpoint Hatası**
   - **Sorun**: Yanlış endpoint kullanılıyordu (HTML döndürüyordu)
   - **Çözüm**: `stationService.getNowPlaying()` fonksiyonu düzeltildi, artık doğru `/api/stations/{id}/metadata` endpoint'ini kullanıyor

2. **Metadata Parse Hatası**
   - **Sorun**: API `{ station: {...}, metadata: {...} }` formatında döndürüyor, eski kod bunu doğru parse edemiyordu
   - **Çözüm**: `fetchNowPlaying` fonksiyonu yeniden yazıldı, `metadata.metadata` veya `metadata` formatlarını destekliyor

3. **Lock Screen Artwork Sorunu**
   - **Sorun**: Artwork URL'leri düzgün oluşturulmuyordu
   - **Çözüm**: `getArtworkUrl` helper fonksiyonu oluşturuldu, tüm durumları (http, https, relative path) doğru işliyor

4. **Metadata Güncelleme**
   - **Sorun**: Lock screen metadata güncellenmiyor veya yanlış gösteriliyordu
   - **Çözüm**: `updateLockScreenMetadata` helper fonksiyonu oluşturuldu, hem `updateNowPlayingMetadata` hem de `updateMetadataForTrack` çağrılıyor

5. **NowPlayingMetadata Tipi**
   - **Sorun**: Tip eksik alanlar içeriyordu (song, artist)
   - **Çözüm**: TypeScript tipi genişletildi: `title`, `song`, `artist`, `station`, `album`, `timestamp`

#### Değişen Dosyalar:
- `/app/frontend/src/providers/AudioProvider.tsx` (fetchNowPlaying, getArtworkUrl, updateLockScreenMetadata)
- `/app/frontend/src/services/stationService.ts` (getNowPlaying)
- `/app/frontend/src/types/index.ts` (NowPlayingMetadata)

#### Test Durumu:
- **Native Cihazda Test Gerekli**: `react-native-track-player` sadece native build'de çalışıyor, web preview'da test edilemez
- **API Testleri Başarılı**: Stream URL'leri ve metadata endpoint'leri curl ile doğrulandı

#### ⚠️ Backend Sorunu - ÇÖZÜLDÜ ✅
Metadata API düzgün çalışıyor:
- **Endpoint:** `/api/stations/{slug}/metadata`
- **Yanıt:** `{ station: { id, name, url }, metadata: { title, artist, station, genre } }`
- **Polling:** 15 saniyede bir (güncellendi)

Test sonuçları:
- MANGORADIO: ✅ `{ title: "Nothing Breaks Like a Heart", artist: "Mark Ronson feat. Miley Cyrus" }`
- Energy NRJ Wien: ⚠️ `{ metadata: {} }` (ICY metadata yayınlamıyor)

### Android Auto Entegrasyonu (December 2025)
- **Plugin eklendi:** `plugins/withAndroidAuto.js`
- **Yapılandırma:** `automotive_app_desc.xml` ve AndroidManifest.xml güncelleniyor
- **Durum:** Build sırasında otomatik entegre edilecek

### UI Düzeltmeleri (December 2025)
1. **Kırmızı çizgi kaldırıldı** - Logo altındaki gereksiz "live indicator bar" kaldırıldı
2. **Ülke bayrağı düzeltmesi** - `countryCode` (camelCase) desteği eklendi
3. **Station tipi güncellendi** - `logoAssets.folder`, `countryCode` eklendi

---

## User Language
Turkish (Türkçe)
