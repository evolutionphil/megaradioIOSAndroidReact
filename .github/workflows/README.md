# 🚀 GitHub Actions — TV Build Pipeline

Otomatik **Samsung Tizen `.wgt`** ve **LG WebOS `.ipk`** üretimi için CI/CD pipeline.

Workflow: `.github/workflows/build-tv-packages.yml`

---

## 🎯 Pipeline Ne Yapar?

1. **Stage 1 — Web Preview Build**: `tvanddesktop/apple-tv-and-macos/web-preview/` Vite ile build edilir.
2. **Stage 2A — Tizen `.wgt`**: Tizen Studio CLI ile `samsung-tizen/dist/`'i paketler.
3. **Stage 2B — WebOS `.ipk`**: `@webos-tools/cli` ile `lg-webos/dist/`'i paketler.
4. **Stage 3 — Release**: `tv-v*` tag'i push edilirse GitHub Release oluşturur, iki paketi ekler.

Stage 2A ve 2B **paralel** çalışır.

---

## 🟢 Nasıl Tetiklenir?

### 1️⃣ Manuel (Actions tab'inden)
```
GitHub repo → Actions → "Build TV Packages" → Run workflow
```
- `sign_packages` seçeneği:
  - `false` → unsigned `.wgt` (dev mode TV testi için)
  - `true` → Samsung sertifikalı `.wgt` (Seller Office submission için, secrets gerekli)

### 2️⃣ Otomatik — TV web preview değişince
PR `frontend/tvanddesktop/apple-tv-and-macos/web-preview/**` altındaki bir dosyayı değiştirirse otomatik build.

### 3️⃣ Otomatik — Tag push ile Release
```bash
git tag tv-v1.0.69
git push origin tv-v1.0.69
```
→ GitHub Release oluşur, `.wgt` + `.ipk` Asset olarak eklenir.

---

## 📦 Output Nereye Düşer?

### Manuel / PR build'lerinde
- Actions run sayfası → "Artifacts" bölümü
  - `megaradio-tizen-wgt` (30 gün saklanır)
  - `megaradio-webos-ipk` (30 gün saklanır)

### Tag push ile Release build'inde
- GitHub repo → Releases → `TV Release tv-v1.0.69` → Assets

İndir, kullan:
- **`.wgt`** → Samsung Seller Office'a upload veya Tizen TV dev mode → `tizen install -n MegaRadio.wgt -t <DEVICE_ID>`
- **`.ipk`** → LG webOS → `ares-install --device LGTV MegaRadio.ipk`

---

## 🔐 Tizen İmzalama Setup (opsiyonel — production için)

Production-ready imzalı `.wgt` üretmek için GitHub Secrets'a şunları ekle:

| Secret Adı | İçerik | Nasıl alınır |
|------------|--------|--------------|
| `TIZEN_AUTHOR_P12_BASE64` | Author certificate `.p12` dosyasının base64 hali | `base64 -i author.p12` |
| `TIZEN_DISTRIBUTOR_P12_BASE64` | Distributor certificate `.p12` base64 | `base64 -i distributor.p12` |
| `TIZEN_AUTHOR_PASSWORD` | Author sertifika şifresi | Tizen Studio'da set ettiğin |
| `TIZEN_DISTRIBUTOR_PASSWORD` | Distributor sertifika şifresi | Tizen Studio'da set ettiğin |

Sertifikaları Tizen Studio → **Tools → Certificate Manager** üzerinden export edebilirsin.

WebOS imzalama gerektirmez — `.ipk` her zaman LG dev portal'dan submission için hazırdır.

---

## 🐞 Sorun Giderme

### "tizen: command not found"
- Tizen Studio CLI 5.0 download URL'i Samsung tarafından değişebilir. `.github/workflows/build-tv-packages.yml` → "Install Tizen Studio CLI" step'ini güncel URL ile değiştir: https://docs.tizen.org/application/tizen-studio/

### "ares-package: command not found"
- `@webos-tools/cli` yerine eski `@webosose/ares-cli` kullanılıyor olabilir. Workflow şu an `@webos-tools/cli` (yeni isim). Eski kullanım için: `npm install -g @webosose/ares-cli`

### Imzalama başarısız
- Action log'unu kontrol et: "Import certificates" step'inde `secrets.TIZEN_AUTHOR_P12_BASE64` boş geliyorsa secret eklenmemiş demek.

---

## 🔄 Manuel Build (Sertifikalı, lokal)

CI'sız hızlı release için lokal:

```bash
cd frontend/tvanddesktop/samsung-tizen
node prepare-tizen.js
# Tizen Studio'da Build Signed Package
```

```bash
cd frontend/tvanddesktop/lg-webos
node prepare-webos.js
ares-package dist/ -o .
```

Detay: `frontend/tvanddesktop/SAMSUNG_LG_BUILD_GUIDE.md`

---

_Last updated: May 26, 2026_
