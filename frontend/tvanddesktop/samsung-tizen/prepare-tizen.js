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
try {
  // Lokal Mac/Linux/Windows uyumlu shell seçimi
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

// Rewrite absolute /api/tv-app/ asset paths to relative ./ paths so the
// bundle works both when served by FastAPI (backend preview) AND when loaded
// from local file:// inside Tizen/WebOS WebApp containers.
console.log('▸ Rewriting absolute asset paths to relative...');
const htmlPath = path.join(OUT_DIR, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/(src|href)="\/api\/tv-app\//g, '$1="./');
fs.writeFileSync(htmlPath, html);

console.log('\n✅ Tizen project ready at:', OUT_DIR);
console.log('   Import this folder into Tizen Studio:');
console.log('   File → Import → Tizen → Tizen Project → next →');
console.log('   "Select root directory" =', OUT_DIR);
