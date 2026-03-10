# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow) with CarPlay, Android Auto, Apple Watch, Wear OS, tvOS, and Android TV support.

## Tech Stack
- Expo (Bare Workflow), TypeScript, EAS Build, Expo Router
- State: Zustand, React Query, Axios
- Audio: `react-native-track-player`
- CarPlay: `@g4rb4g3/react-native-carplay`
- Auth: expo-auth-session (Google), expo-apple-authentication (Apple)
- Ads: react-native-google-mobile-ads v14.2.0
- API Key: `X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw`

## What's Been Implemented
- Full audio streaming with background/lock screen controls
- CarPlay & Android Auto integration
- Favorites, Recently Played, Profile features
- Push Notifications
- Internationalization (i18n)
- Geolocation-based country detection
- Grid/List view modes for stations
- Genre browsing with Popular Genres
- Social login (Google/Apple) via POST-based mobile auth flow

## Recent Changes (March 2026)

### Session 1: Caching & Data Loading Fixes
- Removed all client-side caching logic (staleTime: 0)
- Fixed data-loading race conditions
- Fixed country change auto-refresh
- Fixed grid layout on genre detail page
- Fixed geolocation on startup
- Changed "Browse Genres" to show Popular Genres

### Session 2: Social Login, CarPlay Cold Start, iOS Ads (Current)

#### Social Login Fix (P0) - COMPLETED
- Updated `authService.ts`: New `googleSignIn()` and `appleSignIn()` methods using `fetch()` directly
- Google: POST /api/auth/google with `{ idToken, email, name, googleId, platform: "mobile" }`
- Apple: POST /api/auth/apple with `{ identityToken, authorizationCode, fullName: {givenName, familyName}, email, user, platform: "mobile" }`
- Both endpoints verified working via cURL (proper JSON responses)
- Updated `socialAuthService.ts` to pass user info from SDK to backend
- Saved complete auth documentation to `/app/frontend/docs/MOBILE_AUTH_INTEGRATION_GUIDE.md`

#### CarPlay Cold Start Fix (P0) - COMPLETED
- **Root Cause**: `CarPlayHandler` waited for `playStation` from AudioProvider before initializing CarPlayService, causing 10+ second delay on cold start
- **Fix (JS side)**: CarPlayHandler now initializes CarPlayService IMMEDIATELY on mount with a deferred `playStation` callback. When the real `playStation` becomes available, it re-initializes with the real callback.
- **Fix (Swift side)**: Changed from single 5s retry to staggered retries at 3s, 6s, 10s, 15s intervals for more reliable connection on cold start
- Templates now appear with real data much faster, even before audio playback is ready

#### iOS Ads Fix (P1) - COMPLETED
- **Root Cause 1**: `app.json` had TEST AdMob App IDs (`ca-app-pub-3940256099942544`) instead of production IDs
- **Root Cause 2**: No ATT (App Tracking Transparency) consent request - required on iOS 14+
- **Fix**: Updated `app.json` with production AdMob App IDs:
  - iOS: `ca-app-pub-8771434485570434~4044224468`
  - Android: `ca-app-pub-8771434485570434~7427742767`
- Added `userTrackingPermission` message in Turkish
- Added ATT consent flow in `adMobService.native.ts` initialization

#### Image Loading Consistency Fix (P1) - COMPLETED
- Standardized all screens to use centralized `stationLogoHelper.ts`
- Removed duplicate inline `getLogoUrl` functions from `all-stations.tsx` and `genre-detail.tsx`
- Removed `status === 'completed'` check from `logoUtils.ts` (was skipping valid logos)

#### Genre Detail JSX Fix - COMPLETED
- Fixed missing ternary closing bracket causing TypeScript error

## Prioritized Backlog

### P0 (Critical)
- All P0 items completed ✓

### P1 (High)
- Integrate Apple Watch / Wear OS targets into main iOS/Android builds
- Implement CarPlay CPNowPlayingTemplate
- Audio quality selection feature

### P2 (Medium)
- Equalizer (EQ) with presets
- Enhanced Bluetooth metadata (AVRCP)
- Station alarm feature

### P3 (Low)
- tvOS / Android TV apps
- Song recognition (ShazamKit)

## Key Files
- `frontend/src/services/authService.ts` - Social login endpoints
- `frontend/src/services/socialAuthService.ts` - SDK integration
- `frontend/src/components/CarPlayHandler.tsx` - CarPlay cold start fix
- `frontend/ios/MegaRadio/CarPlaySceneDelegate.swift` - Swift cold start retries
- `frontend/src/services/adMobService.native.ts` - AdMob + ATT consent
- `frontend/app.json` - Production AdMob App IDs
- `frontend/src/utils/stationLogoHelper.ts` - Centralized logo URL helper
- `frontend/src/utils/logoUtils.ts` - Legacy logo helper (updated)
- `frontend/docs/MOBILE_AUTH_INTEGRATION_GUIDE.md` - Auth documentation

## Notes
- User communicates in Turkish (İletişimi Türkçe sürdürün)
- No client-side caching - React Query handles all data freshness
- Web preview has AsyncStorage limitations - test on native builds
- Pre-existing TypeScript errors in castStore.ts, favoritesStore.ts, playerStore.ts (non-blocking)
