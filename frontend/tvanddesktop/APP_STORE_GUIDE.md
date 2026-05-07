# MegaRadio macOS — Mac App Store Yayın Rehberi

Mevcut **MegaRadio** uygulamasının iOS + watchOS sürümlerine **macOS sürümünü** eklemek için adım adım kılavuz. Yeni App Store kaydı açmıyoruz — aynı `com.visiongo.megaradio` Bundle ID altına Mac platformu ekliyoruz.

---

## Genel akış

```
Apple Developer Portal               App Store Connect
─────────────────────────            ─────────────────
1. Bundle ID'ye macOS ekle           4. Mevcut MegaRadio app
2. Mac App ID provisioning           5. + macOS platformu ekle
3. MAS sertifikaları                 6. Submit for Review
                ↓
Mac terminalinde
─────────────────────────
yarn build:mas
↓
.pkg dosyası
↓
Transporter app → App Store Connect
↓
Submit for Review (3-14 gün)
```

---

## 1️⃣ Apple Developer Portal — Bundle ID'ye macOS ekle

1. 🔗 https://developer.apple.com/account/resources/identifiers/list
2. Mevcut **`com.visiongo.megaradio`** Identifier'ı tıkla
3. **Capabilities** listesinde "macOS" / "Mac App Store" gibi macOS-spesifik bir flag yok — Apple zaten aynı Bundle ID'yi her platformda kabul ediyor
4. Sadece şu capability'leri etkinleştir (eğer kapalıysa):
   - ☑️ App Sandbox (otomatik)
   - ☑️ App Groups (eğer iOS app paylaşıyorsa)
5. **Save**

> Aynı Bundle ID birden çok platformda kullanılabilir — Apple bunu Bundle ID + Platform kombinasyonuyla ayırır.

---

## 2️⃣ Mac App Store Sertifikalarını Al

Mac'inde **Xcode**'u aç (App Store'dan ücretsiz):

1. **Xcode → Settings → Accounts**
2. Apple ID'nle giriş yap
3. Sağda **Manage Certificates...**
4. **+** butonuna tıkla, sırayla şunları üret:

   - ✅ **Apple Distribution** (yoksa, hem iOS hem MAS için)
   - ✅ **Mac App Distribution** (.app imzalamak için — MAS özel)
   - ✅ **Mac Installer Distribution** (.pkg imzalamak için — MAS özel)

5. Hepsi otomatik olarak Anahtar Zinciri'ne (Keychain) kaydedilir.

> Kontrol için Terminal'de:
> ```bash
> security find-identity -v -p codesigning
> ```
> Şu satırları görmelisin:
> ```
> "3rd Party Mac Developer Application: VisionGo (TEAM_ID)"
> "3rd Party Mac Developer Installer: VisionGo (TEAM_ID)"
> ```

---

## 3️⃣ Provisioning Profile Üret

1. 🔗 https://developer.apple.com/account/resources/profiles/list
2. **+** butonu → **Mac App Store** → Continue
3. **App ID**: `com.visiongo.megaradio` seç → Continue
4. **Certificate**: Az önce yaptığın **Mac App Distribution** seç → Continue
5. **Profile Name**: `MegaRadio MAS` yaz → Generate
6. İndir (`MegaRadio_MAS.provisionprofile` dosyası)
7. Bu dosyayı şu yola koy:
   ```
   frontend/tvanddesktop/desktop/build/embedded.provisionprofile
   ```

---

## 4️⃣ App Store Connect — macOS Platformu Ekle

1. 🔗 https://appstoreconnect.apple.com
2. **My Apps → MegaRadio** uygulamasına tıkla
3. Sol menüde "iOS App", "watchOS App" görüyorsun
4. Sol üstte ⋯ veya **+** simgesi → **Add Platform** → **macOS**
5. Onayla → "macOS App" sol menüye eklenir

> Bu adım **Bundle ID'yi paylaşır**. Tüm sürüm tek App Store sayfasında, tek isim, tek logo.

---

## 5️⃣ Mac'inde Build Ortamını Hazırla

```bash
cd /yol/proje/desktop

# Eksik paketi kur (notarization için, MAS değil ama yine de)
yarn add -D @electron/notarize

# Ortam değişkenlerini ~/.zshrc'ye ekle (her yeni Terminal'de hazır)
nano ~/.zshrc
```

Aşağıdakileri ekle (kendi değerlerini yaz):

```bash
# MegaRadio Mac build
export APPLE_ID="senin@email.com"
export APPLE_TEAM_ID="ABCD1234EF"           # Apple Developer dashboard'dan
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # appleid.apple.com → Sign-In Security → App-Specific Passwords
export CSC_NAME="3rd Party Mac Developer Application: VisionGo (ABCD1234EF)"
```

Kaydet ve uygula:
```bash
source ~/.zshrc
```

> `entitlements.mas.plist` içindeki **`YOUR_TEAM_ID`** placeholder'ını gerçek Team ID'nle değiştir:
> ```bash
> sed -i '' 's/YOUR_TEAM_ID/ABCD1234EF/g' build/entitlements.mas.plist
> ```

---

## 6️⃣ Mac App Store Build Al

```bash
cd /yol/proje/desktop
yarn build:mas
```

Bu komut otomatik olarak:
1. Electron app'i derler
2. **Mac App Distribution** sertifikasıyla imzalar
3. **Mac Installer Distribution** ile `.pkg` paketler
4. Provisioning profile'ı gömer

Çıktı:
```
dist/mas/MegaRadio-1.0.0.pkg          ← App Store'a yüklenecek dosya
dist/mas-dev/MegaRadio.app             ← Yerel test için sandboxlı .app
```

> **Hızlı sandbox testi**: `dist/mas-dev/MegaRadio.app`'i aç. App Sandbox altında network/audio çalışıyor mu? Tüm sayfalar açılıyor mu?

---

## 7️⃣ Transporter ile Yükle

1. Mac App Store'dan **Transporter** uygulamasını indir (ücretsiz, Apple resmi)
2. Aç → Apple ID'nle giriş yap
3. `dist/mas/MegaRadio-1.0.0.pkg` dosyasını sürükle-bırak
4. **Deliver** → 1-3 dakika upload + tarama
5. Yeşil onay görürsen yüklendi

---

## 8️⃣ App Store Connect — Submit for Review

1. App Store Connect → MegaRadio → **macOS App**
2. Sol menü → **+ Version or Platform** → "1.0" yaz
3. Ekran görüntüleri yükle (1280×800 minimum 2 adet, max 10):
   - Discover ekranı
   - Bir istasyon çalarken
   - Search / Country select
4. **Description**: iOS app'tekiyle aynı kullanabilirsin
5. **Build**: Açılır listede yeni yüklediğin Transporter build'i görünmeli — seç
6. **Pricing**: iOS ile aynı (free / paid)
7. **App Privacy**: iOS'taki cevapları çoğalt
8. Sağ üstte **Submit for Review**
9. 3-14 gün içinde Apple cevap verir

---

## 9️⃣ İlk submission'da olası reddedilme sebepleri

| Sebep | Çözüm |
|---|---|
| App Sandbox ihlali (network/file) | `entitlements.mas.plist`'e gerekli izni ekle |
| Insufficient functionality (boş app) | İçerik dolu olmalı, splash sonrası gerçek istasyonlar yükleniyor mu? |
| HIG ihlali (Mac UI değil iOS UI) | Mac için "10-foot UI" kabul edilebilir, açıklama yaz: "Optimized for big-screen Mac viewing" |
| Login required ama açıklanmamış | Demo account ver: App Information → Demo Account |
| Privacy policy URL yok | `themegaradio.com/privacy` link'i ekle |

---

## Hızlı kontrol listesi (ilk submission öncesi)

- [ ] Bundle ID: `com.visiongo.megaradio` ✅
- [ ] Mac App Distribution sertifikası Keychain'de
- [ ] Mac Installer Distribution sertifikası Keychain'de
- [ ] `embedded.provisionprofile` `build/` klasöründe
- [ ] `entitlements.mas.plist` içindeki TEAM_ID gerçek değer
- [ ] `~/.zshrc`'de APPLE_ID + TEAM_ID + APP_SPECIFIC_PASSWORD set
- [ ] `yarn add -D @electron/notarize` çalıştırıldı
- [ ] `yarn build:mas` hatasız tamamlandı
- [ ] `dist/mas/*.pkg` mevcut
- [ ] Transporter ile upload başarılı
- [ ] App Store Connect'te macOS platformu eklendi
- [ ] Screenshots, description, privacy hazır

---

## Soru sorman gereken yerler

1. **Apple Team ID**: Apple Developer dashboard sağ üst → ad altında 10-haneli kod (örn. `J4N8K8XZ49`)
2. **App-Specific Password**: https://appleid.apple.com → Sign-In and Security → App-Specific Passwords → Generate
3. **Demo account**: Eğer login gerekiyorsa, Apple reviewer için kullanıcı/şifre

Sorun çıkarsa terminal çıktısını veya App Store Connect Activity sekmesindeki log'u paylaş, anında yardım edeyim.
