# MegaRadio — Çok platformlu hata incelemesi ve düzeltmeler

## Kapsam ve yöntem
Kullanıcı talebi: Android Crashlytics kaydı, açılmayan CarPlay, iOS/Android API ve
kod hataları; ardından tvOS/watchOS/Android TV/Samsung/LG kodları. Kullanıcının son
talebiyle Expo/Metro önizleme araştırması durduruldu (Xcode açılışı kullanıcıda çalışıyor).
Bu rapor işlevsel incelemedir; güvenlik denetimi veya bütün satırların hatasızlık garantisi değildir.

## Mobil: iOS / Android
1. **Android native yükleme:** Kayıt 1.0.69(91), 18 Eylül 2026; fatal
   `SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so`.
   Native lib dizini `arm64`, DirectApk kaynakları `lib/x86_64` gösteriyor.
   `useLegacyPackaging=true` ile kurulumda native kütüphane çıkarımı etkinleştirildi;
   modern `loadReactNative(this)` ve dört ABI korunuyor. Yanlış kurulum/split/çeviri
   nedenini tek stacktrace kanıtlamaz. Yeni AAB/APK ve etkilenen cihaz testi gerekli.
2. **CarPlay cold start:** Telefon scene'i yokken React ağacının başlatılmaması
   giderildi. Tek factory/root korunuyor; telefon açıldığında ikinci AudioProvider
   yaratılmadan gerçek telefon penceresine aktarılıyor. JS öncesi native CPList root var.
3. **Prebuild kalıcılığı:** `withCarPlayScenes.js`, Phone/CarPlay/Coordinator/Siri
   kaynaklarını ve Xcode kaynak üyeliğini üretiyor. Temiz Expo şablonundaki inline
   `startReactNative` çağrısı da kaldırılıyor; beklenmeyen şablonda üretim hata verir.
4. **CarPlay sekmeleri/bağlantı yarışı:** title/icon alanları constructor config'inde;
   disconnect sırasında eski veri dönüşü root'u değiştiremiyor. Eski template listener'ları temizleniyor.
5. **Kısayollar:** soğuk/sıcak URL, activity, shortcut aktarımı; `megaradio` URL scheme;
   zaten oynayan son istasyon için sesli PLAY komutunun PAUSE'a dönmemesi.
6. **Yakındaki istasyonlar:** olmayan `playerStore.play` yerine gerçek oynatıcı;
   sıfır koordinat geçerli; image-source biçimi ve refresh-finally düzeltildi.
7. **Failover:** seçilen urlLow/urlHigh/direct URL ilk aday; sonraki deneme artık
   yanlış adayı atlamıyor/aynı yayını tekrar etmiyor. Signed/query playlist tespiti düzeltildi.
8. **Diğer:** StationCard undefined gradient/inert play, eski FileSystem API import'u,
   bildirim banner/list alanları, tekrar font/çeviri anahtarları, telemetride station `_id`.
9. **Uzak loglar:** `remoteLog.ts`, `carPlayLogService.ts`, `sendLog`/`CarPlayLogger`
   çağrıları tamamen silindi. GA4/Crashlytics korunuyor; yeni açılış beklemesi eklenmedi.

## Watch / Wear OS
- Yeni şarkı geldiğinde aynı istasyon çalıyor olsa da metadata yeniden gönderiliyor.
- `urlResolved` / `url_resolved` / `streamUrl` / `url` veri biçimleri tek helper ile eşleniyor.
- watchOS bağlantı sonrası bekleyen applicationContext okunuyor; tür/ülke listesi
  cevabı gelmezse 15 saniyede spinner biter. Kaynak ve generated watch dosyaları eşit.

## tvOS
- Canlı API'de `tag=jazz` filtresiz/geniş liste getiriyor. Native sorgu `genre=jazz` oldu.
- Boş veya relative resolved URL yerine geçerli HTTP(S) yedek URL seçiliyor.
- Gerçek `countrycode` alanı eşleniyor.
- Remote PLAY ve PAUSE artık toggle değil; tekrar çağrılınca ters işlem yapmıyor.
- Eski player/item metadata ve KVO callback'leri yeni istasyonu değiştiremiyor.
- StoreKit: yanlış unsigned JSON yerine `VerificationResult.jwsRepresentation`;
  güncel oturum token'ı; başarısız backend çağrısı yerel premium başarısı üretmiyor;
  transaction yalnızca sunucu kabulünden sonra finish ediliyor; restore hatası yutulmuyor.

## Android TV
- `/play/<id>` ve `/genres/<slug>` yerine mevcut `/radio-playing?station=<id>` ve
  `/genre-list/<slug>` rotaları; parametreler encode ediliyor. Assistant search `q` okunuyor.
- Native platform tespiti Java property erişimine değil bridge invoke/UA'ya dayanıyor.
- Eksik `androidx.tvprovider:tvprovider:1.1.0` eklendi. AAR metadata minCompileSdk34 /
  AGP8.1.1; mevcut proje compileSdk34 / AGP8.5.2 ile uyumlu. Native derleme yapılmadı.
- Billing callback içindeki blocking HTTP IO dispatcher'a taşındı. Oturumsuz,
  HTTP hata/boş plan, reddedilmiş veya PENDING işlem başarı sayılmıyor.
- Doğrulama öncesi acknowledge yok; purchase çakışması/timeouts ve Activity kapanışı ele alındı.
- JS token'ı purchase/restore öncesi native katmana aktarıyor; logout session temizliği var.

## Samsung Tizen / LG webOS (ortak TV web kodu)
- CDN HTML inject başladıktan sonra script hatası veya timeout'ta local fallback
  engellenmiyor; başarılı boot ve local fallback ayrı durumlar.
- Nested CSS asset yolları stylesheet konumuna göre relative; JavaScript bundle'ları değiştirilmez.
- Vite build başarısızsa eski/kısmi bundle paketlenmez. LG build'e manifest sürümü aktarılır.
- webOS `Web0S` UA ve native globals tespit ediliyor.
- Stop sonrası eski playlist/fetch/delayed play yeni yayın başlatamıyor; boş URL guard var.

## Yapılan doğrulamalar
- Değiştirilen JS/TS ve plugin dosyalarında lint geçti.
- `/app/tests/regression_*.cjs`: **7/7** dosya geçti; CarPlay ve bootstrap için
  izole native/DOM test doubles kullanılır. Bunlar gerçek araç/TV runtime testleri değildir.
- `pytest /app/tests/test_live_api_readonly.py -q`: **5/5** canlı salt-okuma API testi geçti.
  init, popular, arama, genre, countries, now-playing ve nearby(0,0) yanıtları kontrol edildi.
- İzole temiz iOS prebuild geçti: AppDelegate ikinci başlangıç yapmıyor, dört Swift dosyası
  ve manifest üyeliği doğru. Asıl `frontend/ios` klasöründe clean yapılmadı.
- Samsung ve LG prepare scriptleri başarılı; local fallback paket içerikleri üretildi.
- `node scripts/add-watchos-target.js` ile watch kaynakları senkronlandı.
- Test raporu `/app/test_reports/iteration_48.json`. İlk rapor47'deki clean-prebuild
  regex hatası düzeltilip48'de yeniden doğrulandı.

## Sınırlar / kalan işler
- Xcode/Android SDK/araç/TV/watch cihazı yok: native compile, CarPlay cold attach,
  Siri, gerçek radyo sürücüleri ve sandbox satın alma/restore cihazda doğrulanmalı.
- Android SoLoader önlemi fiziksel cihazda doğrulanmadı; kesin crash çözümü denmiyor.
- Harici API'nin `tag` davranışı değiştirilemedi; kaynak bu depoda değil. İstemci
  `genre` ile düzeltildi. Ayrıntı `BACKEND_TAG_FILTER_FINDING.md`.
- Eski root TypeScript tanılamaları (ayrı TV alias'ları ve mobil legacy tipleri) sürüyor;
  tüm repository typecheck'in temiz olduğu iddia edilmiyor.
- Gerçek ödeme işlemi/hesap mutasyonu yapılmadı. StoreKit/Play sunucu yanıt sözleşmesi
  sandbox'ta doğrulanmalı; başarısız doğrulama kullanıcıya tekrar deneme hatası verir.
- Mobil sürüm: **1.0.70**, Android **92**, iOS build **5**.