# Apple TV + macOS — MegaRadio Universal App

## 🎯 HEDEF

Tek codebase ile **Apple TV (tvOS 17+)** ve **macOS 14+** için MegaRadio uygulaması.  
**Universal Purchase** aktif — kullanıcı bir kez satın alır, tüm Apple cihazlarında kullanır.

## 🛠️ TEKNİK YAKLAŞIM

### Seçenek A: `react-native-tvos` + `react-native-macos` (ÖNERİLEN)
- ✅ Mevcut React Native kodunun %70-80'ini paylaşır
- ✅ Backend client, types, i18n, services aynen kullanılır
- ✅ Tek codebase, iki platform target
- ✅ Mobile codebase ile **asla çakışmaz** (ayrı klasör)
- 🟡 Bazı native modüller adapt edilmesi gerekiyor (TrackPlayer, Firebase)

### Seçenek B: SwiftUI Native (Tasarım dosyasında önerilen)
- ✅ %100 native performans
- ✅ Apple ekosistem uyumu
- ❌ Backend client, i18n, services baştan yazılması gerek
- ❌ Mobile ile hiçbir kod paylaşımı yok
- ❌ Geliştirme süresi 2x

### KARAR: **Seçenek A** (react-native-tvos + react-native-macos)

Tasarım dosyası SwiftUI'yi öneriyor ama mevcut kodun yeniden kullanımı için RN ekosisteminde kalıyoruz. Performans yine 60fps sınırında.

## 📋 ÖZELLİKLER

### Apple TV
- [ ] Sidebar nav (120×100px tile, focus engine)
- [ ] D-pad/Siri Remote support
- [ ] Splash + Onboarding (4 ekran tour)
- [ ] Login (6-digit TV code, themegaradio.com/tv URL)
- [ ] Discover (hero + popular genres + popular stations)
- [ ] Genres (4-col grid, paginated)
- [ ] GenreList (7-col stations grid, infinite scroll)
- [ ] Search (virtual keyboard 3×9 + results)
- [ ] Favorites (7-col grid)
- [ ] Country Select (search + virtual keyboard + 219 ülke)
- [ ] Settings (Language, Sleep Timer, Cast, Account)
- [ ] RadioPlaying (full-screen player + ambient mode)
- [ ] Help modal (color buttons mapping)
- [ ] Top Shelf widget (öne çıkan istasyonlar)

### macOS
- [ ] Sidebar (Apple TV ile aynı yapı, daha kompakt)
- [ ] Menu Bar (File, Edit, Audio, View, Help)
- [ ] Window controls (resize, mini-player mode)
- [ ] Multi-window support
- [ ] Keyboard shortcuts (Cmd+P play/pause, Cmd+→ next station)
- [ ] Status bar mini player (Spotify gibi)

## 🎨 TASARIM REFERANSI

📁 **Tasarım dosyası**: `../tvanddesktop/_design-spec/RADIO_MEGA_DESIGN_SPEC.md`  
📁 **Screenshot'lar**: `../tvanddesktop/_design-spec/screenshots/`

Tüm **renk değerleri**, **typography** (Ubuntu), **spacing** (4-multiple grid), ve **layout** (1920×1080 reference frame) tasarım dosyasından **birebir** uygulanacak.

## 🔌 BACKEND ENTEGRASYONU

Mevcut backend endpoint'leri kullanılır:
- `https://api.themegaradio.com` (data + auth)
- `https://stream.themegaradio.com` (stream proxy)

TV-specific endpoint'ler:
- `POST /api/auth/tv/code` (login code)
- `GET /api/auth/tv/poll` (login polling)
- `GET /api/cast/poll` (mobile→TV cast)

> Backend'e `?tv=1` query parametresi eklenir (response compression skip).

## 📦 DEPENDENCIES (Planlanan)

```json
{
  "react-native": "npm:react-native-tvos@0.81-stable",
  "react-native-macos": "^0.78.0",
  "@react-native-tvos/config-tv": "latest",
  "expo": "~54.0.0",
  "react": "19.0.0",
  "axios": "^1.x",
  "zustand": "^5.x",
  "react-native-track-player": "^4.x",
  "i18next": "^23.x",
  "react-i18next": "^15.x"
}
```

## 🚀 SETUP TALİMATLARI (Faz 1A başlayınca güncellenecek)

```bash
# Bu komutlar henüz çalıştırılmayacak — Faz 1A başlayınca aktif olur
cd apple-tv-and-macos
yarn install
EXPO_TV=1 npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
yarn tv-ios       # Apple TV Simulator
yarn macos        # macOS native window
```

## 📅 İLERLEME

- [x] Tasarım dosyası alındı
- [x] Klasör yapısı kuruldu
- [ ] Detaylı PRD hazırlanıyor
- [ ] Boilerplate setup
- [ ] İlk ekran (Splash) implementation

---

**Status**: Hazırlık aşaması — kullanıcı 2. dosyayı bekliyor
