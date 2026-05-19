# MegaRadio TV — Samsung Tizen & LG WebOS Build Guide

Bu klasör Samsung Tizen TV (`samsung-tizen/`) ve LG WebOS TV (`lg-webos/`) için
**tek bir source'tan** üretilebilen platform paketlerini içerir.

## 📁 Yapı

```
tvanddesktop/
├── apple-tv-and-macos/web-preview/   ← TV ortak kaynak (Vite + React)
│                                       Her platform buradan beslenir.
├── samsung-tizen/
│   ├── config.xml                    ← Tizen manifest
│   ├── icon.png                      ← 117×117 Tizen launcher icon
│   ├── prepare-tizen.js              ← Build script
│   └── dist/                         ← ÜRETİLİR — Tizen Studio bunu import eder
│
└── lg-webos/
    ├── appinfo.json                  ← WebOS manifest
    ├── icon.png                      ← 80×80
    ├── largeIcon.png                 ← 130×130
    ├── splash.png                    ← 1920×1080 launch image
    ├── prepare-webos.js              ← Build script
    └── dist/                         ← ÜRETİLİR — ares-package input dir
```

## 🔄 Tek source güncelleme akışı

Web preview'da (`apple-tv-and-macos/web-preview/src/`) yaptığınız her değişiklik
**üç platforma da** otomatik yansır:

```
web-preview/src/  →  yarn build  →  backend/static/tv-preview/  ─┐
                                                                 │
                              ┌──────────────────────────────────┤
                              ↓                                  ↓
                  samsung-tizen/dist/                  lg-webos/dist/
                  (Tizen Studio → .wgt)                (ares-package → .ipk)
```

## 🚀 Samsung Tizen — İlk Build

### Gereksinimler (sizde zaten kurulu)
- Tizen Studio 4.5+
- Samsung Author + Distributor certificate (DUID'iniz aktive edilmiş)

### Build adımları

```bash
cd /Users/mumiix/Documents/megaradioIOSAndroidReact/frontend/tvanddesktop/samsung-tizen
node prepare-tizen.js
```

Çıktı: `samsung-tizen/dist/` klasörü içinde
- `index.html`
- `assets/`, `css/`, `js/`, `images/`, `webOSTVjs-1.2.0/`
- `config.xml`
- `icon.png`

### Tizen Studio'ya import

1. Tizen Studio'yu açın
2. **File → Import → Tizen → Tizen Project → Next**
3. **Select root directory** = `samsung-tizen/dist/`
4. "Copy projects into workspace" işaretli olabilir (önemli değil) → **Finish**
5. Proje sol panelde `MegaRadioTV` (config.xml'deki application id) olarak görünür
6. Sağ tık → **Build Signed Package** → `.wgt` üretilir
7. Sağ tık → **Run As → Tizen Web Application** ile gerçek TV'de test edin

### Re-build (her TV source değişikliğinde)

```bash
node prepare-tizen.js
```
Sonra Tizen Studio'da proje üzerinde sağ tık → **Refresh (F5)** → Build Signed Package.

### Samsung Apps store'a yükleme

`.wgt` dosyasını [Samsung Apps TV Seller Office](https://seller.samsungapps.com) üzerinden yükleyin.
Onay süresi: ~5-10 iş günü.

---

## 📺 LG WebOS — İlk Build

### Gereksinimler (sizde zaten kurulu)
- webOS TV CLI (`ares-package`, `ares-install`, `ares-launch`)
- LG dev account (uygulama yayını için)
- TV'de Developer Mode app yüklü + 50 saatlik dev mode aktif

### Build adımları

```bash
cd /Users/mumiix/Documents/megaradioIOSAndroidReact/frontend/tvanddesktop/lg-webos
node prepare-webos.js
```

Çıktı: `lg-webos/dist/` klasörü içinde
- `index.html` + asset'ler
- `appinfo.json`
- `icon.png`, `largeIcon.png`, `splash.png`

### IPK paketleme + cihaza yükleme

```bash
# .ipk üret (current dir'de oluşur)
ares-package lg-webos/dist

# TV'yi dev cihaz olarak ekle (bir kerelik)
ares-setup-device --add LG_TV --info "{
  'host':'192.168.X.X',
  'port':'9922',
  'username':'prisoner',
  'description':'MegaRadio Dev TV'
}"

# (Veya UI ile)
ares-setup-device

# TV'ye yükle
ares-install --device LG_TV com.themegaradio.app_1.0.2_all.ipk

# Çalıştır
ares-launch --device LG_TV com.themegaradio.app
```

### LG Content Store'a yükleme

`.ipk` dosyasını [LG Seller Lounge](http://seller.lgappstv.com) üzerinden yükleyin.
Onay süresi: ~3-7 iş günü.

---

## 🔄 Versiyon güncelleme

Yeni sürüm yayınlamadan önce şunları güncelleyin:

| Dosya | Alan | Notlar |
|---|---|---|
| `samsung-tizen/config.xml` | `version="1.0.X"` | Major.Minor.Patch (3 segment) |
| `lg-webos/appinfo.json` | `"version": "1.0.X"` | Aynı format |

Her iki dosyada da aynı versiyon olmalı, sonra `node prepare-*.js` script'lerini tekrar çalıştırın.

---

## 🔧 Sorun giderme

### Tizen: "Invalid platform" hatası
- Tizen Studio → Window → Preferences → Tizen Studio → Tools → Certificate Manager
- Yeni bir **Samsung TV Certificate Profile** seçin (Active olarak işaretli)

### WebOS: "ares-install: command not found"
- WebOS TV CLI doğru kuruldu mu? `ares --version`
- Path'e ekli mi? `echo $PATH | grep webos`

### Spatial navigation çalışmıyor (D-pad)
- `dist/js/tv-spatial-navigation.js` ve `dist/js/tv-remote-keys.js`'in
  `index.html`'de `<script>` tag ile yüklendiğinden emin olun (otomatik kopyalanıyor).

### CSP hatası "Refused to connect to api.themegaradio.com"
- `config.xml` içindeki `<tizen:content-security-policy>` bloğunu kontrol edin.
- Domain whitelist'te eksik bir endpoint varsa `connect-src`'ye ekleyin.

---

## 📋 Checklist — Production Release

```
[ ] Versiyon her iki manifest'te de güncel mi? (config.xml + appinfo.json)
[ ] node prepare-tizen.js başarıyla çalıştı mı?
[ ] node prepare-webos.js başarıyla çalıştı mı?
[ ] dist/ klasöründe index.html + tüm asset'ler var mı?
[ ] Tizen Studio Build Signed Package "Signed successfully" yazdı mı?
[ ] .wgt boyutu ~5-10MB civarı mı? (50MB+ ise asset'lerde sorun var)
[ ] .ipk boyutu ~5-10MB civarı mı?
[ ] Gerçek TV'de install edip test edildi mi?
[ ] Samsung Apps / LG Content Store yükleme yapıldı mı?
```
