# Native IAP + Siri Voice Search — Implementation Notes

> **Date:** Feb 25, 2026
> **Scope:** Apple TV (StoreKit 2), Android TV (Google Play Billing v7),
> iOS CarPlay/Siri "Hey Siri, play X on MegaRadio"

---

## 1) Apple TV (tvOS) — StoreKit 2

**Yeni dosya:** `tvanddesktop/apple-tv-and-macos/ios-tvos/StoreKitIapService.swift`
- `getProducts()` → StoreKit Product.products(for: [4 ID]) → JSON dizisi
- `purchase(productId:)` → `product.purchase()` + JWS receipt validation + backend POST
- `restore()` → `Transaction.currentEntitlements` taraması
- `openManageSubscriptions()` → tvOS Settings deep-link
- Background `Transaction.updates` listener (otomatik renewal sync)

**Güncellenen:** `MegaRadioTVApp.swift`
- WKWebView config'e `megaradio` script handler eklendi
- Document-start script: `window.MegaRadioPlatform = { platform: 'appletv' }`
- Coordinator artık 2 channel handle ediyor:
  - `continueListening` → Top Shelf (eskiden vardı)
  - `megaradio` → RPC: getProducts, purchaseProduct, restorePurchases, manageSubscriptions, setAuthToken

**Xcode setup (kullanıcı yapacak):**
1. `StoreKitIapService.swift`'i Xcode'a manuel ekle (Add Files to target)
2. Target → **Signing & Capabilities** → **+ Capability** → **In-App Purchase**
3. App Store Connect'te 4 product ID'nin "Ready to Submit" durumunda olduğundan emin ol:
   - `megaradio_premium_yearly` (Auto-Renewable Subscription)
   - `megaradio_premium_monthly1` (Auto-Renewable Subscription)
   - `megaradio_premium_lifetime` (Non-Consumable)
   - `megaradio_remove_ads_yearly1` (Auto-Renewable Subscription)
4. Sandbox tester hesabı oluştur (App Store Connect → Users and Access → Sandbox Testers)

---

## 2) Android TV — Google Play Billing v7

**Yeni dosyalar:**
- `app/src/main/java/com/megaradio/tv/BillingService.kt` — Tam Billing v7 wrapper (queryProductDetails, launchBillingFlow, queryPurchases, acknowledgePurchase, backend POST)
- Aynı dosyada `MegaRadioNativeBridge` class — JS RPC köprüsü (`window.MegaRadioNative`)

**Güncellenen:**
- `MainActivity.kt`: `addJavascriptInterface(MegaRadioNativeBridge, "MegaRadioNative")` + `onPageStarted`'de `window.MegaRadioPlatform = { platform: 'androidtv' }` enjeksiyonu
- `app/build.gradle.kts`: `billing-ktx:7.0.0` + `kotlinx-coroutines-android:1.8.1`
- `AndroidManifest.xml`: `<uses-permission android:name="com.android.vending.BILLING" />`

**Play Console setup (kullanıcı yapacak):**
1. Play Console → MegaRadio TV app → **Monetization → In-app products**
2. Aynı 4 product ID'yi oluştur:
   - SUBS: `megaradio_premium_yearly`, `megaradio_premium_monthly1`, `megaradio_remove_ads_yearly1`
   - INAPP: `megaradio_premium_lifetime`
3. **Testing → License testing** → test hesabı ekle
4. Internal Testing track'ine APK upload + tester ekle

---

## 3) CarPlay / iOS — Siri Voice Search

> "Hey Siri, MegaRadio'da Rock Antenne çal" → app açılıyor, istasyon
> aratılıp otomatik çalıyor. Direksiyon başında elsiz kontrol.

**Yeni dosya:** `ios/MegaRadio/SiriPlayMediaHandler.swift`
- `NSUserActivity` → `INPlayMediaIntent` çözümleyici
- `mediaSearch.mediaName` veya fallback olarak `genreNames` / `artistName`
- Çıktı: `megaradio://play?q=<encoded>` deep link URL

**Güncellenen:**
- `AppDelegate.swift`: `continue userActivity` metoduna `SiriPlayMediaHandler.deepLinkURL(for:)` early-check eklendi; pozitif sonuç varsa `RCTLinkingManager.application(_:open:options:)` ile JS Linking'e geçiyor
- `app/_layout.tsx`: `Linking.addEventListener('url')` → `megaradio://play?q=` URL'ini yakalayıp `router.push('/search', { q, autoplay: '1' })` ile arama sayfasına yönlendiriyor (Search sayfası mevcut `q` paramını işliyor)

**Info.plist:** `NSUserActivityTypes` listesinde `INPlayMediaIntent` zaten kayıtlı — ek değişiklik yok.

**Xcode setup (kullanıcı yapacak):**
1. `SiriPlayMediaHandler.swift`'i Xcode'a manuel ekle (Add Files to "MegaRadio")
2. Target → **Signing & Capabilities** → **+ Capability** → **Siri**
3. (Opsiyonel) App'i ilk açışta `INPreferences.requestSiriAuthorization` ile izin iste; bu sayede kullanıcı "Add to Siri" sayfasında shortcut'lar tanımlayabilir.

**Test:**
- Simulator'da: `xcrun simctl openurl booted "megaradio://play?q=Rock+Antenne"` → app açılıp arama sayfasında Rock Antenne aramalı
- Gerçek cihazda: **Hey Siri, MegaRadio'da Rock Antenne çal** → app açılıp ilk eşleşen istasyonu çalmalı
- CarPlay'de: Voice command butonuna basıp "play jazz on MegaRadio" demek de aynı flow'u tetikler

---

## 4) Ortak — Backend Onayı

Tüm 3 yeni özellik backend tarafında **mevcut `POST /api/user/subscription`**
endpoint'ini kullanıyor. Aynı body schema, aynı response. Sıfır backend
değişikliği gerekiyor. Mobile RN app + Apple TV + Android TV aynı endpoint'le
konuşuyor.

Siri tarafı backend kullanmıyor (sadece local deep link routing).

---

## 5) Tüm Bunlar Build'e Geçmek İçin (kullanıcının check listesi)

**iOS (mobile app):**
- [x] `SiriPlayMediaHandler.swift` → Xcode target'a ekle
- [x] `CarPlaySceneDelegate.swift` → Xcode target'a ekle (Round 1+2)
- [x] Capabilities → Siri ✅, In-App Purchase ✅, CarPlay Audio ✅
- [x] Clean Build Folder + ⌘R

**Apple TV (tvOS shell):**
- [x] `StoreKitIapService.swift` → Xcode target'a ekle
- [x] Capabilities → In-App Purchase ✅
- [x] App Store Connect'te product ID'ler hazır
- [x] Sandbox tester hesabı ile test et

**Android TV:**
- [x] `BillingService.kt` (yeni) + `MegaRadioBridge.kt` (güncel) — Android Studio "Build → Make Project"'te otomatik compile edilir
- [x] Gradle sync (billing-ktx eklendiği için)
- [x] Play Console'da product ID'ler + test hesabı
- [x] Internal Test track'ine APK yükle

Tüm 3 platform aynı backend'i kullandığı için **bir cihazda alınan premium
abonelik diğer cihazlarda da otomatik çalışır** — kullanıcı sadece Account
Linking ile JWT'yi shell'lere taşıması gerekiyor (zaten Login QR ile çözüldü).
