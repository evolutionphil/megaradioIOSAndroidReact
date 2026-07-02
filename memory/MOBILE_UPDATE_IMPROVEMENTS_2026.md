# MegaRadio iOS + Android — Güncelleme Öncesi Potansiyel İyileştirmeler Araştırması
Tarih: Temmuz 2026 | Durum: Yayın hazırlığı (v1.0.69 → sonraki sürüm)

Mevcut durum: Expo SDK 54 (RN 0.81.5), Legacy Architecture, RNTP 4.1.2 (Media3 tabanlı),
AdMob 14.2, Firebase 23.x, IAP 14.7. iOS buildNumber 3, Android versionCode 90.

---

## A. MAĞAZA UYUMLULUĞU — Yayını Engelleyebilecek Maddeler (ÖNCE BUNLAR)

### A1. iOS: Xcode 26 + iOS 26 SDK zorunlu 🔴
- 28 Nisan 2026'dan beri App Store'a gönderilen TÜM güncellemeler **Xcode 26 + iOS 26 SDK** ile
  derlenmek zorunda. Eski Xcode ile yüklenen build reddedilir.
- AKSİYON: Mac'te `xcodebuild -version` kontrol et; Xcode 26.x değilse güncelle. Expo SDK 54
  Xcode 26 ile uyumlu.

### A2. iOS: App-level Privacy Manifest (PrivacyInfo.xcprivacy) YOK 🔴
- Kontrol edildi: `ios/MegaRadio/PrivacyInfo.xcprivacy` mevcut değil. Pod'lar kendi
  manifestlerini getiriyor ama app-level beyan (UserDefaults CA92.1, file timestamp C617.1,
  disk space E174.1, boot time 35F9.1 + toplanan veri kategorileri: AdMob/Analytics/Crashlytics)
  eksikse **ITMS-91053** uyarısı/reddi riski var.
- AKSİYON: `app.json` → `ios.privacyManifests` alanı ile Expo prebuild'e ekletilebilir (kod
  değişikliği ufak, 30 dk iş). App Store Connect "App Privacy" formu ile senkron olmalı.

### A3. Android: Target API 36 (31 Ağustos 2026 son tarih) ✅ büyük ihtimalle hazır
- Expo SDK 54 varsayılanı compileSdk/targetSdk 36 (Android 16) — yani bu güncelleme deadline'ı
  karşılıyor. AKSİYON: build sonrası `aapt dump badging` ile targetSdkVersion=36 doğrula.

### A4. Android 16: Edge-to-edge zorunlu (opt-out kaldırıldı) 🟠
- API 36 hedefleyen uygulamalar sistem barlarının arkasına çizer. Expo SDK 54 edge-to-edge'i
  varsayılan açar; ama özel ekranlarda (player, onboarding, modal'lar) status bar altında
  içerik ezilmesi olabilir.
- AKSİYON: Android 15/16 cihaz/emülatörde tüm ana ekranları hızlıca gez (SafeAreaView denetimi).

### A5. Android: 16KB page size uyumluluğu 🟠
- Kas 2025'ten beri API 35+ hedefleyen güncellemeler 16KB sayfa uyumlu native kütüphane (.so)
  içermeli. Expo 54 + güncel NDK varsayılan uyumlu; risk üçüncü parti eski .so'larda
  (google-cast, ffmpeg türevi varsa).
- AKSİYON: AAB üretince Play Console "App bundle explorer" 16KB uyarısına bak; veya
  `zipalign -c -P 16 -v 4 app.apk` ile doğrula.

### A6. Android izin temizliği 🟠 (Play Data Safety'yi sadeleştirir)
- Mevcut: `READ/WRITE_EXTERNAL_STORAGE` → API 33+'ta işlevsiz (scoped storage), Play denetiminde
  gereksiz veri erişimi olarak görünür → KALDIRILABİLİR (expo-image-picker artık gerektirmiyor).
- `RECORD_AUDIO` + `CAMERA`: gerçekten kullanılıyor mu? (expo-audio mikrofon izni tanımlı —
  kayıt özelliği aktifse kalsın, değilse kaldır; Play "sensitive permission" beyanı ister).
- `ACCESS_FINE_LOCATION`: konuma göre istasyon için kullanılıyor — Play Console'da konum izni
  beyan formunun dolu ve güncel olduğundan emin ol.

### A7. Data Safety (Play) & App Privacy (Apple) formları 🟠
- AdMob (reklam kimliği), Firebase Analytics (kullanım verisi), Crashlytics (kilitlenme) +
  launch_source eventi → her iki mağazada veri toplama beyanlarının güncel olması gerekir.
- Android: `AD_ID` izni AdMob ile otomatik gelir — Data Safety'de "Advertising ID" işaretli olmalı.

### A8. cleartextTraffic: true (bilgi) 🟡
- HTTP radyo stream'leri için gerekli, Play buna izin veriyor. İstenirse
  `network_security_config` ile sadece stream domain'lerine daraltılabilir (düşük öncelik).

---

## B. KULLANICI DENEYİMİ İYİLEŞTİRMELERİ (etki sırasına göre)

### iOS

**B1. Live Activities + Dynamic Island — "Now Playing" (EN YÜKSEK ETKİ) 🌟**
- Kilit ekranı + Dynamic Island'da istasyon logosu, şarkı adı, canlı yayın göstergesi.
  Radyo uygulaması için en görünür modern özellik; kullanıcı müziği kontrol etmese bile marka
  sürekli ekranda.
- Teknik: ActivityKit + native widget extension target gerekir (`@bacons/apple-targets` config
  plugin veya elle Xcode target + bizim withAppIntents benzeri plugin). RNTP metadata eventi →
  Activity güncelleme köprüsü yazılır. Efor: orta-yüksek (2-3 gün). Privacy manifest'e ek beyan.

**B2. Kilit Ekranı / Control Center Widget (WidgetKit + AudioPlaybackIntent, iOS 17+)**
- Backlog'daki madde: uygulamayı hiç açmadan kilit ekranından/Control Center'dan son istasyonu
  başlatma. B1 ile aynı widget extension'ı paylaşır → ikisini tek sprintte yapmak verimli.

**B3. iOS 26 "Liquid Glass" uygulama ikonu**
- Icon Composer ile katmanlı ikon → iOS 26 ana ekranında cam efekti; eski düz ikonlar
  iOS 26'da otomatik dönüştürülüyor ve bazen kötü görünüyor. Efor: düşük (tasarım işi).

**B4. CarPlay zenginleştirme**
- Mevcut CarPlay'e "Son Çalınanlar" ve "Türler" sekmeleri; Siri'den arama (INPlayMediaIntent
  zaten var) ile birleşince araçta tam deneyim. Efor: düşük-orta.

**B5. StoreKit fırsatları**
- Win-back offers (abonelikten çıkanlara özel teklif — App Store Connect'ten yapılandırılır,
  kod değişikliği minimal) + Family Sharing aboneliği açma. Gelir etkisi doğrudan.

### Android

**B6. Ana Ekran Widget'ı (Glance) — "Now Playing / Son İstasyon" (EN YÜKSEK ETKİ) 🌟**
- iOS Live Activity'nin Android karşılığı: 2x1/4x1 widget'ta istasyon + play/pause.
  MediaSession zaten var (RNTP Media3) → widget'tan PendingIntent ile kontrol.
- Teknik: native Kotlin (Glance/RemoteViews) + config plugin. Efor: orta (2 gün).

**B7. Bildirim medya kontrolü denetimi (Media3)**
- RNTP 4.1 Media3 tabanlı ✓. Android 13+ medya bildiriminde seek bar görünümü, albüm kapağı
  kalitesi (S3 logo prefetch bunun için de kullanılabilir) gözden geçir.

**B8. Predictive Back Gesture (API 34+)**
- `android:enableOnBackInvokedCallback="true"` + RN back handler denetimi. Android 16'da
  sistem animasyonlarıyla akıcı geri jesti. Efor: düşük ama tüm geri akışları test ister.

**B9. Boyut & başlangıç: R8 full mode + resource shrinking + Baseline Profile**
- AAB boyutu ve soğuk başlangıç için: `shrinkResources true`, R8 full mode denetimi.
  Baseline Profiles RN'de sınırlı fayda sağlar ama startup'ta %10-15 iyileşme raporlanıyor.

**B10. Bildirim izni akışı (Android 13+)**
- POST_NOTIFICATIONS runtime izni doğru anda mı isteniyor? (İlk açılışta değil, değer
  gösterildikten sonra istemek onay oranını 2x artırır.)

---

## C. PERFORMANS / TEKNİK BORÇ (yayın sonrası sprint)

**C1. New Architecture geçişi (EN ÖNEMLİ TEKNİK BORÇ)**
- Şu an `newArchEnabled: false`. RN 0.82+ Legacy Architecture'ı KALDIRIYOR — bir sonraki
  Expo SDK'ya (55) geçişte zorunlu olacak. Ayrıca:
  - MMKV v4 çalışır hale gelir → DiskCache senkron/hızlı (şu an AsyncStorage fallback)
  - Genel render performansı artar
- Riskler: carplay, google-cast, track-player gibi native modüllerin new-arch uyumu tek tek
  doğrulanmalı. Öneri: bu güncelleme SONRASI ayrı bir sprint.

**C2. RNTP AVFoundation uyarısı** — upstream; RNTP sürüm güncellemelerini izle.

**C3. Favicon HTML dönen istasyonlar** — backend'e "logo doğrulama/proxy" brief'i
  (görsel fallback zinciri şu an yakalıyor; kök çözüm backend tarafında).

**C4. Firebase deprecated namespaced API uyarıları** — react-native-firebase v23 modular API'ye
  geçiş uyarıları loglarda var; v24'te kaldırılacak. Orta vadede migration.

---

## D. YAYIN KONTROL LİSTESİ (bu güncelleme için)

1. Sürümler: `version` 1.0.69 → 1.0.70, iOS `buildNumber` 3 → 4, Android `versionCode` 90 → 91
2. iOS: Xcode 26 doğrula (A1) + privacy manifest ekle (A2) → `prebuild --clean` + `pod install`
   + fix-xcode-cycle
3. Android: targetSdk 36 doğrula (A3), edge-to-edge hızlı UI turu (A4), izin temizliği (A6)
4. Bu oturumda eklenenlerin cihaz testi: açılış hızı, Quick Actions, Siri, launch_source
   (Firebase DebugView)
5. Google Assistant App Actions yalnızca Play'de yayınlandıktan sonra sesle çalışır (internal
   track yeterli) — yayın sonrası test et
6. Mağaza metinleri: "Yenilikler" — hız iyileştirmeleri + Siri/kısayol özellikleri iyi bir
   pazarlama maddesi
7. Data Safety / App Privacy formlarını gözden geçir (A7)

## ÖNERİLEN YOL HARİTASI
- **Bu güncelleme (v1.0.70):** A1-A6 uyumluluk + mevcut hız/kısayol özellikleri → yayınla
- **v1.0.71:** B1+B2 (iOS Live Activity + widget, tek sprint) ve B6 (Android widget)
- **v1.0.72:** B4 CarPlay + B5 StoreKit win-back + B8/B10 Android cilaları
- **Teknik sprint:** C1 New Architecture (Expo 55 öncesi zorunlu)
