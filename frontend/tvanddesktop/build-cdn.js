#!/usr/bin/env node
/**
 * build-cdn.js — Builds the TV web app and stages it for upload to the CDN
 * (Cloudflare). This is the ONLY command you run for a normal "ship an update"
 * cycle — no store re-submission needed.
 *
 *   node build-cdn.js
 *     → tvanddesktop/cdn-dist/   (upload this whole folder to cdn.themegaradio.com/tv/)
 *
 * What gets staged:
 *   cdn-dist/
 *   ├── index.html          (the real Vite app entry)
 *   ├── assets/...          (hashed JS/CSS/images)
 *   └── version.json        ({ version, killSwitch }) — read by the bootstrap
 *
 * To DISABLE remote (emergency rollback to the in-store version on every TV):
 *   set "killSwitch": true in tvanddesktop/cdn-config.json, re-run, re-upload
 *   ONLY version.json. All TVs fall back to their bundled local copy.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HERE       = __dirname;
const REPO_ROOT  = path.resolve(HERE, '..', '..');
const TV_SRC_DIR = path.join(HERE, 'apple-tv-and-macos', 'web-preview');
const TV_DIST    = path.join(REPO_ROOT, 'backend', 'static', 'tv-preview');
const OUT_DIR    = path.join(HERE, 'cdn-dist');
const CONFIG     = path.join(HERE, 'cdn-config.json');

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function pruneOldAssets(dir, days) {
  // Cap accumulation: drop hashed assets older than `days` (any TV that lagged that
  // long re-fetches the current bundle anyway). Files re-written this build keep a
  // fresh mtime, so only truly-unused old hashes are removed.
  if (!fs.existsSync(dir)) return;
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  let removed = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    const p = path.join(dir, e.name);
    try { if (fs.statSync(p).mtimeMs < cutoff) { fs.rmSync(p, { force: true }); removed++; } } catch (_) {}
  }
  if (removed) console.log('▸ Pruned', removed, 'stale asset(s) (>' + days + 'd)');
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function rewriteAssetPaths(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) rewriteAssetPaths(p);
    else if (/\.(html|css)$/.test(e.name)) {
      // Vite emits assets under base "/api/tv-app/"; rewrite to the ABSOLUTE
      // CDN base so the injected bundle resolves from the CDN even when the
      // host document is the local file:// bootstrap (inject model).
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\/api\/tv-app\//g, cfg.cdnBase));
    }
  }
}

const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const version = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS

// INJECT MODEL — the store package keeps a LOCAL file:// bootstrap document
// (so Samsung `tizen`/`webapis` + LG `webOS` native APIs stay injected → audio
// + remote keys work) and only pulls the JS/CSS/assets from the CDN. For the
// injected <script src>/<link href> to resolve to the CDN (not the local file://
// document), the CDN bundle MUST be built with an ABSOLUTE base = cfg.cdnBase.
// The app's assetPath() also reads window.__MR_ASSET_BASE__ (set by the
// bootstrap) so images/fonts load from the CDN too. We build into a DEDICATED
// outDir (cdn-dist) so the backend's tv-preview build is never disturbed.
console.log('▸ Building TV web bundle (absolute CDN base for inject model)...');
console.log('  base =', cfg.cdnBase);
// ACCUMULATE model: build into a TEMP dir, then MERGE into cdn-dist KEEPING old
// hashed assets/*. This is required for the cache-first bootstrap: a TV that booted
// a previous (cached) index.html must still find its (older-hash) JS on the CDN even
// after a newer deploy — otherwise it would 404. Old assets are pruned after 30 days.
const TMP = OUT_DIR + '-tmp';
rmrf(TMP);
let built = false;
try {
  const shell = process.platform === 'win32' ? true : (fs.existsSync('/bin/bash') ? '/bin/bash' : true);
  execSync(`yarn build --base="${cfg.cdnBase}" --outDir="${TMP}" --emptyOutDir`, {
    cwd: TV_SRC_DIR, stdio: 'inherit', shell, env: { ...process.env, VITE_APP_VERSION: version },
  });
  built = fs.existsSync(path.join(TMP, 'index.html'));
} catch (e) {
  console.warn('⚠ dedicated CDN build failed — falling back to existing bundle + rewrite.');
}
if (built) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  copyDir(TMP, OUT_DIR);                 // overwrite entry/css/js/fonts, ADD new assets/*, KEEP old
  rmrf(TMP);
  pruneOldAssets(path.join(OUT_DIR, 'assets'), 30);
} else {
  rmrf(TMP);
  if (!fs.existsSync(TV_DIST)) { console.error('✗ No bundle available at', TV_DIST); process.exit(1); }
  console.log('▸ Staging from existing bundle (fallback):', TV_DIST);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  copyDir(TV_DIST, OUT_DIR);
  rewriteAssetPaths(OUT_DIR);
}

const manifest = { version: version, killSwitch: cfg.killSwitch === true, builtAt: new Date().toISOString() };
fs.writeFileSync(path.join(OUT_DIR, 'version.json'), JSON.stringify(manifest, null, 2));

// Cloudflare cache + CORS rules (Workers/Pages honour _headers):
//  • version.json  → never cached (TVs see updates immediately)
//  • assets/*      → cached forever (filenames are hashed)
//  • /*  ACAO *    → REQUIRED so the local file:// bootstrap can load the CDN's
//                    ES-module bundle (module scripts are always CORS-fetched).
fs.writeFileSync(path.join(OUT_DIR, '_headers'),
  '/*\n' +
  '  Access-Control-Allow-Origin: *\n' +
  '/version.json\n' +
  '  Cache-Control: no-cache, no-store, must-revalidate\n' +
  '  Access-Control-Allow-Origin: *\n' +
  '/assets/*\n' +
  '  Cache-Control: public, max-age=31536000, immutable\n' +
  '  Access-Control-Allow-Origin: *\n'
);

console.log('\n✅ CDN bundle ready:', OUT_DIR);
console.log('   version =', version, '| killSwitch =', manifest.killSwitch);
console.log('\n   Upload the WHOLE folder to your CDN root (cdnBase in cdn-config.json):');
console.log('     ' + cfg.cdnBase);
console.log('\n   Examples:');
console.log('     • Cloudflare Pages (wrangler):  wrangler pages deploy cdn-dist --project-name=megaradio-tv');
console.log('     • Cloudflare R2 / rsync / FTP:  upload cdn-dist/* to <cdnBase>');
console.log('\n   IMPORTANT: set a Cache-Bypass (or short TTL) rule for version.json so TVs see updates fast.');
