#!/usr/bin/env node
// Build the shared TV web bundle at cdnBase ROOT. Never publish a stale fallback.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateBundle, digest } = require('./cdn-ci/bundle.cjs');

function build({ here = __dirname, run = execFileSync, env = process.env } = {}) {
  const cfg = JSON.parse(fs.readFileSync(path.join(here, 'cdn-config.json'), 'utf8'));
  const base = new URL(cfg.cdnBase);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !cfg.cdnBase.endsWith('/')) {
    throw new Error('cdnBase must be an HTTPS directory URL with a trailing slash.');
  }
  const version = env.CDN_BUILD_VERSION || new Date().toISOString().replace(/\D/g, '');
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(version)) throw new Error('Invalid CDN_BUILD_VERSION');
  const source = path.join(here, 'apple-tv-and-macos/web-preview');
  const out = path.join(here, 'cdn-dist');
  const tmp = out + '-tmp';
  fs.rmSync(tmp, { recursive: true, force: true });
  try {
    run(process.execPath, [path.join(source, 'node_modules/vite/bin/vite.js'), 'build',
      `--base=${cfg.cdnBase}`, `--outDir=${tmp}`, '--emptyOutDir'], {
      cwd: source, stdio: 'inherit', env: { ...env, VITE_APP_VERSION: version },
    });
    const manifest = { version, killSwitch: cfg.killSwitch === true, builtAt: new Date().toISOString() };
    fs.writeFileSync(path.join(tmp, 'version.json'), JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(tmp, '_headers'),
      '/*\n  Access-Control-Allow-Origin: *\n' +
      '/\n  Cache-Control: no-cache, max-age=0, must-revalidate, no-transform\n' +
      '/index.html\n  Cache-Control: no-cache, max-age=0, must-revalidate, no-transform\n' +
      '/version.json\n  Cache-Control: no-cache, no-store, must-revalidate\n' +
      '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n' +
      '/js/*\n  Cache-Control: no-cache, max-age=0, must-revalidate\n' +
      '/css/*\n  Cache-Control: no-cache, max-age=0, must-revalidate\n');
    const current = validateBundle(tmp, cfg.cdnBase);
    // The same hashed URL must never acquire different bytes across releases.
    for (const file of current.files.filter(file => file.startsWith('assets/'))) {
      const previous = path.join(out, file);
      if (fs.existsSync(previous) && digest(fs.readFileSync(previous)) !== digest(fs.readFileSync(path.join(tmp, file)))) {
        throw new Error(`Immutable asset collision: ${file}`);
      }
    }
    // History was restored before this call in CI. No automatic age-based deletion:
    // a TV can be offline for months and still carry an old cached index.html.
    fs.mkdirSync(out, { recursive: true });
    fs.cpSync(tmp, out, { recursive: true });
    const result = validateBundle(out, cfg.cdnBase);
    console.log(`CDN build ready: ${out}; version=${version}; files=${result.files.length}`);
    return result;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { build };
if (require.main === module) {
  try { build(); } catch (error) { console.error('CDN build STOPPED:', error.message); process.exitCode = 1; }
}