# MegaRadio Apple release and ASO

`copy.json` is the authoritative copy for all 50 App Store localizations. The
research report explains the local queries, competitor comparisons and limits of
the available evidence. Search volume and ranking guarantees are not claimed.

## Verified remotely

- All 50 app names and subtitles match `copy.json` after reloading App Store
  Connect. Every name retains the exact `MegaRadio` brand prefix.
- iOS 1.0.70 (5), macOS 1.0.3 and tvOS 1.0.0 (1) passed Apple processing and are
  available for internal TestFlight testing. The matching draft versions have
  these builds selected.
- The privacy-policy and contact links load in Safari.

See `validation/RELEASE-STATUS.md` for the remaining work. The app has **not** yet
been submitted to App Review in this release run. `validation.json` checks local
field limits; it is not evidence that all version metadata has been uploaded.

## Regenerate metadata

```sh
python3 release/aso-2026-09-24/build-metadata.py
python3 release/aso-2026-09-24/build-report.py
```

`metadata/` contains three platform packages. The installed `altool` recognizes
38 locales and logs “Unknown language code” for the other 12 while still exiting
successfully. Check the log and remote data, not only its exit status. Its appInfo
operation targets the live app-information record, so do not use it to overwrite
the draft localized names.

## Screenshots

450 opaque PNG files are generated under
`/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24/`: two phone screenshots in each
of three sizes, plus one native iPad, Apple TV and Mac capture per locale. New
screenshots have not yet been uploaded. Existing phone imagery is preserved below
the replaced caption strip. Native app captures preserve their contents and
aspect ratio; only the surrounding layout and captions are added.

`screenshots/build-captions.py`, `render.swift`, `compose.py` and
`compose-platforms.py` reproduce the images when the original image folder and
local native captures are present. The original phone images are in
`/Users/mumiix/Downloads/Mega Radio Store/`; native captures are in
`screenshots/source/`. Large images remain outside version control. Original
slides advertising unsupported recording, unverified rankings or similar claims
are excluded from the generated set.

## API access

`asc-client.py inspect` is read-only and scoped to app 6759302561. It requires
`ASC_KEY_PATH`, `ASC_KEY_ID` and `ASC_ISSUER_ID`; credentials must remain outside
Git. The proposed Marketing-only key is pending user approval and has not been
created. No content-rights declarations, users, agreements or pricing were changed.
