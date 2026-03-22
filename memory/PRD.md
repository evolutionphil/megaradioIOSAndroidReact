# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow). The app requires fully functional CarPlay and Android Auto integration, background/lock screen audio controls, a WatchOS companion app, and Google AdMob monetization.

## Architecture
- **Frontend**: React Native (Expo Bare Workflow)
- **State**: Zustand (playerStore, locationStore, recentlyPlayedStore), React Query
- **Audio**: react-native-track-player (background headless JS)
- **iOS Native**: PhoneSceneDelegate, CarPlaySceneDelegate, ATTModule.swift
- **Android Native**: MegaRadioAutoService (Android Auto), SilentPushService (FCM), BackgroundSyncWorker
- **WatchOS**: Native Swift App + WCSession connectivity
- **Ads**: Google AdMob (AppOpenAd, Interstitial, Rewarded)
- **Casting**: react-native-google-cast (Chromecast), react-airplay (AirPlay)
- **Backend API**: themegaradio.com (external)

## Completed Features
- Background audio streaming with lock screen controls
- CarPlay + Android Auto integration
- Native Splash Screen (iOS + Android)
- Google AdMob (AppOpen + Interstitial + Rewarded)
- Chromecast + AirPlay casting
- WatchOS companion app (NowPlaying, Favorites, Browse, Genres, Countries)
- ATT prompt with lifecycle-aware timing
- GPS/Manual country detection with persistence

## Android Build Readiness (Mar 2026)
### Issues Found & Fixed by Testing Agent
- **VoiceCommandHandler.kt DELETED** - unused dead code with compilation errors (referenced non-existent methods in MegaRadioAutoService). MegaRadioAutoService already has complete MediaSessionCallback inner class.
- **notification_icon.xml CREATED** - was missing, referenced by AndroidManifest
- **splashscreen_logo.xml CREATED** - was missing, referenced by styles.xml
- **WorkManager dependency ADDED** - work-runtime-ktx:2.9.1 (BackgroundSyncWorker.kt)
- **Media compat dependency ADDED** - androidx.media:media:1.7.0 (MegaRadioAutoService.kt)
- **Firebase Messaging dependency ADDED** - firebase-bom:33.7.0 (SilentPushService.kt)
- **Android 12+ registerReceiver FIXED** - RECEIVER_NOT_EXPORTED flag added
- **ProGuard rules ADDED** - Google Cast, Firebase, Media, WorkManager, OkHttp

### Verified Correct (8/8 Kotlin files pass)
- MainApplication.kt, MainActivity.kt, AndroidAutoModule.kt, AndroidAutoPackage.kt
- MegaRadioAutoService.kt (721 lines), MegaRadioApiClient.kt (617 lines)
- BackgroundSyncWorker.kt, SilentPushService.kt

## Pending (Device Testing Required)
- Chromecast actual casting (native build)
- AirPlay actual routing (native build)
- ATT prompt on fresh install (TestFlight)
- WatchOS connectivity (TestFlight)

## Upcoming Tasks
- P1: CarPlay CPNowPlayingTemplate
- P2: ShazamKit, EQ, Bluetooth AVRCP
- P3: Station alarm, tvOS/Android TV
