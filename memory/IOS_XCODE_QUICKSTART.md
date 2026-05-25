# Apple TV / iOS — Xcode Quick Start (Pull → Run)

> **Audience:** the person running the Mac that has the Apple TV / iOS code.
> **Scope:** Sadece "git pull" sonrası Xcode'da projeyi nasıl yeniden açıp
> simulator'da / cihazda çalıştıracağınız. Eğer hâlâ `.xcodeproj` yoksa
> kurulum bölümünü atlamayın.

---

## 0) İlk pull sonrası — Klasör yapısı doğrulaması

Pull aldıktan sonra Mac'inizde şu klasör olmalı:

```
/app/frontend/tvanddesktop/apple-tv-and-macos/
  ├── ios-tvos/
  │     ├── MegaRadioTVApp.swift     ← tvOS native shell (SwiftUI + WKWebView)
  │     ├── ShazamRecognizer.swift   ← "Şu anki şarkı nedir?" Shazam tetikleyici
  │     ├── IntentsExtension/        ← Siri komutları
  │     ├── TopShelfExtension/       ← Top Shelf widget'ı
  │     └── Brand/                   ← AppIcon + Top Shelf görselleri
  └── web-preview/
        └── (Vite + React TV web çekirdeği)
```

Eğer **`MegaRadioTV.xcodeproj`** klasörü görünmüyorsa = Xcode projesi
henüz oluşturulmamış → §A'daki "İlk kurulum" adımlarını izleyin.

Eğer `MegaRadioTV.xcodeproj` zaten varsa → doğrudan §B'ye atlayın.

---

## A) İLK KURULUM (yalnız 1 kere, eğer .xcodeproj yoksa)

1. Xcode'u açın → **File → New → Project…**
2. Şablon: **tvOS → App** → İsim: `MegaRadioTV`, Bundle ID:
   `com.megaradio.tv` (App Store Connect'teki ile aynı olmalı),
   Interface: **SwiftUI**, Language: **Swift**.
3. Kaydet → konum `/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/`
4. Xcode otomatik `MegaRadioTVApp.swift` oluşturacak — **silin**, çünkü
   bizim repo'daki dosya zaten orada (web view + Account Linking flow
   içeriyor).
5. Sol panelde **MegaRadioTV** projesine sağ tık → **Add Files to "MegaRadioTV"…**
   → şu dosyaları ekleyin (Copy items if needed = **OFF**):
   - `MegaRadioTVApp.swift`
   - `ShazamRecognizer.swift`
   - `IntentsExtension/IntentHandler.swift` (yeni Target oluşturarak —
     File → New → Target → tvOS → Intents Extension)
   - `TopShelfExtension/ServiceProvider.swift` (yine yeni Target —
     File → New → Target → tvOS → TV Top Shelf Extension)
6. `Brand/` klasöründeki resimleri **Assets.xcassets** içine sürükleyin
   (AppIcon ve TopShelf image set'leri).
7. **Signing & Capabilities** → Team'inizi seçin, "Automatically manage
   signing"i açın.
8. **Info.plist** → şu key'leri ekleyin:
   - `NSAppTransportSecurity → NSAllowsArbitraryLoads = YES`
     (radyo akışları HTTP olabiliyor)
   - `NSMicrophoneUsageDescription = "Shazam ile çalan şarkıyı tanımak için"`
     (Shazam mikrofona ihtiyaç duyuyor)

→ Build & Run et, simulator'da MegaRadio web view'i açılmalı.

---

## B) GÜNLÜK GELİŞTİRME (pull sonrası rutin)

### 1. Repo'yu güncelle
```bash
cd /path/to/your/local/megaradio-repo
git pull origin main
```

### 2. Xcode'da projeyi aç
```bash
open /app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/MegaRadioTV.xcodeproj
```
veya Finder'dan çift tıkla.

### 3. **Derived Data'yı temizle** (cache problemi olursa)
Xcode menüsü → **Product → Clean Build Folder** (Shift+Cmd+K).
Hâlâ tuhaf hatalar varsa:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/MegaRadioTV-*
```

### 4. Hedef cihazı seç
Üst bar → şeması: **MegaRadioTV** → cihaz:
- **Apple TV 4K (3rd gen) – tvOS 18.x Simulator** → ⌘R
- veya gerçek Apple TV (USB-C / Network → Xcode'a "pair" edin)

### 5. Çalıştır
- **⌘R** → Build & Run
- Simulator açıldığında MegaRadio web çekirdeği yüklenir (URL'i
  `MegaRadioTVApp.swift` içindeki `WebView` source'undan kontrol edin —
  preview için `https://music-premium-fix.preview.emergentagent.com/api/tv-app/`
  veya production için `https://desktop.themegaradio.com/`).
- Apple TV Remote simüle etmek için: **I/O menü → Show Apple TV Remote**
  veya **Cmd+Shift+R**.

### 6. Hata ayıklama
- **View → Debug Area → Activate Console** (⇧⌘C) — Swift print'leri ve
  WKWebView JS console burada akar.
- Web view JS'i incelemek için → Safari → **Develop → Simulator → MegaRadio TV**
  → tam Web Inspector açılır.

---

## C) TESTFLIGHT'A YÜKLEME

1. **Product → Archive** (Cmd+Shift+B sonra Cmd+B).
2. Organizer açılır → **Distribute App → App Store Connect → Upload**.
3. Build numarasını artırmak için: target → **General → Identity → Build**
   alanını +1 yapın (örn. `42 → 43`). Aksi halde reddeder.
4. Upload tamamlanınca **App Store Connect → TestFlight** → yeni build
   ~10 dk içinde "İşleniyor"dan "Test Edilebilir"e döner.

---

## D) TIKANINCA — Hızlı kontrol listesi

| Sorun | Çözüm |
| --- | --- |
| `WKWebView` boş ekran | `MegaRadioTVApp.swift`'teki URL'i kontrol et, doğru `desktop.themegaradio.com` mu? |
| Remote'a hiç tepki vermiyor | Web view'da `data-tv-focusable` olan ilk öğe mount oldu mu? Spatial nav `useFocusManager` ile yönetiliyor. |
| Shazam çalışmıyor | Info.plist'te `NSMicrophoneUsageDescription` ve **Capabilities → ShazamKit** açık mı? |
| Build "code signing failed" | Signing & Capabilities → "Automatically manage signing" tekrar tikle, Team'i yeniden seç. |
| Simulator çok yavaş | tvOS 18 simulator ağır — gerçek Apple TV 4K (3rd gen) ile USB-C cable üzerinden run, 5x daha hızlı. |

---

**TL;DR**: `git pull` → `open MegaRadioTV.xcodeproj` → Clean Build Folder (Shift+Cmd+K) → ⌘R. Hepsi bu.
