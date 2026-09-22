// Remote verification semantics via fake fetch (no network).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { get, verify } = require('../verify.cjs');

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-verify-test-'));
}

function writeLocalBundle(dir, version = 'v1') {
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'main.hash.js'), 'console.log(1)');
  fs.writeFileSync(path.join(dir, 'assets', 'main.hash.css'), 'body{}');
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    '<!doctype html><html><head><link rel="stylesheet" href="assets/main.hash.css"></head><body><script src="assets/main.hash.js"></script></body></html>'
  );
  fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version, killSwitch: false }));
}

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'access-control-allow-origin': '*', ...headers } });
}

test('get rejects SPA fallback HTML for JS asset', async () => {
  const fakeFetch = async () => response('<!doctype html><html>spa fallback</html>', 200, { 'content-type': 'text/html' });
  await assert.rejects(
    () => get('https://cdn.themegaradio.com/', 'assets/main.js', fakeFetch),
    /SPA fallback returned HTML/
  );
});

test('verify live rejects wrong version, HTML mismatch, missing CORS, and bad cache header', async () => {
  const dir = mkdtemp();
  writeLocalBundle(dir, 'v-local');
  const base = 'https://cdn.themegaradio.com/';

  // Wrong version first.
  await assert.rejects(
    () => verify('live', dir, base, async (url) => {
      const file = new URL(url).pathname.slice(1);
      if (file === 'version.json') return response(JSON.stringify({ version: 'v-other', killSwitch: false }), 200, { 'cache-control': 'no-store' });
      if (file === 'index.html') return response(fs.readFileSync(path.join(dir, 'index.html')), 200);
      return response(fs.readFileSync(path.join(dir, file)), 200, { 'access-control-allow-origin': '*' });
    }),
    /Live version differs/
  );

  // HTML mismatch.
  await assert.rejects(
    () => verify('live', dir, base, async (url) => {
      const file = new URL(url).pathname.slice(1);
      if (file === 'version.json') return response(JSON.stringify({ version: 'v-local', killSwitch: false }), 200, { 'cache-control': 'no-store' });
      if (file === 'index.html') {
        return response('<!doctype html><html><body><script src="assets/main.hash.js"></script><!-- changed --></body></html>', 200);
      }
      return response(fs.readFileSync(path.join(dir, file)), 200, { 'access-control-allow-origin': '*' });
    }),
    /Live HTML differs/
  );

  // Bad cache header.
  await assert.rejects(
    () => verify('live', dir, base, async (url) => {
      const file = new URL(url).pathname.slice(1);
      if (file === 'version.json') return response(JSON.stringify({ version: 'v-local', killSwitch: false }), 200, { 'cache-control': 'public, max-age=3600' });
      if (file === 'index.html') return response(fs.readFileSync(path.join(dir, 'index.html')), 200);
      return response(fs.readFileSync(path.join(dir, file)), 200, { 'access-control-allow-origin': '*' });
    }),
    /version.json must not be persistently cached/
  );

  // Missing CORS on JS/CSS.
  await assert.rejects(
    () => verify('live', dir, base, async (url) => {
      const file = new URL(url).pathname.slice(1);
      if (file === 'version.json') return response(JSON.stringify({ version: 'v-local', killSwitch: false }), 200, { 'cache-control': 'no-cache' });
      if (file === 'index.html') return response(fs.readFileSync(path.join(dir, 'index.html')), 200);
      const headers = file.endsWith('.js') || file.endsWith('.css') ? { 'access-control-allow-origin': 'https://blocked.example' } : {};
      return response(fs.readFileSync(path.join(dir, file)), 200, headers);
    }),
    /Missing file:\/\/ CORS/
  );
});

test('history mode allows newer remote version if live hashed refs exist, rejects if missing', async () => {
  const dir = mkdtemp();
  writeLocalBundle(dir, 'candidate-v2');
  const base = 'https://cdn.themegaradio.com/';

  await verify('history', dir, base, async (url) => {
    const file = new URL(url).pathname.slice(1);
    if (file === 'version.json') return response(JSON.stringify({ version: 'live-old', killSwitch: false }), 200, { 'cache-control': 'no-cache' });
    if (file === 'index.html') {
      return response('<!doctype html><html><body><script src="assets/main.hash.js"></script></body></html>', 200);
    }
    return response(fs.readFileSync(path.join(dir, file)), 200, { 'access-control-allow-origin': '*' });
  });

  await assert.rejects(
    () => verify('history', dir, base, async (url) => {
      const file = new URL(url).pathname.slice(1);
      if (file === 'version.json') return response(JSON.stringify({ version: 'live-old', killSwitch: false }), 200, { 'cache-control': 'no-cache' });
      if (file === 'index.html') {
        return response('<!doctype html><html><body><script src="assets/missing.hash.js"></script></body></html>', 200);
      }
      return response('not-used', 200);
    }),
    /History does not contain live asset/
  );
});

for (const file of ['version.json', 'index.html', 'assets/main.hash.js']) {
  for (const cors of ['', '*, *']) {
    test(`live verification rejects CORS ${JSON.stringify(cors)} on ${file}`, async () => {
      const dir = mkdtemp();
      try {
        writeLocalBundle(dir);
        await assert.rejects(() => verify('live', dir, 'https://cdn.themegaradio.com/', async url => {
          const requested = new URL(url).pathname.slice(1);
          return response(fs.readFileSync(path.join(dir, requested)), 200, {
            'cache-control': 'no-store',
            'access-control-allow-origin': requested === file ? cors : '*',
          });
        }), /Missing file:\/\/ CORS/);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    });
  }
}
