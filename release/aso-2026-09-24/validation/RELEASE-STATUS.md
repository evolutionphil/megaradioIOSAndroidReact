# Apple release status — 2026-09-24

## iOS resubmitted after metadata correction

iOS **1.0.70 (6)** was resubmitted on September 24, 2026 at **20:00
Europe/Vienna**. Safari and the API confirm **Waiting for Review**. Automatic
release after approval is enabled. This is a completed submission, not an
Apple approval or a live release.

Apple's automated Guideline 2.3.6 rejection identified Advertising set to No
in the age-rating questionnaire. The app contains AdMob advertising. Only the
Advertising descriptor was changed to Yes in both editable App Information
records, then verified by API and Safari. The review notes explain the free
tier's advertising and Premium/Remove Ads behavior. Review credentials and
content-rights declarations were preserved. No new binary was needed.

Submission ID: `2a04470f-1d8e-43c0-8e71-538d9e909cc2`.
See `ios-review-resubmission.json` for current evidence,
`ios-advertising-declaration.json` for the correction and
`ios-review-submission.json` for the initial 13:29 submission history.

macOS 1.0.3 universal MAS and native tvOS 1.0.0 (1) are processed and available
to the existing internal TestFlight group. Their App Store drafts have saved
build selections; they were not submitted for public App Review.

## Complete ASO and image delivery

All 50 locale copy sets have expanded descriptions and promotional text, local
keyword refinement, and platform-specific feature paragraphs. Every name keeps
the exact MegaRadio brand. All 150 platform records meet Apple's field limits.
Public competitor research does not establish search-volume or ranking guarantees.

A final read-only API comparison verified 250 metadata records with zero
mismatches against the current copy and privacy-policy fingerprints. All
350 screenshot sets / 1,950 images passed remote processing, checksum, order
and current-file verification. Final preflight at 17:59:25 UTC reports zero errors. The iOS-specific readback
also confirms build 6 is VALID, all 150 relevant metadata records match, both
Advertising descriptors are true, and automatic release is selected.

Each locale has 7 images in each of three iPhone sizes, 4 iPad, 6 Watch, 4 Mac
and 4 Apple TV images. Editorial captions are localized; native app UI inside
the captures is retained. Watch uses the original six native-interface images.
Counts, dimensions, opacity and decoding passed local validation. All caption
contact sheets and representative full sets were visually reviewed, followed
by saved-page checks in Safari.

Apple required a shared Apple TV privacy-policy text to accept the iOS submission.
The existing published English policy was copied into that required field and
verified; no new terms were written. Content-rights declarations remain untouched.

## Verified build and device results

- iOS 1.0.70 (6), including iPad and Watch: archive, Apple package validation,
  upload and processing passed. API reports VALID / APP_STORE_ELIGIBLE.
- Build 6 was installed on the physical iPhone. The user confirmed active
  Premium, hidden purchase offers and successful Apple and Google sign-in.
- 79 application tests passed during build validation. All 8 offline ASO delivery
  safety tests pass, including retry of Apple-acknowledged commits that lack
  a checksum while preserving processed originals.
  Simulator email login and entitlement persistence passed.
- No new paid or sandbox purchase was performed. Push delivery was not tested.

No ASO or screenshot upload remains pending. Apple review is the next external
step; no approval date or outcome is guaranteed.

## iPad design refresh delivered

Four real iPad captures replace the previous onboarding-based artwork in all
50 locales (200 RGB PNGs). Every replacement is COMPLETE in Apple, checksum
verified and correctly ordered. Originals were retained until each replacement
set passed and remain backed up locally. The refresh is included in the
resubmitted iOS version. The original MegaRadio icon and native captured UI
are preserved; editorial captions are localized.

The finalization of one Japanese and one Gujarati asset was delayed by Apple.
Retrying the upload commit completed them; no processed originals were removed
until the entire replacement set was ready. `ipad-redesign-delivery.json`
records all 50 successful results.
