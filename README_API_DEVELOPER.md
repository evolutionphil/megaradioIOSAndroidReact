# MegaRadio — API / Web Geliştiricisine Devir

> Son tur öncelikleri, önizleme/üretim endpoint ayrımı ve cihaz kabul adımları:
> [README_API_UPDATES.md](README_API_UPDATES.md). Belgeler birbirini tamamlar.

> **iteration60:** TV now-playing için mevcut `/api/now-playing/{stationId}` canlı
> endpoint'i doğrulandı (flat title/artist). Yeni endpoint istemiyoruz. PLS yerine
> çözülmüş stream URL ve gerçek yanıt örneği yukarıdaki güncelleme belgesinde.

Bu metin doğrudan API/web geliştiricisine iletilebilir. **Mobil/TV kodunda yapılan
düzeltmeler harici API'yi veya canlı websiteyi değiştirmedi.** Aşağıdakiler doğrulanmış
gözlemler ve istemcilerin ihtiyaç duyduğu sözleşmelerdir; endpoint ekleme önerileri
mevcut endpoint olarak sunulmamıştır. Gerçek token, makbuz veya sertifika burada yoktur.

## P0 — Android App Links ve kurulum fallback'i
**Website:** `https://themegaradio.com`
- Mevcut `/.well-known/assetlinks.json` Android paketini `com.visiongo.megaradio` gösteriyor.
- Gerçek Android uygulama paketi **`com.megaradio`**. Gerçek **Play App Signing SHA-256**
  ile bu paketin association'ı eklenmeli/düzeltilmeli. Debug veya başka uygulamanın
  sertifikası kullanılmamalı; mevcut diğer geçerli uygulamalar yanlışlıkla kaldırılmamalı.
- AASA'daki `M6T85HP76P.com.visiongo.megaradio` gerçek iOS archive application-identifier
  ile eşleşmeli. iOS bundle identifier `com.visiongo.megaradio`.
- JSON dosyaları HTTPS200, uygun JSON MIME, redirectsiz ve kimlik doğrulamasız sunulmalı.
- Station/user/genre yolları ve `/tr/...`, `/en/...` dil prefixleri kapsanmalı.
- Native uygulama bu yolları artık işliyor; WhatsApp'ta HTTPS görünmesi doğrudur.

**Hazır dosyalar:** `frontend/linking/README.md`, `website-install-banner.js`,
`scripts/generate-app-link-files.js`. Bunlar canlı siteye henüz eklenmedi.
Uygulama yoksa gerçek App Store/Google Play seçenekleri, yüklüyse “Uygulamada aç” sunulsun.
Mevcut altyapıda otomatik deferred-deep-link yok: ilk kurulumdan sonra kullanıcı özgün
bağlantıya yeniden dokunmalı. Otomatik devam istenirse ayrı entegrasyon gerekir.

**Kabul testi:** aynı WhatsApp station/profile linki installed cold/warm açılışta doğru
ekrana gider; uninstalled halde indirme seçenekleri görünür; özel profil ifşa edilmez.

## P0 — Store doğrulaması ve abonelik sözleşmesi
**Mevcut endpointler:**
- `POST /api/user/subscription` — store doğrulama/senkronizasyon.
- `GET /api/user/subscription` — giriş yapan kullanıcının yetkileri.
- `GET /api/auth/tv/verify` — mevcut TV/desktop oturum doğrulaması.

### Doğrulama gereksinimleri
1. Doğrulama başarısızken200/başarı veya yerel varsayılan plan dönülmemeli.
2. Purchase token / original transaction id unique/idempotent işlenmeli. Aynı receipt
   iki kez gelince ek hak/süre üretilmemeli; farklı kullanıcıya sessizce taşınmamalı.
3. Gerçek bundle/package, productId, ortam, transaction durumu, iptal/iadeler/expiry
   Apple/Google doğrulamasıyla kontrol edilmeli. İstemci productId'si tek başına hak vermez.
4. PENDING/deferred, cancelled, expired, revoked işlemler aktif premium sayılmaz.
5. iOS/tvOS StoreKit2 istemcisi **signed JWS** (`VerificationResult.jwsRepresentation`)
   gönderiyor. Electron MAS ise **Base64 app receipt** kullanıyor. İki format doğru
   ayrıştırılmalı; unsigned JSON veya rastgele Base64, imzalı kanıt kabul edilmemeli.
   `receiptFormat` gibi açık bir discriminator eklenmesi öneridir; mevcut istemcilerle
   geriye uyumluluk korunarak koordineli eklenmeli.
6. Android `purchaseToken` ve mevcut purchase alanları kullanılır. RTDN bildirimi,
   acknowledge/retry/idempotency ve refund/revocation senkronu tamamlanmalı.
7. Restore, receipt/Store transaction içindeki **gerçek ürünü** esas almalı. Her
   restore'u yearly sayan istemci hatası giderildi; monthly/lifetime/remove_ads ayrılmalı.
8. Transaction ancak backend kabulünden sonra istemcide finish/ack edilir; transient
   hata sonrası restore/retry güvenli olmalı. RTDN/StoreKit updates gecikse de aynı
   transaction'ın tekrar doğrulanması tutarlı cevap vermeli.

### İstenen kanonik yanıt
Flat yanıt biçimi tercih edilir; wrapper kullanılıyorsa bütün istemcilere duyurulsun.
Örnek sözleşme (örnek değerlerdir, gerçek hesap bilgisi değil):
```json
{
  "success": true,
  "plan": "premium_yearly",
  "isActive": true,
  "expiryDate": "2030-01-01T00:00:00Z",
  "features": ["no_ads", "high_quality_audio"]
}
```
Süreli planda gerçek UTC expiry gerekli; istemci artık `şimdi + 1 yıl` uydurmuyor.
Lifetime `plan=premium_lifetime`, `expiryDate=null` olabilir. Süresi bitmiş/iptal plan
GET'te `isActive=false` dönmeli. Plan değerleri (`premium_monthly`, `premium_yearly`,
`premium_lifetime`, `remove_ads`) merkezi olarak belgelenmeli.

**Hatalar:**401oturum,403sahiplik,422geçersizkanıt,409conflict gibi anlamlı statüler ve
makine okunur `code` + kullanıcıya gösterilebilir `message`. Geçici store hatası retryable
olarak ayrılmalı. Gerçek satın alma bu incelemede yapılmadı; sandbox kabul testi şart.

### Canlı GET yanıtı — kişisel verilerden arındırılmış gerçek örnek
`iteration_54` salt okunur testinde giriş yapmış, aktif aboneliği olmayan test hesabı
için `GET /api/user/subscription` HTTP 200 verdi. Yalnızca izinli abonelik alanları:
```json
{
  "plan": "none",
  "expiryDate": null,
  "isActive": false,
  "features": []
}
```
Kaynak: `test_reports/artifacts_iter54/subscription_snapshot_sanitized.json`.
Bu bir **gözlenen ücretsiz hesap yanıtıdır**; yukarıdaki aktif premium örneği ise
istenen sözleşmedir. Ücretli hesabın gerçek GET veya satın alma POST yanıtının bu
testte doğrulandığı anlamına gelmez.

| Alan | İstemcide karşılığı |
| --- | --- |
| `plan: "none"` | Premium ve reklamsız yetki verilmez |
| `isActive: false` | Plan metninden bağımsız olarak pasif kabul edilir |
| `expiryDate: null` | Bu pasif hesapta süre yok; tahmini gelecek tarih üretilmez |
| `features: []` | Ek hak yok; istemci ürün seçimini yetki saymaz |

Yanıt flat; `subscription` wrapper'ı veya `success` alanı gerektirmiyor. GET için
`success: true` zorunluluğu ekleyerek çalışan istemcileri bozmayın. POST doğrulamasında
geçersiz kanıta başarı dönmemesi şartı ayrıca geçerlidir.

## P0/P1 — TV eşleme ve session doğrulaması
**Mevcut:** `/api/auth/tv/code`, `/api/auth/tv/check`, `/api/auth/tv/verify`.
- Durum adları, token/user alanları, expiry birimi ve TTL açık belgelenmeli.
- Code/check yanıtları CDN'de cache'lenmemeli (`Cache-Control: no-store`).
- Süresi geçen code deterministik expired yanıtı vermeli; tekrar eşleme güvenli olmalı.
- /verify geçersiz token için401 veya açık `valid=false`; başka kullanıcının bilgisi dönmemeli.
- İstemci eski polling cevabının logout sonrası tekrar login yapmasını engelliyor.
- Önceki backend PR#66 / Android TV RTDN ve activation-expiry çalışması varsa durumunu paylaşın.

## P1 — Community public profile sayfalaması
**Mevcut:** `GET /api/public-profiles`.
Gözlenenler: limit100/200/500 ->100kayıt; page2/offset100/skip100 ->aynı ilk/son IDs.
Yanıtta yalnızca `data` var; total/hasMore yok. Bu gözlem,100'den fazla public kullanıcı
olduğunu tek başına kanıtlamaz; ama mevcut sayfalama parametrelerinin çalıştığını da göstermez.

İstenen: mevcut `data` korunarak gerçek page/limit veya cursor desteği, stabil sıralama,
`hasMore`/total metadata. Search filtresi pagination'dan önce uygulansın ve sözleşmesi
belgelensin. Sadece public hesaplar; email ve private alanlar listeye eklenmesin.

```json
{"data": [], "page": 2, "limit": 100, "hasMore": false, "total": 100}
```
İstemci duplicate sayfayı algılıyor ve duruyor; API'nin vermediği kullanıcıları üretemez.
Kabul testi: page1/page2 farklı IDs; private profil yok; son sayfa deterministik;
arama tüm public dataset'te; cache query parametrelerini ayırır.

## P1 — Yayın kullanılabilirliği ve paylaşım canonical
**Gözlem:** Best FM Türkiye (`best-fm-2`) API listesinde; bounded stream isteği timeout,
website `/station/best-fm-2` 410 `JUNK-410` döndürüyor. Bu radyonun kalıcı kapandığının
kanıtı değildir; stream/ağ durumu ve website tombstone/cache kararı ayrı incelenmeli.
Virgin Türkiye favicon'u testlerde503 döndü; istemci artık yerel logo kullanıyor.

İstenen:
- Resolved/backup/alternative stream URL'leri ve son kontrol zamanı tutarlı olsun.
- Offline/geçici stream, silinmiş istasyon ve paylaşım sayfası durumları ayrı alanlar olsun.
  `isPlayable`, `availabilityReason`, `shareUrl`, `shareAvailable` önerilen ek alanlardır.
- Geçici offline istasyonda bilgi sayfası200 + açıklama; gerçekten silinmiş kayıtta410
  veya **aynı kayıt için** doğru redirect. Başka bir radyoya sessiz redirect yapılmasın.
- `noIndex` tek başına oynatma/paylaşım yasağı anlamına gelmez.
- Canonical/OG publicURL ID/slug eşleştirmesi tutarlı; public profile `/user/<id-or-slug>`
  açılır, private olan bulunamadı/gizli cevabı verir.
- Stream probe HEAD desteklemeyen yayınları yanlışlıkla offline saymamalı; bounded GET
  ve redirect/playlist çözümü kullanılmalı. İstemcide15sn koruma native iOS fix'in yerine geçmez.

## P1 — Tür/ülke/list payload sözleşmeleri
- `GET /api/stations?genre=jazz` doğrulanan tür filtresidir; `tag=jazz` aynı filtreyi
  uygulamadı. `tag` desteklenmiyorsa belgelenmeli veya alias/400 politikası açık olmalı.
- `/api/genres` ile `/api/genres/precomputed` field/envelope farkları belgelenmeli.
- `/api/stations/popular` rawarray dönebiliyor; diğer listeler `{stations:[]}`. Geriye
  uyumlu normalize veya açık API versiyonlaması; sessiz shape değişikliği yapılmasın.
- `/api/filters/countries` şu an string ülke adları döndürüyor. Saatlerde doğru ISO/flag
  için ek format önerisi: `?format=objects` -> `{name, code, flagUrl}`; mevcut default
  stringarray istemcileri bozulmamalı. Ülke adının ilk iki harfi ISO kodu değildir.
- Statik logosuz kayıt için boş/nullURL; sitewide logo kullanılıyorsa boyut/metadatası
  doğru olsun. İstemci fallback'ini CDN/site logosuna bağımlı bırakmayın.

## P2 — Cihazlar arası dinleme istatistikleri (ayrı ürün işi)
Mevcut düzeltme cihazda account-scoped local kaydı ayırır; cloud sync değildir.
Cihazlar arası toplam istenirse auth-scoped stats GET + idempotent session/event upload
sözleşmesi ayrıca tasarlanmalı. Session-end bir şarkı değildir; pause/offline süre,
tekrar gönderim, hesap değişimi ve unique station sayıları doğru ayrılmalı.
Eski cihaz-geneli karışık sayaçlar kanıtsız bir hesaba atanmadı.

## Geliştiriciden beklenen teslim/kabul bilgisi
- Her madde için endpoint/schema değişikliği, geriye uyumluluk ve örnek sanitized yanıt.
- Store sandbox test matrisi: success, cancel, pending, expiredJWT, sameReceiptRetry,
  differentUserConflict, monthly/yearly/lifetime restore, revoke/refund.
- App Links: gerçek release sertifikası, installed/uninstalled/cold/warm sonuçları.
- Community sayfalama ve canonical410 için tekrarlanabilir GET test sonucu.
- Hiçbir secret, JWT, makbuz veya tam purchaseToken README/ticket'e konulmamalı.