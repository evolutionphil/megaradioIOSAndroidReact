# MegaRadio — Apple TV (tvOS) + macOS

Native SwiftUI shell + system integrations for tvOS 17 / macOS 14.

## Files in this folder

| File                                          | Purpose                                          |
|-----------------------------------------------|--------------------------------------------------|
| `MegaRadioTVApp.swift`                        | Main app + WKWebView + Siri-remote D-pad bridge  |
| `ShazamRecognizer.swift`                      | ShazamKit song recognition → `window.__MR_SHAZAM_MATCH__` |
| `TopShelfExtension/ServiceProvider.swift`     | Top-shelf "Continue Listening" rail             |
| `IntentsExtension/IntentHandler.swift`        | Siri → INPlayMediaIntent resolver                |
| `Brand/AppIcon-*.png` + `TopShelf-*.png`      | Pre-rendered brand assets (drop into Assets.xcassets) |

## Xcode project setup (one-time)

1. **New project** — tvOS → App → Interface `SwiftUI`, Language `Swift`,
   bundle id `com.visiongo.megaradio`.
2. **Replace** the generated `ContentView.swift` with
   `MegaRadioTVApp.swift`.
3. **Capabilities** on the main target:
   - Background Modes → Audio, AirPlay, and PiP
   - Siri
   - ShazamKit
   - App Groups → `group.com.visiongo.megaradio`
4. **Assets.xcassets** → drag the PNGs from `Brand/`:
   - `AppIcon` ← `AppIcon-Large-2400x1440.png` (big layer) + `AppIcon-Small-400x240.png` (small layer)
   - `TopShelfImage` ← `TopShelf-1920x720.png`
   - `TopShelfImageWide` ← `TopShelfWide-2320x720.png`
5. **Add Targets**:
   - **TV Top Shelf Extension** — bundle id suffix `.topshelf`. Replace its
     template `ServiceProvider.swift` with the one from this folder.
   - **Intents Extension** — bundle id suffix `.intents`. Replace its template
     `IntentHandler.swift` with the one from this folder. In its Info.plist
     set `IntentsSupported` to `INPlayMediaIntent`.
6. **Main app Info.plist** additions:
   ```
   NSUserActivityTypes = [ "INPlayMediaIntent" ]
   INAlternativeAppNames = [ "MegaRadio", "Mega Radio" ]
   ```
7. ⌘R → the tvOS simulator should launch MegaRadio full-screen with the
   brand icon. Try saying *"Play jazz on MegaRadio"* to Siri.

## macOS build

The same `MegaRadioTVApp.swift` compiles for macOS (Catalyst target). Enable
"Mac Catalyst" on the main target, choose *"Optimize for Mac"*, build — and
the same brand icon (imported in step 4) becomes the dock icon automatically.

For a **traditional (non-Catalyst) Mac app** use the Electron wrapper in
`../../desktop/`; it ships as a `.dmg` with full native menu bar + auto-update.

## Brand asset regeneration

If the hero logo changes, re-run the icon pipeline:

```bash
python3 - <<'PY'
from PIL import Image
src = Image.open('../web-preview/public/images/logo.png').convert('RGBA')
base = src.resize((1024,1024), Image.LANCZOS)
base.save('Brand/AppIcon-1024.png')
base.resize((800,480),   Image.LANCZOS).save('Brand/AppIcon-Small-400x240.png')
base.resize((2400,1440), Image.LANCZOS).save('Brand/AppIcon-Large-2400x1440.png')
for W,H,n in [(1920,720,'TopShelf-1920x720.png'),(2320,720,'TopShelfWide-2320x720.png')]:
    c=Image.new('RGBA',(W,H),(14,14,14,255)); ic=base.resize((520,520),Image.LANCZOS)
    c.paste(ic,((W-520)//2,(H-520)//2),ic); c.save(f'Brand/{n}')
PY
```
