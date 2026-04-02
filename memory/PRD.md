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
Complete rewrite of `withAndroidAutoFull.js` config plugin:

**Kotlin Service (`MegaRadioAutoService.kt`):**
- Full `MediaBrowserServiceCompat` with browse tree (Favoriler, Son Calinanlar, Populer, Turler)
- `MediaSessionCompat` with complete `Callback` implementation
- `onPlayFromMediaId` — tapping a station starts native playback
- `onPlay/onPause/onStop/onSkipToNext/onSkipToPrevious` — all transport controls
- Native `android.media.MediaPlayer` for streaming radio (independent of TrackPlayer)
- `AudioFocus` management (gain/loss/transient handling)
- `PlaybackStateCompat` properly updated through all states (NONE→BUFFERING→PLAYING→PAUSED→STOPPED→ERROR)
- `MediaMetadataCompat` set with station name/artist/album for Now Playing screen
- Content Style Hints: browsable=GRID, playable=LIST
- Favorites loaded from React Native AsyncStorage (`SharedPreferences`)
- Category-aware skip next/previous tracking

**Manifest & Resources:**
- `androidx.car.app.TintableAttributionIcon` — monochrome headphone icon
- `com.google.android.gms.car.application.theme` — accent color #FF4199
- `automotive_app_desc.xml` — declares `<uses name="media" />`
- Navigation permissions aggressively stripped (`NAVIGATION_TEMPLATES`, `MAP_TEMPLATES`, `ACCESS_SURFACE`)
- `react-native-carplay` services blocked via `tools:node="remove"`
- `MegaRadioAutoService` is the **sole** `MediaBrowserService`
- `ACTION_PLAY_FROM_MEDIA_ID` included in supported actions

**TrackPlayer Service Fix:**
- `withTrackPlayerServiceFix.js` updated: MediaBrowserService intent-filter REMOVED from MusicService
- MusicService exported=false (only internal phone playback)
- foregroundServiceType=mediaPlayback preserved for Android 15+

### Android Crash Fixes (Feb-Apr 2026)

1. **TrackPlayer TurboModule Fix** (via `patch-package`)
   - Fixed MusicModule.kt: 36 methods changed from `= scope.launch {}` to `{ scope.launch {} }`
   - Fixed MusicService.kt: `startForeground` wrapped in try-catch
   - Fixed null check for `originalItem`

2. **CarPlay/Android Auto Fix** (`plugins/withCarPlayNativeFix.js`)
   - Added `isCarContextReady()` guard to ALL methods

3. **AdMob Fix** (`plugins/withAdMobFix.js`)
   - 3-layer approach: ManifestAPI + manifestPlaceholders + Raw XML

4. **Firebase Google Services Fix** (`plugins/withGoogleServicesFix.js`)
   - Bulletproof 4-step setup

5. **Android Build Fix** (`plugins/withAndroidBuildFix.js`)
   - Forces `newArchEnabled=false`, MultiDex, ProGuard, DEX

### Google Login Migration (Feb 2026)
- Migrated from `expo-auth-session` to `@react-native-google-signin/google-signin`
- Native SDK handles SHA-1 verification via `google-services.json`
- Backend `/api/auth/google` unchanged (accepts idToken)

### UI Fixes (Feb 2026)
- PremiumPaywall buttons: padding fix for gesture-navigation devices
- Splash screen: configured in app.json
- TrackPlayer: `StopPlaybackAndRemoveNotification` on app kill
- App icons: RGBA conversion (P mode fix)

### Config Plugin Architecture (Current - versionCode 81)
```
app.json plugins (execution order):
1-7.  Expo core plugins
8.    ./plugins/withAndroidBuildFix.js
9.    ./plugins/withAirPlay.js
10.   ./plugins/withAndroidAutoFull.js     ← MEDIA APP: Service + Manifest + Resources
11-12. Other plugins
13.   react-native-google-mobile-ads
14.   ./plugins/withAdMobFix.js
15.   ./plugins/withTrackPlayerServiceFix.js  ← NO MediaBrowserService intent
16.   ./plugins/withCarPlayNativeFix.js
17-18. Firebase plugins
19.   ./plugins/withGoogleServicesFix.js
20.   @react-native-google-signin/google-signin
```

### Native Fix Strategy
- **patch-package**: `react-native-track-player`, `@g4rb4g3/react-native-carplay`, `react-native`
- **Config Plugins**: withAndroidBuildFix, withAdMobFix, withAndroidAutoFull, withTrackPlayerServiceFix, withCarPlayNativeFix, withGoogleServicesFix

## Known Issues
- react-native-reanimated `mIsFinished` warning (non-critical, v3.19.5)
- `libpenguin.so` not found (non-critical)

## Pending Verification
- P0: User needs to build APK and test Android Auto on DHU / real car
- P1: Google Login, background playback fix, splash screen, paywall UI — need user testing
- P1: watchOS Companion App (waiting for user requirements)

## Future/Backlog
- P1: tvOS and Android TV standalone apps
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP)
- P3: Station alarm feature

## Build Instructions
```bash
cd frontend
yarn install
npx expo prebuild --platform android --clean
eas build --platform android --profile preview
```

## API Endpoints
- `POST /api/user/subscription` — IAP sync
- `GET /api/user/subscription` — query status
- `POST/DELETE/GET /api/user/favorites` — favorites CRUD
- `GET /api/user/favorites/check/:stationId` — check if favorited
- `POST/GET /api/recently-played` — recently played
- `POST /api/auth/google` — Google idToken verification
- `POST /api/auth/mobile/login` — email/password login
