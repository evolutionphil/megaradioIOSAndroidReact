# MegaRadio - Product Requirements Document

## Original Problem Statement
Build a production-ready mobile radio streaming app called "MegaRadio" using Expo (Bare Workflow) with CarPlay, Android Auto, Apple Watch, Wear OS, tvOS, and Android TV support.

## Tech Stack
- Expo (Bare Workflow), TypeScript, EAS Build, Expo Router
- State: Zustand, React Query, Axios
- Audio: react-native-track-player
- CarPlay: @g4rb4g3/react-native-carplay
- Auth: expo-auth-session (Google), expo-apple-authentication (Apple)
- Ads: react-native-google-mobile-ads v14.2.0
- API Key: X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw

## What's Been Implemented
- Full audio streaming with background/lock screen controls
- CarPlay & Android Auto integration
- Favorites, Recently Played, Profile features
- Push Notifications, Internationalization (i18n)
- Geolocation-based country detection
- Grid/List view modes, Genre browsing
- Social login (Google/Apple) via POST-based mobile auth flow

## Recent Changes (March 2026)

### Current Session Fixes

#### 1. Genre Stations Empty Page Fix (P0)
- **Root Cause**: Genre stations API `/api/genres/:slug/stations` does direct DB match for country field. DB stores inconsistent names: "Türkiye" (not "Turkey"), "Austria" (not "Österreich")
- **Fix**: Added automatic country name fallback in `genreService.getGenreStations()`. Tries `countryEnglish` first, if 0 results retries with `country` (native name)
- **Files**: genreService.ts, useQueries.ts (useGenreStations hook), genre-detail.tsx

#### 2. Community User Profile Crash Fix (P0)
- **Root Cause**: SIGABRT crash from RCTImageView dealloc chain + JS fatal error. Caused by:
  - `Image source={{ uri: undefined/null }}` passed to native iOS Image component
  - Malformed avatar URLs (e.g., "https://themegaradio.comnull")
  - Deep FlatList rendering causing too many Image components simultaneously
- **Fix**:
  - `renderStation` now validates logo URI, never passes undefined/null
  - Avatar URL safely constructed with null/empty string checks
  - FlatList performance: initialNumToRender=8, maxToRenderPerBatch=5, removeClippedSubviews=true
  - `handlePlayStation` prevents empty URL from reaching TrackPlayer
  - `keyExtractor` null-safe with fallback
- **Files**: user-profile.tsx

#### 3. Logo System Overhaul (P1) - Previous
- Centralized all station logo handling per official Logo/Favicon Rehberi
- 16 files updated to use `stationLogoHelper.ts`
- HTTP favicon URLs auto-proxied for iOS ATS

#### 4. Social Login Fix (P0) - Previous
- Updated for POST-based mobile auth flow

#### 5. CarPlay Cold Start Fix - Previous
- Staggered retries (3s, 6s, 10s, 15s)

#### 6. iOS Ads Fix - Previous
- Production AdMob App IDs + ATT consent flow

## API Notes
- `/api/stations` - Supports ALL country formats (Turkey, TR, TUR, Türkiye)
- `/api/genres/:slug/stations` - ONLY supports exact DB country name. Use fallback logic!
- `/api/auth/google` - POST with { idToken, platform: "mobile" }
- `/api/auth/apple` - POST with { identityToken, platform: "mobile" }

## Prioritized Backlog

### P1 (High)
- Apple Watch / Wear OS target integration
- CarPlay CPNowPlayingTemplate
- Audio quality selection

### P2 (Medium)
- Equalizer (EQ) presets
- Bluetooth metadata (AVRCP)
- Station alarm feature

### P3 (Low)
- tvOS / Android TV apps
- Song recognition (ShazamKit)

## Key Files
- `src/utils/stationLogoHelper.ts` - SINGLE SOURCE OF TRUTH for logo URLs
- `src/services/genreService.ts` - Genre stations with country fallback
- `src/services/authService.ts` - Social login endpoints
- `app/user-profile.tsx` - Community user profile (crash fixed)
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - Swift cold start retries
- `src/services/adMobService.native.ts` - AdMob + ATT consent

## Notes
- User communicates in Turkish
- No client-side caching - React Query handles freshness
- HTTP favicon URLs must be proxied for iOS ATS
- Genre stations API needs both countryEnglish AND countryNative for fallback
