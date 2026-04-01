# MegaRadio - Product Requirements Document

## Original Problem Statement
Implement In-App Purchase (IAP) Premium Strategy for MegaRadio app. The app has heavily evolved to include UI gating for Premium features, Apple App Store compliance, CarPlay/Android Auto integration, Firebase Analytics/Crashlytics, and deep debugging of Android build/runtime crashes and iOS build issues.

## Tech Stack
- **Frontend**: React Native (Expo Bare Workflow, SDK 54, RN 0.81.5)
- **Routing**: Expo Router
- **State Management**: Zustand
- **Backend**: FastAPI + MongoDB
- **Native Fixes**: patch-package (primary) + Custom Expo Config Plugins (Gradle/Manifest)

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

### Android Crash Fixes (Feb-Apr 2026)

1. **TrackPlayer TurboModule Fix** (via `patch-package` ONLY)
   - Fixed MusicModule.kt: 36 methods changed from `= scope.launch {}` (returns `Job`) to `{ scope.launch {} }` (returns `Unit`)
   - Fixed MusicService.kt: `startForeground` wrapped in try-catch + `FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK` for Android 15+
   - Fixed null check for `originalItem` in getTrack/getActiveTrack
   - **IMPORTANT**: `withTrackPlayerNewArchFix.js` plugin REMOVED from app.json (was conflicting with patch-package)

2. **CarPlay/Android Auto Fix** (`plugins/withCarPlayNativeFix.js`)
   - Added `isCarContextReady()` guard to ALL methods
   - Fixed CarPlaySession ReactRootViewTagGenerator
   - Fixed Parser.kt and RCTTemplate.kt null-safety

3. **Android Auto Infinite Loop Fix** (via `patch-package`)
   - Fixed `didConnect` event flooding in `@g4rb4g3/react-native-carplay`
   - Added debounce (2s) to native didConnect/didDisconnect events
   - Removed callback accumulation bug

4. **AdMob Fix** (`plugins/withAdMobFix.js`)
   - 3-layer approach: ManifestAPI + Raw XML + Nuclear Gradle task
   - Removes MobileAdsInitProvider to prevent Invalid Application ID crash
   - AppOpenAd cleanup on CLOSED event

5. **Firebase Google Services Fix** (`plugins/withGoogleServicesFix.js` - IMPROVED Apr 2026)
   - Bulletproof 4-step setup: copy JSON, add classpath, apply plugin, verify package
   - Uses buildscript-specific regex to avoid matching wrong dependencies block
   - Compensates for @react-native-firebase/app v23.8.x config plugin issues

6. **Safe Area / Bottom Padding Fixes**
   - PremiumPaywall: `paddingBottom: 40 + insets.bottom`

7. **Async Blocking Prevention**
   - IAP initialization: 15s timeout
   - GPS detection: 8s timeout
   - AdMob initialization: 20s timeout
   - Track Player setup: 10s timeout
   - FlowAlive analytics: 5s timeout
   - Purchase requests: 30s timeout
   - AudioErrorBoundary wrapping AudioProvider

### Config Plugin Architecture (Current - versionCode 81)
```
app.json plugins (execution order):
1. expo-router -> Routing
2. expo-build-properties -> Build config (newArchEnabled=false)
3-7. Various Expo plugins
8. ./plugins/withAirPlay.js -> AirPlay support
9. ./plugins/withAndroidAutoFull.js -> Android Auto manifest
10. ./plugins/withCleartextTraffic.js -> HTTP traffic
11. ./plugins/withSwift5Mode.js -> Swift compatibility
12. react-native-google-cast -> Cast support
13. react-native-google-mobile-ads -> Base AdMob config
14. ./plugins/withAdMobFix.js -> AdMob ID guarantee + MobileAdsInitProvider removal
15. ./plugins/withTrackPlayerServiceFix.js -> Manifest: MusicService + foreground permission
16. ./plugins/withCarPlayNativeFix.js -> Source: CarPlayModule.kt carContext guards
17. @react-native-firebase/app -> Firebase base
18. @react-native-firebase/crashlytics -> Crashlytics
19. ./plugins/withGoogleServicesFix.js -> SAFETY NET: google-services.json + Gradle plugin
```

**REMOVED**: `withTrackPlayerNewArchFix.js` - Its job is now done entirely by patch-package

### Native Fix Strategy
- **patch-package** (runs during `yarn install`): Modifies source .kt/.js files directly
  - `react-native-track-player+4.1.2.patch` (475 lines) - TurboModule + foreground + null checks
  - `@g4rb4g3+react-native-carplay+2.7.22.patch` - Debounce + event flooding fix
  - `react-native+0.81.5.patch` - Core RN fix
- **Config Plugins** (run during `npx expo prebuild`): Modify AndroidManifest.xml and build.gradle
  - withAdMobFix.js, withTrackPlayerServiceFix.js, withCarPlayNativeFix.js, withGoogleServicesFix.js

## Known Issues
- react-native-reanimated shows `NoSuchFieldException: mIsFinished` warning (non-critical, v3.19.5 handles it)
- `libpenguin.so` not found warning (non-critical, optional debug library)
- @react-native-firebase/app v23.8.x has known Expo config plugin issues → mitigated by withGoogleServicesFix.js

## Pending Tasks
- P0: User verification of versionCode 81 build (all crash fixes applied)
- P1: Android Auto UI/UX verification (after app stops crashing)
- P1: watchOS Companion App (waiting for user requirements)

## Future/Backlog
- P1: tvOS and Android TV standalone apps
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) enhancement
- P3: Station alarm feature

## 3rd Party Integrations
- Google AdMob (Ads) - User Key
- react-native-iap (In-App Purchases) - StoreKit / Play Billing
- Firebase Analytics & Crashlytics
- Google Sign-In (Authentication)
- @g4rb4g3/react-native-carplay (CarPlay/Android Auto)
- react-native-track-player (Audio playback)

## Build Instructions
```bash
# Temiz build (her zaman bu sırayla):
cd frontend
yarn install          # → postinstall: patch-package otomatik çalışır
npx expo prebuild --platform android --clean  # → Config plugins çalışır
# Android Studio'da aç veya:
eas build --platform android --profile preview
```
