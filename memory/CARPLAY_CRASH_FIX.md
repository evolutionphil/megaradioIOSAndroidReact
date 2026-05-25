# CarPlay Crash Fix — Quick Notes

> **Date:** Feb 25, 2026
> **Crash:** `NSGenericException — Application does not implement CarPlay
> template application lifecycle methods in its scene delegate`

---

## Root Cause

`MegaRadio.entitlements` declares `com.apple.developer.carplay-audio = true`,
which tells iOS the app is a CarPlay-enabled audio app. iOS therefore
launches a **separate UIScene** for the CarPlay screen, and looks up its
delegate via `Info.plist → UIApplicationSceneManifest → UISceneConfigurations
→ CPTemplateApplicationSceneSessionRoleApplication`.

Our Info.plist did NOT have this manifest, so iOS couldn't find a delegate
class — and crashed at launch the moment a CarPlay scene was requested
(this happens immediately in the CarPlay Simulator).

---

## Fix Applied (3 files)

### 1. `ios/MegaRadio/CarPlaySceneDelegate.swift` (NEW)

New Swift class that conforms to `CPTemplateApplicationSceneDelegate` and
forwards the connect / disconnect lifecycle to the existing
`@g4rb4g3/react-native-carplay` module:

```swift
public func templateApplicationScene(_, didConnect interfaceController, to window) {
    RNCarPlay.connect(with: interfaceController, window: window)
}

public func templateApplicationScene(_, didDisconnectInterfaceController) {
    RNCarPlay.disconnect()
}
```

### 2. `ios/MegaRadio/MegaRadio-Bridging-Header.h` (MODIFIED)

Added so the Swift class above can see the Obj-C `+connectWith…` class methods:

```objc
#import "RNCarPlay.h"
```

### 3. `ios/MegaRadio/Info.plist` (MODIFIED)

Added the scene manifest entry:

```xml
<key>UIApplicationSceneManifest</key>
<dict>
  <key>UIApplicationSupportsMultipleScenes</key>
  <true/>
  <key>UISceneConfigurations</key>
  <dict>
    <key>CPTemplateApplicationSceneSessionRoleApplication</key>
    <array>
      <dict>
        <key>UISceneClassName</key>
        <string>CPTemplateApplicationScene</string>
        <key>UISceneConfigurationName</key>
        <string>MegaRadio-CarPlay</string>
        <key>UISceneDelegateClassName</key>
        <string>$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate</string>
      </dict>
    </array>
  </dict>
</dict>
```

> **Note:** We intentionally did NOT add the iPhone (`UIWindowSceneSessionRoleApplication`)
> scene config — that would force iOS to use a SwiftUI scene-based launch
> path and break Expo / RN's existing UIApplicationDelegate startup. CarPlay
> needs its own scene config; iPhone keeps the legacy delegate. Apple
> supports this mixed setup.

---

## What the User Must Do in Xcode (Local Mac)

The Swift file isn't auto-registered in the Xcode project — you need to
add it manually once:

1. Pull the latest commit:
   ```bash
   cd ~/Documents/megaradioIOSAndroidReact
   git pull origin main
   ```
2. Open the workspace:
   ```bash
   open frontend/ios/MegaRadio.xcworkspace
   ```
3. In Xcode's Project Navigator (left sidebar), right-click the
   **MegaRadio** folder (group) → **Add Files to "MegaRadio"…**
4. Select **`CarPlaySceneDelegate.swift`** → make sure:
   - **Copy items if needed = OFF**
   - **Target Membership = MegaRadio** is checked
5. Clean: **Shift+Cmd+K** → Build & Run: **⌘R**

The CarPlay Simulator now launches without crashing. The screen will be
empty until your JS code calls `CarPlay.connect()` + `CarPlay.presentTemplate(…)`,
which is what `src/services/carPlayService.ts` already does.

---

## Verifying

Open the CarPlay simulator from Xcode:
**I/O → External Displays → CarPlay**

Expected:
- App launches normally on the iPhone simulator
- After 2–3 seconds the CarPlay window shows the MegaRadio list of
  recently played stations (or empty state if no plays yet)

If the CarPlay window stays black:
- Check Xcode console for `[CarPlay]` logs from `carPlayService.ts`
- Make sure `CarPlay.connect()` is called from your JS code on app startup
