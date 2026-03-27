# MegaRadio - Product Requirements Document

## Original Problem Statement
Production-ready mobile radio streaming app called "MegaRadio" using React Native Expo (Bare Workflow). The app requires:
- Fully functional CarPlay and Android Auto integration
- Background/lock screen audio controls
- WatchOS companion app
- Wear OS companion app
- Native Chromecast/AirPlay streaming
- Google AdMob monetization

## Architecture
- **Frontend**: React Native (Expo Bare Workflow)
- **State Management**: Zustand (playerStore.ts, locationStore.ts, recentlyPlayedStore.ts)
- **iOS Native**: Custom Swift modules (ATTModule.swift, WatchConnectivityBridge.swift, AppDelegate.swift)
- **Android Native**: Custom Kotlin modules for Android Auto + Wear OS
- **WatchOS**: Native Swift App via WCSession
- **Wear OS**: Kotlin Compose app via Data Layer API
- **Background Audio**: react-native-track-player (AudioProvider.tsx)
- **Build Patching**: patch-package for third-party fixes

## Completed Features
- [x] CarPlay CPNowPlayingTemplate with "Add to Favorites" and "Up Next" buttons
- [x] Full Wear OS Integration (17 native Kotlin files, Data Layer communication)
- [x] Android Build System Hardening (Kotlin 2.0+ compatibility)
- [x] react-native-carplay patch for Kotlin compatibility
- [x] **Android Build Fix - Package Name Mismatch** (Feb 2026): Fixed Wear OS `applicationId` from `com.megaradio.wear` to `com.megaradio` to match main app, resolving `:app:handleReleaseMicroApk` failure
- [x] **Wear OS Warnings Cleanup** (Feb 2026): Fixed `optString(key, null)` type mismatch warnings in WearDataRepository.kt, updated deprecated icon imports in Screens.kt

## Build Status
- **Android**: ✅ BUILDING SUCCESSFULLY (AAB uploaded to Google Play Console)
- **iOS**: Not tested in this session

## Pending / In Progress
- None currently blocking

## Completed Recently (Feb 2026)
- [x] **AdMob Reward-Free Fallback Fix**: Fixed critical bug where automatic rewarded ad fallbacks (both app-open and station-change) were incorrectly granting 30 minutes of ad-free time. Added `isManualRewardedAd` flag system. Now ONLY the manual "Watch Ad" button on the profile page grants ad-free time.
- [x] **isAdFree() consistency fix**: Fixed `showAppOpenAd()` to use `isAdFree()` instead of broken `new Date(stringTimestamp)` comparison.
- [x] **onStationChange grantAdFreeTime removal**: Removed `grantAdFreeTime(30)` from the automatic rewarded fallback in `onStationChange()`.

## AdMob Flow (Correct Behavior)
1. **First launch**: App Open ad → if no-fill, rewarded fallback shown → NO 30-min grant → Station change counter NOT incremented
2. **Every 3 station changes** (after first play): Interstitial → if no-fill, rewarded fallback → NO 30-min grant
3. **Manual "Watch Ad" button (Profile page)**: Rewarded ad → if completed → 30 min ad-free granted
4. **During ad-free time**: No ads shown at all
5. **Session counter**: Counter resets to 0 at each app launch (not persisted across sessions)
6. **First station play**: Only app open ad, station counter not incremented (avoids double-ad on first 3 stations)

## Upcoming Tasks (P2)
- ShazamKit integration (song recognition)
- Equalizer (EQ) with presets
- Bluetooth metadata support (AVRCP)

## Future Tasks (P3)
- Station alarm feature
- tvOS and Android TV apps

## Key Files
- `frontend/patches/@g4rb4g3+react-native-carplay+2.7.22.patch`
- `frontend/android/app/build.gradle`
- `frontend/watch/android/wear/build.gradle.kts`
- `frontend/watch/android/wear/src/main/java/com/visiongo/megaradio/wear/`
- `frontend/src/providers/AudioProvider.tsx`

## 3rd Party Integrations
- Google AdMob
- React Native Track Player
- React Native CarPlay (@g4rb4g3/react-native-carplay)
- React Native Google Cast
- React AirPlay

## Notes
- User communicates in Turkish
- Uses EAS Build for Android
- patch-package is used for react-native-carplay fixes
