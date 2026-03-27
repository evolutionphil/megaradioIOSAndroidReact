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
- IAP Integration (StoreKit 2 + Google Play Billing) - Paywall UI ready, purchase logic needs react-native-iap

## Completed Recently (Feb 2026)
- [x] **AdMob Reward-Free Fallback Fix**: Fixed critical bug where automatic rewarded ad fallbacks were granting 30 min ad-free time. Added `isManualRewardedAd` flag. Only manual "Watch Ad" button grants ad-free time.
- [x] **isAdFree() consistency fix**: Fixed broken `new Date(stringTimestamp)` comparison.
- [x] **onStationChange grantAdFreeTime removal**: Removed `grantAdFreeTime(30)` from automatic rewarded fallback.
- [x] **Ad Frequency 3→5**: Changed INTERSTITIAL_FREQUENCY from 3 to 5.
- [x] **First Play Skip**: First station play no longer increments ad counter.
- [x] **Session Counter Reset**: Station change counter resets to 0 on each app launch.
- [x] **PremiumStore**: New Zustand store for premium/remove-ads status.
- [x] **PremiumPaywall**: New component with both "Premium" and "Remove Ads" paywall modes.
- [x] **SongHistoryStore**: New Zustand store for tracking played songs.
- [x] **Song History Page**: New page at `/song-history` from profile, with Spotify/YouTube deep links (premium-gated).
- [x] **Profile Premium Section**: Go Premium, Remove Ads, Watch Ad, Song History buttons.
- [x] **AdMob Premium Integration**: `isAdFree()` checks PremiumStore for permanent ad removal.
- [x] **Song History Recording**: AudioProvider records songs from API + ICY stream metadata.

## AdMob Flow (Correct Behavior)
1. **First launch**: App Open ad → if no-fill, rewarded fallback → NO 30-min grant → Counter NOT incremented
2. **Every 5 station changes** (after first play): Interstitial → if no-fill, rewarded fallback → NO 30-min grant
3. **Manual "Watch Ad" button (Profile)**: Rewarded ad → if completed → 30 min ad-free
4. **During ad-free time**: No ads shown
5. **Session counter**: Resets to 0 each app launch
6. **Premium/Remove Ads users**: No ads ever (checked via PremiumStore)

## Premium Monetization (2 Tiers)
### Tier 1: Remove Ads (€5.99/year)
- Remove all ads

### Tier 2: MegaRadio Premium (€3.99/mo · €29.99/yr · €59.99/lifetime)
- Remove all ads + Song Info + Spotify/YT Links + HD Stream + Song History

## Upcoming Tasks (P2)
- IAP Integration (react-native-iap for StoreKit 2 + Google Play Billing)
- HD Stream gate (URL bitrate selection based on premium status)
- Player song info premium gate (now playing visibility)
- Spotify/YouTube link buttons on player page (premium)
- ShazamKit integration (song recognition)
- Equalizer (EQ) with presets
- Bluetooth metadata support (AVRCP)

## Future Tasks (P3)
- Station alarm feature
- tvOS and Android TV apps
- Lock screen next/prev ad counter integration

## Key Files
- `frontend/patches/@g4rb4g3+react-native-carplay+2.7.22.patch`
- `frontend/android/app/build.gradle`
- `frontend/watch/android/wear/build.gradle.kts`
- `frontend/watch/android/wear/src/main/java/com/visiongo/megaradio/wear/`
- `frontend/src/providers/AudioProvider.tsx`
- `frontend/src/services/adMobService.native.ts`
- `frontend/src/store/premiumStore.ts`
- `frontend/src/store/songHistoryStore.ts`
- `frontend/src/components/PremiumPaywall.tsx`
- `frontend/app/song-history.tsx`
- `frontend/app/(tabs)/profile.tsx`

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
