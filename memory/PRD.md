# MegaRadio - Product Requirements Document

## Original Problem Statement
Implement In-App Purchase (IAP) Premium Strategy (2-tier: Remove Ads & Premium) for MegaRadio mobile app. Includes UI gating, Apple compliance, Premium banner, and Google Login fix.

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

## Key Files
- frontend/app/(tabs)/index.tsx - Home page + Premium Banner
- frontend/app/(tabs)/discover.tsx - Discover page + Premium Banner
- frontend/app/(tabs)/profile.tsx - Account deletion, Premium section
- frontend/app/player.tsx - Premium UI gating
- frontend/src/components/PremiumPaywall.tsx - Paywall with trial UI
- frontend/src/services/authService.ts - Auth methods
- frontend/src/services/socialAuthService.ts - Google/Apple Sign-In
- frontend/src/services/iapService.ts - IAP Product IDs
- frontend/src/hooks/useQueries.ts - Data fetching with retry
- frontend/service.js - Background lock screen logic

## Key API Endpoints (External - themegaradio.com)
- POST /api/auth/google - Google Sign-In (idToken verification)
- POST /api/auth/mobile/login - Email login
- POST /api/auth/signup - Registration
- DELETE /api/user/delete-account - Apple-compliant account deletion

## Backlog / Future Tasks
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) enhancement
- P3: Station alarm feature
- P3: tvOS and Android TV apps
- P3: App Store promotional images (1024x1024)
