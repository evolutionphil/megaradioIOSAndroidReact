# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow). The app requires fully functional CarPlay and Android Auto integration, background/lock screen audio controls, a WatchOS companion app, Wear OS companion app, and Google AdMob monetization.

## Architecture
- **Frontend**: React Native (Expo Bare Workflow)
- **State**: Zustand (playerStore, locationStore, recentlyPlayedStore), React Query
- **Audio**: react-native-track-player (background headless JS)
- **iOS Native**: PhoneSceneDelegate, CarPlaySceneDelegate, ATTModule.swift
- **Android Native**: WearDataLayerListenerService (Wear OS), WearDataLayerModule (RN Bridge)
- **WatchOS**: Native Swift App + WCSession connectivity
- **Wear OS**: Jetpack Compose app + Wearable Data Layer API
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
- **CarPlay CPNowPlayingTemplate (Enhanced)** - Favorite toggle button, More options button, Up Next support
- **Wear OS Full Integration (Feb 2026)** - Complete A-to-Z implementation

## Wear OS Integration (Feb 2026) - COMPLETE
### Watch Side (com.visiongo.megaradio.wear)
- `WearableListenerService.kt` - Background data/message receiver
- `WearDataRepository.kt` - Singleton StateFlow repository for all data
- `PhoneConnectivityService.kt` - Send commands to phone via MessageClient
- `WearViewModel.kt` - ViewModel bridging PhoneConnectivityService and UI
- `MegaRadioWearApp.kt` - Navigation with SwipeDismissableNavHost
- `Screens.kt` - Complete UI: Splash, Home, Genres, Countries, Stations, Favorites, NowPlaying
- `Theme.kt` - MegaRadio brand colors (AccentPink, BackgroundBlack, SurfaceDark)
- `Models.kt` - Station, Genre, Country data classes
- `build.gradle.kts` - Wear Compose 1.3.0, Play Services Wearable 18.1.0
- `AndroidManifest.xml` - Service declarations, watch feature, permissions

### Phone Side (com.megaradio)
- `WearDataLayerListenerService.kt` - Receives commands from watch via MessageClient
- `WearDataLayerModule.kt` - React Native native module bridge (DataClient + MessageClient)
- `WearDataLayerPackage.kt` - Package registrar in MainApplication

### React Native Integration
- `wearOSService.ts` - TypeScript service for Android Wear OS communication
- `AudioProvider.tsx` - Unified watch command handler (iOS + Android)

### Project Configuration
- `settings.gradle` - Wear module included as ':wear'
- `app/build.gradle` - play-services-wearable + wearApp dependency

### Communication Architecture
Data flow (Phone → Watch): DataClient (putDataItem)
- /megaradio/stations, /megaradio/favorites, /megaradio/genres
- /megaradio/countries, /megaradio/now_playing

Commands (Watch → Phone): MessageClient (sendMessage)
- /megaradio/command/play, /pause, /resume, /next, /previous
- /megaradio/command/toggle_favorite, /request_data

Playback state: MessageClient
- /megaradio/playback_state

### Testing
- Static analysis: 100% (iteration_38 - all 17 files verified)
- Message path consistency: ALL_PATHS_MATCH (6 data + 7 command paths)
- Android 12+ compatibility: RECEIVER_NOT_EXPORTED flag present

## Pending (Device Testing Required)
- Wear OS actual device pairing and communication
- CarPlay NowPlayingTemplate buttons (native build)
- Chromecast actual casting (native build)
- AirPlay actual routing (native build)
- ATT prompt on fresh install (TestFlight)
- WatchOS connectivity (TestFlight)

## Upcoming Tasks
- P2: ShazamKit, EQ, Bluetooth AVRCP
- P3: Station alarm, tvOS/Android TV
