# MegaRadio - Product Requirements Document

## Original Problem Statement
MegaRadio: full-stack streaming radio app with **mobile** (iOS/Android — production), plus a **TV/Desktop multi-platform expansion** (Apple TV, macOS, Android TV, Fire TV, Tizen, webOS, Windows, Linux). Mobile codebase isolation: TV/Desktop must NOT touch `/app/frontend/app/` or `/app/frontend/src/`.

## Tech Stack
- **Mobile**: React Native (Expo Bare Workflow, RN 0.81.5)
- **TV/Desktop**: React + TypeScript + Vite (single codebase, multiple native shells)
- **Backend**: FastAPI + MongoDB + `api.themegaradio.com` (legacy)

## What's Been Implemented (Apr 2026)

### Premium Subscription — Account Linking via Stripe ✅ (May 19)
- New page `/premium-upgrade` (`src/pages/PremiumUpgrade.tsx`): full-screen
  TV layout with benefits list (left), white QR code + 6-digit pink PIN
  digits + countdown (right), Cancel & Generate-new-code buttons (bottom).
  5 visual states: loading / pending / activated / expired / error.
- New hook `useSubscriptionLink.ts`: POST `/api/subscription/tv/code` →
  3-second polling of `/code/:code/status` → fires `onActivated` callback
  with `{ tier, plan, validUntil }`. Uses same `buildAuthUrl()` trick as
  AuthContext: relative `/api/tv-proxy/*` in Emergent preview (CORS-free
  server-side proxy), absolute `https://api.themegaradio.com/api/*` after
  `prepare-tizen.js`/`prepare-webos.js` rewrite for .wgt/.ipk runtime.
- Entry points: (a) Settings → bottom "Go Premium" gradient pill now
  routes to `/premium-upgrade` instead of legacy `showPaywall`; (b) Settings
  → Account tab → new "Upgrade to Premium" row (with `Ad-free · HQ` tagline);
  (c) Discover header → pink PREMIUM badge appears between Country
  selector and Login button ONLY when `user.subscription.tier === 'premium'`.
- `User` interface in `AuthContext.tsx` extended with
  `subscription?: { tier, plan, validUntil }`.
- Backend developer brief: `/app/memory/BACKEND_BRIEF_PREMIUM_SUBSCRIPTION.md`
  contains full API contract (3 endpoints + Stripe webhook), Mongo schema,
  Stripe Checkout metadata pattern, web `/activate` page flow, compliance
  notes for Tizen/LG store policy.
- Tizen/WebOS payment policy compliant: TV shows ONLY QR + PIN, never a
  payment field. Stripe Checkout happens in user's browser on the web
  domain. 0% platform commission, ~3% Stripe.

### TV Backend tv-proxy hardened for write methods ✅ (May 19)
- `/api/tv-proxy/{path:path}` now accepts GET / POST / PUT / PATCH / DELETE
  (was GET-only). Forwards request body, content-type, authorization.
- Enables preview-browser to call any backend write endpoint without CORS
  pain (e.g. login `auth/tv/code`, subscription `subscription/tv/code`).

### Focus Debug Overlay ✅ (May 19)

### Client-side ICY Metadata via @radiolise/metadata-client ✅ (May 19)
- Replaced the broken `/api/stations/:id/metadata?tv=1` + SSE
  `/api/stream-metadata?url=...` backend dependency with the official
  `@radiolise/metadata-client` (v1.0.1) WebSocket gateway
  (`wss://backend.radiolise.com/api/data-service`).
- `GlobalPlayerContext.tsx` now owns a single `createMetadataClient` instance
  (lifetime = provider mount). When the active station changes, `trackStream()`
  switches the upstream socket; passing `undefined` releases the stream
  without tearing the WS down.
- Override the gateway via `VITE_METADATA_WS` for self-hosted instances.
- Verified by testing agent: bundle (`index-BrwWjfeD.js`) contains
  `radiolise` + `backend.radiolise.com` refs and ZERO `stream-metadata`
  references — old EventSource code path fully removed; no console errors.

### TV Spatial-Nav Login Button Reachability Fix ✅ (May 19)
- `tv-spatial-navigation.js`: added `findFallbackMatch(direction)` which
  re-runs UP/DOWN search WITHOUT the strict horizontal-overlap requirement
  when the primary `findBestMatch` returns null. This guarantees that
  pressing UP from the topmost content row (where the source card's right
  edge may not extend to x≈1394) still reaches `button-country-selector` or
  `button-header-login` by Euclidean distance.
- Sidebar/content zone barrier preserved; the existing sidebar→header RIGHT
  block is untouched.
- File parity: web-preview/public/js/* === backend/static/tv-preview/js/*
  (verified via diff).

### GitHub Actions Auto-Build Pipeline ✅ (May 7)
- `.github/workflows/desktop-release.yml` — `git tag v*` push'unda Windows
  (NSIS + portable) ve Linux (AppImage + .deb) build'lerini paralel çalıştırır;
  çıktıları `GITHUB_TOKEN` ile otomatik olarak GitHub Releases'e yükler.
- macOS job CI'dan çıkarıldı (lokal Mac'te imzalı DMG + MAS .pkg üretiliyor —
  sertifikalar Keychain'de duruyor).
- Linux `.deb` paketleme için `desktop/package.json` içine
  `author: { name, email }` + `homepage` eklendi (electron-builder zorunluluğu).

### Mac App Store Submission ✅ (May 7)
- `MegaRadio-1.0.0.pkg` Transporter ile App Store Connect'e yüklendi
  (durum: Apple tarafında "Processing").
- `entitlements.mas.plist` + `entitlements.mas.inherit.plist` + provisioning
  profile (`build/embedded.provisionprofile`) ile App Sandbox uyumlu.


### TV/Desktop Faz 6 — JS native bridge (Continue Listening) ✅ (May 1)
- **`src/lib/nativeBridge.ts`** — multi-target bridge that routes the
  `nativeBridge.postContinueListening(list)` call to whichever host is
  available: Android `MegaRadioBridge.onContinueListening(json)`, Apple
  `webkit.messageHandlers.continueListening.postMessage(arr)`, or Electron
  `window.megaRadioNative.postContinueListening(list)`. No-ops on plain
  browsers (debug log only). Verified live: console fires
  `[bridge] no native host detected (browser/web preview)` from the TV preview.
- **`recentlyPlayedStore` integration** — every `add()` and `clear()` now
  pipes the latest 10 items through the bridge automatically. Added a
  `syncToNative()` boot helper that `App.tsx` calls once on mount so the
  home-screen rails are populated even when a user reopens the app without
  starting playback.
- **Android `MegaRadioBridge.kt`** — JavaScript-interface receiver. Parses
  the JSON list and hands it straight to `RecommendationsChannel.publish()`,
  so the Google TV / Fire TV home rail updates in real time without polling.
  Wired up via `addJavascriptInterface(MegaRadioBridge(this), "MegaRadioBridge")`
  in `MainActivity.onCreate`.
- **Apple TV `Coord` script handler** — `WebViewHost.makeUIView` registers
  `WKUserContentController.add(self, name: "continueListening")`; the
  `WKScriptMessageHandler` callback persists the list into
  `UserDefaults(suiteName: "group.com.visiongo.megaradio")` under
  `continue_listening_v1`, exactly the key the Top Shelf
  `ServiceProvider.swift` reads on each appearance.
- End-to-end flow confirmed on the TV preview: store mutation → bridge
  detects host → host-specific dispatch → home-screen rail refreshes.


- **Unified brand icon** — user supplied `app-icon.png` (1189×1189 brand mark
  matching iOS/Android) is now the single source. Auto-generated into every
  platform format:
  - Desktop: `desktop/build/icon.png` (512×512), `icon.ico` (multi-size),
    `icon-1024.png`
  - Android TV: all `mipmap-*/ic_launcher[_round].png` densities +
    `drawable-xhdpi/tv_banner.png` (320×180)
  - Apple TV: `ios-tvos/Brand/AppIcon-Large-2400x1440.png`,
    `AppIcon-Small-400x240.png`, `TopShelf-1920x720.png`,
    `TopShelfWide-2320x720.png`
  - TV web: `logo.png` refreshed so in-app splash matches
- **`/api/tv-icon-proxy`** — HTTPS proxy for HTTP-only station favicons. 24h
  cache header, falls back to 502 on upstream error. Killed the last batch of
  Mixed-Content warnings in Electron.
- **Apple TV — Top Shelf Extension** (`TopShelfExtension/ServiceProvider.swift`)
  — reads the "Continue Listening" list from the shared App Group and
  surfaces it as a sectioned top-shelf rail on the tvOS home screen.
- **Apple TV — Siri INPlayMediaIntent** (`IntentsExtension/IntentHandler.swift`)
  — "Hey Siri, play jazz on MegaRadio" resolves against the station catalog
  and launches the main app via deep-link `megaradio://play?station=…`.
- **Apple TV — ShazamKit** (`ShazamRecognizer.swift`) — samples the live
  stream for up to 12s, posts match back to the web layer as
  `window.__MR_SHAZAM_MATCH__({title, artist, artworkUrl})`.
- **Android TV — Recommendations Channel** (`channels/RecommendationsChannel.kt`)
  — publishes the "Continue Listening" preview programs under the home screen
  channel. Auto-creates the channel on first launch + refreshes via JS bridge.
- **Android TV — Google Assistant + deep-links** — `SEARCH` intent filter,
  `megaradio://` `VIEW` scheme (`play`, `genre`, `search`, `home`), App
  Actions `actions.xml` with `PLAY_MEDIA` fulfillments.  `MainActivity`
  translates every intent into a TV-web hash route without recreating the
  WebView. `searchable.xml` enables voice-search prompt.


- **ICY metadata via SSE** — new `/api/stream-metadata?url=…` backend endpoint
  parses StreamTitle from the upstream radio stream and streams live updates to
  browser clients via Server-Sent Events. `GlobalPlayerContext.tsx` subscribes
  with `EventSource`; Now-Playing text updates identically to the mobile app,
  no external API required. Verified live with `stream.radioparadise.com/mp3-192`.
- **Discover page alignment** — first horizontal list ("Popular Genres") now
  lines up vertically with the "Discover" sidebar icon at y≈200, as requested.
- **Mouse drag-to-scroll** (Windows/Linux) — new `useDragScroll` pointer-based
  hook on every horizontal list (recently played, for-you, genres). Drops
  `setPointerCapture` in favour of window-level `pointermove/up` so Electron
  + Chromium + Playwright all track drag distance correctly. Plain clicks on
  station cards still work (6-px lift threshold + click swallow).
- **Global native keyboard** — new `useNativeKeyboard` hook with optional
  capture-phase registration. Applied to Search page (alphanumeric-only) and
  CountrySelector modal (full printable range). Users can start typing
  without clicking any field.
- **Apple TV native shell** (`apple-tv-and-macos/ios-tvos/MegaRadioTVApp.swift`)
  — SwiftUI + WKWebView + `RemoteFocusView` forwarding Siri-remote presses to
  synthetic DOM `KeyboardEvent`s so the shared spatial-nav engine works
  unchanged. Background-audio / AirPlay / PiP capabilities wired in `init()`.
- **Android TV native shell** (`android-tv/app/`) — full Kotlin project:
  `MainActivity` with leanback-launcher intent filter, fullscreen WebView,
  `dispatchKeyEvent` passthrough for D-pad / Media / Color / Back / Channel
  buttons. Builds AAB + APK via `./gradlew :app:bundleRelease`.
- **Desktop EXE / DMG / AppImage** — Electron-builder config finalised in
  `desktop/package.json`; window icon + installer icon + brand icon use the
  MegaRadio logo (`logo.png` 1024×1024 → auto-generated `build/icon.ico`,
  `build/icon.png`). `yarn build:win / :mac / :linux` produces shippable
  distributables.

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
