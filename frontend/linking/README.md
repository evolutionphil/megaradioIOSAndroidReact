# Radio / profile links — native implementation and external website handoff

Shared links intentionally remain HTTPS (`/station/<slug>` and `/user/<slug-or-id>`).
That is how Universal Links/App Links support BOTH an installed app and a web fallback.
A bare `megaradio://` WhatsApp URL cannot provide a useful no-app download page.

## In this repository (implemented)
- iOS associated-domain entitlement for `themegaradio.com`.
- Android autoVerify filters for station/user/genre routes, including language prefixes.
- `+native-intent.tsx` maps links to a resolver inside AudioProvider; station opens its
  player without toggling an already-playing station off. Public user IDs/slugs resolve
  to the correct profile. Private/missing profiles display an error.
- Existing OAuth, Siri `playLast` and App Intent `play?q=...` URLs remain untouched.
- Profile share buttons now prepare a real public-profile link and call native Share.
- `website-install-banner.js` is a ready-to-integrate website asset, NOT published by
  this mobile repository. It offers Open App / App Store / Google Play and explains
  that after installation the recipient needs to tap the original link again.

## External checks / blockers
- Current website AASA contains `M6T85HP76P.com.visiongo.megaradio` and `/station/*`,
  `/user/*`, `/genre/*`. Verify the signed archive's application-identifier matches it.
- Current Android assetlinks points at **com.visiongo.megaradio**, but this Android app
  is **com.megaradio**. The certificate in that entry is not assumed to be this app's
  Play App Signing certificate. The website owner must publish the correct association.
- `/api/app/info` currently returns empty appStore/playStore values. The configured
  links in `app.json.extra` are the existing URLs from RateUsModal (iOS app6759302561,
  Android com.megaradio); verify storefront availability before website publication.
- There is no Branch/AppsFlyer/deferred-link service in the current app. Universal Links
  cannot automatically carry a target through a first install. No such guarantee is made.
- This workspace does NOT contain the live `themegaradio.com` website server. Adding
  a script here does not change that server. No external files have been overwritten.

## Generate association files for the website owner
Use real signed-production values, NOT debug keystore fingerprints:
```sh
ANDROID_APP_LINKS_SHA256='<PLAY_APP_SIGNING_SHA256>' \
IOS_APPLICATION_IDENTIFIER='<SIGNED_ARCHIVE_APPLICATION_IDENTIFIER>' \
node scripts/generate-app-link-files.js
```
Output: `linking/generated/.well-known/assetlinks.json`,
`linking/generated/.well-known/apple-app-site-association`, `app-link-config.js`.
Both .well-known files need HTTPS200, JSON MIME, no login, no redirect. Merge any
legitimate existing apps instead of accidentally removing them.

On live station/user pages load the generated configuration, then the provided banner:
```html
<script src="/app-link-config.js"></script>
<script defer src="/website-install-banner.js"></script>
```
The page must still contain its real canonical/OG metadata. Do not replace an unavailable
radio with a different station's link or expose a private profile.

## Real-device acceptance
Rebuild native projects (`expo prebuild`, iOS pods/Xcode; Android release build).
Tap a WhatsApp link with app installed: cold and warm station/profile opens. Verify
same-station link doesn't pause playback. Test logged out, private profile and malformed
link. After website changes, test without app installed: real store choices; after install
return to the original link. Android verified-links status must target com.megaradio.