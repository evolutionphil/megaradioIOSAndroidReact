# Samsung/LG CDN automatic upload

Changes pushed to `main` in the TV web source or CDN build configuration trigger `.github/workflows/deploy-tv-cdn.yml`.

1. Install the locked dependencies in `apple-tv-and-macos/web-preview`.
2. Type-check, then run the existing `node build-cdn.js` Vite build with `cdn-config.json`.
3. Validate the freshly generated `cdn-dist` folder and Cloudflare packaging.
4. Upload that folder with Wrangler to the existing **megaradio-tv** Worker.
5. Check the live version, HTML, assets and CORS for Samsung and LG clients.

The production URL stays **https://cdn.themegaradio.com/**. There is one Worker and one current bundle for all TVs. No legacy Worker, service binding, migration baseline or GitHub release archive is required by this workflow. The manual upload is replaced by the build-and-upload job; WGT/IPK packages are not rebuilt or submitted.

GitHub Actions uses the existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. Cloudflare Workers Builds is disconnected to avoid a second publisher. Build failure stops publication. A failed post-publication check means the job needs investigation; inspect whether the upload step already succeeded.

The app retains its existing background update behavior: it checks the version, downloads the new bundle, and uses cached HTML on a subsequent launch. An already running TV is not forcibly refreshed.

For a manual run, open Actions → Update Samsung-LG CDN → Run workflow. Leave `dry_run` enabled for validation only, or disable it to publish the latest main commit. Source pushes publish automatically.
