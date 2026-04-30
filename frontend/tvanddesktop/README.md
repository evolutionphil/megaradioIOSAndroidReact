# MegaRadio TV & Desktop — Multi-Platform Genişleme

> ⚠️ **CRITICAL RULE**: Bu klasördeki çalışmalar **mevcut iOS/Android mobile uygulamasını ASLA etkilemez**. 
> Mobile codebase (`/app/frontend/app/`, `/app/frontend/src/`, `/app/frontend/ios/`, `/app/frontend/android/`) bu çalışma sırasında dokunulmayacak.

---

## 📁 KLASÖR YAPISI

```
tvanddesktop/
├── _design-spec/                    ← Resmi tasarım dosyası (read-only)
│   ├── RADIO_MEGA_DESIGN_SPEC.md   (768 satır, pixel-exact spec)
│   └── screenshots/                 (9 referans ekran)
│
├── _shared/                         ← TÜM platformlarda paylaşılan kodlar
│   ├── api/                        - API client (mevcut backend kullanıyor)
│   ├── types/                      - TypeScript types
│   ├── constants/                  - Brand colors, spacing tokens
│   ├── i18n/                       - Translation strings (48 dil)
│   └── assets/                     - Logo, icons, fonts (Ubuntu)
│
├── apple-tv-and-macos/             ← Apple TV (tvOS) + macOS (Universal Purchase)
│   ├── ios/                        - tvOS native target
│   ├── macos/                      - macOS native target  
│   ├── src/                        - Shared Swift/SwiftUI code
│   ├── App.tsx (or .swift)        - Entry point
│   ├── package.json               - react-native-tvos + react-native-macos
│   └── README.md                  - Setup instructions
│
├── android-tv/                     ← Android TV + Google TV + Fire TV
│   ├── android/                    - Native Android TV target
│   ├── src/                        - Kotlin/Compose for TV
│   ├── package.json               - react-native-tvos (Android side)
│   └── README.md
│
└── desktop/                        ← Windows + Linux + (macOS optional fallback)
    ├── electron/                   - Electron main process
    ├── src/                        - Renderer (web bundle reuse)
    ├── package.json               - electron + react
    └── README.md
```

---

## 🎯 PLATFORM HEDEFLERİ

| Platform | Çerçeve | Bundle ID | Store |
|---|---|---|---|
| Apple TV | react-native-tvos | `com.visiongo.megaradio` (universal) | tvOS App Store |
| macOS | react-native-macos | `com.visiongo.megaradio` (universal) | Mac App Store |
| Android TV | react-native-tvos (Android side) | `com.megaradio.tv` | Google Play TV |
| Google TV | aynı Android TV build | aynı | Google Play TV |
| Fire TV | aynı Android TV build | aynı | Amazon Appstore |
| Windows | Electron | `MegaRadio` | Microsoft Store |
| Linux | Electron | `megaradio` | Snapcraft / AppImage |

---

## 🔗 PAYLAŞILAN BACKEND

Bu projeler mevcut backend'i **aynen kullanır** (değişiklik yok):
- API: `https://api.themegaradio.com`
- Stream proxy: `https://stream.themegaradio.com`
- Auth, IAP, Firebase, AdMob, Analytics — hepsi aynı

---

## 📅 GELİŞTİRME SIRASI (Faz 1A)

Kullanıcı kararı: **Apple TV + macOS önce** (Universal Purchase avantajı için)

1. ✅ Tasarım dosyası alındı ve incelendi
2. ⏳ `apple-tv-and-macos/` klasörü için detaylı PRD
3. ⏳ Teknik mimari kararlar (react-native-tvos vs SwiftUI native)
4. ⏳ Sprint planı
5. ⏳ Faz 1A implementation başlangıcı

---

## ⚠️ DEĞİŞMEZ KURALLAR

1. **Mobile codebase'e DOKUNULMAZ**: `/app/frontend/app/`, `/app/frontend/src/`, `/app/frontend/ios/`, `/app/frontend/android/`, `/app/frontend/plugins/` 
2. **Mobile package.json'a yeni dependency eklenmeyecek** (TV/Desktop kendi package.json'larına sahip)
3. **Backend codebase'e dokunulmaz** (ya da sadece additive endpoint'ler eklenir, mevcut endpoint'ler değişmez)
4. **Aynı API endpoint'ler kullanılır** — yeni backend route'lar TV-specific gerekiyorsa `tv=1` query param ile mevcut endpoint'lerden ayırt edilir
5. **CocoaPods/Gradle config çakışmaları için izole klasörler** kullanılır

---

## 🚀 İLK FAZ TESLİMATLARI

### Apple TV + macOS Faz 1A:
- [ ] `apple-tv-and-macos/` boilerplate (react-native-tvos kurulu)
- [ ] Brand asset transferi (logo, fonts, icons)
- [ ] Sidebar component (120×100px tile, focus engine)
- [ ] Discover sayfası iskeleti (hero + popular genres + popular stations)
- [ ] API client (mevcut backend ile entegre)
- [ ] Splash + Login (TV code) ekranı
- [ ] Apple TV Simulator'da çalışan demo

**Tahmini süre**: 2 hafta

---

**Hazırlayan**: E1 Agent  
**Tarih**: Nisan 2026  
**Status**: Tasarım analizi tamamlandı — implementation başlamaya hazır
