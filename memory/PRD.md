# MegaRadio - Product Requirements Document

## Original Problem Statement
Implement In-App Purchase (IAP) Premium Strategy (2-tier: Remove Ads & Premium) for MegaRadio mobile app. Includes UI gating, Apple compliance, Premium banner, Google Login fix, CarPlay fixes, and App Store Review compliance.

## Tech Stack
- Frontend: React Native (Expo Bare Workflow)
- Routing: Expo Router (file-based)
- State: Zustand (authStore, premiumStore, songHistoryStore)
- Data: React Query (useQueries.ts)
- API: Axios → themegaradio.com (external backend)
- Monetization: Google AdMob + react-native-iap (v14)
- Auth: Email/password + Google Sign-In (expo-auth-session) + Apple Sign-In

## Completed Features
- [x] Premium Gating UI in player.tsx (blur text, lock Spotify/YT, HD badge)
- [x] AdMob lock-screen bypass fix (track skips in service.js)
- [x] HD Stream URL selection based on Premium status
- [x] 7-Day Free Trial UI in PremiumPaywall.tsx
- [x] Apple-compliant Account Deletion in profile.tsx
- [x] T&C links fix in Paywall (setTimeout before route)
- [x] IAP Product ID alignment (megaradio_premium_monthly1, etc.)
- [x] "Watch Ad" button hidden for Premium users
- [x] React Query retry logic for genres/stations
- [x] Signup payload fix (fullName, dynamic username)
- [x] Premium Banner on Home & Discover (SVG-matched design) - Feb 2026
- [x] Google Login fix - Backend updated to accept iOS/Android audience + Frontend retry logic - Feb 2026
- [x] Xcode 16.4 fmt consteval fix - Podfile pre-install patch for fmt 12.1.0 - Mar 2026
- [x] CarPlay Zuletzt gespielt: GridTemplate → ListTemplate for logo support - Mar 2026
- [x] CarPlay Genres: Removed misleading global count - Mar 2026
- [x] Apple Guideline 3.1.2(c) fix: Privacy Policy link in Paywall + fallback Terms/Privacy content - Mar 2026
- [x] Android Auto carContext cold-start crash fix - Native CarPlayModule.kt patch + JS guards - Mar 2026
- [x] Android 15 ForegroundServiceStartNotAllowedException fix - MusicService.kt try-catch + mediaPlayback type - Mar 2026
- [x] AdMob config plugin (withAdMobFix.js) - Hardcoded ID, runs after google-mobile-ads plugin - Mar 2026
- [x] TrackPlayer foregroundServiceType config plugin (withTrackPlayerServiceFix.js) - Mar 2026
- [x] withAndroidAutoFull.js package name fix - com.visiongo.megaradio → com.megaradio - Mar 2026

## Key Files
- frontend/app/(tabs)/index.tsx - Home page + Premium Banner
- frontend/app/(tabs)/discover.tsx - Discover page + Premium Banner
- frontend/app/(tabs)/profile.tsx - Account deletion, Premium section
- frontend/app/player.tsx - Premium UI gating
- frontend/app/static-page.tsx - Terms & Privacy pages with fallback content
- frontend/src/components/PremiumPaywall.tsx - Paywall with trial UI, Terms & Privacy links
- frontend/src/services/authService.ts - Auth methods
- frontend/src/services/socialAuthService.ts - Google/Apple Sign-In (retry logic)
- frontend/src/services/iapService.ts - IAP Product IDs
- frontend/src/services/carPlayService.ts - CarPlay templates (ListTemplate for recent)
- frontend/src/hooks/useQueries.ts - Data fetching with retry
- frontend/service.js - Background lock screen logic
- frontend/ios/Podfile - fmt 12.1.0 patch for Xcode 16.4+

## Key API Endpoints (External - themegaradio.com)
- POST /api/auth/google - Google Sign-In (idToken verification, now accepts iOS/Android audience)
- POST /api/auth/mobile/login - Email login
- POST /api/auth/signup - Registration
- DELETE /api/user/delete-account - Apple-compliant account deletion
- GET /api/app/pages - Static pages (terms, privacy, about)

## App Store Connect Requirements (User Action)
- Privacy Policy URL: https://themegaradio.com/privacy
- EULA/Terms: https://themegaradio.com/terms or Apple standard EULA
- App Review Notes: mention Terms/Privacy link locations in app

## Backlog / Future Tasks
- P1: watchOS companion app (Now Playing, Favorites, Recent)
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) enhancement
- P3: Station alarm feature
- P3: tvOS and Android TV apps
- P3: App Store promotional images (1024x1024)
