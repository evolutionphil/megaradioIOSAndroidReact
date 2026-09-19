# Mobil logo, Best FM donması ve slug paylaşım düzeltmeleri

## Kullanıcı sorunları
1. iOS araç modunda Virgin Radio Türkiye logosu yoksa fallback görünmüyor.
2. Recently Played'de aynı durumda boş görsel.
3. Türkiye Best FM'e basınca iOS tüm arayüz donuyor, uygulama yeniden açılmak zorunda.
4. WhatsApp paylaşımı slug yerine ID gösteriyor; URL biçimi garip/tekrarlı.

## Uygulanan kod değişiklikleri
- `ImageWithFallback`: primary -> optional fallbackUri -> yerel bundled logo.
  Yerel logo contain; URI değiştiğinde zincir reset; onError dış prop ile ezilemez.
- CarMode ve player GridItem bu bileşene geçti; diğer Recently grid yerel fallback'i
  aynı logo oldu. CarMode animasyonları unmount'ta durduruluyor, loading iptal edilebiliyor.
- `stationShare.ts`: canonical website `expo.extra.websiteUrl`; slug yoksa API detail
  en çok5sn beklenir; elde edilemezse kullanıcıya hata. ID veya tahmini station slug'ı üretilmez.
- Native Share payload sadece message+title: message'da tek URL. iOS message+url
  çift gönderimi kaldırıldı. ShareModal busy/generation guard ve görünür hata; aynı
  helper PlayerOptionsSheet/copy akışlarında kullanılıyor.
- Açık 404/410 için paylaşım/kopyalama engellenir. 3sn HEAD timeout veya HEAD405,
  ağ hatası sayfanın kaldırıldığı anlamına gelmez; doğru cached slug korunur.

## iOS donması: native kod bulgusu
- Installed RNTP4.1.2 podspec SwiftAudioEx1.1.0 pinliyor.
- Pinned `AVPlayerWrapper.swift` eager olarak commonMetadata/availableChapterLocales/
  availableMetadataFormats yüklüyor; metadata bloklarında ve progress duration getter'ında
  AVAsset.duration sorguları var. Canlı, indefinite/cevapsız stream'lerde iOS26 bunu
  synchronous mediaserverd probe'a çevirip UI'yı uzun süre bloke edebiliyor.
- Upstream açıklama: https://github.com/doublesymmetry/SwiftAudioEx/pull/106
  Erken async-load da playback hazırlığını geciktirebilir; sadece Promise timeout bu
  native sorunu gidermez. Bu radyo uygulamasında static asset metadata probe tamamen
  atlanıyor; AVPlayerItemMetadataOutput/ICY timed metadata ve playable load korunuyor.
- `scripts/patch-swiftaudioex.js` sadece SHA256
  `e39f2561400166573c4970bd734dd8fd574e87695f67a74c7cebd219e7429c3c` olan bilinen kaynak
  veya daha önce doğru patch'lenmiş kaynak üzerinde çalışır. Farklı/eksik/çoklu kaynakta
  sessiz geçmek yerine build'i durdurur; dependency upgrade olursa patch yeniden incelenmeli.
- `withSwiftAudioExRadioFix.js` clean/incremental Expo prebuild'e kalıcı Podfile hook'u ekler.
- JS tarafında ayrıca15sn deadline, stale generation/queue guard ve cancel eklendi.
  3-track placeholder kuyruğu korunuyor; background next/previous işlevi kaldırılmadı.

## Ağ gözlemleri (evrensel durum iddiası değil)
- Best FM API id `68a8c462bd66579311aae076`, slug `best-fm-2`,
  stream `http://46.20.7.126/;stream.mp3`: bu ortamda bounded12sn istek timeout.
- Virgin favicon `https://i.karnavalcdn.com/media/site_media/icons/android-icon-192x192.png`:503.
- Virgin canonical `/station/virgin-radio-turkiye`:200 ve doğru OG/canonical slug.
- Best canonical `/station/best-fm-2`:410, `x-seo-cache=JUNK-410`.
  Bu dış website problemi burada çözülemez. `noIndex` flag'i tek başına paylaşım yasağı
  veya radyonun kalıcı kapandığı kanıtı olarak kullanılmadı; yalnızca gerçek404/410 engellenir.

## Test kanıtı
- Zorunlu test agent turları: `/app/test_reports/iteration_49.json` ve `iteration_50.json`.
- Executable image-hook test doubles: eksik URI,503error simülasyonu, remote fallback
  başarısızlığı, URI reset, consumer onError, local contain.
- Executable share helper: slug/noID, missing slug recovery, tek URL, HEAD200/404/410/
  405/networkfailure/timeout ve noIndex'in tek başına engellenmemesi.
- Native source transform: gerçek pinned upstream fixture üzerinde doğru bloklar,
  idempotence, unknown-source refusal ve CLI temp-Pods hedefi.
- AudioProvider watchdog/queue kontrolleri source-level: gerçek event ordering/UI
  responsiveness cihazda çalıştırılmadı. Native testin yerine JS harness geçti denmiyor.
- Prebuild, Watch sync ve Xcode PBX parser geçti. Değişen JS/TS lint temiz.
- Test49'daki Best canonical200 beklentisi test50'de gizlenmedi: dış410 engeli ayrıca
  kaydediliyor, istemci negatif akışı doğrulanıyor. Bütün uçtan uca testler geçti iddiası yok.

## Kullanıcıda uygulanması gereken native adım
Repo `frontend/` klasöründe:
```sh
npx expo prebuild --platform ios
(cd ios && pod install)
yarn watch-target
open ios/MegaRadio.xcworkspace
```
Pod install çıktısında `[MegaRadio] SwiftAudioEx live-radio asset fix verified` görünmeli.
Yeni Xcode build gerekir; sadece JS yenilemesi native Pod patch'ini mevcut binary'ye taşımaz.
Sonrasında Best FM tap/cancel/başka istasyon, kilit ekranı next/previous ve CarPlay'i
gerçek iPhone'da; logo/share/loading korumalarını Android'de test edin.

Website410 kaynağı harici olduğundan Best FM sayfa paylaşımının tekrar çalışması için
aynı istasyonun canonical sayfası backend'de açılmalı veya doğru same-record redirect sağlanmalı.