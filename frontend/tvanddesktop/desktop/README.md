# MegaRadio Desktop — Electron wrapper

Ports the TV web app to Windows / macOS / Linux as a fullscreen 16:9
music player. The renderer pulls the same bundle the TV shells use so
every UI change made inside
`apple-tv-and-macos/web-preview/` is picked up automatically.

## Development

```bash
cd /app/frontend/tvanddesktop/desktop
yarn                    # installs electron + electron-builder
yarn start              # launches the Electron window pointing at
                        # https://themegaradio.com/tv (or the preview URL)
```

The native shell is deliberately tiny — all UI is rendered by the WebView.

## Brand icons

The MegaRadio logo (`apple-tv-and-macos/web-preview/public/images/logo.png`,
1024×1024) is bundled as:

```
build/
├── icon.png         (512×512 — Linux AppImage / deb)
├── icon.ico         (multi-size — Windows installer & window icon)
├── icon-1024.png    (1024×1024 — macOS source for .icns generation)
```

If you need to regenerate, run:

```bash
python3 - <<'PY'
from PIL import Image
src = Image.open('../apple-tv-and-macos/web-preview/public/images/logo.png').convert('RGBA')
src.resize((512,512), Image.LANCZOS).save('build/icon.png')
src.resize((256,256), Image.LANCZOS).save('build/icon.ico', format='ICO',
    sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
src.save('build/icon-1024.png')
PY
```

## Building distributables

### Windows `.exe` installer + portable

```bash
# On Windows (PowerShell) or via GitHub Actions runner windows-latest
cd /app/frontend/tvanddesktop/desktop
yarn                    # first time only
yarn build:win
#   ⇒ dist/MegaRadio Setup 1.0.0.exe           (NSIS installer, ~95 MB)
#   ⇒ dist/MegaRadio 1.0.0.exe                 (single-file portable)
```

The installer prompts for an install location, creates a Start-menu entry and
a Desktop shortcut, and all icons (installer, uninstaller, window title,
taskbar) are the MegaRadio brand logo baked in from `build/icon.ico`.

> Cross-building a Windows `.exe` from macOS/Linux works but requires
> **wine** to be installed (electron-builder uses it to sign resources).
> The recommended pipeline is GitHub Actions with a `windows-latest` runner —
> no wine needed.

### macOS `.dmg`

```bash
# On a Mac with Xcode Command Line Tools installed
cd /app/frontend/tvanddesktop/desktop
yarn build:mac
#   ⇒ dist/MegaRadio-1.0.0-universal.dmg       (Intel + Apple Silicon)
```

electron-builder converts `build/icon.png` (1024×1024) into a proper `.icns`
automatically. For App Store submission you also need to codesign with an
Apple Developer ID — set `CSC_LINK` and `CSC_KEY_PASSWORD` env vars.

### Linux `AppImage` + `deb`

```bash
cd /app/frontend/tvanddesktop/desktop
yarn build:linux
#   ⇒ dist/MegaRadio-1.0.0.AppImage            (portable, one-file)
#   ⇒ dist/megaradio_1.0.0_amd64.deb           (Ubuntu / Debian)
```

### All three from one command

```bash
yarn build:all          # requires macOS + wine (for Win) + dpkg (for deb)
```

## Auto-update

`electron-updater` is wired up in `electron/updater.js`. Point
`publish.provider` to your own GitHub release channel or a private
generic-URL server once you have a place to host the `.yml` manifest.

## Window behaviour

- Locked to 16:9 aspect ratio via `BrowserWindow.setAspectRatio(16/9)`.
- The 1920×1080 TV UI is scaled with `webContents.setZoomFactor()` so a
  small 800-pixel-wide window still shows the entire layout, just smaller.
- `F11` toggles fullscreen; `Cmd/Ctrl + Q` quits.
