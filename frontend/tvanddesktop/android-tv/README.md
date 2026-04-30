# Android TV + Google TV + Fire TV — MegaRadio

## 🎯 HEDEF

Tek codebase ile Android TV, Google TV, ve Fire TV (Amazon) için MegaRadio uygulaması.  
**Pazar payı**: %43 Google TV + %17 Fire TV = global TV pazarının %60'ı.

## 🛠️ TEKNİK YAKLAŞIM

### Seçenek A: `react-native-tvos` (Apple TV ile aynı codebase)
- ✅ Apple TV + Android TV **AYNI** kodu paylaşabilir
- ✅ EXPO_TV=1 + platform: android ile build
- ✅ Mobile codebase ile çakışma yok

### Seçenek B: Kotlin + Jetpack Compose for TV (Tasarım dosyasında önerilen)
- ✅ Native, en performanslı
- ❌ Apple TV ile kod paylaşımı yok
- ❌ İki ayrı codebase bakımı

### KARAR: **Seçenek A** (Apple TV ile birleştirilmiş RN codebase)

`apple-tv-and-macos/` ile aynı kod tabanı. Build zamanı `EXPO_TV=1 npx expo prebuild --platform android` komutu ile Android TV native projesi üretilir.

> **Not**: Bu klasörde sadece Android TV-specific overrides ve native android/ klasörü tutulur. Tüm JS/TS kodu `apple-tv-and-macos/src/` altında ortak.

## 📋 ÖZELLİKLER

### Android TV / Google TV / Fire TV (Aynı build)
- [ ] Leanback launcher manifest (`<intent-filter><category android:name="android.intent.category.LEANBACK_LAUNCHER" />`)
- [ ] Banner asset (320×180 px) - Google Play TV gereksinimi
- [ ] D-pad navigation (TVFocusGuideView)
- [ ] **Color buttons** (Apple TV'de yok, sadece Android TV):
  - 🔴 Red → Add to Favorites
  - 🟢 Green → Play/Pause
  - 🟡 Yellow → Open Search
  - 🔵 Blue → Open Country Select
- [ ] Voice search (Google Assistant integration — opsiyonel, Faz 2)
- [ ] Background audio + foreground service + MediaSession

### Fire TV-specific
- [ ] Amazon Appstore manifest declarations
- [ ] Fire TV remote button mappings
- [ ] Amazon Alexa skill (opsiyonel, Faz 3)

## 🎨 TASARIM REFERANSI

📁 **Tasarım dosyası**: `../_design-spec/RADIO_MEGA_DESIGN_SPEC.md` (Apple TV ile aynı)  
📁 **Screenshot'lar**: `../_design-spec/screenshots/`

Apple TV ile **birebir aynı tasarım** — sadece renk button mappings farklı.

## 🚀 SETUP TALİMATLARI (Faz 1B başlayınca güncellenecek)

```bash
# Bu klasör Apple TV codebase'inin bir parçası olarak çalışacak
cd ../apple-tv-and-macos
EXPO_TV=1 npx expo prebuild --platform android --clean
yarn tv-android   # Android TV emulator
```

## 📅 İLERLEME

- [x] Klasör yapısı kuruldu
- [ ] Apple TV temel ekranları bittikten sonra başlanacak
- [ ] Manifest configuration
- [ ] Color button handling
- [ ] Fire TV submission

---

**Status**: Bekliyor — Apple TV faz 1A bitince başlayacak
