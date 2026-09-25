# Android release work — in progress

Updated 2026-09-25. Publishing is authorized. **No Android release has been uploaded or published yet.** Complete the remaining device and store checks before production submission. The user moved the iOS review recheck ahead of Android artwork completion. iOS build 6 was rejected for a missing ATT prompt; build 7 is now WAITING_FOR_REVIEW with automatic release after approval. Android artwork and release work has resumed.

## Google Play listing

- Existing app `com.megaradio`, developer 7314839518457703103, app 4972640059774211400. Production baseline 1.0.69 (91).
- Brand remains **MegaRadio** in all titles.
- 52 editorial language drafts prepared; 51 are supported by the observed Play locale selector. Odia (`or`) is not available and was not uploaded.
- All 51 supported title / short description / full description records were imported, corrected where the importer altered text, saved as drafts, and read back against source hashes. Evidence: `validation/play-console-copy-readback.json`.
- Four Console language aliases are handled: sk, ro, hr, sl. `play-all-listings-import.json` contains the 51 actual Console codes.
- Market research covers 54 contexts, 163 localized listing observations and 141 distinct apps. Local competitors include Radyo Kulesi and radio.de. No keyword-volume or historical-ranking dataset was available; do not claim measured demand or guaranteed rankings.
- Feature graphics were rendered in all prepared languages. All 51 supported locale graphics are saved and verified; none remain. `validation/play-console-feature-readback.json` records the latest persisted checkpoint, which can lag the live session. Do not count a local PNG as a delivered asset.
- Six actual Android phone captures and four Pixel Tablet captures are complete. 306 localized phone images across 51 locales passed file/size/overflow validation and visual contact-sheet review. All 51 supported phone sets (306 images) are saved and all six images per locale were read back with the correct order and dimensions; see validation/play-console-screenshot-readback.json. Tablet delivery is now in progress: 204 localized real-tablet compositions across 51 locales passed RGB/size/overflow and nine contact-sheet checks. The default en-US native tablet set was saved, but translated locales showed empty tablet slots even after reload; localized tablet sets are therefore being saved directly into both size fields. See validation/play-console-tablet-readback.json. TV/Wear captures remain pending.

## Android builds and testing

Phone 1.0.70 (92), TV 1.0.70 (93), Wear 1.0.70 (94) all build with the existing Play upload key. Credentials remain outside Git. The upload certificate matches Play; the phone OAuth upload-key SHA-1 also matches google-services.json. The **Google Play app-signing** OAuth certificate was checked and is missing from Android OAuth clients; the new client is prepared, awaiting action-time approval.

- Phone native build fixed with the existing package patches, Kotlin 2.1.20 and the Wear bridge override. Signed release APK/AAB succeeded. New fixes are being rebuilt and retested.
- All 52 64-bit native libraries passed the ELF 16 KB alignment check.
- Phone emulator: launch without location permission, API catalog, genre headings and fallback REYFM artwork observed. MANGORADIO MP3 played and song metadata updated.
- KRAL POP exposed an HLS regression: API `hls: true` with a `.m3u` URL was sent as a progressive stream. Explicit HLS track types now cover foreground, fallback and background queues. Four focused stream tests pass.
- Longer HLS testing then exposed `BehindLiveWindowException` after pause / a test ad. A scoped Android TrackPlayer patch now resumes live streams at the live edge and limits automatic live-window recovery. **The final native fix passed emulator playback, a roughly two-minute pause/resume, and launcher-background playback checks.** Do not label the initial short HLS playback check as complete stability validation.
- Android Auto formerly contained sample URLs and read favorites from a nonexistent AsyncStorage SharedPreferences file. Its native template now uses the public API and an explicit app-synchronized catalog, localized category labels, foreground playback, focus handling and authenticated browser-client checks. Native compilation passed before the latest TrackPlayer change. Real Android Auto host tests remain pending.
- TV release built with existing CDN origin, scoped native bridges, Billing 8.3.0 and passing origin-policy tests. TV emulator launcher rendering failed with Lavapipe and SwiftShader; host graphics plus a cold boot restored the Google TV launcher. App navigation / playback UI tests remain pending.
- Wear release built and signing matched. Pairing, reconnect and actual control tests remain pending.
- Full TypeScript checking reports existing project errors (platform-specific AdMob resolution and other pre-existing types). The introduced test-import extension error was removed by using a Node `.mjs` test. A successful native build does not mean full TypeScript checking is clean.

## Remaining release gates

1. Finish and verify all localized feature graphics and actual Android screenshots.
2. Retest HLS after prolonged pause, background audio, notification controls, login, premium restore and failure handling.
3. Verify Play app-signing OAuth fingerprint; use an internal Play install for real billing validation.
4. Finish TV / Wear device testing and eligible form-factor onboarding; never advertise a scaffold as tested compatibility.
5. Upload appropriate AABs and submit the authorized update, then verify Play's returned status.
6. Update evidence, review and push scoped changes to the existing PR.
7. iOS 1.0.70 (7) resubmission is complete and remains Waiting for Review with automatic release, rechecked at 01:26 UTC Sep 25. Do not modify content-rights declarations.

## Follow-up on 2026-09-25

- iOS 1.0.70 (7) resubmitted and verified WAITING_FOR_REVIEW at 22:48 UTC Sep 24; automatic release after approval.
- All 51 Play feature graphics saved and verified.
- Android final UI release build succeeded; installed on phone and Pixel Tablet API36 emulators. Profile UMP privacy choices open correctly and decline returns to app. Car mode strings now use app translations. These Android follow-up changes are **not in the already submitted iOS build 7**.
- Google Cloud has only the upload-certificate Android OAuth client. Play production SHA-1 is CA:38:14:B6:BC:19:B4:F1:EB:C4:C7:C9:C4:7E:BF:C1:E4:A8:CE:04. New client form is prepared; action-time authorization is pending before Create. See `validation/google-oauth-signing.json`.

## Current delivery checkpoint

- Source changes are committed as `6b4f1a96`. The signed phone/TV/Wear binaries were built before this commit from the same source; no application source changes were made during screenshot delivery.
- All 51 Play text records, 51 feature graphics and 51 phone sets / 306 images are saved and read back.
- All 204 localized tablet compositions passed RGB, dimensions, size, overflow and visual review. Nineteen localized tablet sets have both size fields saved and first/last read back; all eight positions were checked before saving. `validation/play-console-tablet-readback.json` is authoritative.
- Slovak (`sk`, source `sk-SK`) is unfinished. A browser reload discarded its first unsaved attempt. The latest attempt added the discovery image via its detail panel; further additions were not verified. Reinspect both tablet fields and complete exactly four ordered files before saving. Do not count this locale as delivered.
- Safari's asset-selection controls became unreliable, then its HTML accessibility tree intermittently disappeared while screenshots still showed the page. Window activation, rebinding and reload did not restore reliable interaction. A user question asks whether the Mac is unlocked and the correct Safari window is foreground.
- Google Play Android OAuth creation remains pending the separate action-time confirmation. No client was created and no Android release was uploaded or published.
- Wear AVD `MegaRadio_Wear_API36` was created from the installed API36 signed image with a round 454x454 profile and host renderer, but it has not been started or tested. Android Auto desktop head unit is not installed.
- Final packaging checks: generated ATT/Android Auto modules match their checked-in templates; reverse-apply validation confirms the installed TrackPlayer source matches the patch. Strict diff whitespace checks pass outside the patch; the patch's flagged single-space lines are required unified-diff context and pass with only blank-at-EOL checking disabled.
