# MegaRadio Apple release and ASO

`copy.json` is the authoritative copy for 50 App Store localizations and three
platforms. Names retain the exact `MegaRadio` brand. `ASO-RESEARCH.md` records
local queries, ten competitor comparisons, and the limits of public evidence.
Search volumes and ranking guarantees are not claimed.

## Current delivery

Expanded descriptions, promotional text and refined keywords are uploaded for
all 150 platform localizations. Final read-only API verification compared
250 records with zero mismatches against the current copy fingerprint (two
editable App Information records and three version records). Local field-limit
checks also pass. All 350 screenshot sets / 1,950 images are delivered and
verified against the current local files, Apple's COMPLETE processing state,
checksums and display order. The final preflight reports zero errors.

The iOS 1.0.70 (6) archive passed validation, upload and Apple processing
(`VALID`, `APP_STORE_ELIGIBLE`). iOS 1.0.70 (6) was submitted on September 24,
2026 at 13:29 Europe/Vienna and is now **In Review** (15:26 check), with automatic release
after approval. macOS 1.0.3 and tvOS 1.0.0 (1) passed processing and
are available to the existing internal TestFlight group. See
`validation/RELEASE-STATUS.md` for the latest verified release state.

Apple required the shared Apple TV privacy-policy text before accepting the
iOS submission. `published-privacy-policy.txt` copies the existing published
English policy at https://themegaradio.com/en/privacy-policy without introducing
new terms or translating legal text. Both editable App Information records
were verified against that copy; content-rights declarations were untouched.

## Proposed iPad artwork refresh

A new four-image design with actual iPad screens is prepared separately in
`/Users/mumiix/Downloads/MegaRadio-iPad-Redesign-2026-09-24/`. All 50 locale sets
/ 200 images pass validation. It has not replaced the submitted images: the
app is already In Review, and the user is choosing between withdrawing and
resubmitting or retaining this artwork for a subsequent release. See
`screenshots/IPAD-REDESIGN.md` and `validation/ipad-redesign-validation.json`.

## Regenerate copy

```sh
python3 release/aso-2026-09-24/revisions/apply-expanded-copy.py
python3 release/aso-2026-09-24/revisions/refine-keywords.py
python3 release/aso-2026-09-24/build-metadata.py
python3 release/aso-2026-09-24/build-report.py
```

The first script restores its source revision before applying additions; always
run keyword refinement afterward. The platform-specific paragraph describes
mobile-only controls on iOS without promising them on Mac or Apple TV.

Do not use altool for these metadata packages. It recognizes only 38 of the
50 locales and can exit successfully after logging unknown-language errors.
Its appInfo operation can also target live rather than editable information.
The scoped API uploader supports Apple's region-qualified locale identifiers.

## Complete screenshot sets

1,950 opaque PNG files are generated outside Git under
`/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24/`:

| Display | Size | Images per locale |
| --- | --- | --- |
| iPhone 6.5 | 1284 × 2778 | 7 |
| iPhone 6.9 | 1320 × 2868 | 7 |
| iPhone 5.5 | 1242 × 2208 | 7 |
| iPad 13 | 2064 × 2752 | 4 |
| Apple Watch Ultra | 410 × 502 | 6 |
| Mac | 2880 × 1800 | 4 |
| Apple TV | 1920 × 1080 | 4 |

Original iPhone photos and device frames are preserved. Unsupported recording,
HD and ranking claims are removed; the old recording slide now shows a real
Genres capture. Three original iPad photographs are retained, and the repeated
fourth slide is replaced with a real iPad Genres screen. Mac and Apple TV use
actual app captures for discovery, player, genres and country selection.

Editorial captions are localized in all 50 languages with AppKit text shaping,
including right-to-left and Indic scripts. Native interface text inside the
captures is preserved. The six Watch images are the original native interface
captures, without added marketing captions; they are not claimed to be 50
translated native interfaces.

`validation/complete-screenshot-validation.json` checks all 350 sets for counts,
dimensions, file integrity and opaque RGB output. Remote delivery additionally
requires Apple's COMPLETE state, matching checksums and verified display order.
Only current local fingerprints in `validation/aso-api-screenshots.json` count
as delivered; an older image revision does not satisfy this check.

```sh
python3 release/aso-2026-09-24/screenshots/expand-captions.py
swift release/aso-2026-09-24/screenshots/render.swift release/aso-2026-09-24/screenshots '/Users/mumiix/Downloads/Mega Radio Store' /Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24
python3 release/aso-2026-09-24/screenshots/compose-complete.py
```

`compose-complete.py` supports an optional locale and `--device` for targeted
regeneration. Older `compose.py` and `compose-platforms.py` generate the previous
limited sets; do not use them for this release. Local source images and remote
backups are ignored by Git.

## Scoped API delivery

Set `ASC_KEY_PATH`, `ASC_KEY_ID` and `ASC_ISSUER_ID` outside Git. The approved
Marketing-only key is stored with owner-only permissions. No content-rights
declarations, users, agreements or pricing are changed by these scripts.

```sh
python3 release/aso-2026-09-24/asc-release.py text --apply
python3 release/aso-2026-09-24/asc-release.py screenshots --apply --workers 10 --retry-failed
```

`text` without `--apply` is a read-only comparison. Screenshot delivery resumes
from processed images and local fingerprints. Original sets are backed up
before replacement; old images are removed only after new images are processed
and checksummed. Asset uploads never receive the ASC JWT. Apple's Retry-After
is respected and authentication is refreshed after a long quota wait.
`--refresh-stalled` replaces only unfinished reservations from an interrupted
run; processed originals remain until their replacements are ready. A pending
byte transfer is finalized even if a previous run stopped before its checksum
commit. Seven offline delivery tests cover reuse, ordering, interruption, and
preservation of originals after failed processing or checksum validation.

Run `python3 release/aso-2026-09-24/check-delivery.py` before the final UI review.
It rejects stale metadata or screenshot evidence and verifies all current file
fingerprints, complete counts and the iOS build association.

The scoped uploader intentionally requires editable PREPARE_FOR_SUBMISSION
versions. After submission, preserve the final verification evidence instead of
rerunning a mutation against a version under review. The final UI submission
and Waiting for Review state are recorded in `validation/ios-review-submission.json`.

## iOS subscription and device validation

Build 6 adds already-owned purchase recovery, bounded StoreKit waits, duplicate
operation protection, and protection against delayed inactive status responses.
Active members see account status instead of another purchase offer. Recurring
members can open subscription management; annual ad-free users can still
upgrade to full Premium.

79 automated tests pass. Simulator email sign-in and Premium persistence after
relaunch passed. The user confirmed on their physical iPhone with build 6 that
Premium is active, purchase offers disappeared, and both Apple and Google
sign-in work. No new purchase was performed in this release run. Evidence is
recorded in `validation/ios-subscription-validation.json`.
