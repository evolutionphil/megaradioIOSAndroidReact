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
- **Backend API**: themegaradio.com (external)

## Completed Features
- Background audio streaming with lock screen controls
- CarPlay integration with templates
- Native Splash Screen
- Google AdMob (AppOpen + Interstitial + Rewarded)
- WCSession delegate conflict resolution, transferUserInfo fallback
- Rewarded Ad cancel-stuck fix
- Lock Screen metadata sync with Zustand

### WatchOS App
- NowPlayingView with custom SF Symbol icons (backward.end.fill, pause.fill, forward.end.fill)
- FavoritesView with station list
- Browse Tab (Kesfet) → Genres list + Countries list
- Genre → Genre stations (tap to play)
- Country → Country stations (tap to play)
- Next/Previous uses similar stations logic (same as Control Center)
- Precomputed genres (40+, country-specific)
- WCSession: transferUserInfo fallback + didReceiveUserInfo delegate

### Ads
- AppOpenAd (4798357761) on first launch after splash
- Rewarded Ad (3488497756) on first station click per session
- Interstitial every 3 station changes

### Bug Fixes (Mar 2026)
- **ATT Prompt**: Enhanced to check UIApplication.applicationState, wait for didBecomeActive, then request with delay. Native ATTModule.swift uses NotificationCenter observer for app activation.
- **GPS Location**: `isManuallySet` flag now persisted in AsyncStorage. GPS auto-detection runs on every launch UNLESS user explicitly chose country from picker. GPS-detected countries saved with `isManuallySet: false`.
- **RewardedAdButton**: Wrapped in section View for logged-in profile for consistent layout.
- **CarPlay Recently Played**: Fixed property name `.recentStations` → `.stations`. Store loaded early via `loadFromAPI()`.

## Pending (Needs TestFlight Verification)
- ATT prompt display on fresh install (improved but needs device testing)
- WatchOS connectivity (improved sendMessage fallback but needs Watch testing)

## Upcoming Tasks
- P1: Verify CarPlay CPNowPlayingTemplate behavior
- P2: ShazamKit integration
- P2: Equalizer (EQ) with presets
- P2: Bluetooth AVRCP metadata
- P3: Station alarm feature
- P3: tvOS / Android TV apps
