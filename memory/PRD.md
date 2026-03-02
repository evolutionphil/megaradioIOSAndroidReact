# MegaRadio - React Native Radio Streaming App

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" with support for iOS, Android, CarPlay, Android Auto, Apple Watch, and Wear OS.

## Tech Stack
- **Main App**: Expo SDK 54, TypeScript, Expo Router, react-native-track-player
- **CarPlay/Android Auto**: @g4rb4g3/react-native-carplay
- **Apple Watch**: SwiftUI (watchOS 9+)
- **Wear OS**: Kotlin + Jetpack Compose for Wear OS
- **API**: MegaRadio API (https://themegaradio.com)

## Latest Update (December 2025) - Fork Session

### 🔧 Yapılan Düzeltmeler

1. **Logo Fallback - LOCAL Asset Kullanımı**
   - `assets/images/default-station-logo.png` eklendi (optimize: 256x256, 74KB)
   - `stationLogoHelper.ts`: `DEFAULT_STATION_LOGO_SOURCE` = require() ile local asset
   - `MiniPlayer.tsx`: Local fallback kullanıyor
   - `ImageWithFallback.tsx`: Local fallback default olarak kullanıyor
   - `all-stations.tsx`: onError ile local fallback
   - Network bağımlılığı olmadan çalışıyor

2. **CarPlay Düzeltmeleri**
   - Cold-start için React Native auto-initialization eklendi
   - Genres ülke filtreleme eklendi
   - Genre stations ülke filtreleme eklendi
   - GridTemplate desteği (genres için)
   - Language change listener (dil değiştiğinde template yenileme)

3. **Country Parameter Tutarlılığı**
   - Backend API native name bekliyor (Türkiye, Österreich)
   - `/api/genres/:slug/stations` English name bekliyor (Turkey, Austria)
   - Frontend artık doğru formatları kullanıyor

4. **i18n Cache Fix**
   - `changeLanguage()` fonksiyonunda cache temizleme eklendi

5. **Cache Sistemi**
   - `stationService.getPopularStations()` online'da her zaman API'den çekiyor
   - Cache sadece offline fallback için
   - Cache key artık limit parametresi içeriyor (farklı boyutlar karışmıyor)

6. **CarPlay Real-time Senkronizasyon (YENİ!)**
   - `carPlayService.ts`: `refreshTemplates()`, `refreshFavorites()`, `refreshRecentlyPlayed()` fonksiyonları eklendi
   - `CarPlayHandler.tsx`: Store değişikliklerini dinliyor (country, favorites, recentlyPlayed)
   - Debounced refresh (500ms) - çok sık güncelleme yapılmıyor
   - `AudioProvider.tsx`: Station çalındığında `recentlyPlayedStore.addStation()` çağrılıyor

### ⚠️ Bekleyen Sorunlar (User Verification Gerekli)

| Sorun | Durum | Not |
|-------|-------|-----|
| CarPlay Cold-Start | ❓ | Yeni build ile test edilmeli |
| CarPlay "Mehr" tab | ❓ | i18n düzeltmesi sonrası kontrol |
| Dil Değiştirme (DE vb.) | ❓ | API çalışıyor, UI refresh sorunu olabilir |
| Popular Stations (Fresh Install) | ❓ | Cache fix'i önceki session'da yapıldı |
| CarPlay Favoriler | ❓ | Store subscription eklendi |

### 🔴 Backend Sorunları (Düzeltilemez)
~~- `/api/genres/{slug}/stations` ❌ HTML döndürüyor~~ ✅ **DÜZELTILDI**
~~- `/api/now-playing/{id}` ❌ Bazı ID'ler için çalışmıyor~~ ✅ **DÜZELTILDI**
~~- `/api/recommendations/diverse` ❌~~ ✅ **DÜZELTILDI**

### ✅ Yeni Çalışan Endpoint'ler (Backend Güncellendi)
| Endpoint | Açıklama | Test |
|----------|----------|------|
| `GET /api/genres/:slug/stations` | Genre'ye göre istasyon listesi | ✅ Pop: 5162 istasyon |
| `GET /api/now-playing/:id` | Şu an çalan şarkı bilgisi | ✅ ICY metadata çalışıyor |
| `GET /api/recommendations/diverse` | Karışık tür önerileri | ✅ Multi-genre istasyonlar |

### ✅ Android Auto API Entegrasyonu (YENİ!)
| Dosya | Açıklama |
|-------|----------|
| `MegaRadioApiClient.kt` | OkHttp ile API çağrıları (popular, genres, search, recommendations) |
| `MegaRadioAutoService.kt` | Gerçek API entegrasyonu, ülke filtreleme, cache sistemi |
| `AndroidAutoModule.kt` | React Native native module - event bridge |
| `AndroidAutoPackage.kt` | Native module package registration |
| `androidAutoHandler.ts` | JS event listener for Android Auto broadcasts |

**Android Auto Özellikleri:**
- ✅ Popular Stations (API'den dinamik)
- ✅ Genres listesi (40 tür)
- ✅ Genre'ye göre istasyonlar
- ✅ Discover/Recommendations
- ✅ Search desteği
- ✅ Ülke filtreleme
- ✅ Cache sistemi (hızlı gezinme için)
- ✅ React Native ile event bridge 

## Previous Update (Build 47) - December 2025

### 🔍 API Endpoint Durumu

**Çalışan (14+):**
- `/api/stations/popular?country=Austria&limit=50` ✅ 50 istasyon
- `/api/stations/nearby?lat=48.2&lng=16.3&radius=100` ✅ 10 istasyon
- `/api/stations?country=Austria` ✅ 10 istasyon
- `/api/genres`, `/api/translations/{lang}` vb.

**Çalışmayan:**
- `/api/genres/{slug}/stations` ❌
- `/api/now-playing/{id}` ❌
- `/api/recommendations/diverse` ❌

### 🔧 Build 47 Düzeltmeleri

1. **StationCacheService Web/SSR Uyumluluğu**
   - `checkOnline()`: Web'de `true` döndürüyor (NetInfo skip)
   - Constructor: SSR'de initialization skip ediliyor
   - Lazy singleton pattern eklendi

2. **Popular Stations Debug Logging**
   - `getPopularStations()` fonksiyonuna detaylı logging eklendi
   - Cache yoksa API'ye fallthrough yapılıyor

3. **Nearby Stations**
   - API çalışıyor (koordinat ile test edildi)
   - Sorun: Kullanıcı konum izni vermemiş olabilir
   - `latitude`/`longitude` null ise query disabled

### 📦 Build Bilgileri
- iOS Build: 47
- Android versionCode: 47

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
- **P0**: Yeni EAS Build'ler gerekli (Casting, CarPlay, Android Auto, Tablet Responsive testleri için)
- **P0**: Google OAuth Android SHA-1 fingerprint (kullanıcı aksiyonu bekliyor)
- **P2**: Sleep Timer tam test
- **P2**: UI animasyonları
- **P2**: Splash Screen yeniden tasarımı (tasarım bekleniyor)

## Tablet Responsive Tasarım (Aralık 2025)

### Uygulanan Değişiklikler:

1. **useResponsive Hook** (`src/hooks/useResponsive.ts`)
   - Breakpoints: Phone (<768px), Tablet (768-1024px), Large Tablet (>1024px)
   - Dinamik grid hesaplama (3 → 4 → 5 kolon)
   - Responsive artwork, banner, genre kart boyutları
   - Scale helper fonksiyonu

2. **Responsive Güncellenen Sayfalar:**
   - `app/(tabs)/index.tsx` - HomeScreen: Dinamik grid, banner, genre kartları
   - `app/(tabs)/discover.tsx` - Discover: Genre grid, station listesi
   - `app/(tabs)/favorites.tsx` - Favorites: Dinamik FlatList kolonları
   - `app/(tabs)/genres.tsx` - Genres: Multi-column layout
   - `app/player.tsx` - Player: Büyütülmüş artwork, responsive grid
   - `app/search.tsx` - Search: 2 kolonlu sonuç listesi
   - `app/all-stations.tsx` - All Stations: Responsive grid ve list view

3. **Tablet-Specific Değişiklikler:**
   - Grid kolonları: Phone 3 → Tablet 4-5
   - Side padding: Phone 15px → Tablet 32-40px
   - Artwork boyutu: Phone 190px → Tablet 280-350px
   - Genre kartları: Phone 130px → Tablet 160-180px
   - Banner genişliği: Phone 300px → Tablet 400-480px
   - Section başlıkları ölçekleniyor (1.2-1.3x)
   - User listesi 2 kolonlu tablet layout
   - FlatList numColumns dinamik

### YouTube-Style Universal Cast Button - Aralık 2025

**Kullanıcı İsteği:** Cast ikonuna basınca hem AirPlay hem Chromecast cihazları tek yerden seçilebilmeli

**Çözüm:**

1. **react-airplay** kütüphanesi eklendi:
   - iOS'ta native AirPlay picker açıyor
   - AirPlay bağlantı durumunu takip ediyor
   - `useAirplayConnectivity()` hook'u ile bağlantı kontrolü

2. **UniversalCastButton bileşeni oluşturuldu** (`src/components/UniversalCastButton.tsx`):
   - iOS: Native AirPlay picker (Apple TV, HomePod, AirPlay hoparlörler)
   - Android: Native Chromecast picker
   - Bağlıyken yeşil renk ve pulse animasyonu
   - Tek buton, tüm cihazlar

3. **withAirPlay.js plugin eklendi:**
   - AirPlay Bonjour services (`_airplay._tcp`, `_raop._tcp`)
   - Background audio modes

**Nasıl Çalışıyor:**
- iOS'ta: Cast ikonuna dokun → Native AirPlay picker açılır → Apple TV/HomePod/AirPlay hoparlör seç
- Android'de: Cast ikonuna dokun → Native Chromecast picker açılır → Chromecast/Android TV seç

### Background Player Controls (Next/Previous) Fix - Aralık 2025

**Sorun:** 
- iPhone kilit ekranında ve Control Center'da Next/Previous butonları aktif değildi
- Background'da radyo değiştirme çalışmıyordu

**Çözüm:**

1. **trackPlayerService.ts** - Capability'ler eklendi:
   - `Capability.SkipToNext`
   - `Capability.SkipToPrevious`

2. **service.js** - Background event handler'lar güncellendi:
   - `Event.RemoteNext` → Similar Stations'dan sonraki radyoyu çalıyor
   - `Event.RemotePrevious` → Playback History'den önceki radyoyu çalıyor
   - AsyncStorage ile app ↔ background service iletişimi

3. **AudioProvider.tsx** - Yeni data kaydetme:
   - `@megaradio_current_station` → Şu anki istasyon
   - `@megaradio_similar_stations` → Sonraki için benzer istasyonlar
   - `@megaradio_playback_history` → Önceki için dinleme geçmişi

**Nasıl Çalışıyor:**
- Uygulama bir radyo çaldığında, benzer istasyonları API'den çekip AsyncStorage'a kaydediyor
- Background service (kilit ekranı/Control Center) Next basıldığında AsyncStorage'dan similar stations okuyor
- Previous basıldığında playback history'den önceki radyoyu çalıyor

### CarPlay Crash Fix (Aralık 2025)

**Sorun:** CarPlay bağlandığında uygulama crash oluyordu
**Sebep:** iOS, CarPlay scene oluşturulurken SYNCHRONOUS olarak root template bekliyor. Mevcut kod async veri çekiyordu.
**Çözüm:** `carPlayService.ts` güncellendi:
- `registerOnConnect` callback'inde önce placeholder template SYNCHRONOUS olarak ayarlanıyor
- Sonra async olarak gerçek veriler yükleniyor ve template güncelleniyor

## Tamamlanan Entegrasyonlar
- **Native Google Cast / Chromecast**: react-native-google-cast v4.9.1 entegre edildi
  - Header'da yeni cast butonu (tv-outline icon)
  - Chromecast cihazları otomatik keşif (startDiscoveryAfterFirstTapOnCastButton: false)
  - Doğrudan stream gönderimi (TV uygulaması gerekmez)
  - iOS ve Android desteği
  - Expo Config Plugin ile otomatik native setup
  - Cast başladığında lokal audio otomatik durur
  - audio/mp3 content type kullanılıyor (daha iyi Chromecast uyumu)
  - Generic metadata type (radio streams için optimize)
- **MegaRadio API Cast**: Mevcut sistem korundu (AirPlay butonu)

---

## Changelog

### December 2025 - P0/P1 Bug Fixes

#### Düzeltilen Sorunlar:

1. **Profile.tsx AsyncStorage Import Eksikliği (P0)**
   - **Sorun**: Profile sayfasında `play_at_login_setting` okunurken AsyncStorage import edilmemişti
   - **Çözüm**: AsyncStorage import'u eklendi

2. **Genre Card Text Ortalama (P2)**
   - **Sorun**: Genre kartlarındaki metin ve ikon ortalanmamıştı
   - **Çözüm**: `GenreCard.tsx`'de gradient stilinde `justifyContent: 'center'`, `alignItems: 'center'` eklendi

3. **Unique Stations İstatistiği Güncellenmiyordu (P1)**
   - **Sorun**: "Dinlenen Benzersiz İstasyonlar" her zaman 0 gösteriyordu
   - **Çözüm**: 
     - `statsService.ts`'e `trackUniqueStation()` ve `getUniqueStationsListened()` fonksiyonları eklendi
     - `AudioProvider.tsx`'de her istasyon çalındığında `trackUniqueStation()` çağrılıyor
     - Benzersiz istasyonlar artık AsyncStorage'da ayrı bir set olarak takip ediliyor

4. **Android Auto Favorites Persistence (P1)**
   - **Sorun**: Android Auto'da favoriler statikti, kullanıcının gerçek favorileri gösterilmiyordu
   - **Çözüm**:
     - `favoritesStore.ts`'e `syncToAndroidAuto()` helper fonksiyonu eklendi
     - Favoriler her güncellendiğinde AsyncStorage'a Android Auto için serialize ediliyor
     - `MegaRadioAutoService.kt` (native Kotlin) güncellendi - SharedPreferences'tan favorileri okuyor
     - `loadFavoritesFromStorage()` fonksiyonu eklendi (JSON parse ile favorileri yüklüyor)

#### Değişen Dosyalar:
- `app/(tabs)/profile.tsx` - AsyncStorage import eklendi
- `src/components/GenreCard.tsx` - Stil düzeltmesi (centered layout)
- `src/services/statsService.ts` - trackUniqueStation, getUniqueStationsListened eklendi
- `src/providers/AudioProvider.tsx` - trackUniqueStation çağrısı eklendi
- `app/statistics.tsx` - getUniqueStationsListened kullanımı
- `src/store/favoritesStore.ts` - syncToAndroidAuto helper eklendi
- `plugins/withAndroidAutoFull.js` - MegaRadioAutoService.kt güncellendi (SharedPreferences okuma)

#### ⚠️ Test Gereksinimleri:
- **Native Build Gerekli**: Tüm değişiklikler yeni EAS build gerektiriyor
- **Android Auto Test**: Favorilerin Android Auto'da görünmesi için:
  1. Uygulamada favori ekleyin
  2. Arabaya bağlanın
  3. MegaRadio > Favoriler'i açın
- **İstatistik Test**: Farklı istasyonları dinleyin ve Statistics sayfasını kontrol edin

### December 2025 - Android Bug Fixes (Session 3)

#### Düzeltilen Sorunlar:

1. **Splash Screen Tutarsızlığı (P0)**
   - **Sorun**: İki farklı splash screen görünüyordu (native ve animated)
   - **Çözüm**: Native splash screen kullanıcının sağladığı resimle güncellendi, AnimatedSplash basitleştirildi

2. **Car Mode Volume Slider (P0)**
   - **Sorun**: Volume slider parmakla senkronize hareket etmiyordu, erratik davranış
   - **Çözüm**: `onTouchStart/Move` yerine PanResponder-based VolumeSlider component oluşturuldu, `measureInWindow` ile doğru pozisyon hesaplama

3. **Mini Player Safe Area (P0) - Genre Detail & Search**
   - **Sorun**: Mini player Android sistem navigation bar'ın arkasında kalıyordu
   - **Çözüm**: `genre-detail.tsx` ve `search.tsx` sayfalarında paddingBottom artırıldı (180px ve 200px)

4. **Recently Played/Stations Near You Boyut Sorunu (P0)**
   - **Sorun**: Tek öğe olduğunda çok büyük görünüyordu (flex: 1 ile tüm alanı dolduruyordu)
   - **Çözüm**: Grid item'larda `flex: 1` yerine `width: 31%` ve `maxWidth: 130` kullanıldı

5. **Uygulama Kapatıldığında Radyo Çalmaya Devam Ediyor (P0)**
   - **Sorun**: Android'de uygulama kapatıldığında audio durmuyor
   - **Çözüm**: `_layout.tsx`'e AppState listener eklendi, component unmount'ta TrackPlayer.reset() çağrılıyor

6. **Station Detail Font Düzeltmesi**
   - **Sorun**: "Son Çalınanlar" ve "Benzer Radyolar" başlıkları italic (eğik) fontla gösteriliyordu
   - **Çözüm**: `fontStyle: 'italic'` kaldırıldı, `fontFamily: 'Ubuntu-Bold'` eklendi

7. **Genre Card Text Centered**
   - **Sorun**: Tür kartlarındaki yazılar sol hizalıydı
   - **Çözüm**: `alignItems: 'center'` ve `textAlign: 'center'` eklendi

8. **Play at Login Text Güncellenmesi**
   - **Sorun**: Profile sayfasında Play at Login her zaman "Last Played" gösteriyordu
   - **Çözüm**: AsyncStorage'dan seçili değeri okuyup dinamik gösterme eklendi

9. **Statistics Page Güncellendi**
   - **Sorun**: "Total Radio Stations 136k" yanlış, "Music Played 0" statik
   - **Çözüm**: UI düzenlendi - Unique Stations ve Songs Played gösterilecek şekilde değiştirildi

10. **Music/Songs Played Tracking**
    - **Sorun**: Metadata değiştiğinde şarkı sayısı artmıyordu
    - **Çözüm**: AudioProvider'da metadata değişikliği algılandığında `statsService.incrementMusicPlayed()` çağrılıyor

11. **Cast Icon Header'a Eklendi**
    - Station Detail sayfası header'ına direct cast butonu eklendi (tv-outline icon)

#### Değişen Dosyalar:
- `app.json` - Native splash screen ayarları güncellendi
- `app/_layout.tsx` - AppState listener ve TrackPlayer cleanup eklendi
- `app/genre-detail.tsx` - MiniPlayer için bottom padding eklendi
- `app/search.tsx` - MiniPlayer için bottom padding eklendi  
- `app/(tabs)/index.tsx` - Grid item boyutları düzeltildi, avatar debug log eklendi
- `app/(tabs)/profile.tsx` - Play at Login dinamik text eklendi
- `app/player.tsx` - Font düzeltmesi, cast icon eklendi
- `app/statistics.tsx` - UI düzenlendi (Unique Stations + Songs Played)
- `src/components/AnimatedSplash.tsx` - Basitleştirildi, tek resim kullanıyor
- `src/components/CarModeScreen.tsx` - VolumeSlider component eklendi
- `src/components/GenreCard.tsx` - Text centered yapıldı
- `src/providers/AudioProvider.tsx` - Music played tracking eklendi
- `src/services/statsService.ts` - incrementMusicPlayed fonksiyonu eklendi
- `assets/images/splash-native.png` - Kullanıcının splash screen resmi eklendi

#### ⚠️ Kontrol Gereken:
- **Avatar Görünmüyor**: Backend'den user.avatar veya user.profilePhoto gelmiyor olabilir. Console log eklendi - yeni build'de logları kontrol edin.

### February 2025 - Android Bug Fixes (Session 2)

#### Düzeltilen Sorunlar:

1. **React Hooks Hatası (KRITIK)**
   - **Sorun**: "Rendered more hooks than during the previous render" hatası - MiniPlayer bileşeninde hooks early return'den sonra çağrılıyordu
   - **Çözüm**: Tüm hooks early return'den önce taşındı, PanResponder ve Animated kaldırıldı (swipe-to-dismiss daha sonra eklenecek)

2. **JSX Tag Kapanış Hatası**
   - **Sorun**: `</Animated.View>` yerine `</View>` olması gerekiyordu
   - **Çözüm**: Tag düzeltildi

3. **stopPlayback Fonksiyon Adı**
   - **Sorun**: `stop` fonksiyonu yerine `stopPlayback` kullanılmalıydı
   - **Çözüm**: useAudioPlayer hook'undan doğru fonksiyon adı kullanıldı

### February 2025 - Android Bug Fixes (Session 1)

#### Düzeltilen Sorunlar:

1. **Siyah Ekran Sorunu (P0)**
   - **Sorun**: Uygulama yeniden başlatıldığında ve player modal dismiss edildiğinde siyah ekran
   - **Çözüm**: `_layout.tsx` ve `player.tsx`'de router.canGoBack() kontrolü eklendi, boş route durumunda tabs'a yönlendirme

2. **Mini Player Layout (P0)**
   - **Sorun**: Mini player tab bar'ı kapatıyordu
   - **Çözüm**: `MiniPlayer.tsx`'de Android için system navigation bar inset'i dahil edildi

3. **Mini Player Swipe-to-Dismiss (YENİ ÖZELLİK)**
   - Sağdan sola kaydırarak mini player'ı kapatma özelliği eklendi
   - `playerStore.ts`'ye `hideMiniPlayer()` fonksiyonu eklendi

4. **Profil Sayfası Layout (P0)**
   - **Sorun**: Login butonu mini-player tarafından kapanıyordu
   - **Çözüm**: ScrollView'a dinamik bottom padding eklendi (mini-player + tab bar + system nav bar)

5. **Car Mode Volume Slider (P0)**
   - **Sorun**: Volume slider sistem nav bar arkasında kalıyordu ve çalışmıyordu
   - **Çözüm**: `CarModeScreen.tsx`'e useSafeAreaInsets eklendi, touch-based volume control implement edildi

6. **Cast Icon (P1)**
   - **Sorun**: Cast icon tıklandığında login sayfasına yönlendiriyordu
   - **Çözüm**: Artık doğrudan CastModal açılıyor, login kontrolü modal içinde yapılıyor

7. **Share WhatsApp (P1)**
   - **Sorun**: Paylaşım WhatsApp Business'a gidiyordu
   - **Çözüm**: Native Share API kullanılıyor, kullanıcı hangi WhatsApp uygulamasını kullanacağını seçebilir

8. **AnimatedSplash Safe Area (P0)**
   - Android'de bottom padding eklendi

#### Değişen Dosyalar:
- `app/_layout.tsx` - Boş route kontrolü
- `app/player.tsx` - canGoBack kontrolü, cast handler düzeltmesi
- `app/(tabs)/profile.tsx` - Bottom padding, playerStore import
- `src/components/MiniPlayer.tsx` - Swipe-to-dismiss, safe area düzeltmesi
- `src/components/CarModeScreen.tsx` - Volume slider, safe area düzeltmesi
- `src/components/AnimatedSplash.tsx` - Safe area düzeltmesi
- `src/components/ShareModal.tsx` - Native Share API kullanımı
- `src/store/playerStore.ts` - hideMiniPlayer fonksiyonu

### December 2025 - Backend Onaylı Streaming Düzeltmesi

#### Stream URL Resolution (Final - Backend Onaylı)

**Strateji:**
```javascript
1. streamUrl = urlResolved (boş değilse) || url
2. if streamUrl.endsWith(.pls/.m3u/.m3u8/.asx):
     response = GET /api/stream/resolve?url={streamUrl}
     streamUrl = response.candidates[0]
3. return streamUrl
```

**Android HTTP Streams:**
- `usesCleartextTraffic: true` eklendi (app.json)
- HTTP stream'ler artık doğrudan çalışacak

**Düzeltilen Slug'lar (Backend Onaylı):**
| İstasyon | Doğru Slug | URL |
|----------|------------|-----|
| Virgin Radio Türkiye | `virgin-radio-trkiye` | PLS → resolve gerekli |
| Best FM (Turkey) | `best-fm-2` | `http://46.20.7.126/;stream.mp3` |
| Radyo Maximum | `radyo-maksimum` | `https://radyomaximum.kesintisizyayin.com:9970/;stream.mp3` |

#### Düzeltilen UI Sorunları:
1. **Android Navigation Bar** - `useSafeAreaInsets` ile tab bar padding düzeltildi
2. **Notification Deep Link** - Notification tıklandığında player sayfasına yönlendirme eklendi
3. **Metadata Karışıklığı** - İstasyon değiştiğinde önceki metadata temizleniyor

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

### Kotlin 2.1 Uyumluluk Patch'i (December 2025)
- **Sorun:** `react-native-track-player` Kotlin 2.1 null safety ile uyumsuz
- **Çözüm:** `patch-package` ile `MusicModule.kt` nullable Bundle sorunu düzeltildi
- **Dosya:** `patches/react-native-track-player+4.1.2.patch`
- **Otomatik:** `postinstall` script ile her `yarn install` sonrası uygulanıyor

### UI Düzeltmeleri (December 2025)
1. **Kırmızı çizgi kaldırıldı** - Logo altındaki gereksiz "live indicator bar" kaldırıldı
2. **Ülke bayrağı düzeltmesi** - `countryCode` (camelCase) desteği eklendi
3. **Station tipi güncellendi** - `logoAssets.folder`, `countryCode` eklendi

---

## December 2025 - Critical Bug Fixes (Session 4)

### Düzeltilen Sorunlar:

1. **Favoriler Race Condition (P0)**
   - **Sorun**: Uygulama açıldığında favoriler API çağrısı, auth token yüklenmeden yapılıyordu. Bu yüzden 40+ favori yerine sadece 4 tane (local storage'dan) yükleniyordu.
   - **Kök Neden**: `favorites.tsx`'deki `useEffect`, `isAuthLoaded` flag'ini kontrol etmiyordu. Auth store'dan token alınmadan `loadFavorites()` çağrılıyordu.
   - **Çözüm**: 
     - `favorites.tsx`'de `isAuthLoaded` flag'i eklendi
     - `useEffect` artık `isAuthLoaded` true olana kadar bekliyor
     - Token tamamen yüklendikten sonra API çağrısı yapılıyor

2. **iOS Kilit Ekranı Kontrolleri (P0)**
   - **Sorun**: iOS kilit ekranında ve Control Center'da Next/Previous butonları aktif değildi
   - **Kök Neden**: `_layout.tsx`'deki TrackPlayer setup kodu, `AudioProvider.tsx`'deki doğru capability'leri override ediyordu. Ayrıca eski `TrackPlayer.CAPABILITY_*` formatı kullanılıyordu.
   - **Çözüm**: 
     - `_layout.tsx`'deki TrackPlayer setup kodu sadeleştirildi - artık sadece status check yapıyor
     - Gerçek setup `AudioProvider.tsx`'de yapılıyor (doğru `Capability.*` enum'ları ile)
     - `SkipToNext`, `SkipToPrevious`, `JumpForward`, `JumpBackward` capability'leri zaten ekli

3. **Avatar Fallback (P0)**
   - **Sorun**: Geçersiz avatar URL'lerinde boş alan görünüyordu
   - **Kök Neden**: Inline avatar kodu hata durumunu düzgün handle etmiyordu
   - **Çözüm**:
     - `AvatarWithFallback.tsx` komponenti iyileştirildi (useEffect ile state reset, loading overlay)
     - `index.tsx` (Discovery) ve `profile.tsx` artık `AvatarWithFallback` komponenti kullanıyor
     - Image yüklenemezse gradient fallback (pembe-turuncu) ve person ikonu gösteriliyor

### Değişen Dosyalar:
- `app/(tabs)/favorites.tsx` - isAuthLoaded flag eklendi, race condition düzeltildi
- `app/_layout.tsx` - TrackPlayer setup sadeleştirildi (AudioProvider'a devredildi)
- `app/(tabs)/index.tsx` - AvatarWithFallback import ve kullanımı
- `app/(tabs)/profile.tsx` - AvatarWithFallback import ve kullanımı
- `src/components/AvatarWithFallback.tsx` - Geliştirildi (state yönetimi, loading overlay)

### ⚠️ Test Gereksinimleri:
- **Yeni EAS Build Gerekli**: Tüm değişiklikler native build gerektiriyor
- **Favoriler Test**: Login yapıp favoriler sekmesini kontrol edin - tüm favoriler (40+) yüklenmeli
- **Kilit Ekranı Test**: Bir radyo çalın, telefonu kilitleyin, kilit ekranında Next/Previous butonlarını test edin
- **Avatar Test**: Geçersiz avatar URL'li bir kullanıcı ile giriş yapın, gradient fallback görünmeli

---

## December 2025 - AdMob Integration (Session 6)

### Eklenen Özellikler:

1. **Google AdMob Entegrasyonu**
   - `react-native-google-mobile-ads` paketi eklendi
   - iOS ve Android App ID'leri konfigüre edildi
   - Interstitial ve Rewarded ad unit'leri tanımlandı

2. **Interstitial Reklamlar**
   - Her 4 radyo değişiminde tam ekran reklam gösterilir
   - Reklamsız kullanıcılar için atlanır

3. **Rewarded Reklamlar (30 Dakika Reklamsız)**
   - Video izleyerek reklamsız süre kazanılır
   - Profile sayfasında "Premium" bölümünde

### Ad Unit ID'leri:
- iOS App: ca-app-pub-8771434485570434~4044224468
- Android App: ca-app-pub-8771434485570434~7427742767
- iOS Interstitial: ca-app-pub-8771434485570434/6008042825
- iOS Rewarded: ca-app-pub-8771434485570434/3488497756
- Android Interstitial: ca-app-pub-8771434485570434/7220363780
- Android Rewarded: ca-app-pub-8771434485570434/8745886806

### Eklenen Dosyalar:
- `src/services/adMobService.ts`
- `src/components/RewardedAdButton.tsx`

---

## December 2025 - Settings Persistence & Favorites Cache Fix (Session 5)

### Düzeltilen Sorunlar:

1. **Favoriler Cache Sorunu (P0) - FARKLI BIR SORUN**
   - **Sorun**: Logout yapıp başka hesapla giriş yapınca eski hesabın favorileri geliyordu.
   - **Kök Neden**: `handleLogout` fonksiyonu async `logout()` yerine senkron `clearAuth()` çağırıyordu. `clearAuth` sadece state'i sıfırlıyor, storage ve favoritesStore'u temizlemiyordu.
   - **Çözüm**: 
     - `profile.tsx`'de `handleLogout` artık async `logout()` fonksiyonunu çağırıyor
     - `authStore.ts` logout fonksiyonu AsyncStorage'dan favorileri temizliyor ve favoritesStore'u sıfırlıyor

2. **Dil ve Ülke Ayarları Persist Etmiyor (P0)**
   - **Sorun**: Türkçe ve Türkiye seçip uygulamayı kapatıp açınca English ve mevcut konum ülkesi gösteriliyordu.
   - **Kök Neden**: 
     - `locationStore.ts` ülke seçimini AsyncStorage'a kaydetmiyordu, sadece memory'de tutuyordu
     - Uygulama açılışında geolocation eski seçimi override ediyordu
   - **Çözüm**:
     - `locationStore.ts`'e `loadStoredCountry()` fonksiyonu eklendi
     - `setCountryManual()` fonksiyonu artık seçimi AsyncStorage'a kaydediyor
     - `isManuallySet` flag eklendi - manuel seçim varsa geolocation override etmiyor
     - `_layout.tsx`'de uygulama başlangıcında `loadStoredCountry()` çağrılıyor

### Değişen Dosyalar:
- `src/store/locationStore.ts` - AsyncStorage persist, loadStoredCountry, isManuallySet flag
- `src/store/authStore.ts` - logout fonksiyonunda favoritesStore reset log eklendi
- `app/_layout.tsx` - loadStoredCountry çağrısı eklendi
- `app/(tabs)/profile.tsx` - handleLogout artık async logout() kullanıyor

### ⚠️ Test Gereksinimleri:
- **Yeni EAS Build Gerekli**
- **Ülke Persist Test**: Türkiye seçin, uygulamayı kapatıp açın, Türkiye kalmalı
- **Favoriler Cache Test**: Hesap A ile giriş yapın, logout, Hesap B ile giriş yapın - B'nin favorileri gelmeli

### watchOS Kurulum Rehberi Güncellendi
- `Info.plist`'e `WKCompanionAppBundleIdentifier` ve `WKRunsIndependentlyOfCompanionApp` eklendi
- iOS Bundle ID: `com.visiongo.megaradio`
- watchOS Bundle ID: `com.visiongo.megaradio.watchkitapp`
- Detaylı rehber: `/app/frontend/WATCHOS_SETUP_GUIDE.md`

---

## February 2025 - UX Bug Fixes (Session 7)

### Düzeltilen Sorunlar:

1. **Favoriler Geç Yükleniyor (P0)**
   - **Sorun**: Login sonrası "Favori yok" görünüp 300ms sonra favoriler beliriyordu
   - **Kök Neden**: `authStore.ts`'de `setTimeout(..., 300)` kullanılıyordu
   - **Çözüm**: 
     - `authStore.ts`'den `setTimeout` kaldırıldı
     - `_layout.tsx`'de auth yüklendikten hemen sonra favoriler de yükleniyor
     - Artık login işlemi tamamlandığında favoriler zaten hazır

2. **Play at Login Çalışmıyor (P0)**
   - **Sorun**: "Girişte Çal" ayarı açık olmasına rağmen son dinlenen radyo otomatik başlamıyordu
   - **Kök Neden**: `PlayAtLoginHandler.tsx`, `isAuthLoaded` flag'ini kontrol etmiyordu - auth yüklenmeden `isAuthenticated` false olarak görünüyordu
   - **Çözüm**:
     - `isAuthLoaded` flag'i eklendi - artık auth tamamen yüklenene kadar bekliyor
     - `hasExecuted` mantığı düzeltildi - setting "off" olsa bile tekrar çalışmayı engelliyor
     - Dependency array'e `isAuthLoaded` ve `favoritesLoaded` eklendi

3. **Dil Kalıcılığı (P0)**
   - **Sorun**: Dil değiştirilip uygulama kapatılıp açılınca varsayılan dile dönüyordu (iddia edilen)
   - **Kök Neden**: Aslında çalışıyor - `initI18n` AsyncStorage'dan dili yüklüyor
   - **Çözüm**: Debug logları eklendi - "Initializing with stored language: tr" gibi loglar kontrol edilebilir

4. **Uygulama Her Açılışta Yeniden Yükleniyor (P0)**
   - **Sorun**: Splash screen her seferinde baştan başlıyordu
   - **Kök Neden**: Çoklu async işlemlerin senkronizasyon sorunu - auth/favorites/language ayrı ayrı yükleniyordu
   - **Çözüm**: Auth yüklendiğinde favoriler de hemen yükleniyor, sıralı ve optimize edilmiş loading

### Değişen Dosyalar:
- `src/store/authStore.ts` - setTimeout kaldırıldı, favoriler hemen yükleniyor
- `src/components/PlayAtLoginHandler.tsx` - isAuthLoaded kontrolü eklendi, hasExecuted mantığı düzeltildi
- `src/services/i18nService.ts` - Debug logları eklendi
- `app/_layout.tsx` - Auth yüklendiğinde favoriler de yükleniyor

### ⚠️ Test Gereksinimleri:
- **Yeni EAS Build Gerekli**: Tüm değişiklikler native build gerektiriyor
- **Favoriler Test**: Login yapın, favoriler sekmesine gidin - "Favori yok" flash'ı olmamalı
- **Play at Login Test**: Ayarları "Son Çalınan" yapın, uygulamayı kapatıp açın - son radyo otomatik çalmalı
- **Dil Test**: Türkçe seçin, uygulamayı kapatıp açın - Türkçe kalmalı

---

## February 2025 - Pre-Bare Workflow Checkpoint

### Mevcut Durum (Bare Workflow Öncesi)
Bu checkpoint, Bare Workflow'a geçmeden önceki son çalışan durumu temsil eder.

**Çalışan Özellikler:**
- Audio streaming (react-native-track-player)
- Favoriler, Recently Played, Profile
- Push Notifications (backend hazır)
- Google Cast / Chromecast
- AirPlay
- Android Auto (plugin ile)
- AdMob entegrasyonu
- Dil ve ülke kalıcılığı

**Düzeltilen Son Hatalar:**
1. Favoriler geç yükleniyor → setTimeout kaldırıldı
2. Play at Login çalışmıyor → isAuthLoaded kontrolü eklendi
3. Web AdMob hatası → Platform-specific dosyalar (.native.tsx, .web.tsx)

**Build Konfigürasyonu:**
- Xcode: macos-sequoia-15.3-xcode-16.2
- Swift 5 Mode plugin aktif
- Assets optimize edildi (21MB → 6MB)

**Rollback için:** Bu noktaya dönmek isterseniz, `/ios` ve `/android` klasörlerini silip managed workflow'a geri dönebilirsiniz.

---

## February 2025 - Bare Workflow Migration & CarPlay

### Bare Workflow Geçişi Tamamlandı

**Yapılan İşlemler:**
1. `npx expo prebuild --clean` ile native klasörler oluşturuldu
2. CarPlay Scene Delegate oluşturuldu (`ios/MegaRadio/CarPlaySceneDelegate.swift`)
3. Info.plist'e UIApplicationSceneManifest eklendi
4. Podfile'a Swift 5 mode fix eklendi
5. .easignore güncellendi (ios/android artık dahil)

**Oluşturulan CarPlay Dosyaları:**
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - CarPlay scene delegate
- Info.plist scene manifest yapılandırması

**Rollback için:**
```bash
rm -rf ios android
# Managed workflow'a geri döner
```

---

## User Language
Turkish (Türkçe)

---

## February 26, 2025 - FlowAlive Analytics Entegrasyonu

### FlowAlive SDK Kurulumu Tamamlandı

**Yapılan İşlemler:**
1. `flowalive-analytics@0.0.32` paketi kuruldu
2. `@react-native-community/netinfo@12.0.1` peer dependency kuruldu
3. `FlowAliveProvider` `_layout.tsx`'de uygulamanın root'una eklendi
4. `flowaliveService.ts` helper sınıfı oluşturuldu

**Entegre Edilen Analytics Events:**
- **Uygulama:** `app_opened`, `app_backgrounded`
- **Authentication:** `user_logged_in`, `user_logged_out`, `user_signed_up`
- **Playback:** `station_played`, `station_paused`, `station_stopped`, `playback_error`
- **Favorites:** `station_favorited`, `station_unfavorited`
- **Navigation:** `screen_viewed` (auto-tracking), `search_performed`, `genre_selected`
- **Ads:** `ad_viewed`, `ad_clicked`, `ad_rewarded`
- **CarPlay/Android Auto:** `carplay_connected`, `android_auto_connected`

**Tracking Entegrasyonları:**
- `authStore.ts`: Login/logout olaylarında kullanıcı identity ayarlanır
- `playerStore.ts`: Radyo oynatma/durdurma/hata olayları track edilir
- `favoritesStore.ts`: Favorilere ekleme/çıkarma olayları track edilir
- Auto screen tracking: FlowAliveProvider ile Expo Router ekran değişiklikleri otomatik track edilir

**Kullanılan API Anahtarı:**
- `flowalive_b42f8188aad215f2250e5f0889adcbf4`

**Dosyalar:**
- `src/services/flowaliveService.ts` - Analytics helper sınıfı
- `app/_layout.tsx` - FlowAliveProvider eklendi

**Test için:**
- Uygulama açıldığında `[FlowaliveService] Device initialized` log'u görülmeli
- Login/logout olaylarında user identity güncellenmeli
- Radyo oynatıldığında `station_played` eventi track edilmeli

---

## February 26, 2025 - CarPlay Crash Düzeltmesi (KRİTİK)

### Sorun Analizi
**Crash Sebebi:** CarPlay'de station favicon veya logo'ya tıklandığında uygulama crash oluyordu.
**Crash Noktası:** `[CPTemplateApplicationScene _deliverInterfaceControllerToDelegate]`
**Kök Neden:** 
1. `Info.plist`'te `UIApplicationSceneManifest` tanımlanmamıştı
2. CarPlay için `CPTemplateApplicationSceneDelegate` sınıfı yoktu
3. Ana uygulama için `UIWindowSceneDelegate` yoktu
4. `withCarPlay.js` plugin'i CarPlay scene konfigürasyonunu SİLİYORDU

### Uygulanan Düzeltmeler

**1. PhoneSceneDelegate.swift oluşturuldu:**
- Ana uygulama için window scene delegate
- `nonisolated` keyword ile Swift 6 actor isolation uyumlu

**2. CarPlaySceneDelegate.swift oluşturuldu:**
- CarPlay için template application scene delegate
- `RNCarPlay.connect()` ve `disconnect()` çağrıları
- `nonisolated` keyword ile thread-safe

**3. AppDelegate.swift güncellendi:**
- `application(_:configurationForConnecting:options:)` metodu eklendi
- CarPlay ve Phone scene'leri için routing
- Scene-based lifecycle desteği

**4. Info.plist güncellendi:**
- `UIApplicationSceneManifest` eklendi
- `UIWindowSceneSessionRoleApplication` (Phone)
- `CPTemplateApplicationSceneSessionRoleApplication` (CarPlay)

**5. withCarPlay.js düzeltildi:**
- Scene konfigürasyonunu silme kodu kaldırıldı
- Artık CarPlay scene'i koruyor

**6. MegaRadio-Bridging-Header.h güncellendi:**
- `RNCarPlay.h` import eklendi

**7. project.pbxproj güncellendi:**
- Yeni Swift dosyaları Xcode projesine eklendi

### Dosyalar
- `ios/MegaRadio/PhoneSceneDelegate.swift` - Ana uygulama scene delegate
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - CarPlay scene delegate
- `ios/MegaRadio/AppDelegate.swift` - Scene configuration
- `ios/MegaRadio/Info.plist` - Scene manifest
- `plugins/withCarPlay.js` - Düzeltilmiş config plugin

### Test İçin
1. Yeni iOS build oluşturun: `eas build --platform ios`
2. TestFlight'a yükleyin
3. CarPlay'e bağlanın ve station/logo'ya tıklayın
4. Uygulama crash OLMAMALI

---

## February 27, 2025 - iOS Crash Düzeltmesi (KRİTİK)

### Sorun Analizi
**Crash Sebebi:** Uygulama başlangıçta crash oluyordu
**Crash Mesajı:** `*** -[__NSPlaceholderDictionary initWithObjects:forKeys:count:]: attempt to insert nil object from objects[0]`
**Thread:** Thread 10 - dispatch_once_callout

**Kök Neden:**
1. `CarPlaySceneDelegate.swift` dosyasında `RNCarPlay.connect()` doğrudan çağrılıyordu
2. `RNCarPlay` native pod'u düzgün kurulu/linkli değildi
3. iOS scene delegate başlatılırken `RNCarPlay` sınıfı nil olarak çözümleniyordu
4. `MegaRadio-Bridging-Header.h` dosyasında hardcoded import vardı

### Uygulanan Düzeltmeler

**1. CarPlaySceneDelegate.swift güvenli hale getirildi:**
- `RNCarPlay` çağrıları runtime class lookup ile değiştirildi
- `NSClassFromString("RNCarPlay")` kullanılıyor
- Modül yoksa graceful degradation (crash yerine log)
- `performSelector` ile güvenli method çağrısı

**2. MegaRadio-Bridging-Header.h temizlendi:**
- Hardcoded RNCarPlay import kaldırıldı
- Runtime class lookup kullanılacak şekilde güncellendi

**3. Google Mobile Ads yeniden eklendi:**
- `react-native-google-mobile-ads@14.6.0` paketi eklendi
- `adMobService.native.ts` tamamen yeniden yazıldı
- Güvenli dynamic import ile SDK yüklemesi
- SDK yoksa graceful degradation

**4. app.json güncellendi:**
- `react-native-google-mobile-ads` plugin eklendi
- Build numarası 21'e artırıldı
- Test App ID'leri konfigüre edildi

### Değişen Dosyalar:
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - Güvenli RNCarPlay erişimi
- `ios/MegaRadio/MegaRadio-Bridging-Header.h` - Hardcoded import kaldırıldı
- `src/services/adMobService.native.ts` - Tamamen yeniden yazıldı
- `app.json` - Google Mobile Ads plugin, build number 21
- `package.json` - react-native-google-mobile-ads eklendi

### Test İçin:
1. Yeni iOS build oluşturun: `eas build --platform ios --clear-cache`
2. Build tamamlandığında TestFlight'a yükleyin
3. Uygulama artık crash OLMAMALI
4. CarPlay bağlantısı test edilmeli (RNCarPlay yoksa native-only mod çalışır)

### Build Komutu:
```bash
cd frontend
eas build --platform ios --clear-cache
```

---

## February 27, 2025 - Google Cast Re-integration

### Yapılan İşlemler:
1. **react-native-google-cast@4.8.4** paketi yeniden eklendi
2. **app.json** - Google Cast plugin konfigürasyonu eklendi
3. **NativeCastButton.tsx** - Dynamic import ile güvenli modül yüklemesi
4. **NativeCastModal.tsx** - Dynamic import ile güvenli modül yüklemesi
5. **AppDelegate.swift** - Google Cast initialization aktif edildi
6. **withGoogleCast.js** - Bonjour services konfigürasyonu

### Konfigürasyon:
- iOS: `kGCKDefaultMediaReceiverApplicationID` (default receiver)
- Bonjour: `_googlecast._tcp`, `_94952E1F._googlecast._tcp`
- Auto discovery: enabled
- Expanded media controls: enabled

### Build Komutu:
```bash
cd frontend
eas build --platform ios --clear-cache
```



---

## February 27, 2025 - Google Ads & Next Station Düzeltmeleri

### 1. Google AdMob Orijinal Haliyle Geri Yüklendi
- **Dosya:** `src/services/adMobService.native.ts`
- **Özellik:** Her 4 istasyon değişikliğinde interstitial reklam gösterilir (`INTERSTITIAL_FREQUENCY = 4`)
- **Production Ad Unit IDs:**
  - iOS Interstitial: `ca-app-pub-8771434485570434/6008042825`
  - iOS Rewarded: `ca-app-pub-8771434485570434/3488497756`
  - Android Interstitial: `ca-app-pub-8771434485570434/7220363780`
  - Android Rewarded: `ca-app-pub-8771434485570434/8745886806`
- Rewarded ad izlenince 30 dakika reklamsız süre verilir

### 2. Next Station Butonu Düzeltildi
- **Sorun:** Next butonuna basınca bazen aynı istasyon seçiliyordu (değişken gölgeleme hatası)
- **Kök Neden:** `handleNextStation` içinde yerel `similarStations` değişkeni raw (filtrelenmemiş) data kullanıyordu
- **Çözüm:** 
  - `handleNextStation` artık `displaySimilarStations` kullanıyor (mevcut istasyon zaten filtrelenmiş)
  - `handlePreviousStation` da aynı şekilde düzeltildi
- **Dosya:** `app/player.tsx` - lines 376-412

### 3. Metadata API Endpoint Düzeltildi
- **Sorun:** Now playing metadata API yanlış endpoint kullanıyordu (`/api/stations/{id}/metadata` → 404)
- **Çözüm:** Doğru endpoint kullanılıyor (`/api/now-playing/{id}` → 200)
- **Dosya:** `src/constants/api.ts`

### Değişen Dosyalar:
- `src/services/adMobService.native.ts` - Orijinal implementasyon geri yüklendi
- `app/player.tsx` - Next/Previous station bug fix
- `src/constants/api.ts` - Metadata endpoint düzeltildi

### Pod Sorunu Çözümü (Lokal Build):
```bash
cd ios && rm -rf Podfile.lock Pods && pod install --repo-update && cd ..
```

### EAS Build Komutu:
```bash
eas build --platform ios --profile production --auto-submit --clear-cache
```


---

## February 27, 2025 - CarPlay "Yükleniyor" Sorunu KÖK NEDENİ BULUNDU

### Kök Neden Analizi:
**Problem:** CarPlay her zaman "Yükleniyor..." ekranında kalıyor, istasyonlar görünmüyor.

**Kök Neden:** `MegaRadio-Bridging-Header.h` dosyasında **RNCarPlay import'u EKSİKTİ!**

iOS'ta Swift kodu Objective-C class'larına erişmek için bridging header'da import yapılması **ZORUNLU**. Import olmadan:
1. `NSClassFromString("RNCarPlay")` → **nil** döner
2. Native Swift → React Native bağlantısı kurulamaz
3. React Native `registerOnConnect` callback'i **ASLA** tetiklenmez
4. Template oluşturulmaz → Loading ekranı sonsuza kadar kalır

### Düzeltme:
**Dosya:** `ios/MegaRadio/MegaRadio-Bridging-Header.h`

RNCarPlay import'u eklendi:
```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <react-native-carplay/RNCarPlay.h>
```

### Build Komutu:
```bash
cd ios && rm -rf Podfile.lock Pods && pod install --repo-update && cd ..
eas build --platform ios --profile production --auto-submit --clear-cache
```

---

## February 28, 2025 - iOS Startup Crash Düzeltmesi (Build 32)

### Sorun Analizi:
**Crash Type:** `EXC_CRASH (SIGABRT)`
**Crash Message:** `*** -[__NSPlaceholderDictionary initWithObjects:forKeys:count:]: attempt to insert nil object from objects[0]`
**Crashing Thread:** Thread 11

**Stack Trace:**
```
- __61+[RCTThirdPartyComponentsProvider thirdPartyFabricComponents]_block_invoke
- +[RCTThirdPartyComponentsProvider thirdPartyFabricComponents]
- -[RCTDefaultReactNativeFactoryDelegate thirdPartyFabricComponents]
- -[RCTComponentViewFactory _registerComponentIfPossible:]
```

### Kök Neden:
**react-native-google-mobile-ads v14.6.0** zorla Fabric bağımlılıkları yüklüyor - `newArchEnabled=false` olsa bile!

Detaylı analiz:
1. React Native 0.81.5 `setup_fabric!` fonksiyonunu koşulsuz çağırıyor
2. react-native-google-mobile-ads podspec `install_modules_dependencies(s)` helper'ını kullanıyor
3. Bu helper **HER ZAMAN** `spec.dependency "React-RCTFabric"` ekliyor (RCT_NEW_ARCH_ENABLED değerinden bağımsız)
4. AdMob Fabric component'leri derleniyor ama runtime'da initialize edilemiyor
5. `RCTThirdPartyFabricComponentsProvider.thirdPartyFabricComponents` nil döndürüyor → CRASH

### Çözüm:
**react-native-google-mobile-ads** versiyonu **14.2.0**'a düşürüldü (son stabil versiyon - Fabric bug'ı yok)

```bash
yarn add react-native-google-mobile-ads@14.2.0
```

### Değişen Dosyalar:
- `package.json` - react-native-google-mobile-ads: 14.6.0 → 14.2.0
- `app.json` - buildNumber: 30 → 32, versionCode: 30 → 32

### Build Komutu:
```bash
eas build --platform ios --profile production --auto-submit --clear-cache
```

### CarPlay "Yükleniyor" Durumu:
Bu düzeltme ile birlikte:
1. Uygulama artık açılışta CRASH olmayacak
2. CarPlay bağlandığında React Native tarafı çalışabilecek
3. `CarPlayHandler` component'i düzgün initialize olacak
4. `registerOnConnect` callback tetiklenecek
5. Template'ler oluşturulacak ve "Yükleniyor" ekranı gidecek

---

## February 28, 2025 - CarPlay Bridge Race Condition Düzeltmesi (Build 32)

### Backend Developer Tavsiyeleri Uygulandı:

**Sorun:** Native Swift tarafı `RNCarPlay.connect()` çağırıyor ama React Native bridge henüz hazır olmadığı için event JS tarafına ulaşmıyor.

### 1. Swift Tarafında Bridge Hazır Kontrolü (CarPlaySceneDelegate.swift)

Eklenen özellikler:
- `isBridgeReady()` fonksiyonu - React Native bridge'in hazır olup olmadığını kontrol eder
- Bridge hazır değilse **retry mekanizması** (1 saniye arayla, max 10 deneme)
- `pendingInterfaceController` ve `pendingWindow` - bağlantı bilgisini kuyruğa alır
- Detaylı log: `bridgeReady: true/false` bilgisi

```swift
if !bridgeReady && connectionAttempts < maxRetryAttempts {
    // Queue connection for retry
    pendingInterfaceController = interfaceController
    pendingWindow = window
    // Retry after 1 second
    retryTimer = Timer.scheduledTimer(...)
}
```

### 2. JS Tarafında Erken Handler Kaydı (carPlayService.ts)

Eklenen özellikler:
- **Modül yüklendiği anda** `registerOnConnect` kaydediliyor (initialize beklenmeden)
- `pendingConnection` flag - erken gelen bağlantıları takip eder
- `handlersRegistered` flag - duplicate kayıt önler
- Initialize çağrıldığında `pendingConnection || CarPlay.connected` kontrol ediliyor

```typescript
// CRITICAL: Register handlers IMMEDIATELY when module loads
if (CarPlay && !handlersRegistered) {
  CarPlay.registerOnConnect(() => {
    pendingConnection = true;
  });
}
```

### Değişen Dosyalar:
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - Bridge hazır kontrolü + retry mekanizması
- `src/services/carPlayService.ts` - Erken handler kaydı + pending connection flag

### Build Komutu:
```bash
eas build --platform ios --profile production --auto-submit --clear-cache
```

---

## February 28, 2025 - GitHub Issue #236 Çözümü (Objective-C Delegate)

### GitHub Issue Analizi:
**Issue:** https://github.com/birkir/react-native-carplay/issues/236
**Kullanıcı:** @chaimPaneth
**Sorun:** `expo-router`'ın `SafeAreaProvider`'ı CarPlay'de window dimensions olmadığı için JS tarafını bloke ediyor.

### Uygulanan Çözüm - Objective-C CarPlay Delegate:

GitHub issue'daki kullanıcı Objective-C kullanmış ve başarılı olmuş. Swift'ten Objective-C'ye geçiş:

**Yeni dosyalar:**
- `ios/MegaRadio/CarSceneDelegate.h` - Header dosyası
- `ios/MegaRadio/CarSceneDelegate.m` - Implementation (doğrudan `[RNCarPlay connect...]` çağrısı)

**Avantajları:**
1. `[RNCarPlay connectWithInterfaceController:window:]` **doğrudan** çağrılıyor
2. Dinamik `NSClassFromString` yerine statik import
3. GitHub issue'daki çözümle tam uyumlu

**Info.plist Değişikliği:**
```xml
<!-- Eski (Swift) -->
<string>$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate</string>

<!-- Yeni (Objective-C) -->  
<string>CarSceneDelegate</string>
```

### Tüm Düzeltmelerin Özeti (Build 32):
1. ✅ `react-native-google-mobile-ads` 14.6.0 → 14.2.0 (Crash fix)
2. ✅ Objective-C CarPlay delegate (GitHub #236 çözümü)
3. ✅ JS tarafında erken handler kaydı
4. ✅ Swift bridge retry mekanizması (yedek olarak kaldı)

### Build Komutu:
```bash
eas build --platform ios --profile production --auto-submit --clear-cache
```



---

## March 2025 - iOS Crash Fix & Logo Update

### Crash Analizi (Crash Log: iev95b03_crashlog.crash)

**Crash Tipi:** `EXC_CRASH (SIGABRT)` - React Native assertion hatası
**Thread 10 (Crashed):** `facebook::react::RCTNativeModule::invoke` - Native module çağrısında crash
**Thread 0 (Main):** `REASwizzledUIManager reanimated_manageChildren` - Reanimated UI yönetimi

**Kök Neden:**
`react-native-reanimated` kütüphanesinin `RCTUIManager`'ı "swizzle" etmesi (değiştirmesi) ve CarPlay template refresh işlemlerinin çok hızlı tetiklenmesi arasındaki yarış durumu (race condition).

### Uygulanan Düzeltmeler:

**1. CarPlayHandler.tsx - Mutex ve Debounce Artırımı:**
- `isRefreshing` flag eklendi - eşzamanlı refresh'leri engelliyor
- Debounce süresi 500ms → 1000ms olarak artırıldı
- Cleanup fonksiyonunda `isRefreshing` sıfırlanıyor

**2. carPlayService.ts - Template Mutex:**
- `isCreatingTemplate` mutex eklendi
- `createRootTemplate()` artık eşzamanlı çağrılarda skip ediliyor
- Hem success hem error durumunda mutex serbest bırakılıyor

### Logo Güncellemesi (Pembe M Logosu):

**Eklenen/Güncellenen Dosyalar:**
- `/app/frontend/src/assets/images/app-icon.png` - Yeni pembe logo (source)
- `/app/frontend/src/assets/images/logo.png` - React Native fallback
- `/app/frontend/assets/images/default-station-logo.png` - Genel fallback
- `/app/frontend/assets/images/default-station-logo-128.png`
- `/app/frontend/assets/images/default-station-logo-64.png`
- `/app/frontend/ios/MegaRadio/Images.xcassets/DefaultStationLogo.imageset/` - iOS native fallback (tüm boyutlar)

### Bekleyen Sorunlar (User Verification Gerekli):

| Sorun | Durum | Build Gerekli |
|-------|-------|--------------|
| iOS Crash - REASwizzledUIManager | ❓ Düzeltme yapıldı | ✅ Yeni build |
| CarPlay Cold-Start | ❓ Önceki düzeltmeler test edilmedi | ✅ Yeni build |
| CarPlay Real-time Sync | ❓ Önceki düzeltmeler test edilmedi | ✅ Yeni build |
| Logo Fallback | ✅ Güncellendi | ✅ Yeni build |

### Değişen Dosyalar:
- `src/components/CarPlayHandler.tsx` - Race condition fix
- `src/services/carPlayService.ts` - Template mutex
- `src/assets/images/app-icon.png` - Yeni pembe logo
- `src/assets/images/logo.png` - Yeni fallback
- `assets/images/default-station-logo*.png` - Güncellenmiş fallback'ler
- `ios/MegaRadio/Images.xcassets/DefaultStationLogo.imageset/` - iOS native güncellemesi

### Build Komutu:
```bash
eas build --platform ios --clear-cache
```


---

## March 2025 - CarPlay Search & Voice Commands

### CarPlay Yeni Özellikler

**1. Search Tab Eklendi (🔍)**
- Tab bar'a yeni "Ara" (Search) tab'ı eklendi
- SearchTemplate ile gerçek zamanlı arama
- Arama sonuçları listede gösterilir
- Sonuç seçildiğinde otomatik çalma başlar
- `magnifyingglass` SF Symbol ile ikon

**2. Voice Commands (Siri) Desteği**
- CarPlay'de Siri ile radyo arama
- "Hey Siri, MegaRadio'da jazz ara"
- "Hey Siri, pop müzik çal"
- `openSearch()` metodu Siri intent'leri için hazır

### Android Auto Yeni Özellikler

**1. Search Menüsü**
- Ana menüye "Ara" seçeneği eklendi
- Örnek sesli komutlar gösteriliyor
- Son arama sonuçları cache'leniyor

**2. Voice Commands (Google Assistant) Desteği**
- `onPlayFromSearch` callback geliştirildi
- Türkçe ve İngilizce voice input parsing
- "Hey Google, MegaRadio'da rock çal"
- "Hey Google, jazz radyo ara"
- Arama sonuçları otomatik cache'leniyor

**3. Keyword Extraction**
- Voice input'tan gereksiz kelimeler temizleniyor
- "çal", "ara", "radyo", "müzik" gibi kelimeler filtreleniyor
- Daha doğru arama sonuçları

### Değişen Dosyalar:
- `src/services/carPlayService.ts` - SearchTemplate, openSearch eklendi
- `src/components/CarPlayHandler.tsx` - searchStations callback eklendi
- `src/services/i18nService.ts` - carplay_search çeviri eklendi
- `android/.../MegaRadioAutoService.kt` - Search menu, voice commands, keyword extraction

### Voice Command Örnekleri:

**CarPlay (Siri):**
- "Hey Siri, MegaRadio'da jazz ara"
- "Hey Siri, rock radyo çal"
- "Hey Siri, Power FM aç"

**Android Auto (Google Assistant):**
- "Hey Google, MegaRadio'da pop müzik çal"
- "Hey Google, klasik müzik radyosu ara"
- "Hey Google, Virgin Radio çal"

### Build Komutu:
```bash
# iOS
eas build --platform ios --clear-cache

# Android
eas build --platform android --clear-cache
```


---

## March 2025 - CarPlay Crash Fix & Popular Stations Fix

### Problem 1: CarPlay Crash (CPTabBarTemplate validateTemplates)
**Kök Neden:** `CPSearchTemplate` Audio kategori uygulamalarında Tab Bar'a eklenemez!
- iOS CarPlay sadece şu template'lere izin verir: `ListTemplate`, `GridTemplate`, `InformationTemplate`, `NowPlayingTemplate`
- `SearchTemplate` Navigation uygulamalarına özel

**Çözüm:**
- `SearchTemplate` tab bar'dan kaldırıldı
- Search fonksiyonu Siri voice commands ile kullanılabilir durumda tutuldu
- `createSearchTemplate()` ve `openSearchScreen()` fonksiyonları mevcut (voice command için)

### Problem 2: Popular Stations Çift Yükleme
**Kök Neden:** React Query cache ülke değişikliğinde invalidate edilmiyordu
- Önce eski ülkenin cache'li verisi gösteriliyordu
- Sonra yeni ülke verisi yükleniyordu

**Çözüm:**
- `CarPlayHandler.tsx`: Ülke değişikliğinde `queryClient.invalidateQueries()` eklendi
- `index.tsx`: Tüm country-dependent query'ler invalidate ediliyor:
  - `popularStations`
  - `genres`
  - `precomputedGenres`
  - `stations`
  - `nearby`

### Değişen Dosyalar:
- `src/services/carPlayService.ts` - SearchTemplate tab'dan kaldırıldı
- `src/components/CarPlayHandler.tsx` - Cache invalidation eklendi
- `app/(tabs)/index.tsx` - Cache invalidation eklendi

### Troubleshoot Agent Kullanıldı:
- Crash analizi yapıldı
- React Query cache isolation sorunu tespit edildi
- iOS CarPlay template kısıtlaması belirlendi


---

## March 2025 - Cache-First Pattern Implementation

### Problem: API çalışmadığında loading state ve boş data
**Kök Neden:** "Online-first" pattern - cache sadece offline durumda kullanılıyordu

### Çözüm: Cache-First with Background Refresh Pattern
Tüm service'ler şimdi bu pattern'ı kullanıyor:
1. Cache'den anında veri dön
2. Arka planda API'den güncelle
3. Cache'i güncelle

### Değiştirilen Dosyalar:

**1. stationService.ts**
- `getPopularStations()` → Cache-first pattern
- `getStations()` → Cache-first pattern
- Yeni: `refreshPopularStationsInBackground()`
- Yeni: `fetchPopularStationsFromAPI()`
- Yeni: `refreshStationsInBackground()`
- Yeni: `fetchStationsFromAPI()`

**2. genreService.ts**
- `getPrecomputedGenres()` → Cache-first pattern
- `getDiscoverableGenres()` → Cache-first pattern
- Yeni: `refreshGenresInBackground()`
- Yeni: `fetchPrecomputedGenresFromAPI()`
- Yeni: `refreshDiscoverableGenresInBackground()`
- Yeni: `fetchDiscoverableGenresFromAPI()`

**3. tvInitService.ts**
- `fetchTvInit()` → API hata durumunda boş yapı döndür (crash önleme)

**4. carPlayService.ts**
- GridTemplate yerine ListTemplate kullanılıyor (SF Symbols desteklenmiyor)
- Genre ikonları için posterImage/discoverableImage URL kullanılıyor

### CarPlay Genre İkonları Sorunu
**Sorun:** SF Symbols (systemImageName) react-native-carplay'de çalışmıyor
**Çözüm:** ListTemplate + URL bazlı resimler kullanılıyor

### Backend Developer İçin Notlar:
Eğer backend'de de cache implementasyonu gerekiyorsa:
1. `/api/tv/init` endpoint'i zaten server-side cache yapıyor (responseTime, cacheAge)
2. `/api/stations/popular` endpoint'i Redis/memory cache kullanmalı
3. `/api/genres/precomputed` endpoint'i statik veri olduğu için uzun süreli cache olabilir
4. Genre posterImage ve discoverableImage URL'leri CarPlay'de gösterilecek - bunların dolu olması önemli

### Test Senaryoları:
1. **Offline Test:** Airplane mode aç → App'i kapat → App'i aç → Cache'li veri görünmeli
2. **API Hata:** API çalışmıyor → Loading yok, cache'li veri gösterilmeli
3. **Fresh Install:** İlk kurulum + API hata → Boş yapı, crash yok
4. **CarPlay Genre:** Genre listesinde resimler görünmeli (LOCAL icon kullanılıyor - backend bağımsız)

---

## March 2025 - CarPlay Local Assets (Backend Bağımsızlık)

### Değişiklik: CarPlay Genre İkonları için Local Asset
**Önceki:** Backend'den posterImage/discoverableImage URL kullanılıyordu
**Şimdi:** Local `genre-icon.png` asset kullanılıyor - backend bağımsız

### Eklenen/Güncellenen Dosyalar:
- `assets/images/genre-icon.png` - CarPlay genre ikonları için local asset
- `src/services/carPlayService.ts`:
  - `LOCAL_FALLBACK_LOGO` - Local fallback logo asset
  - `LOCAL_GENRE_ICON` - Local genre icon asset
  - `FALLBACK_LOGO_URL` - URL bazlı fallback (legacy)
  - Genre template artık `LOCAL_GENRE_ICON` kullanıyor

### Neden Local Asset?
1. **Offline Çalışma:** Backend'e erişim olmadan CarPlay çalışır
2. **Güvenilirlik:** Network hataları genre ikonlarını etkilemez
3. **Performans:** Local asset anında yüklenir, network gecikmesi yok
4. **Tutarlılık:** Tüm genre'lar aynı ikonu gösterir

### CarPlay Template Yapısı:
- **Genres:** ListTemplate + Genre-specific local icons (her genre kendi ikonu)
- **Stations:** Station'ların kendi logoları URL olarak (getArtworkUrl)
- **Fallback:** FALLBACK_LOGO_URL (station logosu yoksa)

---

## March 2025 - Genre-Specific Icons for CarPlay

### Oluşturulan Genre İkonları:
| Genre | Dosya | İkon |
|-------|-------|------|
| Pop | genre-pop.png | 🎤 Mikrofon |
| Rock | genre-rock.png | 🎸 Elektro gitar |
| Jazz | genre-jazz.png | 🎷 Saksafon |
| Classical | genre-classical.png | 🎻 Keman & Piyano |
| Dance/Electronic | genre-dance.png | 🎧 Kulaklık |
| Hip-Hop/Rap | genre-hiphop.png | 🎤 Mikrofon & kulaklık |
| Country | genre-country.png | 🎸 Akustik gitar & kovboy şapka |
| News/Talk | genre-news.png | 💬 Konuşma balonu |
| Sports | genre-sports.png | 🏟️ Stadyum |
| World | genre-world.png | 🌍 Dünya & nota |
| R&B/Soul | genre-rnb.png | ❤️ Kalp & nota |
| Metal | genre-metal.png | 💀 Kuru kafa |
| Blues | genre-blues.png | 🎸 Gitar & nota |
| Default | genre-default.png | 🎤 Pop (varsayılan) |

### Dosya Konumu:
`/app/frontend/assets/images/genres/`

### Kod Değişiklikleri:
**carPlayService.ts:**
- `GENRE_ICONS` mapping objesi eklendi
- `getGenreIcon(genreName)` fonksiyonu eklendi
- `createGenresTemplate()` artık genre-specific ikonları kullanıyor

### Avantajlar:
1. ✅ **Görsel Çeşitlilik** - Her genre kendi ikonu
2. ✅ **Offline Çalışma** - Tüm ikonlar local
3. ✅ **Backend Bağımsız** - API'ye gerek yok
4. ✅ **CarPlay UX** - Kullanıcı genre'ı ikondan tanır

---

## March 2025 - CarPlay Performance Optimizations

### Root Cause Analysis (Troubleshoot Agent):
CarPlay'in bazen geç yüklenmesinin nedenleri tespit edildi:

1. **Cold Cache** - Cache boşken 4 ayrı API çağrısı blocking olarak çalışıyordu
2. **Favorites Sync** - `syncWithServer()` her seferinde blocking çağrı yapıyordu
3. **iOS Cold-Start Delay** - 2 saniye bekleme süresi vardı
4. **No Preloading** - Data CarPlay bağlanınca yükleniyordu, önceden değil

### Uygulanan Optimizasyonlar:

**1. Favorites Non-Blocking (CarPlayHandler.tsx)**
- Local favorites anında döndürülüyor
- Server sync arka planda yapılıyor
- 2 saniye timeout ile graceful degradation

**2. iOS Timing Optimizations (CarPlaySceneDelegate.swift)**
- Cold-start delay: 2.0s → 1.0s
- Loading check delay: 5.0s → 3.0s
- Toplam kazanç: ~3 saniye

**3. Cache Pre-Warming (CarPlayHandler.tsx)**
- Component mount olduğunda cache ısıtılıyor
- Popular stations, genres ve favorites paralel yükleniyor
- CarPlay bağlanmadan önce data hazır

### Beklenen İyileşme:
| Senaryo | Önceki | Sonra |
|---------|--------|-------|
| Warm Cache | ~1s | ~1s |
| Cold Cache | 3-5s | 1-2s |
| Cold Start | 5-7s | 2-3s |

### Değişen Dosyalar:
- `src/components/CarPlayHandler.tsx` - Non-blocking favorites, cache pre-warm
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - Reduced delays



