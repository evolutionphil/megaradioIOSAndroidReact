# iOS Açılış Donması (Startup Jank) — Kök Neden Analizi ve Düzeltmeler
Tarih: 2026-06 | Kaynak: Kullanıcının cihazdan aldığı release Xcode log dökümü (dd.rtf)

## Logdan Tespit Edilen Kanıtlar
- `[Layout] GPS detection timed out after 5s` → Splash ekranı GPS'e kilitliydi
- `[IAP] fetchProducts timed out after 10s` + `[Layout] IAP init timed out after 15s` → StoreKit açılışta native kuyruğu tıkıyordu
- `[AudioProvider] Track Player setup timed out after 20s` → TrackPlayer setup açılış penceresinde yarışıyordu
- `Gesture: System gesture gate timed out` (2x) → Main thread bloke sinyali
- `ECONNABORTED timeout of 15000ms` (`/api/stations/popular`, `/api/tv/init`) → cihaz ağı yavaş; UI bunlara bağımlı olmamalı
- `[DiskCache] MMKV not available: Cannot read property 'prototype' of undefined` → MMKV v4, Legacy Architecture'da çalışmıyor
- `Crashlytics verification ping` → her açılışta gereksiz non-fatal error kaydı
- `Asset property "duration" accessed synchronously` → react-native-track-player/SwiftAudioEx kütüphane içi (yayın başlarken, kütüphane seviyesi — bkz. Bilinen Sınırlamalar)
- `createImageAtIndex '<!DOCTYP'` → bazı istasyon favicon URL'leri HTML dönüyor (görsel fallback zinciri yakalıyor, kozmetik)

## Uygulanan Düzeltmeler
1. **remoteLog kapatıldı (release)** — `sendLog` artık sadece `__DEV__`'de çalışıyor. Daha önce her modül yüklemesinde VE `RootLayout`'un HER render'ında (`ROOT_LAYOUT_RENDER_START`) network POST atıyordu → NSURLSession kuyruğu doluyordu. Render gövdesindeki 2 çağrı tamamen silindi. (`src/services/remoteLog.ts`, `app/_layout.tsx`)
2. **Splash artık GPS'i beklemiyor** — `countryLoaded`, AsyncStorage'daki kayıtlı ülke okunur okunmaz set ediliyor (ms seviyesi). GPS tespiti tamamen arka planda fire-and-forget. Kazanç: her cold start'ta ~5s. (`app/_layout.tsx` loadCountry)
3. **IAP init ertelendi** — StoreKit `initConnection + fetchProducts + restore` zinciri artık mount'tan 4s sonra + `InteractionManager.runAfterInteractions` içinde çalışıyor. Premium durumu (AsyncStorage) hâlâ anında yükleniyor. (`app/_layout.tsx` loadPremium)
4. **TrackPlayer setup ertelendi + lazy guard** — Setup 1.5s + interactions sonrasına ertelendi; ayrıca `playStation()` başında `trackPlayerInitialized` kontrolü ile gerçek lazy-init eklendi (eski "will retry on first play" mesajının retry kodu aslında yoktu — şimdi var). (`src/providers/AudioProvider.tsx`)
5. **Crashlytics verification ping kaldırıldı** — her açılışta sahte non-fatal error gönderimi silindi. (`app/_layout.tsx`)

## Denenip Geri Alınanlar
- **MMKV v2.12.2 downgrade**: Expo SDK 54 precompiled React Native build sistemiyle v2 derlenmiyor (umbrella header hatası). v4 ise New Architecture istiyor (app.json: `newArchEnabled: false`). Sonuç: v4.2.0'da kalındı; DiskCache'in **AsyncStorage fallback'i kalıcı ve çalışıyor** — `MMKV not available` uyarısı zararsız. New Architecture'a geçilirse MMKV otomatik devreye girer.

## Bilinen Sınırlamalar (kütüphane/ortam seviyesi, kod değişikliği ile çözülemez)
- `AVFoundation duration synchronously` uyarısı: react-native-track-player → SwiftAudioEx içi; upstream sorun. Yayın başlatma anında oluşur, açılış donmasının nedeni değildi.
- TLS `-1200/-9816` hataları (S3 logo + bazı istasyon favicon'ları): cihazın o anki ağ/filtre durumu; görsel fallback zinciri devrede.
- AdMob `no-fill`: reklam envanteri, kod hatası değil.

## Beklenen Sonuç
Cold start'ta UI'ı bloke eden hiçbir işlem kalmadı: splash yalnızca font + kayıtlı ülke okumayı bekliyor; GPS, IAP, TrackPlayer, AdMob, Crashlytics tümü arka planda/ertelenmiş. 15-20s'lik donma penceresi ortadan kalkmalı.
