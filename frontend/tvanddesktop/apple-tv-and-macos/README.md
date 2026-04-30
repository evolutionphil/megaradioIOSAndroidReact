# MegaRadio Apple TV + macOS

> **Status (Faz 1A)**: ✅ Web preview LIVE — pixel-perfect 1:1 with Tizen/webOS reference.

## Preview URL
`{REACT_APP_BACKEND_URL}/api/tv-app/`

This is the same React + TypeScript + Vite codebase that runs on the production
Samsung Tizen and LG webOS apps. Brand assets, fonts (Ubuntu), 1920×1080 reference
frame, focus engine, virtual keyboard, country selector, and all 12+ pages from the
design spec are reused as-is.

## Architecture

```
apple-tv-and-macos/
├── web-preview/                 # ✅ Working — served via FastAPI at /api/tv-app/
│   ├── src/                     # React + TS source (mirrored from Tizen build)
│   ├── public/
│   │   ├── images/              # Logos, icons, hero (hand-crowd-disco)
│   │   ├── css/tv-styles.css    # 10-foot UI rules
│   │   └── js/                  # Polyfills + spatial-nav + remote-keys + audio
│   ├── index.html
│   ├── vite.config.ts           # base: "/api/tv-app/", outDir → backend/static
│   └── package.json
│
├── ios-tvos/                    # 🚧 Native shim (next phase)
│   └── README.md                # Xcode / SwiftUI WKWebView bootstrap notes
│
└── macos/                       # 🚧 Native shim (next phase)
    └── README.md
```

## Production Native Targets (Faz 1B — needs macOS + Xcode)

The web build above is the **single source of truth** for UI. Native shells are thin
WKWebView wrappers that load the deployed bundle, plus a few platform-specific bridges:

### Apple TV (tvOS 17+)
- Xcode project: `ios-tvos/MegaRadioTV.xcodeproj`
- Loads `https://themegaradio.com/tv` in a fullscreen `WKWebView`
- Bridge: Siri remote events → JS `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))`
- AVAudioSession category `.playback` for background audio
- Top Shelf widget (Faz 2)

### macOS (14+)
- Universal Purchase with tvOS (same Apple ID, same bundle `com.visiongo.megaradio`)
- macOS-only menu bar (File / Edit / Audio / View / Help — see `electron/main.js` for spec)
- Mini-player mode: NSWindow `level: .floating`, 320×96 size

## Development

```bash
cd web-preview
yarn install
yarn build           # Outputs to /app/backend/static/tv-preview
yarn dev             # Local Vite at :8030 (only inside pod)
```

The FastAPI backend mounts the build at `/api/tv-app/*` and proxies API calls
through `/api/tv-proxy/*` to bypass Cloudflare bot-detection in headless previews.
On real devices the renderer hits `https://api.themegaradio.com` directly.

## Verified Pages

| Page              | Hash route               | Status |
|-------------------|--------------------------|--------|
| Splash            | `/`                      | ✅     |
| Onboarding 1–4    | `/guide-1` … `/guide-4`  | ✅     |
| Login (TV code)   | `/login`                 | ✅     |
| Discover          | `/discover-no-user`      | ✅     |
| Genres            | `/genres`                | ✅     |
| Genre List        | `/genre-list/:slug`      | ✅     |
| Search            | `/search`                | ✅     |
| Favorites         | `/favorites`             | ✅     |
| Country select    | `/country-select`        | ✅     |
| Settings          | `/settings`              | ✅     |
| Radio Playing     | `/radio-playing`         | ✅     |

## Brand consistency

- Background `#0E0E0E` everywhere
- Brand pink `#FF4199`
- Ubuntu font (Google Fonts CDN; bundle locally for native targets)
- Sidebar: 120×100 px tile, 108 px pitch, exact match with spec §7
- Pixel-exact 1920×1080 reference frame; native scalers handle 2160p
