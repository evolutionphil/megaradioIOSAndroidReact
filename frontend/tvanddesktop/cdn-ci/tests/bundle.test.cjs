// Bundle validation and entry-reference rules.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { entryReferences, validateBundle } = require('../bundle.cjs');

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-bundle-test-'));
}

function writeValidBundle(dir, opts = {}) {
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'app.123.js'), 'console.log(1);');
  fs.writeFileSync(path.join(dir, 'assets', 'app.123.css'), 'body{}');
  const html = opts.html ?? [
    '<!doctype html><html><head>',
    '<link rel="stylesheet" href="assets/app.123.css">',
    '</head><body>',
    '<script src="assets/app.123.js"></script>',
    '</body></html>',
  ].join('');
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version: 'v1', killSwitch: false }));
}

test('entryReferences accepts absolute CDN and relative refs, ignores external SDK refs', () => {
  const html = [
    '<script src="assets/a.js"></script>',
    '<script src="https://cdn.themegaradio.com/assets/b.js"></script>',
    '<script src="https://unpkg.com/sdk.js"></script>',
    '<img src="https://cdn.themegaradio.com/assets/logo.png">',
  ].join('');
  const refs = entryReferences(html, 'https://cdn.themegaradio.com/');
  assert.deepEqual(new Set(refs), new Set(['assets/a.js', 'assets/b.js', 'assets/logo.png']));
});

test('validateBundle rejects missing JS entry', () => {
  const dir = mkdtemp();
  writeValidBundle(dir, {
    html: '<!doctype html><html><body><link rel="stylesheet" href="assets/app.123.css"><script src="https://example.com/sdk.js"></script></body></html>',
  });
  assert.throws(() => validateBundle(dir, 'https://cdn.themegaradio.com/'), /Missing bundled JS entry/);
});

test('validateBundle rejects missing referenced dependency (including CSS)', () => {
  const dir = mkdtemp();
  writeValidBundle(dir);
  fs.rmSync(path.join(dir, 'assets', 'app.123.css'));
  assert.throws(() => validateBundle(dir, 'https://cdn.themegaradio.com/'), /Missing entry dependency/);
});

test('validateBundle rejects symlink and private env files', () => {
  const dir = mkdtemp();
  writeValidBundle(dir);
  const linkPath = path.join(dir, 'assets', 'symlink.js');
  fs.symlinkSync(path.join(dir, 'assets', 'app.123.js'), linkPath);
  assert.throws(() => validateBundle(dir, 'https://cdn.themegaradio.com/'), /Symlink forbidden/);

  fs.rmSync(linkPath);
  fs.writeFileSync(path.join(dir, '.env.production'), 'SECRET=x');
  assert.throws(() => validateBundle(dir, 'https://cdn.themegaradio.com/'), /Private\/source file/);
});

test('validateBundle rejects file-count limit exceedance', () => {
  const dir = mkdtemp();
  writeValidBundle(dir);
  for (let i = 0; i < 20001; i += 1) {
    fs.writeFileSync(path.join(dir, 'assets', `f-${i}.txt`), 'x');
  }
  assert.throws(
    () => validateBundle(dir, 'https://cdn.themegaradio.com/'),
    /20,000-file limit/
  );
});
