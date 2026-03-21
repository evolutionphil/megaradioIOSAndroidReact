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

## What's Been Implemented

### Core Features (DONE)
- Full radio streaming with background audio
- Station discovery, search, favorites
- User profiles and social features (follow/unfollow)
- Genre browsing
- Recently played history
- CarPlay integration (native Swift delegates)
- Android Auto integration
- WatchOS companion app target
- AdMob (Interstitial + Rewarded Interstitial)
- Background refresh and silent push notifications
- i18n localization

### Bug Fixes - Feb 2026 Session
1. **AdMob/ATT Never Initializing** - `splashHidden` state was never declared in `_layout.tsx`, causing AdMob useEffect to never execute. Fixed by adding state variable and trigger.
2. **Recently Played Logos Missing** - `records.tsx` imported from `stationLogoHelper` (returns null) instead of `logoUtils` (always returns URL). Fixed import.
3. **Home Screen Users/Favorites Empty** - React Query `initialData` + `staleTime: 30min` prevented API refetch when cache had empty data. Changed to `placeholderData` + `refetchOnMount: 'always'`.
4. **CarPlay Blank Screen (3 mutex bugs)** - `isCreatingTemplate` mutex was never released in early-return and fallback paths, permanently blocking template creation. Fixed all return paths + added watchdog retry.
5. **WatchOS Companion App Not Detected** - iOS app never activated WCSession. Added WatchConnectivity import, delegate, and activation in AppDelegate.swift.
6. **Background Tasks Registration Failed** - Info.plist missing `BGTaskSchedulerPermittedIdentifiers` and `processing` background mode. Added both.

## Pending Verification (User TestFlight)
- All 6 fixes above need TestFlight verification
- Code review and API testing passed (iteration_31)

## Upcoming Tasks
- P1: Enhance CarPlay CPNowPlayingTemplate
- P2: Verify WatchOS connection on physical devices
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) support
- P3: Station alarm feature
- P3: tvOS and Android TV apps

## Key Files
- `/app/frontend/app/_layout.tsx` - Root layout with AdMob init
- `/app/frontend/app/(tabs)/records.tsx` - Recently played screen
- `/app/frontend/src/hooks/useQueries.ts` - React Query hooks
- `/app/frontend/src/services/carPlayService.ts` - CarPlay JS service
- `/app/frontend/src/services/adMobService.native.ts` - AdMob service
- `/app/frontend/ios/MegaRadio/AppDelegate.swift` - App delegate with WCSession
- `/app/frontend/ios/MegaRadio/CarPlaySceneDelegate.swift` - CarPlay native delegate
- `/app/frontend/ios/MegaRadio/Info.plist` - iOS configuration
