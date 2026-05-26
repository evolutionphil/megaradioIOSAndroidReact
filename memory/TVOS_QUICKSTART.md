# Apple TV (tvOS) Quickstart

> **Bu klasör SADECE Apple TV için. macOS ayrı projede: `frontend/tvanddesktop/desktop/` (Electron).**
> iOS ve WatchOS hâlâ `frontend/ios/` altında, dokunulmamıştır.

---

## 🚀 Hızlı Başlangıç (Mac'te)

```bash
# 1. Homebrew yoksa kur
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Proje klasörüne git
cd ~/Documents/megaradioIOSAndroidReact/frontend

# 3. tvOS projesini sıfırdan üret (xcodegen otomatik kurulur)
yarn tvos:setup

# 4. Xcode'da aç
open tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj
```

> **⚠️ Önemli:** `project.yml`, `Assets/Fonts/`, veya `Assets/Images/` değişirse
> mutlaka `yarn tvos:setup` çalıştırın. Yalnızca `.swift` dosya değişiklikleri için
> Xcode hot reload yeterlidir (Cmd+R).

Xcode'da:
- **Scheme** (sol üst) → `MegaRadioTV`
- **Cihaz** → Apple TV Simulator (örn. *Apple TV 4K (3rd generation)*)
- **Cmd + R** → Build & Run

İlk açılışta:
1. Splash (mega**radio** logosu + pink ellipse) görünür
2. 1.5s sonra **Guide 1 → 2 → 3 → 4** onboarding turu (tıkla / OK ile ilerle)
3. Sonra **Discover** ekranı: sol sidebar, sağ üstte Country + Login pill, listeler

---

## 🎨 1:1 Tasarım Paritesi

tvOS uygulaması artık web-preview React kodunun **birebir kopyası**:

| Ekran | Web → SwiftUI Dosyası |
|-------|----------------------|
| Splash | `Splash.swift` |
| Guide 1–4 | `Guides.swift` |
| Discover (no-user) | `Discover.swift` |
| Radio Playing | `RadioPlaying.swift` |
| Genres / GenreList | `Genres.swift` |
| Search | `Search.swift` |
| Favorites | `Favorites.swift` |
| Settings / Login (QR) | `Settings.swift` |
| Country Select | `CountrySelect.swift` |

### Asset & Font Adımları
Tüm web `images/*.svg` ve `*.png` dosyaları PNG'ye dönüştürülüp `Assets/Images/`'a, Ubuntu fontu (Light/Regular/Medium/Bold) `Assets/Fonts/`'a kondu ve `project.yml` içinde `UIAppFonts`'a kaydedildi. `Stage1920x1080` view modifier ile tvOS native 1920×1080 ekranda piksel-piksel aynı pozisyonlar kullanılır.

### Brand Token'ları
- Pink accent: `#FF4199`
- Background: `#0E0E0E`
- Surface: `#1A1A1A`
- Ubuntu fontu: 300/400/500/700 ağırlıkları bundle içinde

---

## 🐞 Bilinen Düzeltmeler (bu oturum)

| Sorun | Çözüm |
|-------|-------|
| ❌ `AudioPlayer` env object eksik → crash | ✅ `MegaRadioTVApp.swift` kökünde `.environmentObject(AudioPlayer.shared)` enjekte edildi (ayrıca AuthStore, FavoritesStore, CountryStore, TVRouter) |
| ❌ HTTP radio stream'leri ATS engelliyor | ✅ `project.yml` → `NSAppTransportSecurity.NSAllowsArbitraryLoads: true` |
| ❌ tvOS UI web-preview ile aynı değil | ✅ Tüm ekranlar `Stage1920x1080` + tam koordinat eşleşmesiyle baştan yazıldı |

---

## 🧪 Doğrulama Adımları

`yarn tvos:setup` sonrası Xcode'da Cmd+R basıp şunları kontrol edin:

1. **Splash:** Sol kenarda pembe ellipse glow + ortada `mega**radio**` logo + "Listen freely" + "megaradio.live" alt yazı
2. **Guide 1:** Sağ kalibrasyonlu kırmızı bullet'lı tooltip "This is the discovery page..." + sol üstte vurgulanmış Discover butonu + ok işareti
3. **Guide 2/3/4:** Sırayla Genres (green), Search (blue), Favorites (yellow) tooltip'leri
4. **Discover:** Hand-crowd-disco background + sol sidebar + üst sağda Country + Login pill + sezgisel istasyon kartları
5. **İstasyona tıkla:** Crash YOK, Radio Playing ekranı açılıyor, 480×480 artwork + büyük başlık + Play/Pause/Heart/Back butonları
6. **AVPlayer:** HTTP stream'leri çalıyor (ATS izin verdi)

---

## 📁 Klasör Yapısı

```
ios-tvos/
├── project.yml                  # xcodegen kaynağı
├── MegaRadioTVApp.swift         # @main, env objects, AVAudioSession
├── TVRouter.swift               # Wouter-clone hash routing
├── Theme.swift                  # Brand tokens + Stage1920x1080 + BrandImage
├── Views.swift                  # Router + sidebar/header/global-player
├── Splash.swift                 # /
├── Guides.swift                 # /guide-1..4
├── Discover.swift               # /discover-no-user
├── RadioPlaying.swift           # /radio-playing
├── Genres.swift                 # /genres + /genre-list/:tag
├── Search.swift                 # /search
├── Favorites.swift              # /favorites
├── Settings.swift               # /settings + /login
├── CountrySelect.swift          # /country-select
├── AudioPlayer.swift            # AVPlayer ObservableObject
├── AuthStore.swift              # Pairing-code login
├── FavoritesStore.swift         # UserDefaults-backed favorites
├── CountryStore.swift           # Country picker persistence
├── APIClient.swift              # api.themegaradio.com wrapper
├── Models.swift                 # Station / Genre / Country / responses
├── StoreKitIapService.swift     # StoreKit 2 (Apple TV IAP)
├── ShazamRecognizer.swift       # (excluded — ShazamKit not on tvOS)
├── Assets/
│   ├── Images/                  # logo, icons, hero images (PNG)
│   └── Fonts/                   # Ubuntu .ttf (Light/Regular/Medium/Bold)
└── Brand/                       # AppIcon / TopShelf
```

---

## 🛠️ Sık Karşılaşılan Sorunlar

**"Ubuntu font not loading"** → Fontlar `UIAppFonts` array'inde var, ama Xcode bazen cache'i temizleyene kadar font'u görmez. `Product → Clean Build Folder` (Shift+Cmd+K), sonra Build.

**"Image not found"** → `Assets/Images` klasörü `buildPhase: resources` olarak project.yml'de tanımlı. Yine de görünmüyorsa `yarn tvos:setup` ile projeyi yeniden oluştur.

**ATS değişiklikleri** → `project.yml` Info props altında. `yarn tvos:setup` çalıştırınca Info.plist otomatik yeniden üretilir.
