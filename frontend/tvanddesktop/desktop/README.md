# MegaRadio Desktop (Windows / Linux / macOS)

> **Status (Faz 3)**: ✅ Electron wrapper scaffolded — points at the deployed TV web build.

## Architecture

Electron main process (`electron/main.js`) opens a 1280×800 window that loads the
same web TV build deployed at `https://themegaradio.com/tv` (or the preview URL
during development). All UI, audio, focus engine, and data fetching is reused.

### Native bridges (Faz 3A)
- `globalShortcut`: MediaPlayPause / MediaNextTrack / MediaPreviousTrack
- Menu bar: Audio menu (Cmd+P play/pause, Cmd+→ next, Cmd+← prev)
- Window controls: Hidden inset on macOS, default on Win/Linux

## Build

```bash
cd /app/frontend/tvanddesktop/desktop
yarn install
yarn build:linux         # AppImage + .deb
yarn build:win           # NSIS installer + portable exe
yarn build:mac           # DMG (signing requires Apple Developer ID)
yarn build:all           # All three at once
```

Outputs land in `dist/`. Auto-update via `electron-updater` is wired up in Faz 3B.

## Bundle ID
`com.visiongo.megaradio.desktop`

## Stores
- Microsoft Store (Windows)
- Snapcraft + AppImage hub (Linux)
- Mac App Store (macOS — separate from the native macOS target which uses the
  same Apple ID + Universal Purchase as tvOS)
