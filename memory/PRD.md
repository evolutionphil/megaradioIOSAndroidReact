# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow). The app requires fully functional CarPlay and Android Auto integration, background/lock screen audio controls, a WatchOS companion app, and Google AdMob monetization.

## Architecture
- **Frontend**: React Native (Expo Bare Workflow)
- **State**: Zustand (playerStore, locationStore, recentlyPlayedStore), React Query
- **Audio**: react-native-track-player (background headless JS)
- **iOS Native**: PhoneSceneDelegate, CarPlaySceneDelegate, ATTModule.swift
- **WatchOS**: Native Swift App + WCSession connectivity
- **Ads**: Google AdMob (AppOpenAd, Interstitial, Rewarded)
- **Casting**: react-native-google-cast (Chromecast), react-airplay (AirPlay)
- **Backend API**: themegaradio.com (external)

## Completed Features
- Background audio streaming with lock screen controls
- CarPlay + Android Auto integration
- Native Splash Screen
- Google AdMob (AppOpen + Interstitial + Rewarded)
- WCSession Watch connectivity with transferUserInfo fallback

### Chromecast + AirPlay Casting (Mar 2026)
- **react-native-google-cast v4.9.1** installed and configured
- **react-airplay v1.2.0** installed for native iOS AirPlay
- iOS: GoogleCast SDK initialized in AppDelegate.swift (auto-discovery enabled)
- Android: play-services-cast-framework + GoogleCastOptionsProvider configured
- NativeCastModal: Full Chromecast section (connected/connecting/disconnected states)
- NativeCastButton: Native CastButton from Google Cast SDK, AirPlay fallback on iOS
- Auto-cast: When device connects, audio stream starts automatically
- loadMedia: Sends correct metadata (title, artist, logo, contentType, streamType:live)
- Player bottom cast button now opens NativeCastModal (native) instead of old API-based CastModal

### WatchOS App
- NowPlayingView (backward.end.fill, pause.fill, forward.end.fill icons)
- FavoritesView, Browse Tab (Genres + Countries)
- Genre/Country → stations → tap to play
- Next/Previous uses similar stations logic

### Bug Fixes
- ATT prompt: AppState lifecycle + didBecomeActive notification observer
- GPS location: isManuallySet persisted in AsyncStorage
- CarPlay Recently Played: Fixed property name bug
- RewardedAdButton: Section wrapper for logged-in profile

## Pending (Needs Device Testing)
- Chromecast actual device casting (native build required)
- AirPlay actual device routing (native build required)
- ATT prompt display on fresh install (TestFlight)
- WatchOS connectivity (TestFlight)

## Upcoming Tasks
- P1: Verify CarPlay CPNowPlayingTemplate
- P2: ShazamKit integration
- P2: Equalizer (EQ) with presets
- P2: Bluetooth AVRCP metadata
- P3: Station alarm feature
- P3: tvOS / Android TV apps
