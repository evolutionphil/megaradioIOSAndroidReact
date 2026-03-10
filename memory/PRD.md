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
- Push Notifications, Internationalization (i18n)
- Geolocation-based country detection
- Grid/List view modes, Genre browsing
- Social login (Google/Apple) via POST-based mobile auth flow

## Recent Changes (March 2026)

### Logo System Overhaul (Current Session)
**Centralized all station logo handling** across the entire app to follow the official Logo/Favicon Kullanım Rehberi:

**Priority order (enforced in all screens):**
1. `logoAssets.webp256` (S3, optimized) — requires `status === 'completed'`
2. `localImagePath` (legacy server file)
3. `favicon` (external URL, HTTP→proxy for iOS ATS)
4. Placeholder (local asset or default URL)

**Files updated to use centralized `stationLogoHelper.ts`:**
- `src/utils/stationLogoHelper.ts` — REWRITTEN with full algorithm
- `src/utils/logoUtils.ts` — Now delegates to stationLogoHelper
- `app/(tabs)/favorites.tsx` — Replaced inline getLogoUrl
- `app/(tabs)/records.tsx` — Replaced inline getLogoUrl
- `app/(tabs)/index.tsx` — Already used logoUtils (now delegates)
- `app/all-stations.tsx` — Already used stationLogoHelper
- `app/genre-detail.tsx` — Already used stationLogoHelper
- `app/nearby-stations.tsx` — Replaced inline getLogoUrl
- `app/search.tsx` — Replaced inline stationToResult logo logic
- `app/player.tsx` — Replaced inline getLogoUrl (uses 'large' size)
- `app/user-profile.tsx` — Replaced inline s.logo || s.favicon
- `src/components/CarModeScreen.tsx` — Replaced inline getLogoUrl
- `src/components/CastModal.tsx` — Replaced inline getLogoUrl
- `src/components/NativeCastButton.tsx` — Replaced inline getStationLogoUrl
- `src/components/NativeCastModal.tsx` — Replaced inline favicon logic
- `src/components/MiniPlayer.tsx` — Already used stationLogoHelper
- `src/services/carPlayService.ts` — Replaced 2 inline functions (getStationImageSync, getArtworkUrl)

**Key features of new centralized helper:**
- HTTP URLs auto-proxied through `https://themegaradio.com/api/image/{base64}`
- Handles both full URLs and filename-only webp256 data
- Protocol-relative URLs (`//`) handled
- `localImagePath` support added
- `status === 'completed'` check enforced per documentation

### Previous Session Fixes
- Social Login (Google/Apple) fixed for POST-based flow
- CarPlay cold start improved with staggered retries
- iOS Ads: Production AdMob IDs + ATT consent flow added
- Genre detail: Fixed country parameter (countryEnglish vs native name)
- Browse Genres: Changed to Discoverable Genres below "Stations Near You"

## Prioritized Backlog

### P1 (High)
- Integrate Apple Watch / Wear OS targets into builds
- CarPlay CPNowPlayingTemplate enrichment
- Audio quality selection feature

### P2 (Medium)
- Equalizer (EQ) with presets
- Enhanced Bluetooth metadata (AVRCP)
- Station alarm feature

### P3 (Low)
- tvOS / Android TV apps
- Song recognition (ShazamKit)

## Key Files
- `src/utils/stationLogoHelper.ts` — **SINGLE SOURCE OF TRUTH for logo URLs**
- `src/services/authService.ts` — Social login endpoints
- `src/services/socialAuthService.ts` — SDK integration
- `src/components/CarPlayHandler.tsx` — CarPlay cold start fix
- `ios/MegaRadio/CarPlaySceneDelegate.swift` — Swift cold start retries
- `src/services/adMobService.native.ts` — AdMob + ATT consent
- `app.json` — Production AdMob App IDs
- `docs/MOBILE_AUTH_INTEGRATION_GUIDE.md` — Auth documentation

## Notes
- User communicates in Turkish
- No client-side caching - React Query handles freshness
- All logo display must go through `stationLogoHelper.ts`
- HTTP favicon URLs must be proxied for iOS ATS compliance
