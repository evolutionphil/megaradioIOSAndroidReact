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
- **7-Day Free Trial** on Monthly plan

## IAP Product IDs (App Store Connect)
- `megaradio_remove_ads_yearly1` — Remove Ads Yearly
- `megaradio_premium_monthly1` — Premium Monthly (with 7-day trial)
- `megaradio_premium_yearly` — Premium Yearly
- `megaradio_premium_lifetime` — Premium Lifetime

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

### Premium Feature Gating (2026-03-27)
- [x] Player Premium Gating UI (player.tsx) — song info blurred, Spotify/YT locked, HD badge conditional
- [x] Lock Screen Next/Prev AdMob Counter (service.js + adMobService sync)
- [x] HD Stream Quality Gating (AudioProvider.tsx)
- [x] Guest Profile Premium Buttons

### Apple Policy Compliance (2026-03-28)
- [x] 7-Day Free Trial badge + "Start Free Trial" CTA
- [x] Delete Account button + modal + backend API integration (E2E tested)
- [x] Terms & Conditions links fixed in PremiumPaywall
- [x] App Privacy Labels guide created

### Bug Fixes (2026-03-28)
- [x] **IAP SKU fix**: `megaradio_remove_ads_yearly` → `megaradio_remove_ads_yearly1`, `megaradio_premium_monthly` → `megaradio_premium_monthly1`
- [x] **Signup fix**: `name` → `fullName` + auto-generated `username` from email
- [x] **Profile layout**: Premium section moved to top (above Settings)
- [x] **Delete Account redirect**: Now goes to Discover page after account deletion

## Key Files
- `frontend/src/services/iapService.ts` - Core IAP logic + Product IDs
- `frontend/src/components/PremiumPaywall.tsx` - Subscription/purchase UI
- `frontend/src/store/premiumStore.ts` - Premium state
- `frontend/src/providers/AudioProvider.tsx` - Audio + HD gating
- `frontend/app/player.tsx` - Player with premium UI gating
- `frontend/service.js` - Background task + AdMob counter sync
- `frontend/src/services/adMobService.native.ts` - AdMob with counter sync
- `frontend/app/(tabs)/profile.tsx` - Profile with premium on top
- `frontend/src/services/authService.ts` - Auth with fixed signup fields

## Backlog
- P2: ShazamKit integration (song recognition)
- P2: Equalizer (EQ) with presets
- P2: Bluetooth metadata (AVRCP) enhancement
- P3: Station alarm feature
- P3: tvOS and Android TV apps
