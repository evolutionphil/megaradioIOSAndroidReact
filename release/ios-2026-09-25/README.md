# iOS ATT review correction — build 7

**Submitted:** iOS 1.0.70 (7) is WAITING_FOR_REVIEW with automatic release after approval. See `latest-status.json` for the most recent read-only check.

Apple rejected 1.0.70 (6) under Guideline 5.1.2(i). The App Privacy label
declares tracking, but the application did not show the system ATT request.

The JavaScript service called a native `ATTModule` that did not exist. The
AdMob Expo option was also incorrectly named `userTrackingPermission`, so the
archived Info.plist had no tracking usage description. SDK app measurement
was not delayed.

Build 7 adds a native bridge to AppTrackingTransparency and an Expo plugin
that preserves its source and framework linkage. The correct
`userTrackingUsageDescription` option and `GADDelayAppMeasurementInit` setting
are present. SDK initialization waits for a resolved ATT request and UMP's
`canRequestAds` result. Missing configuration, unresolved permission, and
unavailable consent fail closed. Concurrent initialization attempts share one
promise. Existing non-personalized ad requests are retained. Firebase's
advertising storage, ad user data, personalization signals and ad-network
registration default to disabled.

Six consent regression tests pass. The iOS simulator native build succeeds;
its final plist confirms version 7 and all privacy defaults. On an iPad Pro
13-inch (M5), iOS 26.4, the system ATT alert appeared before ad initialization.
After declining tracking, a test ad loaded and MANGORADIO reached playing
state with ICY metadata. Playback was then paused. This is simulator evidence,
not yet a physical iPhone or App Store approval result.

The ATT screenshot is attached to App Review, processed COMPLETE and checksum
verified. The review notes explain how to locate the permission request;
existing review contact/login information is preserved. Content-rights and
App Privacy declarations were not changed.

A fresh read-only verification also checked all 250 ASO records and all
350 screenshot sets / 1,950 images in App Store Connect. No mismatch or
incomplete image was found. See the adjacent JSON evidence and
`../aso-2026-09-24/validation/store-assets-recheck-2026-09-25.json`.

Archive and App Store upload succeeded. Apple processed build 7 as VALID /
APP_STORE_ELIGIBLE, and it is selected for iOS 1.0.70. The iPhone 17 Pro
simulator also showed the ATT prompt; declining it allowed MANGORADIO to
play with ICY metadata. The unsigned Debug simulator reports an Expo push
registration Keychain entitlement warning. Physical iPhone installation
remains unverified because the device disconnects during CoreDevice setup.
Resubmission status is recorded in `validation.json`.

The upload was accepted with a warning that the Hermes framework dSYM was
unavailable. This limits Hermes framework crash symbolication; it did not
block App Store processing.
