# Apple TV (tvOS) + macOS Quickstart

> **iOS ve WatchOS projenizi etkilemez.** Bu klasör tamamen bağımsızdır.

## 🚀 Hızlı Başlangıç (Mac'te)

```bash
# 1. Henüz yüklemediysen Homebrew'u kontrol et
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Proje klasörüne git
cd ~/Documents/megaradioIOSAndroidReact/frontend

# 3. tvOS + macOS projesini otomatik üret
#    İlk çalıştırmada xcodegen otomatik kurulur (~30 saniye)
yarn tvos:setup

# 4. Xcode'da aç
open tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj
```

Xcode açılınca:
- **Scheme seçici** (sol üstte) → `MegaRadioTV` (Apple TV için) veya `MegaRadioMac` (macOS için)
- **Cihaz seçici** → Apple TV Simulator (tvOS) veya My Mac (macOS)
- **Cmd+R** → Build & Run

---

## 📦 Bu Proje Ne İçeriyor?

```
tvanddesktop/apple-tv-and-macos/ios-tvos/
├── project.yml                      ← TEK gerçek kaynak (YAML spec)
├── MegaRadioTVApp.swift             ← Ana SwiftUI app + WKWebView
├── ShazamRecognizer.swift           ← Şarkı tanıma
├── StoreKitIapService.swift         ← In-App Purchase
├── Brand/                           ← App icon, top shelf PNG'leri
├── MegaRadioTV.xcodeproj/           ← OTOMATİK üretilen (git'te yok)
├── Info.plist                       ← OTOMATİK (git'te yok)
└── MegaRadioTV.entitlements         ← OTOMATİK (git'te yok)
```

### 2 Target

| Target | Platform | Bundle ID | Ne yapar? |
|--------|----------|-----------|-----------|
| `MegaRadioTV` | tvOS 17+ | `com.visiongo.megaradio` | Apple TV uygulaması — Siri remote, ShazamKit, AirPlay |
| `MegaRadioMac` | macOS 14+ | `com.visiongo.megaradio.mac` | macOS uygulaması — menu bar, mini-player |

> **Universal Purchase:** tvOS bundle ID iOS ile aynı → kullanıcı **bir kez** alır, **iPhone + Apple TV** üzerinde kullanır. macOS biraz farklı bundle (`...mac`) çünkü Apple kuralları gereği iOS+tvOS+macOS aynı bundle id'de **sadece Mac Catalyst** ile mümkün.

---

## 🛡️ iOS ve WatchOS'i Bozar Mı?

**HAYIR.** Şu noktalar garanti:

| Bunu | Bunu yapmıyor |
|------|---------------|
| ✅ Sadece `tvanddesktop/apple-tv-and-macos/ios-tvos/` klasörüne yazıyor | ❌ `frontend/ios/` klasörüne dokunmuyor |
| ✅ Yeni `yarn tvos:setup` komutu ekledi | ❌ `yarn ios:setup` değişmedi |
| ✅ Yeni `scripts/create-tvos-project.js` | ❌ `scripts/add-watchos-target.js` değişmedi |
| ✅ Yeni Xcode projesi (`MegaRadioTV.xcodeproj`) | ❌ `MegaRadio.xcodeproj` değişmedi |
| ✅ Hiçbir pod gerektirmiyor (saf SwiftUI) | ❌ `ios/Podfile` değişmedi |

İstediğin zaman tamamen siliebilirsin (`rm -rf tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj`) — iOS uygulamanız etkilenmez.

---

## ⚙️ project.yml'i Değiştirdiğinde

xcodegen tek gerçek kaynak olarak `project.yml`'i okur. Yeni Swift dosyası eklediğinde veya bundle ID değiştirdiğinde:

```bash
yarn tvos:setup
```

`.xcodeproj` regenerate olur. Xcode açıksa **Cmd+Q** ile kapatıp tekrar aç.

> **⚠️ ÖNEMLİ:** Xcode UI üzerinden dosya/target ekleme — **kaybolur** çünkü `.xcodeproj` git'te yok ve regenerate'te overwrite olur. Hep `project.yml`'i güncelle.

---

## 🎬 İlk Build'de Beklenen Davranış

1. tvOS Simulator açılır
2. Splash screen (logo)
3. WKWebView, `https://www.themegaradio.com/tv` web preview'unu yükler
4. Siri Remote D-pad → JS `KeyboardEvent` olarak forwardlanır
5. Spatial navigation çalışır (zaten web preview'da var)

> İlk açılışta web'in yüklenmesi 2-3 saniye sürebilir (CDN cache + RN bundle).

---

## 🐞 Sık Karşılaşılan Sorunlar

### "xcodegen: command not found"
Script bunu **otomatik halletmeli**. Manuel yüklemek için:
```bash
brew install xcodegen
```

### "No matching provisioning profile"
Xcode'da: **Signing & Capabilities** → Team seç (Apple Developer hesabın).
Eğer farklı bundle ID kullanmak istersen `project.yml`'de `PRODUCT_BUNDLE_IDENTIFIER`'ı değiştir.

### "Could not find module 'CarPlay'"
CarPlay tvOS'ta yok — `MegaRadioTVApp.swift`'te conditional kullanılıyor olmalı. Hata alırsan dosyaya `#if os(iOS)` wrapper ekle.

### macOS target için "App Sandbox" hatası
macOS App Store'a göndermek için sandbox açık olmalı. `project.yml`'de `com.apple.security.app-sandbox: true` zaten ayarlı.

---

## 📝 Tüm Komutlar Özet

| Komut | Ne yapar |
|-------|----------|
| `yarn ios:setup` | iOS + WatchOS (mevcut, **değişmedi**) |
| `yarn tvos:setup` | Apple TV + macOS projesini regenerate eder (**YENİ**) |
| `open ios/MegaRadio.xcworkspace` | iOS / WatchOS aç |
| `open tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj` | tvOS / macOS aç |

---

## 🚢 App Store'a Gönderme

### Apple TV
1. Xcode → MegaRadioTV scheme → Product → Archive
2. Distribute App → App Store Connect
3. Apple Developer Portal → tvOS app oluştur (eğer yoksa)
4. TestFlight → internal testing → review submission

### macOS
Aynı akış ama scheme `MegaRadioMac`. Mac App Store kuralları için **App Sandbox** zorunlu (zaten açık).

---

_Last updated: May 26, 2026_
