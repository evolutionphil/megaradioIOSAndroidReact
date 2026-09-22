const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { guard, checkAssets, run } = require('../migration.cjs');
const baseline = require('../legacy-baseline.json');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../wrangler.jsonc'), 'utf8'));

test('deployment may never replace the original asset store or detach its fallback', () => {
  guard(config);
  for (const change of [
    { name: baseline.service }, { services: [] },
    { assets: { ...config.assets, not_found_handling: 'single-page-application' } },
    { routes: [{ pattern: 'cdn.themegaradio.com', custom_domain: true }] },
  ]) assert.throws(() => guard({ ...config, ...change }), /Unsafe migration/);
});

test('missing legacy assets stop migration', async () => {
  await assert.rejects(() => checkAssets(baseline.base, async () => new Response('missing', { status: 404 })), /HTTP 404/);
  await assert.rejects(() => checkAssets(baseline.base, async () => new Response('changed')), /Legacy asset changed/);
});

test('changed original Worker version stops migration', async () => {
  await assert.rejects(() => run('bootstrap', '/unused', async () => new Response('{"version":"unexpected"}')), /original Worker changed/);
});

async function worker() { return (await import('../worker.mjs')).default; }
function req(file, method = 'GET') { return new Request('https://cdn.themegaradio.com/' + file, { method }); }

test('new assets win and do not call the legacy store', async () => {
  let fallback = 0;
  const result = await (await worker()).fetch(req('assets/new.js'), {
    ASSETS: { fetch: async () => new Response('new', { headers: { 'Access-Control-Allow-Origin': '*, *' } }) },
    LEGACY_CDN: { fetch: async () => { fallback++; return new Response('old'); } },
  });
  assert.equal(await result.text(), 'new'); assert.equal(fallback, 0);
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(result.headers.get('Cache-Control'), /immutable/);
});

test('unknown old asset is served from intact legacy store with normalized CORS', async () => {
  const result = await (await worker()).fetch(req('assets/unknown-old.js'), {
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    LEGACY_CDN: { fetch: async () => new Response('old bytes', { headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*, *' } }) },
  });
  assert.equal(await result.text(), 'old bytes');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), '*');
});

test('legacy SPA miss becomes 404 rather than successful HTML masquerading as JS', async () => {
  const result = await (await worker()).fetch(req('assets/missing.js'), {
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    LEGACY_CDN: { fetch: async () => new Response('<html>old</html>', { headers: { 'Content-Type': 'text/html' } }) },
  });
  assert.equal(result.status, 404);
});

test('root and index preserve current bootstrap bytes and disable transformations', async () => {
  for (const file of ['', 'index.html']) {
    const result = await (await worker()).fetch(req(file), {
      ASSETS: { fetch: async request => { assert.equal(new URL(request.url).pathname, '/index.html'); return new Response('<html>current</html>', { headers: { 'Content-Type': 'text/html' } }); } },
      LEGACY_CDN: { fetch: async () => assert.fail('must not call old entry') },
    });
    assert.equal(await result.text(), '<html>current</html>');
    assert.match(result.headers.get('Cache-Control'), /no-transform/);
  }
});

test('broken current entry and manifest never fall back to stale version', async () => {
  for (const file of ['', 'index.html', 'version.json']) {
    const result = await (await worker()).fetch(req(file), {
      ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
      LEGACY_CDN: { fetch: async () => assert.fail('must not hide broken deployment') },
    });
    assert.equal(result.status, 404);
  }
});

test('preflight and unsupported methods do not fetch assets', async () => {
  assert.equal((await (await worker()).fetch(req('assets/a.js', 'OPTIONS'), {})).status, 204);
  assert.equal((await (await worker()).fetch(req('assets/a.js', 'POST'), {})).status, 405);
});
