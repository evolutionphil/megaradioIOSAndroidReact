# MegaRadio — Backend geliştiricisi için güncel görevler

## Son ek — TV şarkı bilgisi (iteration60, mevcut API kullanılıyor)
`GET https://api.themegaradio.com/api/now-playing/{stationId}` **mevcut ve çalışıyor**;
bu iş için yeni endpoint gerekmiyor. TV/Desktop ortak servis önizlemede
`/api/tv-proxy/now-playing/{stationId}`, paketli ortamda gerçek API'yi kullanır.
Yerel FastAPI'nin aynı adlı `/api/now-playing` fallback yolu ile karıştırmayın.

Türkülerle Türkiye için gerçek test yanıtı (şarkı zamanla değişir):
```json
{"title":"Senem","artist":"İzzet Altınmeşe","station":"TURKULERLE TURKIYE","genre":"Pop"}
```
İstemci flat yanıtı ve eski `{metadata:{title,artist}}` wrapper'ını destekler. Şarkı
başlığı yoksa tür/station adından sahte şarkı üretmez. Playlist `url` yerine geçerli
`url_resolved` / `urlResolved` alanlarını koruyun: ICY/WebSocket doğrudan ses URL'si
ister. TV yedek REST sorgusu oynarken60sn, güncelICY varsa atlanır. Geçici metadata
hataları eldeki aynı-istasyon başlığını silmez; eski istasyon yanıtları yok sayılır.
Detaylar ve diğer backend açık işleri aşağıdaki ana belgede devam eder.

Bu belge son çapraz platform hata turunun giriş noktasıdır. Ayrıntılı ve geriye
uyumlu sözleşme: [README_API_DEVELOPER.md](README_API_DEVELOPER.md).
**Harici API/website bu depodan değiştirilmedi.** Aşağıdaki gözlemleri yeni endpoint
isteklerinden ayırın. Gerçek satın alma, StoreKit/Play sandbox veya cihaz testi bu
Linux ortamında yapılmadı. Mobil/TV tasarımı ve yeni mimari geçişi kapsam dışında.

## 1. Son rapordaki 404'lerin doğru yorumu

| Yol | Sahibi / kullanım | Backend aksiyonu |
| --- | --- | --- |
| `/api/stream-resolve` | Bu depodaki FastAPI; tarayıcı önizlemesinde redirect çözümü | Sırf canlı katalog sunucusunda 404 diye yeni üretim endpoint'i eklemeyin |
| `/api/stream-proxy` | Aynı önizleme sunucusu; tarayıcı CORS/mixed-content ve playlist okuma | Paketli TV/Desktop bu göreli yolu çağırmamalı |
| `/api/tv-app/` | FastAPI statik Vite çıktısı | Katalog API'sinde bulunması gerekmiyor |
| `/api/stream-metadata` | Eski, isteğe bağlı SSE yardımcısı | Mevcut TV/Desktop oynatıcı kullanmıyor; Radiolise WebSocket kullanılıyor |
| `/api/stations`, `/api/filters/countries`, `/api/genres/precomputed` | Gerçek katalog API'si | Aşağıdaki filtre/yanıt sözleşmelerini koruyun |
| `/api/user/subscription`, `/api/auth/tv/verify` | Gerçek hesap/abonelik API'si | Store doğrulama ve yanıt sözleşmesi zorunlu |

`iteration_53` ilk dört yolu canlı katalog sunucusunda test etmişti. Bu yanlış hedef,
paketli uygulamaların tamamının bozuk olduğunu kanıtlamaz. Ancak kodda ayrı bir gerçek
hata vardı: Electron/Android TV playlist ve yeniden deneme akışı önizleme yollarına
düşebiliyordu. İstemci artık bütün native/paketli ortamlarda doğrudan yayın/playlist
yolunu kullanır; önizleme proxy'si yalnızca tarayıcıya aittir. Redirect yanıtındaki
`final_url` ile istemcinin `resolvedUrl` alanı farkı da geriye uyumlu ele alındı.

## 2. Öncelikli backend / website işleri

### P0 — Store doğrulama sözleşmesi
- `POST /api/user/subscription`: Apple signed JWS (iOS/tvOS) ve Base64 app receipt
  (Electron MAS) ayrı formatlardır. Kanıt gerçek store'da doğrulanmalı; product ID,
  bundle/package, ortam, sahiplik, iade/iptal/son kullanma tarihi kontrol edilmeli.
- Google purchaseToken için de aynı doğrulama ve idempotency gereklidir.
- Aktif olmayan, reddedilmiş veya pending işlem premium açmamalı. İstemci store
  diyaloğunun açılmasını satın alma başarısı saymıyor.
- Aynı makbuz tekrarında süre uzatmayın; farklı hesaba sessiz taşıma yapmayın.
- `GET /api/user/subscription` gerçek `plan`, `isActive`, `expiryDate` alanlarını
  dönmeli. Tarih UTC; lifetime için null olabilir. GET/POST wrapper farklarını
  sürümleyin, sessizce değiştirmeyin. Ayrıntı ve plan adları ana README'de.
- Gerçek sandbox kabul testleri: success/cancel/pending, expired session, offline
  verification→restore, aylık/yıllık/lifetime/reklamsız restore, refund/revoke,
  aynı receipt retry ve farklı hesap conflict.

### P0 — App Links / website
- Android gerçek package `com.megaradio`. `assetlinks.json` bunu gerçek **Play App
  Signing SHA-256** ile ilişkilendirmeli. Önceki gözlem farklı package gösteriyordu.
- iOS AASA'yı gerçek imzalı archive application-identifier ile karşılaştırın.
- Dosyalar redirectsiz HTTPS 200 JSON olmalı; station/user/genre ve dil prefixleri
  kapsanmalı. Hazır araçlar: `frontend/linking/README.md`.
- Uygulama yoksa mağaza seçeneklerini sunan website banner'ını siteye entegre edin.
  Otomatik deferred deep link yok; kurulum sonrası özgün link tekrar açılır.

### P1 — Katalog / Community / paylaşım
- `/api/public-profiles`: önceki canlı kontroller page/offset/skip değişse de aynı
  100 kaydı verdi. Gerçek stabil pagination + hasMore/total veya cursor; search
  pagination öncesi uygulanmalı; private/email alanlarını ifşa etmeyin. 100'den
  fazla public kayıt bulunduğu bu gözlemden çıkarılamaz.
- Tür filtresi `genre=jazz`; önceki kontrollerde `tag=jazz` filtre uygulamadı.
- `/api/filters/countries` mevcut string ülke adlarını koruyun. İsteğe bağlı
  `?format=objects` ile `{name, code, flagUrl}` sunulabilir; bu **öneridir**, mevcut
  endpoint özelliği diye sunulmamıştır. İlk iki harf ISO değildir.
- Watch/Wear katalog normalizasyonu aynı helper'ı kullanıyor. Kod verilmezse eski
  bridge `code` alanı tam ülke adını taşır. Wear ülke isteği isimle gönderilir;
  telefon `/api/stations/popular?country=<tam ad>&limit=30` kullanır. Boş/hatalı
  yanıt eski ülkenin radyolarını ekranda bırakmamalı.
- Best FM `best-fm-2`: önceki testte canonical sayfa 410 `JUNK-410`, yayın isteği
  timeout verdi. Website tombstone/cache ve yayın erişimi ayrı incelenmeli;
  kalıcı kapanma varsayılmamalı. Geçici offline radyonun bilgi sayfası silinmemeli.
- API listelerindeki raw array / `{stations:[]}` / `{data:[]}` farklarını belgeli
  tutun. Logo URL'si bozuksa gerçek kaynak düzeltmesi gerekir; istemci fallback'i var.

## 3. Bu turda istemcide düzeltilenler
- Desktop ödeme sayfası geçerli `premium` varyantını kullanır. Paywall'daki `bridge`
  değişken çakışması giderildi; purchase/restore artık hazırlıkta ReferenceError vermez.
  Electron IPC JSON serileştirmesi zaten mevcuttu; yeni ödeme sağlayıcısı eklenmedi.
- UpdateBanner union tipi ve Equalizer eksik Sidebar parametreleri giderildi.
- Saat ülke eşlemesi ortaklaştırıldı, Wear boş/hata listelerini temizler; ülke/tür
  yol parametreleri özel karakterler için kodlanır.
- Paketli yayın yolları önizleme endpoint'lerinden ayrıldı. Playlist istekleri
  zaman aşımıyla sınırlı; HLS manifest'i ses segmentiyle değiştirilmez.

## 4. Tekrarlanabilir test hedefleri
```bash
# Değeri güncel FastAPI önizleme köküyle verin; /api eklemeyin.
export TV_PREVIEW_BACKEND_URL='<current-preview-origin>'
pytest backend/tests/test_tv_desktop_endpoints.py -v
# Legacy SSE varsayılan test kapısı değil; gerekiyorsa TEST_LEGACY_SSE=1.
node tests/regression_issue53_companion_native.cjs
node tests/regression_issue53_desktop_iap.cjs
node tests/regression_issue53_tv_desktop_build_shared.cjs
node tests/regression_issue54_behavior.cjs
cd frontend/tvanddesktop/apple-tv-and-macos/web-preview
yarn tsc --noEmit
yarn build
```
Canlı katalog/hesap kontrolleri ayrı hedefte ve salt okunur çalıştırılır; test hesabı
ve anahtarlar bu README'ye yazılmamalı. Son doğrulama sonucu test raporuna kaydedilir.

**Doğrulama:** `test_reports/iteration_54.json`: 14 backend testi geçti, kullanılmayan
legacy SSE testi bilinçli atlandı; 5 mevcut Node regresyon dosyası ve TV Equalizer /
Settings / Discover tarayıcı kontrolü geçti. TV TypeScript ve Vite build geçti.
Gerçek GET abonelik örneği ve alan eşlemesi `README_API_DEVELOPER.md` içinde.
Testte bir üçüncü taraf BigR favicon isteği 403 verdi; yerel fallback çalıştı.
Bu dış logo kaynağı düzeltilmiş sayılmamalı; API geliştiricisi geçerli logo URL'sini
araştırmalı. Native cihaz/sandbox satın alma sonuçları bu test sayılarının içinde değil.

**Ek doğrulama:** `test_reports/iteration_55.json`: gerçek TypeScript kaynaklarını
çalıştıran 41 davranış kontrolü geçti (test doubles ile ödeme callback sırası,
ülke normalizasyonu, platforma göre URL seçimi ve playlist çözüm yardımcıları).
Sıkılaştırılmış 3 canlı API kontrolü ve Equalizer yukarı sürükleme/klavye/reset testi
geçti. Deprecated slider uyarısı giderildi. Doğrudan `GlobalPlayerProvider.onError`
retry event zinciri uçtan uca tetiklenmedi; helper testleri gerçek native playback
ve yeniden deneme akışının cihaz kabul testinin yerine geçmez.

## 5. Cihaz kabul kontrol listesi

Yerleşim turu (iteration56–57) backend'e yeni endpoint gerektirmedi. TV/Desktop
Favorites istekleri artık kopya host yerine mevcut ortak API URL yardımcısını
kullanır; önizlemede `/api/tv-proxy/user/favorites`, paketli uygulamada mevcut gerçek
`/api/user/favorites` sözleşmesi korunur. Ekranlar için `/api/tv-app/` tarayıcı girişi
kullanılmalı; root URL mobil Expo kabuğudur.
- **iPhone yeni Xcode build:** Best FM/yanıtsız yayın → arayüz yanıt vermeli,
  yükleme iptal edilebilmeli; başka radyo açılmalı. Kilit ekranı ve CarPlay kumandaları
  çalışmalı. Native SwiftAudioEx yaması için pod install + yeni binary gerekir.
- **CarPlay:** telefon uygulaması kapalıyken bağlan → telefon ekranını aç → kopar/
  yeniden bağla; tek oynatıcı ve güncel şablonlar kalmalı.
- **Android:** yeni build ile açılış/ABI regresyonu, offline yayın iptali, Android Auto.
- **Watch/Wear:** ülkeler → Germany/United Kingdom/Türkiye → radyolar; boş liste,
  bağlantı kesilmesi ve hızlı seçim sonrası eski veri kalmaması. Saat köprülerinin
  gerçek eşleşmiş cihazda çalışması burada kanıtlanmış değildir.
- **Desktop/Android TV/Tizen/LG:** `.pls` ve `.m3u`, doğrudan HTTP/HTTPS yayın,
  hatalı yayın retry; hiçbir istek `file:///api/stream-*` yoluna gitmemeli.
- **App Links:** gerçek WhatsApp station/profile bağlantısı installed cold/warm ve
  uninstalled senaryolarında; özel profil ifşası olmadan doğru ekran/mağaza seçeneği.

**P2:** New Architecture geçişi ve Apple TV görsel/focus parity ayrı iş olarak kalır.