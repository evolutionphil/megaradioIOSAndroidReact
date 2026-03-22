# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow) with:
- CarPlay and Android Auto integration
- Audio streaming with background/lock screen controls
- WatchOS companion app
- AdMob integration (Interstitial and Rewarded ads)

## Tech Stack
- **Frontend**: Expo Bare Workflow (React Native 0.81.5), React Query, Zustand, React Native Track Player
- **iOS Native**: Custom PhoneSceneDelegate and CarPlaySceneDelegate (Swift)
- **Ad System**: react-native-google-mobile-ads v14.2.0
- **Storage**: MMKV (via react-native-nitro-modules)
- **Backend**: FastAPI + MongoDB (hosted at themegaradio.com)

## Ad Unit IDs
- iOS Interstitial: ca-app-pub-8771434485570434/6008042825
- iOS App Open Interstitial: ca-app-pub-8771434485570434/4798357761
- iOS Rewarded: ca-app-pub-8771434485570434/3488497756

## What's Been Implemented

### Core Features (DONE)
- Full radio streaming with background audio
- Station discovery, search, favorites
- User profiles and social features
- Genre browsing, Recently played history
- CarPlay + Android Auto integration
- WatchOS companion app target
- AdMob (Interstitial + Rewarded Interstitial + App Open Interstitial)
- Background refresh, silent push, i18n
- Splash screen with MegaRadio branding (dark background)

### Bug Fixes - Session 1
1. AdMob/ATT splashHidden not declared
2. Recently Played logos wrong import
3. Home Screen Users empty (React Query caching)
4. CarPlay blank screen (3 mutex bugs)
5. WatchOS companion not detected (no WCSession)
6. Background tasks missing from Info.plist

### Bug Fixes - Session 2
7. Lock screen metadata revert (service.js Zustand sync)
8. Rewarded ad cancel stuck loading (CLOSED listener)
9. Interstitial frequency changed to 3
10. First launch interstitial with app open ad unit
11. AppDelegate WCSession conflict resolved

### New Features - Session 2
12. App Open Interstitial ad type (ca-app-pub-8771434485570434/4798357761)
13. Splash screen with full MegaRadio branding image
14. Background color updated to #1A1A1A

## Pending Verification
- All fixes need TestFlight build

## Key Files
- `app/_layout.tsx` - Root layout with AdMob/ATT init
- `service.js` - Background playback service
- `src/services/adMobService.native.ts` - AdMob service with 3 ad types
- `src/providers/AudioProvider.tsx` - Audio provider
- `src/store/playerStore.ts` - Zustand state
- `src/services/carPlayService.ts` - CarPlay
- `ios/MegaRadio/AppDelegate.swift` - App delegate
- `ios/MegaRadio/SplashScreen.storyboard` - Splash screen
- `ios/MegaRadio/Images.xcassets/SplashScreenLogo.imageset/` - Splash images

## Upcoming Tasks
- P1: CarPlay CPNowPlayingTemplate
- P2: WatchOS physical device test
- P2: ShazamKit, EQ, Bluetooth AVRCP
- P3: Station alarm, tvOS/Android TV
