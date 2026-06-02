# MegaRadio - Product Requirements Document

## Original Problem Statement
MegaRadio: full-stack streaming radio app with **mobile** (iOS/Android — production), plus a **TV/Desktop multi-platform expansion** (Apple TV, macOS, Android TV, Fire TV, Tizen, webOS, Windows, Linux). Mobile codebase isolation: TV/Desktop must NOT touch `/app/frontend/app/` or `/app/frontend/src/`.

## Tech Stack
- **Mobile**: React Native (Expo Bare Workflow, RN 0.81.5)
- **TV/Desktop Web Core**: React + TypeScript + Vite (single codebase, multiple native shells)
- **Apple TV**: Native SwiftUI (no React Native — WKWebView is unsupported on tvOS)
- **Desktop**: Electron (Windows/macOS/Linux)
- **Android TV**: Kotlin shell + same web preview
- **Backend**: FastAPI + MongoDB + `api.themegaradio.com` (legacy)

## What's Been Implemented (Latest: Feb 2026 fork)

### 🎯 Apple TV — 1:1 Web Parity Rewrite (Feb 2026, session 2)
**Status: PAGES REWRITTEN — awaiting user local Xcode build verification.**

#### ✅ Completed this session
- **ROOT CAUSE FIX — invisible icons/images:** Sidebar SVG icons used `fill="var(--fill-0, white)"`; the SVG→PNG converter (cairosvg) can't parse CSS `var()` and fell back to **black**, making icons invisible on the dark bg. New `scripts/convert_icons.py` resolves `var(--*, fallback)` → fallback colour and re-renders all icons at 256px preserving aspect ratio. All sidebar icons now white; `path-8` logo stays pink. This fixes the cross-cutting "icons missing/wrong" complaint on every page.
- **CountrySelect** (`CountrySelect.swift`) — full rewrite mirroring `CountrySelector.tsx`: left search bar + scrollable flag list (flagcdn), right on-screen keyboard (13 layouts) + language dropdown + hint row. New `CountryCatalog.swift` (fetches `/api/countries`, name→ISO map, flag URLs).
- **Settings** (`Settings.swift`) — full rewrite mirroring `Settings.tsx`: 7-category master list (Language/Keyboard/Playback/Timer/Accessibility/Account/Cast) + dynamic options panel + Go Premium gradient button + version block. New `SettingsStore.swift` persists selections.
- **Search** (`Search.swift`) — full rewrite mirroring `Search.tsx`: search bar + results list (h:110 rows, highlighted match) + shared keyboard + "Recently Played" 2×4 grid. Removed wrong country/login header.
- **Genres** (`Genres.swift`) — full rewrite mirroring `Genres.tsx`: hero bg + "Popular Genres" (2×4) and "All" (4-col) translucent cards with name + station count + now-playing equalizer pill. (Removed old colourful gradient tiles — those were never in the web design.)
- **Sidebar** (`Views.swift`) — added missing 7th "Help" item (SF Symbol) for full parity; header flag pill now renders a real flag image from ISO code instead of an emoji string.
- **Shared component** `TVKeyboard.swift` — `KbLayout`, `kbLayouts`, `kbFlagURL`, `KeyButton`, `FlagThumb` extracted so Country + Search stay identical.
- **project.yml** — registered `CountryCatalog.swift`, `SettingsStore.swift`, `TVKeyboard.swift`. User MUST run `yarn tvos:setup`.

> ⚠️ Native tvOS cannot be compiled/tested in the Emergent Linux container (no Xcode/swiftc). Verification is done by the user on a local Mac (build + screenshot). Code was self-reviewed against the React source for correctness.

#### Build/verify steps for user
```
cd frontend/tvanddesktop/apple-tv-and-macos/ios-tvos
yarn tvos:setup            # required: project.yml changed + 3 new files
# Xcode: delete old app from simulator → Shift+Cmd+K (Clean) → Cmd+R (Run)
```

### 🎯 Apple TV Native SwiftUI — earlier foundation (Feb 2026, session 1)
**Status: PARTIAL** — Foundation built, 1:1 web-parity rewrites in progress.

#### ✅ Completed in this session
- **Build infrastructure:** `xcodegen` + `yarn tvos:setup` regenerates project from `project.yml`.
- **Static Info.plist** (`ios-tvos/Info.plist`) — guarantees ATS `NSAllowsArbitraryLoads` + UIAppFonts + UIBackgroundModes survive every regen. project.yml `info.properties` was removed.
- **Ubuntu font family bundled** in `Assets/Fonts/` (Light/Regular/Medium/Bold).
- **All web SVG/PNG assets converted** (cairosvg → PNG) into `Assets/Images/`. `BrandImage("name")` resolves with 4 fallback paths + NSLock cache.
- **TVRouter.swift** — wouter-clone routing with 11 routes (`Route: Equatable, Hashable`).
- **Root env objects injected** in `MegaRadioTVApp.swift`: AudioPlayer, AuthStore, FavoritesStore, CountryStore, TVRouter (crash fix done).
- **Focus halo killed** via `TVTransparentButtonStyle: PrimitiveButtonStyle` (focusable + focusEffectDisabled + onTapGesture).
- **AppSidebar** matches web `Sidebar.tsx`: 120×100 items, 108px pitch, pink %45 focus + 3px border + scale 1.04 (clearly distinct from active %18).
- **MegaRadioLogo** 1:1 swoosh + wordmark (mega-Bold + radio-Regular).
- **RadioPlaying.swift** 1:1 port of web `RadioPlaying.tsx` (1217 lines) — radial gradient bg, 296×296 white card artwork, pink eq bars, station name 48px, tag row (flag/bitrate/codec/country), 4 controls 90.192×90.192, similar+popular scroll.
- **StationCardLarge** matches web spec exactly: 200×264 card, rgba(255,255,255,0.14) bg, 132×132 inner white box (34,34), name centered top:187, tag centered top:218.2.

#### 🔴 Remaining 1:1 Pixel-Perfect Rewrites (in user's priority order)
User explicitly requested birer-birer rewrite in new session. Sequence:

1. **CountrySelect** — current looks "close" but user wants 1:1 with web's `CountrySelectPage.tsx`. Verify dark tile + flag + ISO code styling, header position, search bar exact size, "Choose a country" 56px font.
2. **Settings/Account** — Web `Settings.tsx` has MORE than just "Not signed in" + Sign In button. Verify: language switcher, sleep timer, audio quality, version info, sign-out flow when authenticated.
3. **Search** — Web `Search.tsx` has popular searches / recent / suggested genres BELOW the input. Currently SwiftUI only shows input + grid.
4. **Genres** — Web `Genres.tsx` uses specific per-genre background colors. Verify gradient palette + tile size + music-icon position.
5. **Discover** — Final polish: hero background blend, scroll sections (recently played + for-you when authenticated).
6. **RadioPlaying final pass** — verify all details vs `RadioPlaying.tsx` once user confirms baseline.

#### 📁 Files to focus on next session
- `/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/CountrySelect.swift`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Settings.swift`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Search.swift`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Genres.swift`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Discover.swift`

Reference (read line-by-line in next session):
- `/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/CountrySelectPage.tsx`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/Settings.tsx`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/Search.tsx`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/Genres.tsx`
- `/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/DiscoverNoUser.tsx`

#### ⚠️ Critical for next agent
- User communicates in **Turkish** ("Lütfen iletişimi Türkçe sürdürün").
- User builds locally on Mac. After every `project.yml` / Info.plist / Assets change, user MUST: `yarn tvos:setup` + DELETE app from simulator + Shift+Cmd+K + Cmd+R.
- User compared this Apple TV app side-by-side with the Electron preview ("Apple TV ui Tizen/Electron ile 1:1 ayni olmali"). Treat the Electron/web-preview Vite React app as the definitive source of truth for pixel layout.
- Use `Stage1920x1080` view modifier for any new page — copy absolute coordinates straight from the React JSX.
- After EACH page rewrite, ask user to verify on local Xcode + screenshot, then move to the next page.
- DO NOT try to do all pages at once — context will run out. ONE page per round.


### Backend Pending Items — ALL COMPLETED ✅ (May 26, 2026)
Backend developer confirmed completion of both P1 backend tasks (TV login QR auto-activation + Google Play RTDN webhook). Verification:
- **Web Activation `?code=`**: Endpoint `POST /api/auth/tv/activate` live at
  `https://www.themegaradio.com/tv` — auto-fires on page load when user is
  logged-in, preserves `?code=` through OAuth/email login when logged-out.
  TV frontend already polls `GET /api/auth/tv/code/:code/status` (no
  frontend changes needed).
- **Android TV RTDN**: `POST /api/webhooks/google-play-rtdn` live with
  shared-secret + OIDC JWT verification, idempotent messageId tracking,
  Google Play Developer API receipt verification. Handles all 7
  notificationType events (PURCHASED/RENEWED/CANCELED/EXPIRED/REVOKED/
  ON_HOLD/GRACE). User just needs to set `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
  env var on Railway + finalize Pub/Sub push subscription endpoint URL
  in Google Play Console.


- **Symptom**: After CarPlay/WatchOS integration, iPhone app loaded JS bundle
  (Firebase analytics fired, all modules registered, `Running "main"` printed)
  but stayed on a permanent black screen after splash.
- **Root cause**: Previous Expo prebuild had deleted `PhoneSceneDelegate.swift`.
  Info.plist still declared `UIApplicationSceneManifest` (required for CarPlay
  entitlement), so iOS adopted the UIScene lifecycle for the iPhone window —
  but with no scene delegate registered, RCTRootView ended up on a
  `windowScene=nil` UIWindow and `RCTRootContentView.frame` stayed
  `(0,0,0,0)` forever.
- **Fix** (`ios/MegaRadio/PhoneSceneDelegate.swift`,
  `ios/MegaRadio/AppDelegate.swift`, `ios/MegaRadio/Info.plist`,
  `ios/MegaRadio.xcodeproj/project.pbxproj`):
  - Restored `PhoneSceneDelegate.swift` from git history.
  - Moved React Native initialization OUT of
    `AppDelegate.didFinishLaunchingWithOptions` and INTO
    `PhoneSceneDelegate.scene(_:willConnectTo:options:)` — that's the
    only place we get a real `UIWindowScene` to attach to the UIWindow
    before RN measures.
  - `AppDelegate.configurationForConnecting` returns
    `PhoneSceneDelegate.self` for `UIWindowSceneSessionRoleApplication` and
    `CarPlaySceneDelegate.self` for `carTemplateApplication`.
  - Info.plist declares both scenes (`UIWindowSceneSessionRoleApplication`
    → `PhoneSceneDelegate`, `CPTemplateApplicationSceneSessionRoleApplication`
    → `CarPlaySceneDelegate`).
  - `scripts/add-watchos-target.js` now also registers
    `PhoneSceneDelegate.swift` / `CarPlaySceneDelegate.swift` /
    `SiriPlayMediaHandler.swift` into the MegaRadio target's Sources
    phase, so any future `expo prebuild --clean` doesn't lose them again.
  - Also added auto-install of `xcode` npm package fallback.
- **Verified live**: User confirmed the app opens to the HomeScreen
  (Austrian Rock Radio playing, Firebase / IAP / AdMob / Crashlytics all OK).



### TV UX polish: hidden player, scroll bugs, focus restore, login QR ✅ (Feb 25, 2026)
- **GlobalPlayer.tsx**: Bottom audio bar is now also hidden on `/search`,
  `/settings`, and `/country-select`. Audio keeps playing in background; the
  bar simply doesn't overlap full-screen UX content. Previously only hidden
  on `/premium-upgrade`, `/onboarding-premium`, `/manage-subscription`,
  `/login`, `/guide-*`.
- **DiscoverNoUser horizontal scroll fix**: `scrollForYouIntoView`,
  `scrollGenreIntoView`, `scrollRecentIntoView` were reading
  `ref.current.children[index]`, but DOM structure is
  `<scroller><flex-wrapper>{cards}</flex-wrapper></scroller>`, so `children`
  pointed at the flex wrapper not the cards. Fixed to use
  `ref.current.children[0].children[index]`. Result: "For You" and
  "Popular Genres" now scroll past the visible viewport — user can reach
  card #12 with D-pad RIGHT instead of getting stuck at card #8.
- **Focus restoration after back from /radio-playing**: `NavigationContext`
  now stores `returnStationId` + `returnSection` in addition to
  `returnFocusIndex`. After lazy-loaded lists (recently played grows, popular
  loads, country stations paginate) settle, `DiscoverNoUser.tsx` re-resolves
  the saved station's CURRENT index from the section's array. User pressing
  Back from "Rock Antenne - Heavy Metal" now lands on Rock Antenne, not
  Mangoradio.
- **Login QR Code**: `Login.tsx` now renders a white QR code next to the
  6-digit PIN (split layout with "OR" divider in the middle). QR encodes
  `https://www.themegaradio.com/tv?code=<6DIGITS>`. Backend brief
  `/app/memory/BACKEND_BRIEF_LOGIN_QR.md` documents the trivial web-side
  change needed for one-tap login when the user is already signed in on
  the website.

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


---

## tvOS Native — UI/Focus Pass (2026-02)

User feedback round (Turkish). Changes applied to `ios-tvos/*.swift` (no new files,
`project.yml` unchanged — user just rebuilds in Xcode):

- **Country**: Removed the "Global" option everywhere. A concrete country is always
  active — auto-detected from the device region/language on first launch, **UK (GB)
  fallback**. `CountryStore.swift` rewritten with `detect()`; `CountryCatalog` gained
  `codeToName` / `name(for:)`. Selected-row match is now code-based.
- **Directional focus**: Added `.focusSection()` grouping to fix Tizen-style jumps —
  Country (list ↔ keyboard), Settings (categories ↔ detail panel), RadioPlaying
  (controls / scroll grid), and the global `AppSidebar`. This makes RIGHT/UP from
  anywhere in a region snap to the adjacent region (previously only worked when
  geometrically aligned).
- **Global player bar**: Rewritten 1:1 with `GlobalPlayer.tsx` — full-width 1920×155
  translucent dark bar, white 89px logo, station name + country•metadata, and 3
  black circular buttons (Play/Pause, Favorite=pink-when-active, Equalizer=pink-when-
  playing). Now hidden on search/settings/country-select/login (was showing on country).
- **Help popup**: Sidebar "Help" item opens a `HelpOverlay` ("Remote Control Colors":
  Red=Favorite, Green=Play/Pause, Yellow=Search, Blue=Country) — port of web HelpModal.

### Still open / next (needs user Xcode screenshots to verify)
- Discover page parity (background hero + station-card layout / focus) — pending a fresh
  screenshot; AppSidebar focusSection already improves left/right return.
- If `.focusSection()` is not pixel-identical to Tizen on any page, implement the full
  explicit index-based focus engine (single focusable container + `onMoveCommand`) to
  exactly mirror the web `useTVNavigation` zone model.
- P1: Desktop (Windows/Linux) Stripe subscription via external-browser checkout.



### tvOS Focus pass #2 + Discover parity (2026-02)
- Applied the working Settings-style `.focusSection()` grouping to ALL remaining pages:
  Search (results ↔ keyboard), Genres (content), GenreList (grid), Favorites (grid),
  Discover (Genres row / Popular grid / Stations grid each a section). Sidebar already a
  section → LEFT/RIGHT between sidebar and content now reliable on every page.
- Discover: "Popular Right Now" converted from a horizontal scroll to a **2×7 grid**
  (matches web `DiscoverNoUser.tsx`). GenrePill restyled to web spec (px72/py28, r20,
  22px, bg .14). `.clipped()` kept (web clips too).
- Genres-detail / Favorites / grids: added `.padding(.top, 16)` to stop the top focused
  card being clipped on the first row.
- Cards (StationCardLarge 200×264, inner 132×132) already match web 1:1.
- Rebuild: just `Cmd+R` in Xcode (no new files, project.yml unchanged).



### tvOS EXPLICIT FOCUS ENGINE — Country page rebuilt (2026-02)
`.focusSection()` proved insufficient: tvOS geometric focus can't jump from a
country low in the list to the keyboard (no perpendicular overlap). User demands
Tizen-identical index navigation. Implemented the real model:

- **Engine pattern**: whole page = ONE focusable container
  (`.focusable(true).focusEffectDisabled().onMoveCommand{}.onTapGesture{}`). A manual
  focus model (`zone` + indices) drives all highlights. Arrows are intercepted and
  routed by an explicit `handleMove(dir)`; select by `activate()`. Geometry is
  irrelevant — RIGHT from ANY country → keyboard, LEFT from anywhere → sidebar, etc.
  (`onTapGesture` select is reliable here — the app's `.tvTransparent` style already
  uses it and select works.)
- **Reusable pieces** (in Views.swift): `EngineSidebar` / `EngineSidebarItemView` +
  `engineSidebarItems` (non-focusable sidebar highlighted from a model index).
  `KeyButtonLabel` extracted in TVKeyboard.swift (visual-only key) so engine pages
  render plain keys while Search keeps the old `KeyButton`.
- **CountrySelect.swift** fully rewritten on the engine (sidebar + list + keyboard +
  language dropdown all in one model). Visuals/layout unchanged (1:1 with web).

**Background image (Discover/Genres black)**: gradients already match web exactly.
Root cause = `Assets/Images` is `type: group` (xcodegen snapshots files at GENERATION
time); hero PNGs (`hand-crowd-disco-1.png`, `discover-background.png`) were added after
the user's last `yarn tvos:setup`, so they aren't in the built bundle. FIX = re-run
`yarn tvos:setup`.

### Rollout plan (next, once user confirms Country focus is perfect)
- Apply the SAME engine to Discover, Genres, Search (reuse EngineSidebar + KeyButtonLabel;
  refactor GenreCard/StationCardLarge/GenrePill to plain `isFocused:` views).
- Discover infinite scroll (backend supports `?page=N&country=`; load more near bottom).
- Settings → Account redesign 1:1 with Tizen: show code directly (no "Show code"
  button, single line) + QR code for phone scanning. Login/account visual parity.



### tvOS — Background image ROOT CAUSE + Login/QR redesign (2026-02)
- **Background black (Discover/Genres) — ROOT CAUSE FOUND & FIXED**: `hand-crowd-disco-1.png`
  was actually a **JPEG renamed to .png** (invalid PNG signature `FFD8FF/JFIF`). Browsers
  (web/Tizen) sniff content so it worked there, but Xcode's build-time PNG processing
  (pngcrush) mangles a fake-PNG → `UIImage` returns nil → black. Re-encoded it to a REAL
  PNG (PIL, 2000×1333, 1.57MB) with the same filename. Scanned all 24 PNGs — only this one
  was bad; rest valid. Gradients already matched web exactly.
- **Login/Account redesigned 1:1 with web `Login.tsx`**: removed the "Show my code" button —
  code is now auto-requested on appear (`startPairing()`). Code shown as **6 single-row
  character boxes** (88×108, pink) with `.fixedSize()` so it NEVER wraps to 2 lines.
  Added a native **QR code** (CoreImage `qrCodeGenerator`, value
  `https://www.themegaradio.com/tv?code={code}`) in a white card + "OR" divider + waiting
  indicator + Skip. Centered full-screen layout (no sidebar), matching Tizen.


### tvOS FOCUS — REAL root cause + UIKit pressesBegan engine (2026-02)
Previous attempts (`.focusSection()`, then single-container `.onMoveCommand`) FAILED on
device. DEEP DIAGNOSIS: on tvOS a SwiftUI `ScrollView` is implicitly focusable and STEALS
focus, so `.onMoveCommand` on a container never fires. Apple's supported low-level hook is
`UIResponder.pressesBegan`. 
- NEW: `RemoteControl.swift` — `RemoteCaptureUIView` (UIView, `canBecomeFocused`, overrides
  `pressesBegan`) wrapped in `UIViewRepresentable`; `.remoteControl { key in }` View modifier;
  `windowStart()` sliding-window helper. Added to project.yml (NEW FILE → user must run
  `yarn tvos:setup`).
- CountrySelect.swift now uses `.remoteControl` (no ScrollView, no onMoveCommand). The list +
  language dropdown render a focus-driven sliding WINDOW of rows (no native scroll → no focus
  stealing). Deterministic Tizen navigation: RIGHT from any row → keyboard, LEFT → sidebar, etc.
- Pages must have NO focusable SwiftUI elements when using `.remoteControl` (cards/buttons
  rendered as plain views, highlight from model).

### Rollout (after user confirms Country pressesBegan works on device)
- Convert Discover, Genres, Search, Favorites to `.remoteControl` + EngineSidebar + windowed
  grids (make StationCardLarge/GenreCard/GenrePill plain `isFocused:` variants).
- Discover infinite scroll: append `?page=N&country=` results as focus nears the grid end.


### Still pending (next)
- Roll out the explicit focus engine (proven on Country) to Discover, Genres, Search,
  Favorites — ONLY after user confirms Country focus is correct on-device.
- Discover infinite scroll (`?page=N&country=`).



### Tizen/WebOS CDN Remote-Update — COMPLETED & VALIDATED (2026-06-01)
Over-the-air update system finalized & verified end-to-end in the container (Vite build
is buildable here; only native tvOS isn't).
- **Validated build chain runs clean**: `node build-cdn.js` → `cdn-dist/` (assets
  rewritten to `./`, `version.json`, `_headers`). `prepare-tizen.js` + `prepare-webos.js`
  both produce correct store packages = thin `index.html` bootstrap (CDN base injected) +
  full `app/` local fallback + manifest/icons.
- **ROOT-CAUSE FIX (Tizen would white-screen)**: the bootstrap navigates the top-level
  document to `https://cdn.themegaradio.com/index.html`, but Tizen BLOCKS main-resource
  navigation to an external origin unless whitelisted. Added
  `<tizen:allow-navigation>*.themegaradio.com themegaradio.com</tizen:allow-navigation>`
  to `samsung-tizen/config.xml`. Per Tizen docs this also makes the WRT keep injecting
  `tizen`/`webapis` (color keys, MediaPlay, Back via tvinputdevice) into the CDN-served
  page — otherwise remote keys would die.
- **webOS**: no appinfo flag needed — packaged→external https navigation works by default;
  CORS only governs XHR/fetch, not top-level nav; CDN serves its own assets same-origin.
- **Bug fix**: `prepare-tizen.js` version regex matched the XML prolog `version="1.0"`
  instead of the widget `version="1.0.2"`; anchored to 3-part semver. Fallback
  `app/version.json` now self-identifies as 1.0.2.
- **Docs**: `REMOTE_UPDATE.md` updated with Cloudflare Worker (`wrangler.jsonc`) deploy
  steps + a "Platform güvenlik gereksinimleri (KRİTİK)" section documenting the
  allow-navigation requirement.
- **Cosmetic**: `remote-bootstrap.html` CDN_BASE comment fixed (root, no `/tv/` subpath)
  to match `cdn-config.json`.
- Files: `samsung-tizen/config.xml`, `samsung-tizen/prepare-tizen.js`,
  `remote-bootstrap.html`, `REMOTE_UPDATE.md`. (`prepare-webos.js`, `build-cdn.js`,
  `cdn-config.json`, `wrangler.jsonc` were already complete.)
- **USER ACTION (test on devices)**: `wrangler deploy` the cdn-dist to
  cdn.themegaradio.com → repackage Tizen `.wgt` (Tizen Studio) + LG `.ipk`
  (`ares-package dist`) → install → verify app opens from CDN, color/Back keys work, and
  killSwitch=true falls back to local `./app/`.


### CDN Remote-Update — switched NAVIGATE → INJECT model (2026-06-01, device-driven)
On-device test proved the navigate-to-CDN approach is fatal on Samsung: loading the app
from the remote `https://cdn.themegaradio.com` origin means the runtime does NOT inject
`tizen`/`webapis` → `webapis is not defined` (NO AUDIO via avplay) + `tizen is not
defined` (no color/Back keys). `<tizen:allow-navigation>` did NOT fix it.
**Fix = INJECT model** (keep local file:// document as app context; pull only JS/CSS/
assets from CDN):
- **`remote-bootstrap.html`** rewritten: stays on local doc, sets
  `window.__MR_ASSET_BASE__ = cdnBase`, fetches `version.json` (killSwitch) + CDN
  `index.html`, recreates its `<link>/<style>/<script>` nodes (absolute CDN URLs) into
  the local document — plain helper scripts (polyfills, tv-remote-keys, tv-audio-player)
  first, ES-module React entry last, chained by onload for order. Native globals survive
  → audio + keys work. Falls back to local `./app/index.html` on CDN failure/killSwitch.
- **`build-cdn.js`**: CDN bundle now built with ABSOLUTE base (`cfg.cdnBase`) into a
  dedicated outDir (cdn-dist), so injected refs point at the CDN. `_headers` now emits
  `Access-Control-Allow-Origin: *` (required: file:// document loads CDN ES-module).
- **`src/lib/assetPath.ts`**: checks `window.__MR_ASSET_BASE__` FIRST (before the file://
  branch) so images/fonts load from the CDN in the inject model. Backward compatible
  (undefined on web preview / local fallback).
- **Also fixed earlier this session**: images/icons were 404 on CDN because the prior
  relative/`/api/tv-app/` base mismatched the CDN root — absolute base fixes it.
- Validated in container: build-cdn produces absolute-CDN index.html + ACAO _headers;
  bootstrap node-simulation extracts correct CDN URLs (helpers first, module last);
  prepare-tizen/webos emit the inject bootstrap + local app/ fallback; backend preview
  smoke test OK.
- **USER ACTION**: `node build-cdn.js` + `npx wrangler@3 deploy` → rebuild `.wgt`/`.ipk`
  (new bootstrap) → reinstall → verify audio plays + keys work + images load from CDN.

### Tizen INJECT model — VERIFIED WORKING ON DEVICE (2026-06-01)
User device test confirmed: `[MegaRadio] INJECT bootstrap v2 active` → no more
`tizen`/`webapis` undefined → **audio plays** (`avplay` onReady/onPlay) → keys work →
images load from CDN. CDN OTA confirmed (cf-fonts + inject marker). 🎯

### Self-hosted Ubuntu font (offline-safe) — 2026-06-01
Fixed the only remaining cosmetic issue: `file:///cf-fonts/...woff2 ERR_ACCESS_DENIED`
(Cloudflare auto-rewrote Google Fonts to root-relative `/cf-fonts/` which breaks under
file://). Now self-hosted:
- Added 8 woff2 (Ubuntu 300/400/500/700 × latin/latin-ext) to
  `web-preview/public/fonts/`.
- Prepended `@font-face` to `public/css/tv-styles.css` using `url("../fonts/..")` —
  relative to the CSS file, so it resolves identically on CDN, `/api/tv-app/` preview,
  and `file://` local fallback.
- Removed the Google Fonts `<link>`/preconnect from `web-preview/index.html`.
- Verified: preview renders Ubuntu with zero font/cf-fonts/gstatic errors; fonts bundled
  into cdn-dist + Tizen/WebOS `app/` fallback (offline-safe).
- **USER ACTION**: `node build-cdn.js` + `npx wrangler@3 deploy` → rebuild & reinstall
  `.wgt` → font now loads with no `cf-fonts` ACCESS_DENIED.

### TV open-telemetry ping — wired to backend (2026-06-01)
Backend dev shipped `GET /api/tv/telemetry/open` (204, CORS *) + admin
`GET /api/admin/tv-telemetry?days=7` (per-version remote/local counts, unique TVs,
localPct = killSwitch rollback signal). Frontend wired in `remote-bootstrap.html`:
- `telemetry(src)` fire-and-forget `new Image()` beacon — never blocks the app.
- Sends `src` (remote=inject succeeded / local=fallback), `v` (CDN bundle version from
  version.json), `plat` (auto-detected tizen/webos/other), `app` (`__APP_VERSION__`
  replaced by prepare-tizen/webos = package version), `did` (persistent anon id in
  localStorage).
- `prepare-tizen.js` + `prepare-webos.js` now replace `__APP_VERSION__`.
- Validated in container: bootstrap JS syntax OK, placeholders replaced (app=1.0.2),
  `telemetry/open` returns 204 with ACAO `*`.
- **USER ACTION**: redeploy CDN + rebuild/reinstall `.wgt` → dashboard shows version
  adoption & remote/local split.

### Settings version + L/C source indicator + font CSP + onboarding focus (2026-06-02)
- **"Version 3.0" kaynağı**: `Settings.tsx` içinde hardcoded. Artık
  `Version 3.0 · {C|L} (VITE_APP_VERSION)` gösteriyor — C=CDN inject, L=local fallback
  (`window.__MR_BOOT_SRC__`, bootstrap inject yolunda 'cdn' set ediyor); build id =
  çalışan bundle'ın gömülü sürümü. Preview'de doğrulandı: "Version 3.0 · L (1.0.2)".
- **Font CSP fix**: self-hosted Ubuntu inject modunda CDN'den geldiği için Tizen
  `config.xml` CSP `font-src`'ye `https://*.themegaradio.com` eklendi (yoksa
  "Refused to load the font"). config.xml pakette → tek seferlik `.wgt` reinstall gerekir.
- **Onboarding focus fix**: `OnboardingPremium.tsx` revealed (QR) ekranında
  "Maybe later — Continue free" butonu kalıcı vurgulu + ENTER ile çalışır (eskiden focus
  yok + ENTER ölüydü).

### Async cache-first OTA — IMPLEMENTED ✅ (2026-06-02, approach A)
Non-blocking boot delivered (user reported first-open blocking on the network-first model).
- **`remote-bootstrap.html`** → CACHE-FIRST: injects `localStorage['mr_cdn_html']`
  instantly if present (· C), else boots bundled local copy instantly (· L). NO network
  on the boot critical path → never blocks. Removed the blocking version.json/index.html
  fetch + timeout from the boot path.
- **`src/lib/bundleUpdater.ts`** (new) + wired in `main.tsx` → after first paint (4s),
  ONLY on file:// (packaged TV; no-op on web/Electron): fetch CDN version.json; killSwitch
  → clear cache (rollback); newer version → stash CDN index.html in localStorage +
  prewarm assets → shown on NEXT launch.
- **`build-cdn.js`** → ACCUMULATE: build to temp, merge into cdn-dist keeping old hashed
  `assets/*` (so a cached older index.html never 404s after a new deploy); prune >30 days.
  Verified assets 1→2 on rebuild (old kept + new added).
- Behaviour: fresh install → 1st launch local (instant) → bg downloads CDN → 2nd launch
  CDN (instant) → new deploys appear next-launch. **CDN down/gone → app still works**
  (cached or bundled local). killSwitch → next launch local.
- Container-validated: bootstrap JS syntax OK + cache-first markers; bundleUpdater compiles
  + no-op on https preview (0 console errors); accumulation works.
- **USER ACTION**: deploy CDN + ONE more `.wgt`/.ipk reinstall (bootstrap changed) — LAST
  forced reinstall; all future changes are pure OTA.

### Station image + audio robustness (2026-06-02)
Investigated user reports (Turkish station logos not showing + some stations not playing).
Root cause = **backend/external, NOT a regression** from the CDN/inject work:
- **Logos**: backend `api.themegaradio.com/api/tv-icon-proxy` 404s for many stations +
  external station icon servers with expired certs / redirects / 503. App's
  `resolveStationImageUrl` + onError→fallback is correct (unchanged). Backend brief needed.
- **Audio**: `tv-audio-player.js` avplay is correct (HTTP+HTTPS); Super FM actually played
  in the user's log; CSP allows http media. Failures are slow/dead external streams.
App-side improvements shipped (both OTA, no reinstall):
- **Optimized `fallback-station.png`** 1024²/1MB → 400²/160KB (TV was choking rendering
  many 1MB placeholders in lists).
- **avplay watchdog** in `public/js/tv-audio-player.js`: 15s timeout on `prepareAsync`
  (some HTTP streams hang with neither onPlay nor onError) → converts a silent hang into
  onError so the existing 3-attempt retry chain kicks in. Syntax-checked; in cdn bundle.
- **USER ACTION**: `node build-cdn.js && npx wrangler@3 deploy` → OTA (next launch). No
  `.wgt` reinstall (helper JS + images come from CDN).

### TV station images + playlist audio — ROOT CAUSE + fix (2026-06-02, session 2)
Deep investigation of "Best Fm / Süper FM çalmıyor + resimler gözükmüyor" (Turkish).
Verified via curl against production `api.themegaradio.com`:
- **Images ROOT CAUSE**: production API does NOT expose `/api/tv-icon-proxy`
  (returns Express `Cannot GET … ` 404). Also `/api/stream-proxy` and
  `/api/stream-resolve` are 404 there (they only exist on the Emergent FastAPI
  preview backend). So on a real TV the `http://` favicon upgrade always failed →
  missing logos. FIX (`src/lib/imageUtils.ts`): on packaged TV (`file://`) load the
  `http://` favicon DIRECTLY (CSP `img-src http:` allows it, no mixed-content under
  file://). Web/preview/Electron https path unchanged (still uses working proxy).
- **Audio ROOT CAUSE**: Turkish playlist stations (Süper FM `…SUPER_FMAAC.pls`,
  Best Fm `…/listen.pls`, Metro FM …) ship `.pls`/`.m3u` URLs. avplay/webOS audio
  can't parse playlist *files*; on TV the code intentionally skipped resolution
  (`needsResolve && !isTV`) and the backend resolver is unreachable → silent fail
  (matches "debug ederken çalışıyor" = web build resolved it, TV didn't). FIX
  (`src/contexts/GlobalPlayerContext.tsx`): new `resolvePlaylistOnTV()` fetches the
  playlist text client-side and extracts the first stream URL before handing avplay
  a direct URL; graceful fallback to original on failure. Tizen `config.xml`
  `connect-src` broadened with `http: https:` so the playlist fetch isn't CSP-blocked.
- StreamTheWorld redirect stations (Super Fm `…/livestream-redirect/SUPER_FM_SC`)
  are 302→audio/mpeg and should already play (avplay follows redirects). Raw-IP
  SHOUTcast (`http://46.20.7.126/;stream.mp3`) are flaky external servers (15s
  watchdog already converts hangs → retry).
- Backend brief: `/app/memory/BACKEND_BRIEF_TV_PROXY_ENDPOINTS.md`.
- Build verified in container (vite build OK, markers present in bundle, preview
  smoke test OK, no regression).
- **USER ACTION**: `node build-cdn.js && npx wrangler@3 deploy` (OTA, images fix is
  pure OTA). The Tizen `config.xml` `connect-src` change needs ONE `.wgt` rebuild +
  reinstall for the playlist audio fix to take effect (webOS `.ipk` too if used).

### Station logo fallback CHAIN — S3 → favicon → fallback image (2026-06-02, session 2)
Per user: logos should come from our own S3; favicon only as a secondary fallback,
local image as last resort. Implemented:
- `megaRadioApi.ts slimStation()`: `favicon = logoAssets.webp256` (S3) when
  `status==='completed'`; added `faviconFallback` = raw favicon (kept as secondary).
  `Station` interface gained `faviconFallback?: string`.
- `imageUtils.ts handleStationImageError()`: shared <img> onError walker —
  step 1 swaps to the raw favicon (once, via dataset flag), step 2 swaps to the
  local fallback-station image.
- Wired into all station-logo onError sites: DiscoverNoUser, Search, Favorites,
  GenreList, GlobalPlayer, IdleScreensaver, RadioPlaying (now-playing + similar +
  popular). (ContinueListening rail already had a final-image fallback.)
- Verified in preview: search "best" → real logos for Radio Best / Best FM /
  Budapest / Debrecen; S3-less stations fall to branded fallback; **0 broken imgs**.
- Backend still needs to re-process `failed` logoAssets (12–20% of stations) — see
  `BACKEND_BRIEF_TV_PROXY_ENDPOINTS.md`.

### CRITICAL: avplay watchdog killed a PLAYING stream (Super Fm) — fixed (2026-06-02 s2)
Root cause found from real Samsung TV logs (user): the app fired `play()` twice in
quick succession (RadioPlaying auto-play re-trigger). avplay is a SINGLETON; the
superseded call's 15s `prepareAsync` watchdog later fired `stop()/close()`, KILLING
the stream that was actually playing (`onPlay - Stream playing successfully` had
already fired) → false `PREPARE_TIMEOUT` → retry → audio cut out. This is the real
reason "Super Fm çalmıyor" (it played, then died after 15s).
Fix in `public/js/tv-audio-player.js`:
- Watchdog moved to instance var `self._watchdog`; each new `play()` cancels the
  previous watchdog first (no stale singleton kill).
- Before the watchdog declares a timeout it re-checks `webapis.avplay.getState()`;
  if `PLAYING`/`READY` it treats the stream as fine (fires onPlay) instead of killing it.
- `imageUtils.ts`: `data:` URI favicons now returned as-is (were wrongly prefixed
  with `/api/image/` → 404; seen in TV logs for slowturk base64 logo).
- `tv-audio-player.js` is loaded from CDN by the bootstrap (`./js/x` → CDN), so this
  fix is PURE OTA (`node build-cdn.js && npx wrangler@3 deploy`, applies within 1–2
  TV restarts). NO `.wgt` reinstall for the audio watchdog fix.
- Note: Super Fm URL is a StreamTheWorld HTTPS redirect (NOT a playlist) — avplay
  handles it; the watchdog was the only problem. The `.pls` client-side resolver +
  `connect-src` change still benefits true playlist stations (needs the one `.wgt`).

