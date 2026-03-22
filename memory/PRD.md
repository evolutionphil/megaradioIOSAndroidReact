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
- Google AdMob integration (AppOpen + Interstitial + Rewarded)
- WCSession delegate conflict resolution
- Rewarded Ad cancel-stuck fix
- Lock Screen metadata sync with Zustand

### WatchOS App
- NowPlayingView with custom playback icons (backward.end.fill, pause.fill, forward.end.fill)
- FavoritesView with station list
- WCSession connectivity with transferUserInfo fallback
- Next/Previous uses similar stations logic (same as Control Center)
- Browse Tab (Kesfet) with Genres and Countries
- Genre list → tap genre → Genre stations (play on tap)
- Country list → tap country → Country stations (play on tap)
- Precomputed genres (40+, country-specific)
- Better connection status display

### Ads (Mar 2026)
- AppOpenAd (4798357761) shown on first launch after splash
- Rewarded Ad (3488497756) shown on first station click per session
- Interstitial shown every 3 station changes
- Ad-free time granted after watching rewarded ad

### CarPlay Fixes (Mar 2026)
- Recently Played fixed: wrong property name `.recentStations` → `.stations`
- Early store initialization for CarPlay cold start

## Pending Issues
- P1: ATT prompt not showing on fresh TestFlight install (recurring)
- P1: WatchOS connectivity still needs TestFlight verification
- P2: GPS location skipped after manual country set
- P2: Rewarded Ad button hidden for logged-in users
- Note: Genre station counts from API are global (not country-specific) - server-side limitation

## Upcoming Tasks
- P1: Verify CarPlay CPNowPlayingTemplate
- P2: ShazamKit integration
- P2: Equalizer (EQ) with presets
- P2: Bluetooth AVRCP metadata
- P3: Station alarm feature
- P3: tvOS / Android TV apps
