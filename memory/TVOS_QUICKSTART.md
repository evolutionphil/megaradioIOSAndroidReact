# Apple TV (tvOS) Quickstart

> **Bu klasör SADECE Apple TV için. macOS ayrı projede: `frontend/tvanddesktop/desktop/` (Electron).**
> iOS ve WatchOS hâlâ `frontend/ios/` altında, dokunulmamıştır.

---

## 🚀 Hızlı Başlangıç (Mac'te)

```bash
# 1. Henüz yüklemediysen Homebrew'u kur
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Proje klasörüne git
cd ~/Documents/megaradioIOSAndroidReact/frontend

# 3. tvOS projesini otomatik üret (xcodegen otomatik kurulur)
yarn tvos:setup

# 4. Xcode'da aç
open tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj
```

Xcode'da:
- **Scheme** (sol üst) → `MegaRadioTV`
- **Cihaz** → Apple TV Simulator
- **Cmd+R** → Build & Run

---

## 🤔 Neden Sadece tvOS? macOS'a Ne Oldu?

Önceki versiyonda `MegaRadioMac` adında ayrı bir SwiftUI macOS target'ı vardı. Şu sebeplerle kaldırıldı:

| Native SwiftUI macOS | Mevcut Electron |
|----------------------|------------------|
| Yeni kod, yeni UI (AppKit) | ✅ Zaten çalışıyor |
| Apple Mac UDID kaydı şart | ✅ Vision Go GmbH sertifikası signed |
| Sadece macOS | ✅ Windows + Linux + macOS tek codebase |
| ~10MB | ~150MB (kabul edilebilir) |
| Mac App Store kolay | ✅ Mac App Store + DMG ikisi de mümkün |

**Sonuç:** Mevcut Electron app (`frontend/tvanddesktop/desktop/`) hem daha az bakım gerektiriyor hem de iOS/Android ile birebir aynı UX sunuyor (aynı web preview).

**tvOS farklı:** Electron tvOS'a port edilmedi, bu yüzden tvOS için **native Swift zorunlu** — bu klasör onun için.

---

## 📦 Bu Proje İçeriği

```
tvanddesktop/apple-tv-and-macos/ios-tvos/
├── project.yml                      ← TEK gerçek kaynak (YAML spec)
├── MegaRadioTVApp.swift             ← SwiftUI app + WKWebView + Siri remote
├── ShazamRecognizer.swift           ← Şarkı tanıma (tvOS'ta YOK, sadece disk'te durur)
├── StoreKitIapService.swift         ← In-App Purchase
├── Brand/                           ← App icon, top shelf PNG'leri
├── MegaRadioTV.xcodeproj/           ← ⚙️ OTOMATİK üretilen (git'te yok)
├── Info.plist                       ← ⚙️ OTOMATİK (git'te yok)
└── MegaRadioTV.entitlements         ← ⚙️ OTOMATİK (git'te yok)
```

### Target

| Target | Platform | Bundle ID | Ne yapar? |
|--------|----------|-----------|-----------|
| `MegaRadioTV` | tvOS 17+ | `com.visiongo.megaradio` | Apple TV uygulaması — Siri remote, AirPlay, StoreKit IAP |

> **Universal Purchase:** tvOS bundle ID iOS ile aynı → kullanıcı **bir kez** alır, **iPhone + Apple TV** üzerinde kullanır.

---

## 🖥️ macOS İçin (Electron)

```bash
cd ~/Documents/megaradioIOSAndroidReact/frontend/tvanddesktop/desktop
yarn install
yarn build:mac    # → dist/MegaRadio-1.0.x-universal.dmg
```

İmzalama otomatik (`Vision Go GmbH (M6T85HP76P)` sertifikası `package.json`'da hazır).

---

## 🛡️ iOS ve WatchOS'i Bozar Mı?

**HAYIR.** Bağımsızlık garantileri:

| Bunu | Bunu yapmıyor |
|------|---------------|
| ✅ Sadece `tvanddesktop/apple-tv-and-macos/ios-tvos/` klasörüne yazıyor | ❌ `frontend/ios/` klasörüne dokunmuyor |
| ✅ Yeni `yarn tvos:setup` komutu | ❌ `yarn ios:setup` değişmedi |
| ✅ Yeni `scripts/create-tvos-project.js` | ❌ `scripts/add-watchos-target.js` değişmedi |
| ✅ Yeni Xcode projesi (`MegaRadioTV.xcodeproj`) | ❌ `MegaRadio.xcodeproj` değişmedi |
| ✅ Hiçbir pod gerektirmiyor (saf SwiftUI) | ❌ `ios/Podfile` değişmedi |

İstediğin zaman tamamen silebilirsin → iOS uygulaman etkilenmez.

---

## ⚙️ project.yml'i Değiştirdiğinde

```bash
yarn tvos:setup
```

`.xcodeproj` regenerate olur. Xcode açıksa **Cmd+Q** ile kapatıp tekrar aç.

> ⚠️ **DİKKAT:** Xcode UI üzerinden dosya/target ekleme — **kaybolur**. Hep `project.yml`'i güncelle.

---

## 🐞 Sık Karşılaşılan Sorunlar

### "xcodegen: command not found"
```bash
brew install xcodegen
```

### ❗ "Communication with Apple failed — team has no devices"
### ❗ "No profiles for 'com.visiongo.megaradio' were found"

**Sebep:** iOS App ID `com.visiongo.megaradio` Apple Developer Portal'da SADECE iOS için kayıtlı. tvOS Capability açık değil → Xcode tvOS provisioning profili bulamıyor.

**Hızlı çözüm (şimdiki konfig):**
`project.yml`'de bundle ID `com.visiongo.megaradio.tv` olarak ayarlandı → Xcode otomatik **yeni App ID** yaratır, hiçbir manuel iş YOK. **Bu sayfayı atlayabilirsin, build çalışacak.**

**Sonuç:** Apple TV App Store'da AYRI bir uygulama olarak görünür (universal purchase değil — iOS müşterileri ayrıca satın alır).

**Production yol (Universal Purchase için, sonraya):**
1. https://developer.apple.com/account/resources/identifiers/list
2. `com.visiongo.megaradio` (iOS App ID) seç
3. Sayfanın altına in → **Additional Capabilities**
4. **tvOS**'u etkinleştir → Save
5. `project.yml`'de `com.visiongo.megaradio.tv` → `com.visiongo.megaradio` olarak değiştir
6. `yarn tvos:setup` → Xcode artık universal profili çekebilir

### "AppIcon must include 400x240 icon"
`Brand/Assets.xcassets/AppIcon.brandassets/`'e top shelf + AppIcon image setlerini eklemelisin. Hazır PNG'ler `Brand/` klasöründe.

---

## 📝 Tüm Komutlar Özet

| Komut | Ne yapar |
|-------|----------|
| `yarn ios:setup` | iOS + WatchOS (mevcut, **değişmedi**) |
| `yarn tvos:setup` | Apple TV projesi (**YENİ**) |
| `yarn build:mac` (desktop/) | macOS Electron DMG |
| `yarn build:win` (desktop/) | Windows EXE/NSIS |
| `yarn build:linux` (desktop/) | Linux AppImage/DEB |
| `open ios/MegaRadio.xcworkspace` | iOS / WatchOS aç |
| `open tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj` | tvOS aç |

---

## 🚢 App Store'a Gönderme (Apple TV)

1. Xcode → MegaRadioTV scheme → **Product → Archive**
2. Distribute App → App Store Connect
3. Apple Developer Portal → tvOS app oluştur (eğer yoksa)
4. App Store Connect → TestFlight → review submission

Universal Purchase iOS app ile beraber çalışır (aynı bundle ID).

---

_Last updated: May 26, 2026_
