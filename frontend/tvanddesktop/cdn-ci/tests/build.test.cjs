// Build helper behavior with injected run() (no real vite build).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { build } = require('../../build-cdn.js');

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-build-test-'));
}

function setupWorkspace(root, cdnBase = 'https://cdn.themegaradio.com/') {
  fs.mkdirSync(path.join(root, 'cdn-ci'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apple-tv-and-macos', 'web-preview', 'node_modules', 'vite', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'cdn-config.json'), JSON.stringify({ cdnBase, killSwitch: false }));
}

function writeBundleOutput(tmpOut, contentSuffix = 'A') {
  fs.mkdirSync(path.join(tmpOut, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(tmpOut, 'assets', 'app.hash.js'), `console.log('${contentSuffix}');`);
  fs.writeFileSync(path.join(tmpOut, 'assets', 'app.hash.css'), `body{--x:${contentSuffix};}`);
  fs.writeFileSync(
    path.join(tmpOut, 'index.html'),
    '<!doctype html><html><head><link rel="stylesheet" href="assets/app.hash.css"></head><body><script src="assets/app.hash.js"></script></body></html>'
  );
}

test('build success preserves old hashed assets regardless of mtime and writes expected metadata/headers', () => {
  const root = mkdtemp();
  setupWorkspace(root);
  const outDir = path.join(root, 'cdn-dist');
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
  const oldAsset = path.join(outDir, 'assets', 'old.keep.js');
  fs.writeFileSync(oldAsset, 'legacy');
  const oldTime = new Date('2001-01-01T00:00:00.000Z');
  fs.utimesSync(oldAsset, oldTime, oldTime);

  const fakeRun = (_exec, args) => {
    const outDirArg = args.find((a) => a.startsWith('--outDir='));
    writeBundleOutput(outDirArg.replace('--outDir=', ''), 'A');
  };

  const result = build({ here: root, run: fakeRun, env: { ...process.env, CDN_BUILD_VERSION: 'ver-1' } });
  assert.ok(result.files.includes('assets/old.keep.js'));
  assert.equal(fs.readFileSync(oldAsset, 'utf8'), 'legacy');
  assert.deepEqual(jsonRead(path.join(outDir, 'version.json')), { version: 'ver-1', killSwitch: false, builtAt: jsonRead(path.join(outDir, 'version.json')).builtAt });
  const headers = fs.readFileSync(path.join(outDir, '_headers'), 'utf8');
  assert.match(headers, /Access-Control-Allow-Origin: \*/);
  assert.match(headers, /\/assets\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers, /\/js\/\*\n  Cache-Control: no-cache, max-age=0, must-revalidate/);
  assert.match(headers, /\/css\/\*\n  Cache-Control: no-cache, max-age=0, must-revalidate/);
});

test('build rejects invalid cdnBase and invalid build version', () => {
  const root = mkdtemp();
  setupWorkspace(root, 'http://cdn.themegaradio.com/');
  assert.throws(
    () => build({ here: root, run: () => {} }),
    /cdnBase must be an HTTPS directory URL/
  );

  const root2 = mkdtemp();
  setupWorkspace(root2);
  assert.throws(
    () => build({ here: root2, run: () => {}, env: { ...process.env, CDN_BUILD_VERSION: 'bad version with spaces' } }),
    /Invalid CDN_BUILD_VERSION/
  );
});

test('same hashed path with different bytes is rejected', () => {
  const root = mkdtemp();
  setupWorkspace(root);
  const outDir = path.join(root, 'cdn-dist');
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'assets', 'app.hash.js'), "console.log('old');");

  const fakeRun = (_exec, args) => {
    const outDirArg = args.find((a) => a.startsWith('--outDir='));
    writeBundleOutput(outDirArg.replace('--outDir=', ''), 'NEW');
  };

  assert.throws(
    () => build({ here: root, run: fakeRun, env: { ...process.env, CDN_BUILD_VERSION: 'v2' } }),
    /Immutable asset collision: assets\/app.hash.js/
  );
});

test('build throw from run keeps previous output and does not fallback/overwrite', () => {
  const root = mkdtemp();
  setupWorkspace(root);
  const outDir = path.join(root, 'cdn-dist');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify({ version: 'old', killSwitch: false }));

  const explodingRun = () => {
    throw new Error('vite failed');
  };

  assert.throws(
    () => build({ here: root, run: explodingRun, env: { ...process.env, CDN_BUILD_VERSION: 'new' } }),
    /vite failed/
  );
  assert.equal(jsonRead(path.join(outDir, 'version.json')).version, 'old');
  assert.ok(!fs.existsSync(path.join(root, 'cdn-dist-tmp')));
});

function jsonRead(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
