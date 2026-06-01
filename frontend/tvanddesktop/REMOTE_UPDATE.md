# MegaRadio TV — Remote (CDN) Update System

Tizen (Samsung) ve WebOS (LG) uygulamasını **mağaza onayı beklemeden** güncellemek için.
Mantık: mağaza paketi = ince **bootstrap** + **tam yerel yedek**. Açılışta CDN'den
çalışır; CDN yoksa yerel yedeğe düşer.

```
Mağaza paketi (.wgt / .ipk)
├── index.html        ← bootstrap (CDN'i dener, yoksa ./app/'a düşer)
├── app/              ← TAM uygulama (offline + onay-güvenli yedek)
│   └── version.json
├── config.xml / appinfo.json + ikonlar

CDN (cdn.themegaradio.com/tv/)   ← güncellemeyi buraya yüklersiniz
├── index.html  +  assets/...    ← gerçek uygulama
└── version.json   { version, killSwitch }
```

> ⚠️ CDN domaini **`*.themegaradio.com` (örn. `cdn.themegaradio.com`) OLMALI.** Uygulamanın
> `detectApiBase()`'i host'ta `themegaradio.com` görünce API'yi `api.themegaradio.com`'a
> yönlendirir. Başka domain (örn. `*.pages.dev`) kullanırsanız API çağrıları kırılır.

---

## 🔁 GÜNCELLEME YAYINLAMA (sık — her değişiklikte)

Yeni özellik, çıkarma, tasarım — ne olursa olsun:

```powershell
cd frontend\tvanddesktop
# cdn-config.json içindeki cdnBase'i bir kez kendi domaininize göre ayarlayın
node build-cdn.js
#   → frontend\tvanddesktop\cdn-dist\  klasörü oluşur
```
`cdn-dist/` klasörünün tamamını CDN köküne (`cdnBase`) yükleyin:
```powershell
# Cloudflare Pages örneği:
wrangler pages deploy cdn-dist --project-name=megaradio-tv
```
Tüm TV'ler bir sonraki açılışta yeni sürümü alır. **Mağaza işlemi YOK.**

### Acil geri alma (killSwitch)
`cdn-config.json` → `"killSwitch": true` → `node build-cdn.js` → sadece `version.json`'ı
yükleyin. Tüm TV'ler mağazadaki yerel yedeğe döner.

---

## 📦 MAĞAZA PAKETİ (nadir — ilk gönderim / yerel yedeği tazeleme)

```powershell
# Samsung
cd frontend\tvanddesktop\samsung-tizen
node prepare-tizen.js          # dist\ = bootstrap + app\ + config.xml
# tizen build-web / package / install   (deploy rehberindeki gibi)

# LG
cd frontend\tvanddesktop\lg-webos
node prepare-webos.js          # dist\ = bootstrap + app\ + appinfo.json
# ares-package dist  →  ares-install
```

---

## ☁️ Cloudflare kurulumu (bir kez)
1. `cdn.themegaradio.com` → Cloudflare Worker (Static Assets) — repodaki `wrangler.jsonc`
   `cdn-dist`'i kökten servis eder:
   ```
   cd frontend/tvanddesktop
   node build-cdn.js
   wrangler deploy            # cdn-dist'i cdn.themegaradio.com köküne yükler
   ```
   (Alternatif: `wrangler pages deploy cdn-dist --project-name=megaradio-tv`.)
2. `version.json` için **Cache Bypass / kısa TTL** — `cdn-dist/_headers` zaten bunu ayarlar.
3. `assets/*` zaten hash'li → uzun cache verebilirsiniz (`_headers` immutable verir).
4. DNS: `cdn` CNAME/route → Cloudflare. (themegaradio.com Cloudflare'deyse otomatik.)

> ℹ️ **cdnBase KÖK olmalı** (`https://cdn.themegaradio.com/`, `/tv/` alt yolu YOK).
> Worker `cdn-dist`'i kökten servis ettiği için bootstrap `CDN_BASE + 'index.html'`
> ve `CDN_BASE + 'version.json'` çağırır.

## 🔐 Platform güvenlik gereksinimleri (KRİTİK)
Bootstrap, top-level dokümanı CDN kopyasına **yönlendirir** (`window.location.replace`).
Platformlar harici origin'e yönlendirmeyi varsayılan olarak engeller:

- **Tizen (Samsung)** — `config.xml` içinde `<tizen:allow-navigation>*.themegaradio.com
  themegaradio.com</tizen:allow-navigation>` ZORUNLU. Bu olmadan CDN'e yönlendirme
  engellenir (beyaz ekran). Ayrıca allow-navigation, WRT'nin `tizen`/`webapis`
  global'lerini (renk tuşları, MediaPlay, Back = tvinputdevice) uzak sayfaya da
  enjekte etmesini sağlar — yoksa uzaktan kumanda tuşları çalışmaz. ✅ Eklendi.
- **webOS (LG)** — paketli uygulamadan harici https'e yönlendirme varsayılan olarak
  çalışır; `appinfo.json`'da ekstra bayrak GEREKMEZ (CORS yalnızca XHR/fetch için,
  top-level navigasyon için değil). CDN kendi asset'lerini aynı origin'den servis
  ettiği için CORS sorunu yoktur. API çağrıları runtime `detectApiBase()` ile
  `api.themegaradio.com`'a gider.
- **CSP (Tizen)** — `connect-src`/`script-src` zaten `https://*.themegaradio.com`'a
  izin verir, dolayısıyla CDN asset'leri + API çağrıları CSP'den geçer.

## ✅ Doğrulama (TV'de)
- CDN açık → uygulama CDN'den gelir; `version.json` değişince güncellenir.
- CDN'i geçici kapatın → uygulama yerel `./app/`'tan açılmalı (beyaz ekran olmamalı).
- Konsol: API çağrıları `api.themegaradio.com`'a gitmeli (origin CDN olsa bile).

## 🛠️ Dosyalar
- `cdn-config.json` — cdnBase + killSwitch (tek ayar yeri)
- `remote-bootstrap.html` — bootstrap şablonu (`__CDN_BASE__` paketleme anında değişir)
- `build-cdn.js` — CDN paketi üretir (`cdn-dist/`)
- `samsung-tizen/prepare-tizen.js`, `lg-webos/prepare-webos.js` — mağaza paketleri
