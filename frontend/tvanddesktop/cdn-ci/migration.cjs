const fs = require('node:fs');
const path = require('node:path');
const { digest, validateBundle } = require('./bundle.cjs');
const { get, verify } = require('./verify.cjs');
const here = path.resolve(__dirname, '..');
const baseline = require('./legacy-baseline.json');
const base = require('../cdn-config.json').cdnBase;

function guard(config) {
  if (config.name !== 'megaradio-tv-cdn' || config.name === baseline.service ||
      config.main !== 'cdn-ci/worker.mjs' ||
      !config.services?.some(s => s.binding === 'LEGACY_CDN' && s.service === baseline.service) ||
      config.assets?.binding !== 'ASSETS' || config.assets?.run_worker_first !== true ||
      config.assets?.not_found_handling !== 'none' || config.assets?.html_handling !== 'none' ||
      config.routes?.length !== 1 || config.routes[0].pattern !== 'cdn.themegaradio.com/*' ||
      config.routes[0].zone_name !== 'themegaradio.com' || config.routes[0].custom_domain) {
    throw new Error('Unsafe migration configuration: keep the original Worker and its asset store intact.');
  }
}

async function checkAssets(origin, fetcher = fetch, cors = false) {
  for (const [file, hash] of Object.entries(baseline.assets)) {
    const result = await get(origin, file, fetcher);
    if (digest(result.bytes) !== hash) throw new Error(`Legacy asset changed or missing: ${file}`);
    if (cors && result.response.headers.get('access-control-allow-origin') !== '*') throw new Error(`Legacy CORS: ${file}`);
  }
}

async function run(mode, directory = path.join(here, 'cdn-dist'), fetcher = fetch) {
  guard(JSON.parse(fs.readFileSync(path.join(here, 'wrangler.jsonc'), 'utf8')));
  if (mode === 'live') {
    await checkAssets(base, fetcher, true);
    console.log('Original CDN assets remain available through the production route.');
    return;
  }
  const legacy = JSON.parse((await get(baseline.base, 'version.json', fetcher)).bytes);
  if (legacy.version !== baseline.version) throw new Error('The preserved original Worker changed; stop and review.');
  await checkAssets(baseline.base, fetcher);
  if (mode === 'bootstrap' || mode === 'history') {
    const remote = JSON.parse((await get(base, 'version.json', fetcher)).bytes);
    if (remote.version === baseline.version) {
      await checkAssets(base, fetcher);
    } else if (mode === 'bootstrap') {
      throw new Error('Cannot bootstrap again after migration. Restore the cumulative release archive.');
    } else {
      await verify('history', directory, base, fetcher);
    }
    console.log('History protected by the original Worker plus cumulative post-migration checkpoints.');
  } else if (mode === 'collisions') {
    const local = validateBundle(directory, base);
    for (const file of local.files.filter(f => f.startsWith('assets/'))) {
      const response = await fetcher(new URL(file, baseline.base), { signal: AbortSignal.timeout(20000) });
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`Legacy collision check failed: ${file}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if ((response.headers.get('content-type') || '').includes('text/html')) continue; // old SPA miss
      if (digest(bytes) !== digest(fs.readFileSync(path.join(directory, file)))) throw new Error(`Legacy immutable collision: ${file}`);
    }
    console.log('No new hashed URL overwrites an original CDN asset.');
  } else throw new Error('Unknown migration check');
}
module.exports = { guard, checkAssets, run };
if (require.main === module) run(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
