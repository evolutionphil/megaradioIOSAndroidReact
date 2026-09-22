# LG QA — webOS 3.0/3.5 açılış düzeltmesi (yeni paket 1.0.3)

## Raporu doğru yorumlama
Paylaşılan eski v1.0.0 testinde son not: 4.0/4.5/5.0 değişikliği doğrulanmış,
3.0/3.5 hâlâ splash'ta takılıyor. Eski test edilen `.ipk` elimizde olmadığı için
onun tam kodunu veya QA cihaz logunu doğrulayamıyoruz. Kullanıcı güncel koddan
yeni paket hazırlanmasını onayladı. Raporun geoblock maddesi **olasılık**, kanıt değil.

## Güncel kodda bulunan somut açılış engelleri
- LG resmi tablosu: webOS3.x **Chromium38**, webOS4.x **Chromium53**. İkisinde de
  native ES modules yoktur. Chrome53'ün modules/async-await desteklediği eski kod
  yorumu yanlıştı; bu yüzden yalnız `target:chrome53` çözüm değildir.
- Eski çıktı yalnız `type="module"` uygulama girişi içeriyordu. Runtime polyfill,
  parse edilmeyen modern sözdizimini veya yok sayılan module etiketini düzeltemez.
- `public/js/polyfills.js` içinde dahi `const`, destructuring ve `for...of` vardı;
  Vite public dosyalarını kendiliğinden transpile etmez.
- Fetch/URL/AbortController gibi gerekli API'ler eski engine'de eksik olabilir.
- Cache-first yükleyici script yüklenmesini React'in açılmasıyla karıştırıyordu;
  legacy loader ID/data-src özniteliklerini de korumuyordu.
- Chromium38 CSS değişkenlerini desteklemez: JS açılmış olsa bile utility renkleri
  ve bazı konumlandırmalar görünmez/yanlış olabilirdi.

## Değişiklikler
- Vite5'e uygun `@vitejs/plugin-legacy@5.4.3`: modern + ES5/SystemJS bundle.
- Klasik `compat-runtime.js` **tüm yardımcı dosyalardan önce** çalışır; core-js,
  fetch, abort, text-encoding ve küçük DOM eksiklerini tamamlar. Public helper'lar
  ayrıca Babel ile ES5'e dönüştürülür; mobil Expo bağımlılıkları değişmedi.
- `prepare-webos.js` ve `prepare-tizen.js` paketli `file://` kopyayı classic legacy
  entry'ye çevirir. Modern web/Electron HTTPS girişi çift bundle olarak korunur.
- Paket/CDN build'inde Acorn ES5 kontrolü: legacy uygulama+polyfill+public helpers.
- Eski engine için **sadece kapsamlı utility fallback** CSS üretildi; modern CSS
  değişmedi. Bu dinamik CSS variables veya tüm CSS Grid/flex-gap API'lerinin tam
  emülasyonu değildir. Görsel/focus kabul testi fiziksel eski TV'de gereklidir.
- Bootstrap v3 cached dual bundle'ın SystemJS girişini kullanır. Eski module-only
  cache, eksik dosya veya zaman aşımı → yeni paketin yerel kopyası. Başarı yalnız
  React `megaradio-ready` olayından sonra kabul edilir.
- Yerel kopya da açılmazsa sonsuz splash yerine `TV_STARTUP_TIMEOUT` + kumandayla
  kullanılabilir Try again gösterilir. Bu hata ekranı başarılı açılış sayılmaz.
- webOS `appinfo.json` sürümü **1.0.3**. İzin, bundle ID veya hesap akışı değişmedi.
- Yeni CLI'nin manifest uyarısı için `requiredACG:[]` eklendi; uygulama Luna API
  çağırmıyor (SDK tanımları tek başına çağrı değildir). Yeni yetki talep edilmedi.
  [ACG rehberi](https://webostv.developer.lge.com/develop/guides/acg-guide) uyarınca
  bu alan eski3.x açılışının sebebi değil, yeni platformların manifest hazırlığıdır.

## Yeni paket üretme
TV bağımlılıkları kurulu olmalı (`web-preview/yarn.lock` sabit sürümleri içerir).
```bash
node frontend/tvanddesktop/lg-webos/prepare-webos.js
ares-package frontend/tvanddesktop/lg-webos/dist
ares-install --device LG_TV com.themegaradio.app_1.0.3_all.ipk
ares-launch --device LG_TV com.themegaradio.app
```
**Eski v1.0.0 paketi yeniden göndermeyin. Yeni `.ipk` gerekir:** eski paketin kendi
açılış yükleyicisi yalnız CDN dosyası güncellenerek güvenilir şekilde değişmez.
CDN çıktısı ayrıca `node frontend/tvanddesktop/build-cdn.js` ile yeniden üretilir.
GitHub otomasyonu ve önceki CDN geçmişi gereksinimleri aynen geçerlidir.

## LG QA / cihaz kabul senaryoları

### Bu ortamda elde edilen kanıt
- `iteration_62.json`: modern + classic paket yolu ve eksikAPI polyfill tarayıcı
  kontrolleri; gerçek Chromium38 motoru değil.
- `iteration_63.json` ve son yerel koşum:16bootstrap/guard +25CDN birim testi;
 10ES5script kontrolleri,LG/Samsung/CDNbuild ve yayınsızWrangler kontrolü geçti.
- Yeni gerçek test paketi: `artifacts/webos/com.themegaradio.app_1.0.3_all.ipk`.
  SHA256: `2e8ae9938b25ed6d1b16aaecd001f01f21537942efcbe20e7136f4754c8fcafc`.
- LG mağazasına gönderim veya gerçek cihaz kurulumu yapılmadı; aşağıdaki kabul turu açık.

1. webOS3.0 +3.5 gerçek cihaz: temiz kurulum → splash kalkar → menü/ülke/radyo listesi.
2. Kumanda yönleri/OK/Back, arama ve radyo başlat-duraklat; eski CSS fallback okunabilir.
3. Aynı paketi4.0/4.5/5.0+ üzerinde regresyon turu; native ses/codec sınırlamalarını ayrı kaydet.
4. Ağsız ilk açılış: yerel arayüz açılır, ağdan radyo verisi alamadığını anlaşılır gösterir;
   donmuş splash olmaz. TLS/CDN erişimi kapalıyken cached launch → yerel kopya.
5. Eski module-only cache + yeni paket → cache silinir (yalnız OTA anahtarları), yerel açılış;
   hesap/favori localStorage alanları silinmez.
6. Sağlam yeni CDN cache → tek React kökü, native `webOS` context korunur;
   script404/offline → watchdog yerel kopyaya döner, sonsuz reload olmaz.
7. Loglayın: cihaz modeli/webOS, paket1.0.3, JS parse/runtime hatası ve isteklerin
   HTTP/TLS sonucunu. Yalnız User-Agent değiştirmek Chromium38 motor testi değildir.

## Cloudflare / IP konusu
[CLOUDFLARE_QA_ACCESS.md](../CLOUDFLARE_QA_ACCESS.md) dar kapsamlı IP listesini ve
hesap kurulumunu anlatır. Bu ortamda Cloudflare credential bulunmadı; **token,
GitHub Secret veya firewall kuralı oluşturulmadı**. Bizim ağımızdan CDN/API200
alınması Kore QA IP'lerinin engellenmediğini kanıtlamaz. QA saatine ait Security
Events/Ray ID incelenmeden geoblock kesin sebep diye işaretlenmemelidir.

Kaynak: [LG Web API and Web Engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine),
[Vite legacy plugin](https://www.npmjs.com/package/@vitejs/plugin-legacy/v/5.4.3).