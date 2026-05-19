#!/usr/bin/env node
/**
 * Prepares Samsung Tizen package contents in tvanddesktop/samsung-tizen/dist/
 *
 * Steps:
 *   1. Re-build the TV web-preview bundle (yarn build → dist/)
 *   2. Copy dist/* → tvanddesktop/samsung-tizen/dist/
 *   3. Copy config.xml + icon.png alongside index.html
 *
 * After this script:
 *   • Open Tizen Studio
 *   • File → Import → Tizen Project → root = tvanddesktop/samsung-tizen/dist/
 *   • Right-click project → Build Signed Package → .wgt is produced.
 *
 * Re-run this script every time you change TV web sources.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT  = path.resolve(__dirname, '..', '..', '..');
const TV_SRC_DIR = path.join(REPO_ROOT, 'frontend', 'tvanddesktop', 'apple-tv-and-macos', 'web-preview');
// Vite outputs to /backend/static/tv-preview (configured in web-preview/vite.config.ts)
const TV_DIST    = path.join(REPO_ROOT, 'backend', 'static', 'tv-preview');
const OUT_DIR    = path.join(__dirname, 'dist');

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('▸ Building TV web bundle...');
// Read version from config.xml so the embedded version + manifest are in sync,
// and the UpdateBanner can compare against /api/tv/version.
let tizenVersion = '1.0.2';
try {
  const cfg = fs.readFileSync(path.join(__dirname, 'config.xml'), 'utf8');
  const m = cfg.match(/version="([\d.]+)"/);
  if (m) tizenVersion = m[1];
} catch (_) {}
console.log('  embedded VITE_APP_VERSION =', tizenVersion);
try {
  const shell = process.platform === 'win32' ? true : (fs.existsSync('/bin/bash') ? '/bin/bash' : true);
  execSync('yarn build', {
    cwd: TV_SRC_DIR,
    stdio: 'inherit',
    shell,
    env: { ...process.env, VITE_APP_VERSION: tizenVersion },
  });
} catch (e) {
  console.warn('⚠ yarn build başarısız oldu — TV_DIST mevcut ise devam edeceğim.');
  if (!fs.existsSync(TV_DIST)) {
    console.error('✗ TV bundle bulunamadı:', TV_DIST);
    console.error('  Lütfen önce şunu çalıştırın:');
    console.error('  cd ' + TV_SRC_DIR + ' && yarn build');
    process.exit(1);
  }
}

console.log('▸ Cleaning output:', OUT_DIR);
rmrf(OUT_DIR);

console.log('▸ Copying TV bundle → samsung-tizen/dist/');
copyDir(TV_DIST, OUT_DIR);

console.log('▸ Copying Tizen manifest + icon');
fs.copyFileSync(path.join(__dirname, 'config.xml'), path.join(OUT_DIR, 'config.xml'));
fs.copyFileSync(path.join(__dirname, 'icon.png'),   path.join(OUT_DIR, 'icon.png'));

// Tizen Studio'nun "Import Tizen Project" wizard'ı bir klasörü algılamak için
// Eclipse-tarzı .project + .tproject meta dosyalarına ihtiyaç duyar. Bunlar
// olmadan import wizard "Project list" alanını boş gösterir.
console.log('▸ Adding Eclipse/Tizen meta files (.project, .tproject)');
fs.copyFileSync(path.join(__dirname, '.project.template'),  path.join(OUT_DIR, '.project'));
fs.copyFileSync(path.join(__dirname, '.tproject.template'), path.join(OUT_DIR, '.tproject'));

// Rewrite absolute /api/* paths so the bundle works inside file:// containers.
// IMPORTANT — must NOT double-prefix already-absolute URLs of ANY origin
// (themegaradio.com, backend.radiolise.com, third-party stream domains, etc.).
// We park EVERY scheme://host/api/... match before doing the relative-/api/
// rewrite, then restore them verbatim afterwards.
console.log('▸ Rewriting absolute /api/* paths in HTML + JS + CSS...');
const BACKEND_HOST = 'https://api.themegaradio.com';

function rewriteFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');

  // 1) Park ALL absolute URLs containing /api/ (any scheme: http, https, ws, wss).
  const parked = [];
  s = s.replace(/(https?|wss?):\/\/[^\s"'`<>()]+/g, (match) => {
    const token = `__MR_URL_${parked.length}__`;
    parked.push(match);
    return token;
  });

  // 2) Asset prefix → relative (we're running from file:// inside Tizen).
  s = s.replace(/\/api\/tv-app\//g, './');

  // 3) Remaining /api/... (relative backend calls) → absolute backend host.
  s = s.replace(/\/api\//g, BACKEND_HOST + '/api/');

  // 4) Restore parked URLs verbatim.
  s = s.replace(/__MR_URL_(\d+)__/g, (_, i) => parked[Number(i)]);

  fs.writeFileSync(filePath, s);
}

function walkAndRewrite(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAndRewrite(p);
    else if (/\.(html|js|css|mjs|map)$/.test(entry.name)) rewriteFile(p);
  }
}
walkAndRewrite(OUT_DIR);

console.log('\n✅ Tizen project ready at:', OUT_DIR);
console.log('   Import this folder into Tizen Studio:');
console.log('   File → Import → Tizen → Tizen Project → next →');
console.log('   "Select root directory" =', OUT_DIR);
