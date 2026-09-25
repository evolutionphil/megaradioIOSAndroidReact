# Apple release status — 2026-09-25

iOS **1.0.70 (7)** was resubmitted at **2026-09-24 22:48 UTC** and is **WAITING_FOR_REVIEW**, with automatic release after approval. The last read-only check at 2026-09-25 01:26 UTC confirmed build `488189fc-079b-4f9a-b182-13d8fa033d80`, processing state VALID, and release type AFTER_APPROVAL. This is a completed submission, not Apple approval or publication. See `../../ios-2026-09-25/latest-status.json` and `resubmission.json` in that directory.

## Privacy correction

Apple rejected build 6 under Guideline 5.1.2(i): its tracking label was not accompanied by an ATT permission request. The native ATT module was missing and the Expo tracking-description option was incorrect. Build 7 adds the native module/framework, correct usage description, delayed measurement and ATT/UMP-gated advertising initialization. The App Privacy and content-rights declarations were preserved. Review notes and a processed/checksum-verified ATT screenshot explain the permission flow.

The ATT prompt appeared on iPhone 17 Pro and iPad Pro 13-inch (M5) iOS 26.4 simulators. Declining tracking allowed radio playback, song metadata and non-personalized test ads. Six consent tests passed. Archive, Apple upload and processing passed. The accepted upload has a Hermes framework dSYM warning, limiting that framework's crash symbolication. Physical installation of build 7 is unverified because CoreDevice disconnected. The user's successful Premium and Apple/Google-login checks apply to build 6.

## ASO and image delivery

All 50 locale copy sets have locally researched names, subtitles, keyword fields, descriptions and promotional text. Every name preserves MegaRadio. Public competitor research does not establish measured search-volume or ranking guarantees.

The latest full read-only verification found no mismatch in **250 metadata records** and no missing or incomplete image in **350 screenshot sets / 1,950 images**. Each locale includes seven images in each of three iPhone sizes, four iPad, six Watch, four Mac and four Apple TV. Editorial captions are localized; native captured UI is preserved. The four iPad images are genuine native iPad captures, and their 200 replacements passed processing, checksum and display-order checks before originals were removed. Evidence: `store-assets-recheck-2026-09-25.json`.

Apple's earlier 2.3.6 age-rating issue was corrected by declaring the app's advertising in both editable App Information records. The required Apple TV policy-text field contains the existing published policy. Historical submission responses remain in the adjacent JSON evidence.

## Other platforms and validation limits

macOS 1.0.3 and native tvOS 1.0.0 (1) are processed and available to the existing internal TestFlight group. Their public App Store drafts were not submitted. The earlier contract/auth/purchase validation passed 79 application tests; the ASO uploader passed eight safety tests. No new paid or sandbox purchase was performed and push delivery remains unverified.

Android's subsequent profile privacy-options entry and car-mode localization fixes are **not part of the already submitted iOS build 7**. Android delivery remains in progress; consult `../../android-2026-09-24/STATUS.md` for its independent release gates.
