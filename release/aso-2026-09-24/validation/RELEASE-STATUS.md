# Apple upload status — 2026-09-24

All three uploaded builds passed package validation and Apple processing. The final server state is VALID / BETA_INTERNAL_TESTING (see the per-platform processing JSON files).

- iOS 1.0.70 (5), including iPad and embedded watchOS app.
- macOS 1.0.3, Electron 44.4.5 universal MAS package.
- tvOS 1.0.0 (1), native SwiftUI app.

App Store review submission is still pending metadata and screenshot verification. Upload/processing success does not mean App Review approval. Physical-device Apple/Google sign-in and sandbox purchases have not been verified in this release run.

App Store draft build associations were saved: iOS 1.0.70 → build 5, macOS 1.0.3 → build 1.0.3, tvOS 1.0.0 → build 1.

All 50 localized app names and subtitles were read back from Safari after reload and exactly matched copy.json. Brand prefix MegaRadio is unchanged. See app-info-remote-verification.json.

The public privacy and support URLs were opened successfully in Safari. The privacy URL redirects from /en/pages/privacy-policy to /en/privacy-policy.

Remaining before iOS review submission:
- Upload version metadata for 12 locales unsupported by altool: en-CA, bn, gu, kn, ml, mr, or, pa, ta, te, ur, sl (across iOS, macOS and tvOS).
- Upload and verify localized screenshots. 450 generated PNG files are available outside Git in /Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24. None of the new assets have been uploaded yet.
- Final remote metadata and screenshot delivery validation, then iOS App Review submission.

A Marketing-only App Store Connect key named MegaRadio ASO Release 2026 is prepared in Safari, but creation is pending explicit user approval. No new key has been created. Existing user/content-rights declarations were left untouched.
