# MegaRadio TV/Desktop Genişlemesi — Araştırma Raporu

**Tarih**: Nisan 2026  
**Hedef Platformlar**: Apple TV (tvOS) · macOS · Android TV / Google TV / Fire TV · Windows/Linux Desktop

---

## 1. PLATFORM GENEL BAKIŞ

| Platform | Geliştirme Yöntemi | Aynı Codebase? | Önerilen | Olgunluk |
|---|---|---|---|---|
| **Apple TV (tvOS)** | `react-native-tvos` fork + Expo plugin | ✅ Mobil ile %80 paylaşım | ✅ Native | ⭐⭐⭐⭐⭐ |
| **macOS** | `react-native-macos` (Microsoft) | ✅ iOS ile %70 paylaşım | ✅ Native | ⭐⭐⭐⭐ |
| **Android TV / Google TV / Fire TV** | `react-native-tvos` fork + Expo plugin | ✅ Mobil ile %80 paylaşım | ✅ Native | ⭐⭐⭐⭐⭐ |
| **Windows Desktop** | Electron veya `react-native-windows` | 🟡 Web bundle reuse | Electron (hızlı) | ⭐⭐⭐ |
| **Linux Desktop** | Electron | 🟡 Web bundle reuse | Electron | ⭐⭐⭐ |

---

## 2. ÖNERİLEN MİMARİ — MONOREPO YAPI

```
megaradio/
├── apps/
│   ├── mobile/          # iOS + Android (mevcut)
│   ├── tv/              # Apple TV + Android TV + Fire TV
│   ├── macos/           # macOS native
│   └── desktop/         # Windows + Linux (Electron)
│
├── packages/
│   ├── shared-ui/       # Ortak komponentler
│   ├── shared-services/ # API, Auth, Audio, IAP, Analytics
│   ├── shared-store/    # Zustand store'lar
│   └── shared-types/    # TypeScript types
│
├── backend/             # Mevcut FastAPI backend (değişmez)
└── package.json
```

**Avantaj**: %70-80 kod paylaşımı, tek backend, tek API.

---

## 3. APPLE TV (tvOS) — DETAY

### Gereksinimler
- **macOS** (zorunlu)
- **Xcode 16+**
- **tvOS SDK 17+**
- **Apple Developer Account** (mevcut: ✅ `M6T85HP76P` Vision Go GmbH)

### Paketler
```json
{
  "react-native": "npm:react-native-tvos@0.81-stable",
  "@react-native-tvos/config-tv": "latest"
}
```

### Native Özellikler
- ✅ **D-pad/Siri Remote** focus engine (otomatik)
- ✅ **TVFocusGuideView** ile özel navigasyon
- ✅ **TVEventHandler** (Play/Pause/Menu butonları)
- ✅ **AVPlayer** üzerinden audio streaming (TrackPlayer aynı kalır)
- ✅ Top Shelf widget (uygulama ön ekranda öne çıkanlar)

### MegaRadio'ya Özel Tasarım Gereksinimleri
- **TV-first layout**: Yatay kart kaydırma, hero banner, large fonts
- **Focus visual feedback**: Scale + glow + soft shadow
- **Voice search**: Siri ile "Türkçe pop dinle"
- **Background audio**: Ekran kapalı çalmaya devam
- **CarPlay'e benzer şekilde** TabBarTemplate + ListTemplate yapısı

---

## 4. ANDROID TV / GOOGLE TV / FIRE TV — DETAY

### Tek Codebase Avantajı
- Apple TV ile aynı `react-native-tvos` fork'unu kullanır
- `EXPO_TV=1` environment ile prebuild → her iki platform için de çalışır
- AndroidManifest.xml'e `<intent-filter>` ile Leanback launcher eklenir

### Önemli Detaylar
- **Leanback focus engine**: Proximity-based (yakınlık temelli) — bazen tahmin edilemez
- **TVFocusGuideView**: Apple TV ile aynı API — düzenleyici
- **react-tv-space-navigation**: Daha güvenilir cross-TV navigation
- **Fire TV** için ek manifest flags gerekiyor (Amazon test gereksinimleri)

### Pazar Verileri
- Google TV / Android TV: %43 global TV market share
- Fire TV: %17 (özellikle ABD/UK)
- Tek codebase ile her ikisi de hedeflenebilir

---

## 5. macOS — DETAY

### Yöntem Karşılaştırması

| Yöntem | Açıklama | Önerim |
|---|---|---|
| **react-native-macos** | Microsoft maintained, native AppKit | ✅ ÖNERİLEN |
| **Mac Catalyst** | iPad uygulamasını Mac'te çalıştır | ❌ Düşük UX |

### Neden `react-native-macos`?
- Native macOS deneyimi (menü bar, sidebar, window controls)
- iOS kodu paylaşılabilir (%70+)
- Mac Catalyst'in "iPad on Mac" hissinden kurtulur
- Microsoft tarafından aktif maintenance

### Native Özellikler
- ✅ Menü bar (File, Edit, Audio, Help)
- ✅ Sidebar navigation (NSSplitView)
- ✅ Toolbar (NSToolbar)
- ✅ macOS klavye kısayolları (Cmd+P play/pause, Cmd+→ next station)
- ✅ Touch Bar (eski MacBook'lar için opsiyonel)
- ✅ Spotlight indexing (uygulama içi arama)
- ✅ Notification Center entegrasyonu

### MegaRadio'ya Özel
- **Window manager**: Resize, mini-player mode (always-on-top)
- **Now Playing**: macOS Control Center'da gözükmesi (mevcut TrackPlayer destekliyor)
- **Menu Bar Mini Player**: Status bar'da küçük müzik kontrolü (Spotify gibi)

---

## 6. WINDOWS / LINUX DESKTOP — DETAY

### Önerilen: **Electron + Web Bundle**

**Neden?**
- Mevcut web preview zaten çalışıyor
- Hızlı geliştirme (RN Windows native portu çok zor)
- Auto-update sistemi (electron-updater)
- Tek codebase paylaşımı

### Alternatif: `react-native-windows`
- Microsoft maintained
- Native Windows hissi
- AMA: Setup zor, RN versiyon kısıtlamaları, az destek

### Önerim: Electron
- Web build → Electron ile paketle
- 1-2 günde kullanılabilir desktop app çıkar
- Windows/Linux/macOS aynı kodu kullanır

---

## 7. STORE / DAĞITIM PLANLAMASI

| Platform | Store | Bundle ID | Account |
|---|---|---|---|
| Apple TV | tvOS App Store | `com.visiongo.megaradio.tv` | Vision Go GmbH ✅ |
| macOS | Mac App Store | `com.visiongo.megaradio.macos` | Vision Go GmbH ✅ |
| Android TV | Google Play TV | `com.megaradio.tv` | (mevcut hesap) |
| Fire TV | Amazon Appstore | `com.megaradio.firetv` | Yeni hesap gerekli |
| Windows | Microsoft Store / Web | `MegaRadio` | Yeni hesap |
| Linux | Snapcraft / AppImage | - | - |

> **Not**: tvOS/macOS için ayrı Apple Developer hesabı gerekmiyor — mevcut Vision Go GmbH yeterli, sadece yeni bundle ID kayıtları yapılır.

---

## 8. UI/UX TASARIMSAL FARKLAR

### Apple TV / Android TV
- **10-foot UX**: Uzaktan görünebilir büyük tipografi
- **Focus state**: Görsel olarak güçlü highlight (scale 1.1 + shadow + border)
- **Yatay grid**: Hero carousel + horizontal categories
- **Minimal text input**: Voice/QR code login
- **Dark theme zorunlu**: TV ekranları için

### macOS
- **Sidebar layout**: Sol panel (Stations, Genres, Favorites) + ana içerik
- **Window controls**: Yeşil tam ekran, kırmızı kapat, sarı küçült
- **Multi-window**: Tek istasyon detay + ana pencere ayrı
- **Menu bar**: Standart macOS menüsü
- **Hover states**: Mouse'a duyarlı

### Desktop (Windows/Linux Electron)
- **Top toolbar** + sidebar
- **System tray**: Mini control
- **Auto-launch on startup** opsiyonu
- **Global hotkeys**: Media keys yönetimi

---

## 9. PAYLAŞILAN KODLAR (Backend & Services)

✅ **Aynen kullanılacak** (değişiklik gerekmez):
- FastAPI backend (`api.themegaradio.com`)
- Stream proxy (`stream.themegaradio.com`)
- Authentication flow
- Country/Genre/Station services
- Audio playback logic (TrackPlayer abstract'i)
- Favorites store
- Recently played
- ICY metadata parsing
- Firebase Analytics + Crashlytics

🟡 **Adapt edilecek**:
- IAP (tvOS/macOS aynı, AndroidTV farklı)
- Push notifications (Apple Push aynı, FCM Android TV)
- AdMob (TV ve macOS için ayrı reklam birim ID'leri)
- Splash screen (TV için yatay)
- Onboarding (TV için QR code login)

❌ **Platform özel**:
- Navigation (Tab bar yerine TV grid layout)
- Focus management (TVFocusGuideView)
- Window/Menu bar (sadece macOS)

---

## 10. AŞAMALI YOL HARİTASI

### Faz 1: Hazırlık (1 hafta)
1. Monorepo'ya geçiş (`packages/shared-*` paketler)
2. `react-native-tvos` test (yan dalda)
3. CI/CD adaptasyonu (EAS profile'lar: `tv-ios`, `tv-android`, `macos`)

### Faz 2: Apple TV MVP (2 hafta)
1. tvOS app target oluştur
2. TV-first navigation (yatay grid)
3. Focus engine wrapper component
4. Audio playback test
5. Apple TV Simulator demo
6. TestFlight beta

### Faz 3: Android TV (1 hafta — Apple TV bittikten sonra hızlı)
1. Aynı codebase'den Android TV build
2. Leanback launcher manifest
3. Fire TV testi
4. Google Play TV submission

### Faz 4: macOS Native (2 hafta)
1. `react-native-macos` integration
2. Sidebar + menu bar layout
3. Multi-window support
4. Mac App Store submission

### Faz 5: Desktop (1 hafta)
1. Electron wrapper
2. Auto-update (electron-updater)
3. System tray
4. Windows/Linux installer

**Toplam tahmini süre**: 7-8 hafta (sıralı), 4-5 hafta (paralel)

---

## 11. RİSKLER & DİKKAT EDİLECEKLER

### 🔴 Kritik Riskler
1. **`react-native-track-player` TV uyumluluğu**: TV'de plugin native modüllerin test edilmesi gerek
2. **CarPlay native modülü** TV ile çakışma ihtimali — koşullu yükleme gerek
3. **Firebase iOS modülleri** macOS için yeniden derlenmesi gerek
4. **AdMob TV reklamları**: TV-specific ad units (Google AdMob TV) farklı

### 🟡 Orta Riskler
1. **App store inceleme süreleri**: tvOS daha katı (3-7 gün)
2. **Performance**: TV cihazları düşük RAM'li olabilir (Fire TV Stick = 1GB)
3. **Bundle size**: TV apps maksimum 200MB

### 🟢 Düşük Riskler  
1. UI tasarım iterasyonları
2. Kullanıcı onboarding akışı

---

## 12. MALIYET TAHMİNİ

| Kalem | Tek Seferlik | Aylık |
|---|---|---|
| Apple Developer | ✅ Mevcut | $99/yıl |
| Google Play Console | ✅ Mevcut | $25 (1x) |
| Amazon Appstore (Fire TV) | $0 | $0 |
| Microsoft Store | $19 | $0 |
| EAS Build paid plan (TV builds) | - | $99/ay opt. |
| Code signing certs (macOS Notarization) | $0 | $0 (Apple Dev'de dahil) |

---

## 13. SORULAR (Sizin İçin)

1. **Önce hangi platformla başlamak istersiniz?**  
   - a) Apple TV + macOS (Apple ekosistem önce)
   - b) Apple TV + Android TV (TV önce, macOS sonra)
   - c) Tüm platformlar paralel (4-5 hafta yoğun)

2. **Apple TV ile macOS aynı app mi olacak?**  
   - Bundle ID aynı mı? (Tek satın alım = her iki platformda kullanım)
   - Mevcut: `com.visiongo.megaradio` (iOS)
   - Önerim: `com.visiongo.megaradio` (Universal Purchase ile macOS+tvOS)

3. **Tasarım dosyanızı paylaşın**  
   - Figma link / PDF / Screenshot
   - TV'ye özel mockup'lar
   - macOS sidebar tasarımı

4. **Premium model TV'de aynı mı?**  
   - Subscription IAP TV'de farklı setup gerekir
   - Family Sharing destek?

5. **Voice search istiyor musunuz?**  
   - Apple TV: Siri integration
   - Android TV: Google Assistant integration

6. **Live TV-style features?**  
   - Continue listening
   - Top Shelf widget
   - Picture-in-picture

---

## 14. SONRAKİ ADIM

Bana **tasarım dosyanızı** ve yukarıdaki **6 sorunun yanıtlarını** paylaşırsanız:
1. Detaylı PRD (Product Requirements) hazırlarım
2. Sprint planı çıkarırım
3. Faz 1'in (monorepo + tvOS hazırlık) implementasyonuna başlarız

---

**Hazırlayan**: E1 (Emergent AI)  
**Tarih**: Nisan 2026  
**Durum**: Araştırma Tamamlandı — Tasarım Dosyası Bekleniyor
