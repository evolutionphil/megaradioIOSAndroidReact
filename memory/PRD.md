# MegaRadio - Product Requirements Document

## Original Problem Statement
Implement In-App Purchase (IAP) Premium Strategy for MegaRadio app. The app has heavily evolved to include UI gating for Premium features, Apple App Store compliance, CarPlay/Android Auto integration, Firebase Analytics/Crashlytics, deep debugging of Android build/runtime crashes, iOS build issues, and (Apr 2026) the **Apple TV / macOS / Android TV / Fire TV / Desktop multi-platform expansion**.

## Tech Stack
- **Mobile Frontend**: React Native (Expo Bare Workflow, SDK 54, RN 0.81.5)
- **TV / Desktop Frontend**: React + TypeScript + Vite (1:1 with production Tizen / webOS bundle)
- **Routing (mobile)**: Expo Router · **Routing (TV)**: wouter w/ hash routing
- **State**: Zustand (mobile) · React Query + Context (TV)
- **Backend**: FastAPI + MongoDB

## What's Been Implemented

### Multi-Platform TV/Desktop Expansion (Apr 2026 — DONE)
- **Apple TV + macOS** (Faz 1A): Pixel-perfect web preview at `/api/tv-app/`
  - Full React+Vite codebase ported from Tizen/webOS (`/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview`)
  - All 12+ pages working: Splash, Login, Onboarding (4 guides), Discover, Genres, GenreList, Search, Favorites, Country select, Settings, RadioPlaying
  - Sidebar (120×100 px tile, exact match), 7-column station grid, virtual keyboard, Ubuntu font, brand pink `#FF4199`, 1920×1080 reference frame
  - SwiftUI WKWebView shim authored at `/ios-tvos/MegaRadioTVApp.swift` (build on Mac with Xcode 16+)
- **Android TV / Google TV / Fire TV** (Faz 2): Same web bundle via symlink (`/app/frontend/tvanddesktop/android-tv/web-preview`)
  - Native Kotlin/Compose shell pattern documented; Leanback launcher manifest + KeyEvent bridge for color buttons
- **Desktop (Win/Linux/Mac)** (Faz 3): Electron wrapper (`/app/frontend/tvanddesktop/desktop/`)
  - Main process with global media keys, menu bar (File/Audio/View/Help), Cmd+P play/pause shortcuts
  - electron-builder configs for AppImage / .deb / NSIS / portable exe / DMG
- **Backend additions**:
  - `/api/tv-app/*` static mount serving the Vite build
  - `/api/tv-proxy/{path}` server-side proxy bypasses Cloudflare bot-detection on headless previews

### Mobile Core (DONE — pre-existing)
- Premium UI gating, CarPlay/Android Auto, Firebase Analytics/Crashlytics, AdMob (App Open / Interstitial / Rewarded / Banner), IAP, Google Sign-In, ICY metadata client-side, Backend sync (favorites / recently-played / subscription)

## Known Issues
- iOS Push Notifications BLOCKED on Apple Developer Portal maintenance (P1)
- Sandbox IAP products: only `megaradio_premium_monthly1` returns; yearly + lifetime missing in App Store Connect (P1)
- StackPath CDN 404 on Pal Station logo (P3)

## Pending Verification
- TV/Desktop native builds (require Xcode + Android Studio + macOS — must be built locally)
- iOS Universal Purchase setup with new tvOS/macOS bundle IDs
- App Store Connect TV declaration

## Future/Backlog
- P2: Top Shelf widget (Apple TV)
- P2: Voice search (Siri / Google Assistant)
- P2: ShazamKit song recognition
- P2: Equalizer (EQ) presets
- P2: Mini-player floating window (macOS / Desktop)
- P3: Watch app companion (blocked on Xcode cycle fix verification)

## Build Instructions
```bash
# Mobile (unchanged)
cd /app/frontend && yarn install && npx expo prebuild --platform ios --clean

# TV web preview
cd /app/frontend/tvanddesktop/apple-tv-and-macos/web-preview
yarn install && yarn build   # Outputs to /app/backend/static/tv-preview

# Desktop (Electron)
cd /app/frontend/tvanddesktop/desktop && yarn install && yarn build:linux
```

## Preview URLs
- Mobile: `https://music-premium-fix.preview.emergentagent.com/` (Expo Web)
- TV Web Preview: `https://music-premium-fix.preview.emergentagent.com/api/tv-app/`

## API Endpoints (TV/Desktop)
- `https://api.themegaradio.com/api/*` — Direct (production native builds)
- `{REACT_APP_BACKEND_URL}/api/tv-proxy/*` — Preview-only proxy

## Verified TV Routes
| Route | Status |
|---|---|
| `#/` Splash | ✅ |
| `#/login` (TV code) | ✅ |
| `#/discover-no-user` | ✅ |
| `#/genres` | ✅ |
| `#/country-select` | ✅ |
| `#/settings` | ✅ |
| `#/favorites` | ✅ |
| `#/search` | ✅ |
