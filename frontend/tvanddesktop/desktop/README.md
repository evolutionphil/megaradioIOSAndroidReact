# Desktop — Windows + Linux + (Optional macOS Fallback)

## 🎯 HEDEF

MegaRadio desktop uygulaması — Windows + Linux için Electron tabanlı, macOS için ise opsiyonel olarak Apple TV/macOS native build varsa onu kullanır.

## 🛠️ TEKNİK YAKLAŞIM

### Electron + Web Bundle
- ✅ Mevcut React web bundle'ı reuse eder
- ✅ Tek codebase, 3 platform (Win/Linux/macOS)
- ✅ Auto-update (electron-updater)
- ✅ System tray + global hotkeys
- ✅ 1-2 günlük work ile MVP çıkar

> **Not**: Apple kullanıcıları için **macOS native build** (apple-tv-and-macos klasöründen) tercih edilir. Electron sadece Windows/Linux fallback.

## 📋 ÖZELLİKLER

### Windows + Linux Electron App
- [ ] Tek pencere uygulaması (resize edilebilir)
- [ ] System tray icon (sağ tıklayınca menü)
- [ ] Global media keys (Play/Pause/Next/Previous)
- [ ] Auto-launch on startup (opsiyonel ayar)
- [ ] Mini player mode (always-on-top küçük pencere)
- [ ] Native notifications (yeni şarkı bilgisi)
- [ ] Auto-update (electron-updater)

### Windows-specific
- [ ] Windows installer (.msi via electron-builder)
- [ ] Microsoft Store submission

### Linux-specific
- [ ] AppImage paketi
- [ ] Snap package
- [ ] Flatpak paketi (opsiyonel)
- [ ] .deb / .rpm packages

## 📦 DEPENDENCIES (Planlanan)

```json
{
  "electron": "^32.x",
  "electron-builder": "^25.x",
  "electron-updater": "^6.x",
  "react": "19.0.0",
  "react-dom": "19.0.0"
}
```

## 🎨 TASARIM REFERANSI

📁 **Tasarım dosyası**: `../_design-spec/RADIO_MEGA_DESIGN_SPEC.md`

> Desktop için tasarım uyarlaması:
> - Sidebar TV ile aynı yapıda ama biraz daha kompakt
> - Window controls (close/minimize/maximize)
> - Mouse hover states (TV'de yok)
> - Sağ tık menüleri

## 🚀 SETUP TALİMATLARI (Faz 2'de güncellenecek)

```bash
cd desktop
yarn install
yarn dev          # Geliştirme modu
yarn build:win    # Windows installer
yarn build:linux  # AppImage + .deb + .rpm
```

## 📅 İLERLEME

- [x] Klasör yapısı kuruldu
- [ ] Apple TV/macOS bittikten sonra başlanacak
- [ ] Electron + RN web bundle entegrasyonu
- [ ] Auto-update sistemi
- [ ] Windows/Linux installer'lar

---

**Status**: Beklemede — Apple TV/macOS bittikten sonra (Faz 2-3)
