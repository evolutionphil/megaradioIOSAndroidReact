# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow). The app requires fully functional CarPlay and Android Auto integration, background/lock screen audio controls, a WatchOS companion app, and Google AdMob monetization.

## Architecture
- **Frontend**: React Native (Expo Bare Workflow)
- **State**: Zustand (playerStore, locationStore), React Query
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

### WatchOS App (Feb 2026)
- NowPlayingView with playback controls
- FavoritesView with station list
- WCSession connectivity with transferUserInfo fallback

### WatchOS Enhancements (Mar 2026)
- **Next/Previous** now uses similar stations logic (same as Control Center)
- **Precomputed Genres** - country-specific genres (40+) instead of 3 global
- **Genre Detail** - NavigationLink on genres + GenreStationsView (tap to play)
- **Browse Tab** with "Genres" and "Countries" sections
- **Countries Feature** - Full country list with flags, NavigationLink to country stations
- **Country Stations** - Play any station from selected country
- **Improved WCSession** - transferUserInfo fallback + didReceiveUserInfo delegate
- **Better Connection Status** - "iPhone baglantisi yok" (red) vs "iPhone arka planda" (orange)

## Pending Issues
- P0: WatchOS "No iPhone connection" (recurring - needs TestFlight verification)
- P0: AppOpenAd (4798357761) first launch implementation
- P0: Rewarded Ad (3488497756) on first station click
- P1: ATT prompt not showing on fresh TestFlight install
- P1: CarPlay UI sync bugs (Recently Played, Genres counts)
- P2: GPS location skipped after manual country set
- P2: Rewarded Ad button hidden for logged-in users

## Upcoming Tasks
- P1: Verify CarPlay CPNowPlayingTemplate
- P2: ShazamKit integration
- P2: Equalizer (EQ) with presets
- P2: Bluetooth AVRCP metadata
- P3: Station alarm feature
- P3: tvOS / Android TV apps
