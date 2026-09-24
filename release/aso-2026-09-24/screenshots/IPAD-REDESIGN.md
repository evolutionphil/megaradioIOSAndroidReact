# iPad store artwork refresh

The previous four-image set used three onboarding photographs and one Genres
screen. This replacement uses four genuine iPad Pro 13-inch captures:
Discover, live player, a genre's station grid, and country selection. Large
captions, a consistent device frame and a coordinated purple, peach and lilac
palette give the set a shared visual structure. MegaRadio's original app icon
and exact brand name are preserved.

The design output package is retained separately from the canonical delivered package:
`/Users/mumiix/Downloads/MegaRadio-iPad-Redesign-2026-09-24/`.
It contains four 2064 × 2752 RGB PNGs per locale, 50 locales / 200 images,
with localized editorial captions. The real native interface remains in English.
The Pop station grid is the real result of opening Pop from Genres; no screen
content, station data, account entitlements or playback metadata was invented.

## Status

The user requested correction and resubmission after Apple's automated
Guideline 2.3.6 rejection for an incorrect Advertising age-rating descriptor.
The metadata issue is corrected. The rejected version is editable, so the
prepared 50-locale artwork has been delivered as part of this resubmission.
All 200 images are COMPLETE with verified checksums and order. The canonical
package now contains this artwork; originals remain backed up locally.
No active review was withdrawn. iOS 1.0.70 (6) was resubmitted at 20:00
Europe/Vienna and is Waiting for Review. See
`../validation/ipad-redesign-delivery.json` for verified per-locale evidence.

Apple documents that screenshot editing requires an editable version state:
https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots

## Reproduce

The native captures are in the ignored `source/ipad-redesign` directory and
copied into the output package's `native-captures` directory. They were taken
using Simulator's Save Screen control at full native resolution, without
painting over interface content. No private review credentials are in the assets.

```sh
swiftc -O release/aso-2026-09-24/screenshots/render-ipad-redesign.swift -o /tmp/megaradio-render-ipad-redesign
/tmp/megaradio-render-ipad-redesign release/aso-2026-09-24/screenshots /Users/mumiix/Downloads/MegaRadio-iPad-Redesign-2026-09-24
python3 release/aso-2026-09-24/screenshots/validate-ipad-redesign.py
```

An optional final locale argument renders only that locale. Finalize the full
set with the validation script before upload. It verifies the complete locale
coverage, four-image order, dimensions, opaque pixels and PNG decoding; converts
opaque RGBA to RGB; records SHA-256 checksums; and creates overview/contact sheets.
AppKit supplies native shaping and font fallback for RTL, Indic and CJK captions.
Text rendering fails explicitly if a caption does not fit its allotted box.

The Release simulator configuration for iOS 1.0.70 (6) also built and installed
successfully during capture preparation. The submitted App Store binary was
not changed or replaced.
