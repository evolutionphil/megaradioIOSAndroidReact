# MegaRadio - Çalışan Sistem Dökümü (Build 32)

## 🔒 KRİTİK KURAL: BU SİSTEMİ BOZMA!

**Tarih:** 28 Şubat 2025  
**Son Çalışan Build:** 32  
**Durum:** ✅ Stabil

---

## ⚠️ DOKUNULMAMASI GEREKEN DOSYALAR

Bu dosyalarda değişiklik yaparken **ÇOK DİKKATLİ** ol:

### iOS Native (Swift/Objective-C)
| Dosya | Açıklama | Risk |
|-------|----------|------|
| `ios/MegaRadio/CarPlaySceneDelegate.swift` | CarPlay ana delegate | 🔴 Yüksek |
| `ios/MegaRadio/CarSceneDelegate.m` | CarPlay ObjC delegate (yedek) | 🔴 Yüksek |
| `ios/MegaRadio/PhoneSceneDelegate.swift` | Telefon scene delegate | 🔴 Yüksek |
| `ios/MegaRadio/AppDelegate.swift` | Uygulama başlangıç noktası | 🔴 Yüksek |
| `ios/MegaRadio/MegaRadio-Bridging-Header.h` | Swift-ObjC köprüsü | 🔴 Yüksek |
| `ios/MegaRadio/Info.plist` | iOS yapılandırması | 🔴 Yüksek |
| `ios/Podfile` | CocoaPods bağımlılıkları | 🔴 Yüksek |

### Yapılandırma Dosyaları
| Dosya | Açıklama | Risk |
|-------|----------|------|
| `app.json` | Expo/EAS yapılandırması | 🔴 Yüksek |
| `package.json` | NPM bağımlılıkları | 🔴 Yüksek |
| `tsconfig.json` | TypeScript yapılandırması | 🟡 Orta |

### Çekirdek Servisler
| Dosya | Açıklama | Risk |
|-------|----------|------|
| `src/services/carPlayService.ts` | CarPlay template yönetimi | 🔴 Yüksek |
| `src/services/carPlayLogService.ts` | CarPlay loglama | 🟡 Orta |
| `src/hooks/useAudioPlayer.ts` | Ses çalma mantığı | 🔴 Yüksek |
| `src/services/trackPlayerService.ts` | Track Player yapılandırması | 🔴 Yüksek |
| `src/services/adMobService.native.ts` | Reklam servisi | 🟡 Orta |

---

## 📦 DOKUNULMAMASI GEREKEN PAKET VERSİYONLARI

```json
{
  "react-native": "0.81.5",
  "expo": "54.0.33",
  "react-native-google-mobile-ads": "14.2.0",  // ⚠️ 14.6.0 CRASH YAPAR!
  "@g4rb4g3/react-native-carplay": "^2.7.22",
  "react-native-track-player": "^4.1.2",
  "expo-router": "~6.0.22"
}
```

### ⚠️ Paket Güncellemesi Kuralları:
1. **ASLA** `react-native-google-mobile-ads`'ı 14.2.0'dan yükseltme
2. **ASLA** `expo` major versiyonunu değiştirme (54.x kalmalı)
3. **ASLA** `react-native` versiyonunu değiştirme
4. **ASLA** `newArchEnabled: true` yapma

---

## ✅ GÜVENLİ DEĞİŞİKLİK ALANLARI

Bu alanlarda güvenle değişiklik yapabilirsin:

### UI/Frontend
- `src/components/` - UI componentleri
- `src/screens/` veya `app/` - Ekranlar
- `src/styles/` - Stiller
- `assets/` - Görseller, fontlar

### Servisler (Dikkatli)
- `src/services/stationService.ts` - İstasyon API
- `src/services/authService.ts` - Kimlik doğrulama
- `src/services/favoritesService.ts` - Favoriler

### Yeni Özellik Ekleme
- Yeni component oluşturma ✅
- Yeni screen ekleme ✅
- Yeni hook oluşturma ✅
- Mevcut API'lere yeni endpoint ekleme ✅

---

## 🚫 YAPILMAMASI GEREKENLER

1. ❌ Native modülleri (Swift/ObjC) silme veya yeniden yazma
2. ❌ Paket versiyonlarını güncellerken "latest" kullanma
3. ❌ `pod install` parametrelerini değiştirme
4. ❌ `newArchEnabled` değerini değiştirme
5. ❌ Scene delegate yapısını değiştirme
6. ❌ Info.plist'teki scene configuration'ı değiştirme
7. ❌ CarPlay entitlements'ı değiştirme

---

## 📋 GÜVENLİ GÜNCELLEME PROSEDÜRÜ

Herhangi bir değişiklik yapmadan önce:

### 1. Değişiklik Planı
```
- Ne değişecek?
- Hangi dosyalar etkilenecek?
- Risk seviyesi nedir?
```

### 2. Build Numarası
```
app.json -> buildNumber ve versionCode artır
```

### 3. Test Sırası
```
1. Local build kontrolü (hata var mı?)
2. EAS build
3. TestFlight test
4. CarPlay test (simülatör veya gerçek cihaz)
```

---

## 🔧 BUILD 32 ÇALIŞAN YAPILANDIRMA

### Info.plist Scene Delegates
```xml
<!-- Telefon -->
<string>$(PRODUCT_MODULE_NAME).PhoneSceneDelegate</string>

<!-- CarPlay -->
<string>$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate</string>
```

### CarPlay Entitlements
```xml
<key>com.apple.developer.carplay-audio</key>
<true/>
```

### Expo Build Properties
```json
{
  "ios": {
    "useFrameworks": "static",
    "newArchEnabled": false
  }
}
```

---

## 📊 BİLİNEN SORUNLAR VE DURUMLARI

| Sorun | Durum | Açıklama |
|-------|-------|----------|
| iOS Startup Crash | ✅ Çözüldü | AdMob 14.2.0 ile düzeldi |
| CarPlay "Yükleniyor" | 🔄 Test Bekliyor | Build 32'de test edilmeli |
| Next Station Button | 🔄 Test Bekliyor | Kod düzeltildi, test gerekli |
| Google Cast | ❌ Devre Dışı | Crash yaptığı için kaldırıldı |
| Android Build | 🔄 Test Bekliyor | Henüz test edilmedi |

---

## 📝 NOTLAR

- Build 32 başarılı şekilde derlendi
- Kullanıcı "sorunsuz çalışıyor" dedi
- Bundan sonraki değişiklikler minimal ve güvenli olmalı
