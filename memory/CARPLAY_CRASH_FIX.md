# CarPlay Crash — UPDATED FIX (Round 2)

> **Date:** Feb 25, 2026 — _v2 (round 2)_
> **Previous attempt:** SceneDelegate eklendi ama uygulama yine siyah ekrana
> takıldı + tekrar `NSGenericException` aldı.

---

## Round-1 Hatası

İlk fix'te `Info.plist`'e `UIApplicationSupportsMultipleScenes = true`
koyduk → iOS app'i **tam scene-based lifecycle**'a zorladı ama:

1. iPhone için `UIWindowSceneSessionRoleApplication` config'i tanımlamadık
2. `AppDelegate`'te `configurationForConnecting(_:)` metodu yoktu
3. Sonuç: iOS hangi scene class'ı kullanacağını bilemedi → siyah ekran +
   crash döngüsü

---

## Round-2 Fix (3 ek değişiklik)

### 1. `Info.plist` — `UIApplicationSupportsMultipleScenes` artık `false`

```xml
<key>UIApplicationSupportsMultipleScenes</key>
<false/>
```

Bu önemli — iOS multi-scene'i zorlamıyor; iPhone tarafı **eski UIApplication
Delegate flow'una düşüyor** (Expo/RN'nin window setup'ını koruyor), sadece
CarPlay scene'i için manifest'i kullanıyor.

### 2. `AppDelegate.swift` — `configurationForConnecting` extension eklendi

iOS scene oluştururken ÖNCE bu metoda sorar; biz CarPlay role'ünü
detect edip `CarPlaySceneDelegate`'i runtime'da bağlıyoruz. Plist + kod
çift güvence:

```swift
import CarPlay

extension AppDelegate {
  public override func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    if connectingSceneSession.role == UISceneSession.Role.carTemplateApplication {
      let config = UISceneConfiguration(
        name: "MegaRadio-CarPlay",
        sessionRole: connectingSceneSession.role
      )
      config.delegateClass = CarPlaySceneDelegate.self
      config.sceneClass = CPTemplateApplicationScene.self
      return config
    }
    return UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
  }
}
```

### 3. CarPlaySceneDelegate.swift (Round 1'den korundu)

Round-1'de oluşturulan dosya geçerli. Hâlâ Xcode target'ına eklenmiş
olmalı — eğer Build Phases → Compile Sources'ta görünmüyorsa tekrar
**Add Files to "MegaRadio"…** yap.

---

## ⚠️ Kullanıcının Yapması Gerekenler

1. `git pull` ile son commit'i çek
2. **Pods cache'i + DerivedData'yı tamamen sil** (önceki başarısız build artıkları):
   ```bash
   cd ~/Documents/megaradioIOSAndroidReact/frontend/ios
   rm -rf Pods Podfile.lock
   rm -rf ~/Library/Developer/Xcode/DerivedData/MegaRadio-*
   pod install --repo-update
   cd ..
   ```
3. Xcode workspace'i kapat → tekrar aç:
   ```bash
   open ios/MegaRadio.xcworkspace
   ```
4. **Project Navigator'da kontrol et** — `CarPlaySceneDelegate.swift`
   `MegaRadio` group altında görünüyor mu? **Target Membership** sağ
   panelden bak: `MegaRadio` checked olmalı.
5. Eğer dosya yoksa: sağ tık → **Add Files to "MegaRadio"…** →
   `CarPlaySceneDelegate.swift` seç → "Copy items if needed = OFF",
   "Target Membership = MegaRadio" ✅
6. **Shift+Cmd+K** (Clean Build Folder) → **⌘R** (Run)

---

## 🚀 Yeni Bonus: Otomatik NowPlayingTemplate

`carPlayService.ts` artık CarPlay bağlandığında:
1. Root template'i oluşturuyor (Recently Played, Genres, Search vs.)
2. **Eğer telefonda zaten bir istasyon çalıyorsa**, üstüne
   `NowPlayingTemplate`'i otomatik push ediyor

Sonuç: Kullanıcı arabaya bindiğinde CarPlay ekranında **doğrudan oynayan
istasyonu görür** + Play/Pause/Skip butonları hazır. Spotify / Apple
Music UX paritesi. Extra tap yok.

Log: `[CarPlay] Auto-pushing NowPlayingTemplate for active station`
veya `[CarPlay] No active station - skipping auto NowPlaying`.

---

## Test Beklentisi

CarPlay Simulator'da (Xcode → I/O → External Displays → CarPlay):

| Senaryo | Beklenen |
|---|---|
| App ilk açılış (iPhone) | Normal MegaRadio ana ekranı, siyah ekran YOK |
| CarPlay bağlan (hiç çalmadan) | CarPlay'de Recently Played, Genres, Search ListTemplate'i |
| Telefonda Rock Antenne çalıyor → arabaya bağla | CarPlay'de DOĞRUDAN Rock Antenne NowPlayingTemplate'i, Play/Pause çalışıyor |
| CarPlay'den çık → tekrar bağla | Yine en son çalan istasyonun NowPlaying'i |

Eğer hâlâ crash veya siyah ekran varsa **mutlaka Xcode console'unun**
ilk 20 satırını paylaşın — özellikle:
- `Bundle module name` (PRODUCT_MODULE_NAME değerini görelim)
- `Could not instantiate class` benzeri mesajlar
- `CarPlaySceneDelegate` adının log'larda görünüp görünmemesi
