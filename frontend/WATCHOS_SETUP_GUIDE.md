# MegaRadio watchOS Companion App - Kurulum Rehberi

Bu rehber, MegaRadio iOS uygulamasına watchOS companion app eklemek için adım adım talimatlar içerir.

## Ön Gereksinimler

- Xcode 15.0 veya üzeri (tercihen Xcode 16)
- macOS Sonoma veya üzeri
- Apple Developer hesabı
- EAS Build ile oluşturulmuş iOS projesi

## Önemli Bilgiler

| Değer | Açıklama |
|-------|----------|
| iOS Bundle ID | `com.visiongo.megaradio` |
| watchOS Bundle ID | `com.visiongo.megaradio.watchkitapp` |
| watchOS Display Name | MegaRadio |
| Minimum watchOS | 9.0 |

## Adım 1: iOS Projesini Aç

```bash
# EAS build sonrası ios klasörü oluşturulmuş olmalı
cd /path/to/megaradio/frontend
open ios/megaradio.xcworkspace
```

**ÖNEMLİ**: `.xcodeproj` değil, `.xcworkspace` dosyasını açın (CocoaPods bağımlılıkları için).

## Adım 2: watchOS Target Ekle

1. Xcode'da: **File > New > Target...**
2. Platform: **watchOS**
3. Template: **App** (Watch App for iOS App DEĞİL - yeni SwiftUI template)
4. Ayarlar:
   - **Product Name**: `MegaRadioWatch`
   - **Bundle Identifier**: `com.visiongo.megaradio.watchkitapp`
   - **Language**: Swift
   - **User Interface**: SwiftUI
   - **Include Tests**: Hayır (opsiyonel)
   - **Watch-only App**: HAYIR (iOS companion ile çalışacak)

5. **Finish** tıklayın

## Adım 3: Xcode Tarafından Oluşturulan Template Dosyalarını Sil

Xcode yeni target için boş template dosyaları oluşturacak. Bunları silin:

1. Project Navigator'da `MegaRadioWatch` klasörünü bulun
2. Aşağıdaki dosyaları silin (Move to Trash):
   - `MegaRadioWatchApp.swift` (template)
   - `ContentView.swift` (template)
   - `Assets.xcassets` (template)
   - `Preview Content` klasörü

## Adım 4: Hazır Dosyaları Kopyala

Bu repo'daki hazır watchOS dosyalarını kopyalayın:

### Kaynak Klasör:
```
frontend/watch/ios/MegaRadioWatch/
```

### Hedef Klasör:
```
frontend/ios/MegaRadioWatch/
```

### Kopyalanacak Dosyalar:
- `MegaRadioWatchApp.swift` - Ana giriş noktası
- `ContentView.swift` - Tab view container
- `NowPlayingView.swift` - Şu an çalan ekranı
- `FavoritesView.swift` - Favoriler listesi
- `GenresView.swift` - Türler listesi
- `Assets.xcassets/` - İkonlar dahil tüm klasör
- `Info.plist` - Yapılandırma dosyası

### Terminal ile Kopyalama:
```bash
cp -R frontend/watch/ios/MegaRadioWatch/* frontend/ios/MegaRadioWatch/
```

## Adım 5: Dosyaları Xcode Projesine Ekle

1. Xcode'da `MegaRadioWatch` target klasörüne sağ tıklayın
2. **Add Files to "megaradio"...** seçin
3. Kopyaladığınız dosyaları seçin:
   - `MegaRadioWatchApp.swift`
   - `ContentView.swift`
   - `NowPlayingView.swift`
   - `FavoritesView.swift`
   - `GenresView.swift`
   - `Assets.xcassets` (klasörü seçin)
4. **Options**:
   - **Copy items if needed**: HAYIR (zaten kopyaladık)
   - **Add to targets**: `MegaRadioWatch` SEÇİLİ
5. **Add** tıklayın

## Adım 6: Info.plist Ayarları

Info.plist dosyasını kontrol edin ve şu değerlerin doğru olduğundan emin olun:

```xml
<key>WKCompanionAppBundleIdentifier</key>
<string>com.visiongo.megaradio</string>

<key>WKRunsIndependentlyOfCompanionApp</key>
<false/>

<key>WKApplication</key>
<true/>
```

## Adım 7: Build Settings Kontrolü

1. `MegaRadioWatch` target'ı seçin
2. **Build Settings** sekmesi
3. Kontrol edin:
   - **Product Bundle Identifier**: `com.visiongo.megaradio.watchkitapp`
   - **Deployment Target**: watchOS 9.0 veya üzeri
   - **Swift Language Version**: Swift 5

## Adım 8: Signing & Capabilities

1. `MegaRadioWatch` target'ı seçin
2. **Signing & Capabilities** sekmesi
3. **Team**: Apple Developer hesabınızı seçin
4. **Bundle Identifier**: `com.visiongo.megaradio.watchkitapp`
5. **Automatically manage signing**: Aktif

## Adım 9: iOS App Target'a watchOS Embed Ekle

1. Ana iOS target'ı seçin (`megaradio`)
2. **General** sekmesi > **Frameworks, Libraries, and Embedded Content**
3. `MegaRadioWatch.app` eklenmiş olmalı (yoksa + ile ekleyin)
4. Embed seçeneği: **Embed & Sign**

## Adım 10: Build & Test

### Simulator'da Test:
1. Scheme seçici'den `MegaRadioWatch` seçin
2. Destination: Apple Watch simulator (örn: Apple Watch Series 9 - 45mm)
3. **⌘ + R** ile build ve run

### Gerçek Cihazda Test:
1. iPhone'u Mac'e bağlayın
2. Apple Watch iPhone ile eşleşmiş olmalı
3. Scheme: `MegaRadioWatch`
4. Destination: Paired Apple Watch
5. Build & Run

## Yaygın Hatalar ve Çözümleri

### Hata 1: "CFBundleIdentifier missing"
**Çözüm**: Info.plist'te `$(PRODUCT_BUNDLE_IDENTIFIER)` değerinin Build Settings'teki değerle eşleştiğinden emin olun.

### Hata 2: "Icon asset catalog requirements"
**Çözüm**: 
- `Assets.xcassets/AppIcon.appiconset/` klasöründe tüm gerekli icon boyutları var mı kontrol edin
- `Contents.json` dosyasındaki filename'ler gerçek dosya adlarıyla eşleşmeli
- Clean Build Folder: **Product > Clean Build Folder** (⌘ + Shift + K)
- DerivedData sil: `rm -rf ~/Library/Developer/Xcode/DerivedData`

### Hata 3: "WKCompanionAppBundleIdentifier must match"
**Çözüm**: Info.plist'teki `WKCompanionAppBundleIdentifier` değeri iOS app'ın bundle ID'si ile aynı olmalı: `com.visiongo.megaradio`

### Hata 4: Build Settings'te PRODUCT_BUNDLE_IDENTIFIER boş
**Çözüm**: 
1. MegaRadioWatch target > Build Settings
2. "Product Bundle Identifier" ara
3. Değer gir: `com.visiongo.megaradio.watchkitapp`

## Apple Developer Portal Ayarları

watchOS app için App Store Connect'te:

1. **Certificates, Identifiers & Profiles** > **Identifiers**
2. Yeni Identifier ekle: `com.visiongo.megaradio.watchkitapp`
3. Platform: watchOS
4. Capabilities: Gerekli olanları etkinleştir

## Sonraki Adımlar

watchOS app başarıyla build olduktan sonra:

1. **WatchConnectivity** ekleyerek iOS app ile iletişim kurulabilir
2. **Now Playing** bilgisi iOS'tan alınabilir
3. **Favoriler** iOS app ile senkronize edilebilir
4. **Streaming** kontrolü eklenebilir

## Dosya Yapısı (Final)

```
ios/
├── megaradio/
│   ├── AppDelegate.mm
│   ├── Info.plist
│   └── ...
├── MegaRadioWatch/
│   ├── MegaRadioWatchApp.swift
│   ├── ContentView.swift
│   ├── NowPlayingView.swift
│   ├── FavoritesView.swift
│   ├── GenresView.swift
│   ├── Info.plist
│   └── Assets.xcassets/
│       ├── AppIcon.appiconset/
│       │   ├── Contents.json
│       │   ├── icon-24@2x.png
│       │   ├── icon-27.5@2x.png
│       │   └── ... (tüm boyutlar)
│       └── AccentColor.colorset/
└── megaradio.xcworkspace
```

## Destek

Sorun yaşarsanız:
1. Xcode console loglarını kontrol edin
2. Clean Build Folder deneyin
3. DerivedData silin ve tekrar deneyin
