# MegaRadio - Product Requirements Document

## Original Problem Statement
Radio streaming app with full monetization: AdMob (interstitial, rewarded) + In-App Purchases (2-tier premium system).

## Architecture
- **Frontend**: React Native (Expo Bare Workflow) with Expo Router
- **State Management**: Zustand (playerStore, locationStore, authStore, premiumStore, songHistoryStore)
- **Monetization**: Google AdMob (adMobService.native.ts) + IAP (iapService.ts wrapping react-native-iap v14)
- **Background Audio**: react-native-track-player (AudioProvider.tsx + service.js)
- **iOS/Android**: Native modules for CarPlay, WearOS, Bluetooth

## 2-Tier Premium Strategy
### Tier 1: Remove Ads (€5.99/year)
- Removes all interstitial and banner ads

### Tier 2: Premium (€3.99/mo, €29.99/yr, €59.99/lifetime)
- Remove Ads included
- Song Info (Now Playing metadata)
- Spotify/YouTube deep links
- HD Streaming (320kbps)
- Song History
- **7-Day Free Trial** on Monthly plan (configured via App Store Connect / Google Play Console)

## Completed Features

### AdMob Fixes
- [x] Automatic fallback ads no longer grant 30-min ad-free rewards
- [x] Fixed double-ad issue on initial app launch
- [x] Changed interstitial frequency from 3 to 5 station changes

### IAP Infrastructure
- [x] Created premiumStore.ts and songHistoryStore.ts
- [x] Created PremiumPaywall.tsx (premium + remove_ads modes)
- [x] Created song-history.tsx screen
- [x] Installed react-native-iap@14.7.19
- [x] Configured iOS Entitlements and Android Manifest
- [x] Created iapService.ts (StoreKit 2 + Google Play Billing)
- [x] Updated AudioProvider.tsx for song history metadata push
- [x] Rewrote Profile screen with premium navigation
- [x] Created IAP_SETUP_GUIDE.md
- [x] Generated 55-char App Store metadata for 4 IAP tiers

### Premium Feature Gating (2026-03-27)
- [x] P0: Player Premium Gating UI (player.tsx)
  - Song info blurred/hidden for free users with lock icon
  - "Premium" badge on locked song info
  - Spotify/YouTube deep link buttons locked for free users
  - HD badge only shown for premium users
  - "Go Premium" banner in player for free users
  - PremiumPaywall modal integrated in player
- [x] P1: Lock Screen Next/Prev AdMob Counter (service.js)
  - AsyncStorage counter sync on RemoteNext/Prev/JumpForward/JumpBackward
  - adMobService syncs from AsyncStorage before incrementing
- [x] P2: HD Stream Quality Gating (AudioProvider.tsx)
  - Premium users get highest quality stream URL
  - Free users get standard quality URL
- [x] Guest Profile Premium Buttons
  - Go Premium and Remove Ads added to guest profile view

### Apple Policy Compliance (2026-03-28)
- [x] 7-Day Free Trial badge + "Start Free Trial" CTA on Monthly plan
- [x] Trial info text: "7 days free, then auto-renews at €3.99/month. Cancel anytime."
- [x] Delete Account button + confirmation modal (profile.tsx)
  - "Type 'delete' to confirm" safety mechanism
  - API endpoint added: DELETE /api/user/delete-account
  - **REQUIRES BACKEND IMPLEMENTATION** (see BACKEND_DELETE_ACCOUNT_API.md)
- [x] Terms & Conditions links fixed in PremiumPaywall (both paywall modes)
  - Now navigates to /static-page?type=terms
- [x] Test account credentials created (review@themegaradio.com)
- [x] App Privacy Labels guide created (APP_PRIVACY_LABELS_GUIDE.md)

## Key Files
- `frontend/src/services/iapService.ts` - Core IAP logic
- `frontend/src/components/PremiumPaywall.tsx` - Subscription/purchase UI
- `frontend/src/store/premiumStore.ts` - Premium state
- `frontend/src/store/songHistoryStore.ts` - Song history state
- `frontend/src/providers/AudioProvider.tsx` - Audio + HD gating
- `frontend/app/player.tsx` - Player with premium UI gating
- `frontend/service.js` - Background task + AdMob counter sync
- `frontend/src/services/adMobService.native.ts` - AdMob with counter sync
- `frontend/app/(tabs)/profile.tsx` - Profile with premium nav + delete account
- `frontend/src/constants/api.ts` - API endpoints (including deleteAccount)

## Documentation Created
- `frontend/IAP_SETUP_GUIDE.md` - App Store Connect / Play Console IAP setup
- `frontend/BACKEND_DELETE_ACCOUNT_API.md` - Backend developer instructions for delete account API
- `frontend/APP_PRIVACY_LABELS_GUIDE.md` - Step-by-step App Privacy Labels guide (Almanca arayüz)

## Backlog
- P2: ShazamKit integration (song recognition)
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) enhancement
- P3: Station alarm feature
- P3: tvOS and Android TV apps
- P3: Premium feature images (1024x1024) for App Store/Play Console

## Backend Developer Action Required
- **DELETE /api/user/delete-account** endpoint must be implemented on themegaradio.com
- See `BACKEND_DELETE_ACCOUNT_API.md` for full specification
- Without this endpoint, Apple will REJECT the app

## Test Account for Apple Review
- Email: review@themegaradio.com
- Password: MegaReview2026!
- Must be created on production backend
