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
- Centralized logo system (stationLogoHelper.ts)
- iOS ATT consent + AdMob ads

## Recent Changes

### Session 3 Fixes (Feb 2026)

#### 1. Community User Profile Crash Fix - ROOT CAUSE (P0)
- **Root Cause**: `CACHE_TTL` was imported in `preloadService.ts` from `useQueries.ts` but NEVER EXPORTED. This caused `TypeError: Cannot read properties of undefined` when `getPreloadedFavorites()` was called for cached community users, leading to native crash.
- **Fix**: 
  - Added `CACHE_TTL` export to `useQueries.ts`
  - Added try-catch around `getPreloadedFavorites()` calls
  - Added `Array.isArray()` checks on API data
  - Used optional chaining for safer data access
  - Made `loadFollowerCounts` resilient with `.catch()` on each API call
  - Fixed `public-profiles.tsx` to pass `userAvatar` param when navigating
  - Used `??` (nullish coalescing) instead of `||` for profile count data
- **Files**: useQueries.ts, user-profile.tsx, public-profiles.tsx

#### 2. CarPlay Cold Start Fix - COMPREHENSIVE (P0)
- **Root Causes Identified**:
  1. `isCreatingTemplate` mutex blocked second `initialize` from refreshing templates
  2. `deferredPlayStation` only retried once (500ms), insufficient for cold start
  3. No forced template refresh when real `playStation` callback became available
  4. Missing import for `getCarPlayImagePath`
  5. `rootTabBarTemplate` variable referenced but never defined
  6. Genre loading had no fallback when country-specific query returned empty
- **Fixes Applied**:
  - Changed mutex to queuing system with `pendingCallbackRefresh` flag
  - deferredPlayStation now retries 10 times (5s total) for cold start
  - Force template refresh when playStation becomes available + CarPlay connected
  - Added missing `getCarPlayImagePath` import
  - Fixed undefined `rootTabBarTemplate` reference
  - Added global genre fallback when country-specific genres return empty
- **Files**: carPlayService.ts, CarPlayHandler.tsx

#### 3. TypeScript Type Fixes
- Updated `Station.logoAssets` type to include `webp256`, `webp48`, `status`, `original`, `processedAt` fields matching API response
- **Files**: types/index.ts

### Session 2 Fixes (March 2026)

#### Genre Stations Empty Page Fix
- Country name fallback in genreService.ts

#### Logo System Overhaul
- Centralized via stationLogoHelper.ts (16 files updated)

#### Social Login Fix
- POST-based mobile auth flow

#### iOS Ads Fix
- Production AdMob App IDs + ATT consent flow

## API Notes
- `/api/stations` - Supports ALL country formats
- `/api/genres/:slug/stations` - ONLY exact DB country name. Use fallback!
- `/api/auth/google` - POST with { idToken, platform: "mobile" }
- `/api/auth/apple` - POST with { identityToken, platform: "mobile" }
- `tv=1` param returns optimized data BUT includes `logoAssets` with `webp256`, `status`, `folder`

## Prioritized Backlog

### P0 (Critical) - VERIFICATION PENDING
- [ ] Verify CarPlay cold start fix with native build
- [ ] Verify user profile crash fix with native build  
- [ ] Verify social login (Google/Apple) end-to-end
- [ ] Verify iOS ads + ATT prompt
- [ ] Verify genre station loading across countries
- [ ] Verify follow/unfollow feature

### P1 (High)
- [ ] Apple Watch / Wear OS target integration
- [ ] CarPlay CPNowPlayingTemplate
- [ ] Audio quality selection

### P2 (Medium)
- [ ] Equalizer (EQ) presets
- [ ] Bluetooth metadata (AVRCP)
- [ ] Station alarm feature

### P3 (Low)
- [ ] tvOS / Android TV apps
- [ ] Song recognition (ShazamKit)

## Key Files
- `src/utils/stationLogoHelper.ts` - SINGLE SOURCE OF TRUTH for logo URLs
- `src/services/carPlayService.ts` - CarPlay template management + cold start logic
- `src/components/CarPlayHandler.tsx` - CarPlay data fetching + initialization
- `ios/MegaRadio/CarPlaySceneDelegate.swift` - Native CarPlay lifecycle
- `src/hooks/useQueries.ts` - React Query hooks + CACHE_TTL constants
- `src/services/preloadService.ts` - User favorites preloading
- `src/services/genreService.ts` - Genre stations with country fallback
- `src/services/authService.ts` - Social login endpoints
- `app/user-profile.tsx` - Community user profile
- `src/services/adMobService.native.ts` - AdMob + ATT consent

## Notes
- User communicates in Turkish
- No client-side caching - React Query handles freshness
- HTTP favicon URLs must be proxied for iOS ATS
- Genre stations API needs both countryEnglish AND countryNative for fallback
- CarPlay cold start requires staggered retries + queued template refresh
