#!/usr/bin/env node
/**
 * Prepares LG WebOS package contents in tvanddesktop/lg-webos/dist/
 *
 * Steps:
 *   1. Re-build the TV web-preview bundle (yarn build → dist/)
 *   2. Copy dist/* → tvanddesktop/lg-webos/dist/
 *   3. Copy appinfo.json + icon.png + largeIcon.png
 *
 * After this script, package with ares-package CLI (installed with webOS TV CLI):
 *   $ ares-package tvanddesktop/lg-webos/dist
 *   → produces com.themegaradio.app_1.0.2_all.ipk in the current directory.
 *
 * Install to dev TV:
 *   $ ares-setup-device --add LG_TV --info "{...}"   (one time)
 *   $ ares-install --device LG_TV com.themegaradio.app_1.0.2_all.ipk
 *
 * For LG Content Store submission: upload the .ipk on http://seller.lgappstv.com
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
try {
  const shell = process.platform === 'win32' ? true : (fs.existsSync('/bin/bash') ? '/bin/bash' : true);
  execSync('yarn build', { cwd: TV_SRC_DIR, stdio: 'inherit', shell });
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

console.log('▸ Copying TV bundle → lg-webos/dist/');
copyDir(TV_DIST, OUT_DIR);

console.log('▸ Copying WebOS manifest + icons');
fs.copyFileSync(path.join(__dirname, 'appinfo.json'), path.join(OUT_DIR, 'appinfo.json'));
fs.copyFileSync(path.join(__dirname, 'icon.png'),      path.join(OUT_DIR, 'icon.png'));
fs.copyFileSync(path.join(__dirname, 'largeIcon.png'), path.join(OUT_DIR, 'largeIcon.png'));
fs.copyFileSync(path.join(__dirname, 'splash.png'),    path.join(OUT_DIR, 'splash.png'));

// Rewrite HTML / CSS ONLY. JS is OFF LIMITS — see prepare-tizen.js for the
// full explanation. Naive text rewrite on minified JS breaks regex literals
// like `/^\/api/` (becomes invalid regex → "Unexpected token ','" on TV).
// Runtime detectApiBase() in AuthContext + subscription hooks already
// returns https://api.themegaradio.com under file://, so no JS rewrite
// is needed; we only need to fix asset paths in HTML/CSS.
console.log('▸ Rewriting absolute /api/* asset paths in HTML/CSS (NEVER touch JS)...');
function rewriteFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  s = s.replace(/\/api\/tv-app\//g, './');
  fs.writeFileSync(filePath, s);
}
function walkAndRewrite(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAndRewrite(p);
    else if (/\.(html|css)$/.test(entry.name)) rewriteFile(p);
  }
}
walkAndRewrite(OUT_DIR);

console.log('\n✅ WebOS project ready at:', OUT_DIR);
console.log('   Package with:');
console.log('     ares-package', OUT_DIR);
console.log('   Install on dev TV:');
console.log('     ares-install --device LG_TV com.themegaradio.app_1.0.2_all.ipk');
