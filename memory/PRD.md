# MegaRadio - Product Requirements Document

## Original Problem Statement
MegaRadio: full-stack streaming radio app with **mobile** (iOS/Android — production), plus a **TV/Desktop multi-platform expansion** (Apple TV, macOS, Android TV, Fire TV, Tizen, webOS, Windows, Linux). Mobile codebase isolation: TV/Desktop must NOT touch `/app/frontend/app/` or `/app/frontend/src/`.

## Tech Stack
- **Mobile**: React Native (Expo Bare Workflow, RN 0.81.5)
- **TV/Desktop**: React + TypeScript + Vite (single codebase, multiple native shells)
- **Backend**: FastAPI + MongoDB + `api.themegaradio.com` (legacy)

## What's Been Implemented (Apr 2026)

### TV/Desktop Faz 1A — Apple TV + macOS web preview ✅
- Pixel-perfect 1:1 with Tizen/webOS source
- All 12+ pages working: Splash, Login, 4 Onboarding guides, Discover, Genres, GenreList, Search, Favorites, Country select, Settings, RadioPlaying

### TV/Desktop Faz 2 — Cross-platform reuse ✅
- **Android TV / Google TV / Fire TV**: same web bundle via symlink (zero divergence)
- Native Kotlin/Compose shell pattern documented + KeyEvent bridge spec

### TV/Desktop Faz 3 — Desktop ✅
- Electron wrapper with `globalShortcut`, menu bar, multi-platform builds
- **Auto-update** via `electron-updater` (GitHub Releases, 6h check)

### Premium System ✅ (Apr 30)
- **`PremiumPaywall.tsx`** — pixel-exact match for both designs (Premium 3-tier + Remove Ads single-tier)
- Hero images bundled: `paywall-hero-pink.jpg` + `paywall-hero-yellow.jpg`
- **`PaywallContext`** — `usePaywall().showPaywall('premium' | 'remove_ads')` from anywhere
- **`usePremium`** hook — localStorage-backed state with `applyPurchase`, auto-expire
- **Native bridge** (`window.megaRadioNative.purchase` + `mr-iap-completed` postMessage)
- **Cross-platform IAP IDs** = identical to mobile:
  - `megaradio_premium_monthly1` / `megaradio_premium_yearly` / `megaradio_premium_lifetime` / `megaradio_remove_ads_yearly1`
- Routes: `#/premium`, `#/remove-ads`

### Equalizer ✅ (Apr 30)
- 10-band EQ via Web Audio API (BiquadFilterNode chain)
- 10 presets: Flat, Rock, Pop, Jazz, Classical, Dance, Bass Boost, Treble Boost, Vocal, News/Talk
- Vertical sliders, persists to localStorage `eq_state_v1`
- Route: `#/equalizer`

### Continue Listening ✅ (Apr 30)
- `recentlyPlayedStore` + `ContinueListeningSection` (6 cards)
- Component ready to drop into Discover; emits `mr:recently-played-changed` events
- Source: hooks into existing TV audio player on `play` event

### Backend additions ✅
- `/api/tv-app/*` — static mount for the Vite build (Mounted under /api/* for ingress routing)
- `/api/tv-proxy/*` — server-side passthrough (bypasses Cloudflare bot-detection)

### Documentation for backend dev ✅
- `/app/frontend/tvanddesktop/_design-spec/BACKEND_DEV_TASKS.md` — 6 items including IAP receipt validation endpoint spec, StackPath logo fix, station metadata 404

## Mobile (unchanged — DO NOT TOUCH)
Premium UI gating, CarPlay/Android Auto, Firebase Analytics, AdMob, IAP, Google Sign-In, etc. — all remain in `/app/frontend/app/` + `/app/frontend/src/`.

## Known Issues
- **iOS Push Notifications BLOCKED** on Apple Developer Portal maintenance (P1 — external)
- Sandbox IAP yearly + lifetime products not yet "Ready to Submit" in App Store Connect (P1 — user action)
- StackPath CDN 404 on Pal Station logo (P3 — backend dev)
- Station metadata 404 (P2 — backend dev)

## Pending Verification (USER ACTION)
- Build tvOS + macOS app in Xcode 16+ (`apple-tv-and-macos/ios-tvos/MegaRadioTVApp.swift`)
- Build Android TV APK in Android Studio (Leanback Activity + WebView)
- Build Electron Desktop (`cd desktop && yarn build:linux/win/mac`)
- Universal Purchase setup in App Store Connect (`com.visiongo.megaradio` shared bundle)

## Future/Backlog
- P2: Top Shelf widget (Apple TV) — needs SwiftUI + Top Shelf extension target
- P2: Voice search (Siri tvOS, Google Assistant Android TV)
- P2: ShazamKit integration (iOS only)
- P3: WatchOS companion (blocked on Xcode cycle fix)
- P3: Hisense Vidaa TWA build

## Build Instructions
```bash
# TV web preview
cd /app/frontend/tvanddesktop/apple-tv-and-macos/web-preview
yarn install && yarn build      # Outputs to /app/backend/static/tv-preview

# Desktop (Electron)
cd /app/frontend/tvanddesktop/desktop
yarn install
yarn build:linux                # AppImage + .deb
yarn build:win                  # NSIS + portable
yarn build:mac                  # DMG (needs Apple Dev ID)
```

## Preview URLs
- Mobile (Expo Web): `{REACT_APP_BACKEND_URL}/`
- TV/Desktop preview: `{REACT_APP_BACKEND_URL}/api/tv-app/`

## Verified Routes
| Route | Status |
|---|---|
| `#/` Splash | ✅ |
| `#/login` (TV code) | ✅ |
| `#/discover-no-user` | ✅ |
| `#/genres` | ✅ |
| `#/country-select` | ✅ |
| `#/settings` | ✅ |
| `#/equalizer` | ✅ |
| `#/premium` (3-tier paywall) | ✅ |
| `#/remove-ads` (yearly paywall) | ✅ |
