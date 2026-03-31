# MegaRadio - Product Requirements Document

## Original Problem Statement
Implement In-App Purchase (IAP) Premium Strategy for MegaRadio app. The app has heavily evolved to include UI gating for Premium features, Apple App Store compliance, CarPlay/Android Auto integration, Firebase Analytics/Crashlytics, and deep debugging of Android build/runtime crashes and iOS build issues.

## Tech Stack
- **Frontend**: React Native (Expo Bare Workflow, SDK 54, RN 0.81.5)
- **Routing**: Expo Router
- **State Management**: Zustand
- **Backend**: FastAPI + MongoDB
- **Native Fixes**: Custom Expo Config Plugins + patch-package

## What's Been Implemented

### Core Features (DONE)
- Premium UI gating in Player
- Apple App Store compliance (Account Deletion, T&C, Auto-Renewal terms)
- CarPlay/Android Auto native support
- Firebase GA4 and Crashlytics integration
- Google AdMob (App Open, Interstitial, Rewarded, Banner ads)
- IAP (In-App Purchases) with StoreKit / Play Billing
- Google Sign-In authentication
- Package name alignment (com.megaradio for Android)
- versionCode 76

### Android Crash Fixes (Feb 2026)
1. **TrackPlayer TurboModule Fix** (`plugins/withTrackPlayerNewArchFix.js`)
   - Fixed MusicModule.kt: 37 methods changed from `= scope.launch {}` (returns `Job`) to `{ scope.launch {} }` (returns `Unit`)
   - Fixed MusicService.kt: `startForeground` wrapped in try-catch + `FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK` for Android 15+
   - Fixed null check for `originalItem` in getTrack/getActiveTrack

2. **CarPlay/Android Auto Fix** (`plugins/withCarPlayNativeFix.js`)
   - Added `isCarContextReady()` guard to ALL methods including `createScreen` (line 469 crash)
   - Fixed CarPlaySession ReactRootViewTagGenerator (TurboModule compatibility)
   - Fixed Parser.kt and RCTTemplate.kt null-safety issues

3. **AdMob Fix** (`plugins/withAdMobFix.js` - enhanced)
   - Removes duplicate meta-data entries before adding correct one
   - Double verification: withAndroidManifest + withDangerousMod fallback
   - AppOpenAd cleanup on CLOSED event to prevent overlay touch-blocking

4. **Safe Area / Bottom Padding Fixes**
   - PremiumPaywall: `paddingBottom: 40 + insets.bottom` (both paywall modes)
   - IAP purchase error handling: Shows error alert instead of silently closing

5. **Async Blocking Prevention**
   - IAP initialization: 10s timeout
   - GPS detection: 8s timeout
   - AdMob initialization: 20s timeout
   - Track Player setup: 10s timeout
   - FlowAlive analytics: 5s timeout
   - Purchase requests: 30s timeout
   - AudioErrorBoundary wrapping AudioProvider (prevents white screen from TrackPlayer crash)

### Config Plugin Architecture
```
app.json plugins (execution order):
1. expo-router → Routing
2. expo-build-properties → Build config (newArchEnabled=false)
3-12. Various Expo plugins
13. react-native-google-mobile-ads → Base AdMob config
14. ./plugins/withAdMobFix.js → AdMob ID guarantee + duplicate removal
15. ./plugins/withTrackPlayerServiceFix.js → Manifest: MusicService + foreground permission
16. ./plugins/withTrackPlayerNewArchFix.js → Source: MusicModule.kt TurboModule fix + MusicService try-catch
17. ./plugins/withCarPlayNativeFix.js → Source: CarPlayModule.kt carContext guards
18. @react-native-firebase/app → Firebase
```

## Known Issues
- Patch-package may silently fail in EAS builds → Config plugins provide fallback
- TurboModule interop active even with newArchEnabled=false in RN 0.81/Expo SDK 54

## Pending Tasks
- P0: User verification of Android crashes after new build
- P1: watchOS Companion App (waiting for user requirements)

## Future/Backlog
- P1: tvOS and Android TV standalone apps
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) enhancement
- P3: Station alarm feature
- P3: App Store promotional images

## 3rd Party Integrations
- Google AdMob (Ads) - User Key
- react-native-iap (In-App Purchases) - StoreKit / Play Billing
- Firebase Analytics & Crashlytics
- Google Sign-In (Authentication)
- @g4rb4g3/react-native-carplay (CarPlay/Android Auto)
- react-native-track-player (Audio playback)
