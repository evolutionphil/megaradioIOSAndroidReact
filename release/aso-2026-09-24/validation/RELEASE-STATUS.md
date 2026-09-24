# Apple release status — 2026-09-24

## Verified build and device results

- iOS 1.0.70 (6), including iPad and Watch: archive, Apple package validation,
  upload and processing passed. API reports VALID / APP_STORE_ELIGIBLE.
- macOS 1.0.3 universal MAS and native tvOS 1.0.0 (1): processed and available
  to the existing internal TestFlight group. Their draft build selections are saved.
- iOS build 6 is installed on the physical iPhone. The user confirmed active
  Premium, hidden purchase offers and successful Apple and Google sign-in.
- 79 automated tests pass. Simulator email login and entitlement persistence pass.
  A new paid or sandbox purchase was not performed.

## ASO and image delivery in progress

All 50 locale copy sets have expanded descriptions and promotional text, local
keyword refinement, and platform-specific feature paragraphs. All names retain
MegaRadio. All 150 generated platform records meet Apple's field limits.

The earlier metadata revision passed 250-record readback. The expanded revision
is still being delivered and must receive its own complete comparison. Apple
returned HTTP 429 with a Retry-After value; the uploader waits for the specified
quota reset without changing keys or accounts.

The complete local image package contains 1,950 PNGs in 350 sets: 7 images in
each of three iPhone sizes, 4 iPad, 6 Watch, 4 Mac and 4 Apple TV per locale.
Captions are localized; native app UI inside the captures is retained.
Counts, dimensions and opacity passed local validation. Uploaded sets are
tracked by processed state, checksum, order and current local fingerprint.

## Remaining before review submission

1. Complete expanded-copy upload and compare all 250 remote records.
2. Complete all 350 screenshot sets and verify current checksums and order.
3. Select and verify iOS build 6 for the 1.0.70 version.
4. Check representative saved pages in Safari and submit iOS for App Review.

No App Review submission has been completed in this release run. Existing
content-rights declarations remain untouched as requested by the user.
