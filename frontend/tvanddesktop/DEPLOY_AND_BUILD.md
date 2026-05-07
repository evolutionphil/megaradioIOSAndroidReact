# MegaRadio Desktop — Deploy & Build Guide

Hızlı bir referans: hem **Railway** üzerinde `desktop.themegaradio.com`
servisini açmak hem de **Windows / macOS / Linux** için EXE/DMG/AppImage
üretmek için adım adım.

---

## 1. Railway — `desktop.themegaradio.com` servisini aç

> Mobil uygulama backend'i (`api.themegaradio.com`) bu servise hiç dokunmuyor.
> Tamamen ayrı, yan yana çalışacak.

**Adım 1 — GitHub'a push:**
```bash
# Tüm bu repo'yu (frontend/tvanddesktop dahil) GitHub'a yükle
git push origin main
```

**Adım 2 — Railway dashboard:**
1. **New Project** → **Deploy from GitHub** → bu repo'yu seç
2. Ayarları şöyle yap:
   - **Root directory**: `/` (varsayılan)
   - **Builder**: Nixpacks (varsayılan, otomatik algılayacak çünkü
     `/app/nixpacks.toml` yazdık)
   - **Watch paths** (opsiyonel, daha hızlı re-deploy için):
     `backend/**`, `frontend/tvanddesktop/apple-tv-and-macos/web-preview/**`

**Adım 3 — Environment variables:**
```
MONGO_URL = (api.themegaradio.com servisinin kullandığı MongoDB Atlas string'i)
DB_NAME   = megaradio   (veya production veritabanın hangisiyse)
```

**Adım 4 — Custom domain:**
1. Settings → Domains → **+ Custom Domain**
2. `desktop.themegaradio.com` yaz
3. Railway sana CNAME değeri verecek (örn. `xyz.up.railway.app`)
4. DNS sağlayıcında (Cloudflare / Route53 / namecheap) bir CNAME kaydı ekle:
   ```
   desktop.themegaradio.com  →  xyz.up.railway.app
   ```
5. 1-5 dakika sonra Railway "Domain active" yeşili gösterir.

**Adım 5 — Doğrulama:**
```bash
curl -I https://desktop.themegaradio.com/api/tv-app/
# HTTP/2 200 → tamamdır
```

Bu noktadan sonra her `git push origin main` Railway'i tetikler ve 2-3
dakika sonra tüm Electron kullanıcılarında yeni UI canlı.

---

## 2. Desktop EXE / DMG / AppImage üret

### 2A. Mac'te (en kolay)
```bash
cd frontend/tvanddesktop/desktop
yarn                           # bir kerelik
yarn build:mac                 # → dist/MegaRadio-1.0.0-universal.dmg
```

### 2B. Windows EXE (3 yol var)

**Yol 1 — Bir Windows makinasında (en güvenilir):**
```powershell
cd frontend\tvanddesktop\desktop
yarn
yarn build:win
# → dist\MegaRadio Setup 1.0.0.exe   (NSIS installer)
# → dist\MegaRadio 1.0.0.exe         (portable)
```

**Yol 2 — Mac'te wine ile (kurulumu yarım saat):**
```bash
brew install --cask wine-stable
yarn build:win
```

**Yol 3 — GitHub Actions (en pratik, önerilir):**
Aşağıdaki workflow dosyasını commit'le, sonra her `git tag v1.0.x && git push --tags`
GitHub'da otomatik EXE/DMG/AppImage üretir ve Releases'e ekler.

`.github/workflows/desktop-release.yml`:
```yaml
name: Desktop Release
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: yarn,
                cache-dependency-path: frontend/tvanddesktop/desktop/yarn.lock }
      - run: yarn install --frozen-lockfile
        working-directory: frontend/tvanddesktop/desktop
      - name: Build
        working-directory: frontend/tvanddesktop/desktop
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: yarn run electron-builder --publish always
```

### 2C. Linux AppImage / .deb
```bash
yarn build:linux
# → dist/MegaRadio-1.0.0.AppImage
# → dist/megaradio_1.0.0_amd64.deb
```

---

## 3. Auto-update zaten kurulu

`electron/updater.js` `electron-updater`'ı GitHub Releases'e bağlamak üzere
hazır. Sen GitHub'a yeni `v1.0.1` release attığında her açık MegaRadio
penceresi 6 saatte bir kontrol eder, indirir, kullanıcı "Yeniden başlat"
butonuyla yeni sürüme geçer.

Yapılacak: `package.json` → `build` bloğuna ekle (eğer GitHub Actions ile
otomatik publish yapacaksan):
```json
"publish": {
  "provider": "github",
  "owner": "<github-kullanıcı-adın>",
  "repo": "<repo-adın>"
}
```

---

## 4. Splash screen & ikon nasıl çalışıyor

| Ne | Kaynak dosya | Ne zaman görünür |
|---|---|---|
| Splash penceresi | `electron/splash.html` (logo + animasyonlu yükleme barı) | Çift tıklayınca, ana pencere açılana kadar (~1-2 sn) |
| Pencere ikonu (taskbar) | `build/icon.ico` (Win) / `build/icon.png` (Mac/Linux) | Sürekli |
| Installer ikonu (Win) | `build/icon.ico` | Setup.exe sırasında + Programs listesinde |
| App ikonu (Mac dock) | `build/icon.png` (1024×1024 → otomatik .icns) | Sürekli |
| AppImage ikonu (Linux) | `build/icon.png` | Sürekli |

**İkonu değiştirmek istersen:**
1. Yeni 1024×1024 PNG'i `frontend/tvanddesktop/apple-tv-and-macos/web-preview/public/images/logo.png`'e koy
2. Şu komutu çalıştır:
```bash
python3 - <<'PY'
from PIL import Image
src = Image.open('frontend/tvanddesktop/apple-tv-and-macos/web-preview/public/images/logo.png').convert('RGBA').resize((1024,1024), Image.LANCZOS)
src.resize((512,512), Image.LANCZOS).save('frontend/tvanddesktop/desktop/build/icon.png')
src.resize((256,256), Image.LANCZOS).save('frontend/tvanddesktop/desktop/build/icon.ico',
    format='ICO', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
src.save('frontend/tvanddesktop/desktop/build/icon-1024.png')
PY
```
3. `yarn build:mac` / `:win` / `:linux` → yeni ikonlu paket
