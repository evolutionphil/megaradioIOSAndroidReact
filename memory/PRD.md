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
   - Fixed MusicModule.kt: 36 methods changed from `= scope.launch {}` to `{ scope.launch {} }`
   - Fixed MusicService.kt: `startForeground` wrapped in try-catch + `FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK`
   - Fixed null check for `originalItem` in getTrack/getActiveTrack
   - **`withTrackPlayerNewArchFix.js` REMOVED from app.json** (was conflicting with patch-package)

2. **CarPlay/Android Auto Fix** (`plugins/withCarPlayNativeFix.js`)
   - Added `isCarContextReady()` guard to ALL methods
   - Fixed event flooding with debounce

3. **AdMob Fix** (`plugins/withAdMobFix.js`)
   - 3-layer approach: ManifestAPI + Raw XML + Nuclear Gradle task

4. **Firebase Google Services Fix** (`plugins/withGoogleServicesFix.js` - IMPROVED)
   - Bulletproof 4-step setup with buildscript-specific regex

5. **Android Build Fix** (`plugins/withAndroidBuildFix.js` - NEW Apr 2026)
   - Forces `newArchEnabled=false` in gradle.properties (was conflicting as `true`)
   - Enables MultiDex explicitly
   - Adds comprehensive ProGuard keep rules for all native libraries
   - Configures DEX compiler with 4GB heap
   - Fixes `classes.dex not found` crash

### Config Plugin Architecture (Current - versionCode 81)
```
app.json plugins (execution order):
1-7. Expo core plugins
8.  ./plugins/withAndroidBuildFix.js -> NEW: MultiDex + newArch + ProGuard + DEX
9.  ./plugins/withAirPlay.js
10. ./plugins/withAndroidAutoFull.js
11-12. Other plugins
13. react-native-google-mobile-ads
14. ./plugins/withAdMobFix.js
15. ./plugins/withTrackPlayerServiceFix.js
16. ./plugins/withCarPlayNativeFix.js
17-18. Firebase plugins
19. ./plugins/withGoogleServicesFix.js
```

### Native Fix Strategy
- **patch-package**: `react-native-track-player` (TurboModule+foreground+null), `@g4rb4g3/react-native-carplay` (debounce), `react-native` (core)
- **Config Plugins**: withAndroidBuildFix, withAdMobFix, withTrackPlayerServiceFix, withCarPlayNativeFix, withGoogleServicesFix

## Known Issues
- react-native-reanimated `mIsFinished` warning (non-critical, v3.19.5)
- `libpenguin.so` not found (non-critical)

## Pending Tasks
- P0: ~~Backend Developer IAP Specification~~ (DONE - Feb 2026)
- P0: User verification of versionCode 81 build
- P1: Android Auto UI/UX verification
- P1: Backend API integration for subscription validation (after backend developer implements)
- P1: watchOS Companion App (waiting for user requirements)

## Future/Backlog
- P1: tvOS and Android TV standalone apps
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP)
- P3: Station alarm feature

## IAP Technical Specification (Delivered Feb 2026)
- Product IDs: `megaradio_remove_ads_yearly1`, `megaradio_premium_monthly1`, `megaradio_premium_yearly`, `megaradio_premium_lifetime`
- Plans: `none`, `remove_ads`, `premium_monthly`, `premium_yearly`, `premium_lifetime`
- Features: `remove_ads`, `song_info`, `spotify_link`, `youtube_link`, `hd_stream`, `song_history`, `stream_record`
- Current flow: Fully local (AsyncStorage), no server-side receipt validation
- Backend endpoints proposed: `POST /api/user/subscription` (validate & store), `GET /api/user/subscription` (query status)

## Build Instructions
```bash
cd frontend
yarn install
npx expo prebuild --platform android --clean
eas build --platform android --profile preview
```
