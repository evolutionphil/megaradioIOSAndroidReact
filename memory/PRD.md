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
- User profiles and social features
- Genre browsing, Recently played history
- CarPlay + Android Auto integration
- WatchOS companion app target
- AdMob (Interstitial + Rewarded Interstitial)
- Background refresh, silent push, i18n

### Bug Fixes - Feb 2026 Session 1
1. **AdMob/ATT Never Initializing** - `splashHidden` state was never declared → AdMob never started
2. **Recently Played Logos Missing** - Wrong import (stationLogoHelper vs logoUtils)
3. **Home Screen Users Empty** - `initialData` + `staleTime` prevented API refetch
4. **CarPlay Blank Screen** - 3 mutex bugs in `createRootTemplate()`
5. **WatchOS Companion Not Detected** - iOS app never activated WCSession
6. **Background Tasks** - Missing `BGTaskSchedulerPermittedIdentifiers` in Info.plist

### Bug Fixes - Feb 2026 Session 2
7. **Lock Screen Metadata Revert** - service.js changed station but never synced Zustand store → ICY metadata handler used old station name. Fixed by syncing playerStore directly in service.js.
8. **Rewarded Ad Cancel → Stuck Loading** - showRewardedAd() promise never resolved when user cancelled. Added CLOSED event listener with resolved flag.
9. **Interstitial Frequency** - Changed from every 4 to every 3 station changes.
10. **First Launch Interstitial** - Added 5s delay after AdMob init to show interstitial on first launch.
11. **AppDelegate WCSession Conflict** - Removed duplicate WCSessionDelegateHandler, now uses WatchConnectivityHandler.shared.

## Pending Verification (User TestFlight)
- All fixes need TestFlight build and verification

## WatchOS Setup Guide (Xcode)
1. Create Watch target → watchOS → App → "MegaRadioWatch"
2. Delete auto-generated files, add files from `watch/ios/MegaRadioWatch/`
3. Add WatchConnectivity bridge files (3) to iOS target from `watch/ios/`
4. Set Bundle ID: `com.visiongo.megaradio.watchkitapp`
5. Remove Info.plist from "Copy Bundle Resources" if auto-added

## Upcoming Tasks
- P1: Enhance CarPlay CPNowPlayingTemplate
- P2: Verify WatchOS on physical devices

## Future/Backlog
- ShazamKit song recognition
- Equalizer (EQ) with presets
- Bluetooth metadata (AVRCP) support
- Station alarm feature
- tvOS / Android TV apps

## Key Files
- `app/_layout.tsx` - Root layout with AdMob/ATT init
- `service.js` - Background playback service with lock screen controls
- `src/services/adMobService.native.ts` - AdMob service
- `src/providers/AudioProvider.tsx` - Audio provider with ICY metadata handling
- `src/store/playerStore.ts` - Zustand player state store
- `src/services/carPlayService.ts` - CarPlay JS service
- `ios/MegaRadio/AppDelegate.swift` - App delegate with WCSession
- `watch/ios/MegaRadioWatch/` - Watch app source files
- `watch/ios/` - WatchConnectivity bridge files for iOS target
