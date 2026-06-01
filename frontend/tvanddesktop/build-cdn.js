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
      // Vite emits assets under base "/api/tv-app/"; make them relative so the
      // app works from ANY origin (CDN path, or file:// local fallback).
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\/api\/tv-app\//g, './'));
    }
  }
}

const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const version = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS

console.log('▸ Building TV web bundle...');
try {
  const shell = process.platform === 'win32' ? true : (fs.existsSync('/bin/bash') ? '/bin/bash' : true);
  execSync('yarn build', { cwd: TV_SRC_DIR, stdio: 'inherit', shell, env: { ...process.env, VITE_APP_VERSION: version } });
} catch (e) {
  if (!fs.existsSync(TV_DIST)) { console.error('✗ Build failed and no previous bundle at', TV_DIST); process.exit(1); }
  console.warn('⚠ build failed — using existing bundle.');
}

console.log('▸ Staging CDN folder:', OUT_DIR);
rmrf(OUT_DIR);
copyDir(TV_DIST, OUT_DIR);
rewriteAssetPaths(OUT_DIR);

const manifest = { version: version, killSwitch: cfg.killSwitch === true, builtAt: new Date().toISOString() };
fs.writeFileSync(path.join(OUT_DIR, 'version.json'), JSON.stringify(manifest, null, 2));

// Cloudflare Pages cache rules (automatic — no dashboard config needed):
//  • version.json  → never cached (TVs see updates immediately)
//  • assets/*      → cached forever (filenames are hashed)
fs.writeFileSync(path.join(OUT_DIR, '_headers'),
  '/version.json\n' +
  '  Cache-Control: no-cache, no-store, must-revalidate\n' +
  '/assets/*\n' +
  '  Cache-Control: public, max-age=31536000, immutable\n'
);

console.log('\n✅ CDN bundle ready:', OUT_DIR);
console.log('   version =', version, '| killSwitch =', manifest.killSwitch);
console.log('\n   Upload the WHOLE folder to your CDN root (cdnBase in cdn-config.json):');
console.log('     ' + cfg.cdnBase);
console.log('\n   Examples:');
console.log('     • Cloudflare Pages (wrangler):  wrangler pages deploy cdn-dist --project-name=megaradio-tv');
console.log('     • Cloudflare R2 / rsync / FTP:  upload cdn-dist/* to <cdnBase>');
console.log('\n   IMPORTANT: set a Cache-Bypass (or short TTL) rule for version.json so TVs see updates fast.');
