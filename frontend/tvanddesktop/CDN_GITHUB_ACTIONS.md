# Samsung/LG CDN publishing

Push TV web changes to `main`. `.github/workflows/deploy-tv-cdn.yml` builds, validates, checkpoints, deploys, and verifies the live app. `workflow_dispatch` defaults to a dry run; choose `dry_run=false` for publication. Required repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token must permit Worker deployment and the `themegaradio.com` Worker route.

## Existing installations and the September 2026 migration

The original `megaradio-tv` Worker remains intact and owns the `cdn.themegaradio.com` custom domain and ALL pre-migration assets. Do not deploy to, delete, or reconnect automated builds to this original Worker.

The publishing target is now `megaradio-tv-cdn`. Its `cdn.themegaradio.com/*` route runs in front of the original custom-domain Worker. New files come from its ASSETS binding. A missing file is fetched through its LEGACY_CDN service binding to `megaradio-tv`. Unknown old files therefore remain available even without an exhaustive downloadable archive. This is not a claim that the locally recovered partial archive is complete.

`cdn-ci/migration.cjs` checks the target configuration, the preserved original version and known legacy hashes, and immutable path collisions. A changed original Worker stops publication. Live verification checks both the newly built entry/assets and legacy assets through the production domain.

Only the very first migration can begin without a `tv-cdn-*` checkpoint, and only while the public CDN and original Worker both still match the recorded legacy baseline. Subsequent builds require a valid cumulative GitHub release archive. Corrupt/incomplete releases or a migrated live version cannot silently reset history. The archive contains all post-migration hashed assets; pre-migration history continues to reside in the preserved original Worker.

## Publication sequence

1. Install locked dependencies; run archive, routing and publication tests.
2. Restore the latest cumulative checkpoint, or validate the one-time preserved-Worker migration.
3. Type-check, build, validate legacy JavaScript compatibility and packaging.
4. Check old immutable paths for collisions.
5. Save `tv-cdn-history.tar.gz` and SHA-256 in a `tv-cdn-*` prerelease BEFORE publication.
6. Reject a stale main commit; deploy to the new Worker.
7. Verify live version, exact HTML and asset hashes, cache policy, CORS and legacy fallback.

A saved checkpoint or a successful build alone is not proof of publication. The live verification step must pass. `version.json` identifies the live build. Root/index and manifest are revalidated; hashed assets remain immutable. Entry HTML uses `no-transform` to preserve the TV bootstrap bytes.

## Recovery

Keep all cumulative checkpoint releases and the original Worker. To restore a downloaded checkpoint, use the validated unpack routine in `cdn-ci/history.py`; never replace it with a fresh Vite build or partial historical download.

For immediate rollback of the initial migration, remove only the new `cdn.themegaradio.com/*` route: the original custom-domain Worker remains underneath. For later releases, roll back the new Worker to a verified prior version, retaining cumulative asset history. Never delete the original service or historical assets merely to fix a failed build.

WGT/IPK shells are separate store packages. CDN publication updates the hosted UI. Changes to package permissions, native capabilities or bootstrap requirements can still require a new store package and platform review.
