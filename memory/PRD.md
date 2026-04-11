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
- Google Sign-In authentication (Native SDK on Android)
- Package name alignment (com.megaradio for Android)

### Backend Sync (DONE - Feb 2026)
- IAP sync: `reportToBackend(purchase)`, `syncSubscriptionFromBackend()`
- Favorites sync: `POST/DELETE/GET /api/user/favorites`
- Recently played: `POST/GET /api/recently-played`

### Android Auto A-Z Media App Compliance (DONE - Feb 2026)
- Full `MediaBrowserServiceCompat` with browse tree
- `MediaSessionCompat` with complete `Callback` implementation
- Station artwork/favicon support via `setIconUri()`
- Navigation permissions stripped, sole `MediaBrowserService`

### ICY Client-Side Metadata (DONE - Feb 2026)
- `Icy-MetaData: 1` header added to ALL TrackPlayer.add() calls (AudioProvider, service.js, trackPlayerService)
- `Event.PlaybackMetadataReceived` / `Event.MetadataCommonReceived` handler with:
  - Advertisement detection (AdCreativeId, adw_ad, adswizz, etc.)
  - "Artist - Title" parsing from ICY stream
  - Song change detection for `incrementMusicPlayed()` stats
  - Lock screen metadata update
  - Song History auto-population
- ICY-first strategy: No server polling if ICY active
- Fallback: REST API polling at 60s interval only if no ICY metadata after 20s
- Zero additional server load for metadata

### Xcode Dependency Cycle Fix (DONE - Feb 2026)
- Created `withWatchOSBuildFix.js` config plugin
- Adds `post_integrate` hook to Podfile
- Sets `always_out_of_date = "1"` on all CocoaPods `[CP-User]` script phases
- Prevents dependency cycle between Watch App embed, Firebase/AdMob scripts, and ProcessInfoPlistFile

### Config Plugin Architecture (Current - versionCode 86)
```
app.json plugins (execution order):
1-7.  Expo core plugins
8.    ./plugins/withAndroidBuildFix.js
9.    ./plugins/withAirPlay.js
10.   ./plugins/withAndroidAutoFull.js
11-12. Other plugins
13.   react-native-google-mobile-ads
14.   ./plugins/withAdMobFix.js
15.   ./plugins/withTrackPlayerServiceFix.js
16.   ./plugins/withCarPlayNativeFix.js
17-18. Firebase plugins
19.   ./plugins/withGoogleServicesFix.js
20.   @react-native-google-signin/google-signin
21.   ./plugins/withFmtFix.js
22.   ./plugins/withWatchOSBuildFix.js    <-- NEW: Must be LAST
```

### Native Fix Strategy
- **patch-package**: `react-native-track-player`, `@g4rb4g3/react-native-carplay`, `react-native`
- **Config Plugins**: withAndroidBuildFix, withAdMobFix, withAndroidAutoFull, withTrackPlayerServiceFix, withCarPlayNativeFix, withGoogleServicesFix, withFmtFix, withWatchOSBuildFix

## Known Issues
- react-native-reanimated `mIsFinished` warning (non-critical, v3.19.5)
- `libpenguin.so` not found (non-critical)

## Pending Verification
- P0: Xcode Dependency Cycle fix — user needs to run `cd frontend && npx expo prebuild --platform ios --clean` and build in Xcode
- P0: ICY metadata — user needs to test on physical device with live radio stream
- P2: AdMob ads on physical Android device (new Ad Unit ID propagation 24-72h)

## Backend Developer Communication
- App uses **REST API polling (Yontem A)** for metadata: `GET /api/now-playing/{stationId}`
- Now enhanced with ICY client-side metadata as primary source
- Logo proxy already updated to `stream.themegaradio.com`
- Stream connection: HTTPS direct, HTTP via proxy

## Future/Backlog
- P1: watchOS Companion App (blocked on Xcode cycle fix verification)
- P1: tvOS and Android TV standalone apps
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP)
- P3: Station alarm feature
- P3: Web Preview CORS fix

## Build Instructions
```bash
cd frontend
yarn install
npx expo prebuild --platform android --clean
eas build --platform android --profile preview

# iOS
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
# Then open in Xcode and build
```

## API Endpoints
- `POST /api/user/subscription` — IAP sync
- `GET /api/user/subscription` — query status
- `POST/DELETE/GET /api/user/favorites` — favorites CRUD
- `GET /api/user/favorites/check/:stationId` — check if favorited
- `POST/GET /api/recently-played` — recently played
- `POST /api/auth/google` — Google idToken verification
- `POST /api/auth/mobile/login` — email/password login
- `GET /api/now-playing/:stationId` — metadata (fallback only, ICY preferred)
- `https://stream.themegaradio.com/api/image/{encoded}` — logo proxy
