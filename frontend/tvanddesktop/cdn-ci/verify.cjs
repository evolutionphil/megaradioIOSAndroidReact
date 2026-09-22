const fs = require('fs');
const path = require('path');
const { digest, entryReferences, validateBundle } = require('./bundle.cjs');

// Probe the actual file:// TV client shape. Generic automation user agents can
// receive a browser challenge even when the Samsung/LG requests are permitted.
const TV_USER_AGENTS = {
  samsung: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.5) AppleWebKit/537.36 (KHTML, like Gecko) 69.0.3497.106/5.5 TV Safari/537.36',
  lg: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 WebAppManager',
};

async function get(base, file, fetcher = fetch) {
  const url = new URL(file, base);
  // Match bundleUpdater.ts: timestamp query without a custom Cache-Control header.
  url.searchParams.set('_', Date.now().toString());
  const client = process.env.CDN_VERIFY_CLIENT || 'samsung';
  if (!TV_USER_AGENTS[client]) throw new Error('Unknown CDN_VERIFY_CLIENT');
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': TV_USER_AGENTS[client], Origin: 'null', Accept: file.endsWith('.json') ? 'application/json' : '*/*' },
  });
  if (!response.ok) throw new Error(`${url.origin}/${file}: HTTP ${response.status}; mitigation=${response.headers.get('cf-mitigated') || 'none'}; ray=${response.headers.get('cf-ray') || 'none'}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (/\.(js|css|json)$/.test(file) && /^\s*<!?html|^\s*<!doctype/i.test(bytes.toString('utf8'))) {
    throw new Error(`${file}: SPA fallback returned HTML instead of an asset`);
  }
  return { response, bytes };
}

async function verify(mode, directory, base, fetcher = fetch) {
  const local = validateBundle(directory, base);
  const manifestResponse = await get(base, 'version.json', fetcher);
  const remote = JSON.parse(manifestResponse.bytes.toString('utf8'));
  if (!remote.version || typeof remote.killSwitch !== 'boolean') throw new Error('Invalid live manifest');
  const remoteHtml = await get(base, 'index.html', fetcher);
  const references = entryReferences(remoteHtml.bytes.toString('utf8'), base);
  if (!references.some(file => file.startsWith('assets/') && file.endsWith('.js'))) throw new Error('Live entry has no bundled JS');
  if (mode === 'history') {
    // Failed/cancelled candidates may be newer than live. Only immutable paths must
    // match; the full historical archive was explicitly supplied by its maintainer.
    for (const file of references.filter(file => file.startsWith('assets/'))) {
      if (!local.files.includes(file)) throw new Error(`History does not contain live asset ${file}; import the full current CDN backup.`);
    }
    console.log(`History covers current live entry (${remote.version}).`);
    return;
  }
  if (remote.version !== local.manifest.version || remote.killSwitch !== local.manifest.killSwitch) throw new Error('Live version differs from this build');
  if (digest(remoteHtml.bytes) !== digest(Buffer.from(local.html))) throw new Error('Live HTML differs from this build');
  const cache = manifestResponse.response.headers.get('cache-control') || '';
  if (!/no-cache|no-store/.test(cache)) throw new Error('version.json must not be persistently cached');
  for (const [file, result] of [['version.json', manifestResponse], ['index.html', remoteHtml]]) {
    if (result.response.headers.get('access-control-allow-origin') !== '*') throw new Error(`Missing file:// CORS: ${file}`);
  }
  const old = local.files.find(file => file.startsWith('assets/') && !local.references.includes(file));
  for (const file of new Set([...local.references, ...(old ? [old] : [])])) {
    const { response, bytes } = await get(base, file, fetcher);
    if (digest(bytes) !== digest(fs.readFileSync(path.join(directory, file)))) throw new Error(`CDN file mismatch: ${file}`);
    if (/\.(js|css)$/.test(file) && response.headers.get('access-control-allow-origin') !== '*') throw new Error(`Missing file:// CORS: ${file}`);
  }
  console.log(`Live version ${remote.version} and entry assets verified.`);
}

module.exports = { get, verify, TV_USER_AGENTS };
if (require.main === module) {
  const here = path.resolve(__dirname, '..');
  const cfg = JSON.parse(fs.readFileSync(path.join(here, 'cdn-config.json'), 'utf8'));
  const mode = process.argv[2];
  const directory = path.resolve(process.argv[3] || path.join(here, 'cdn-dist'));
  (async () => {
    if (mode === 'local') { console.log(validateBundle(directory, cfg.cdnBase).manifest); return; }
    if (!['history', 'live'].includes(mode)) throw new Error('Usage: node cdn-ci/verify.cjs local|history|live [directory]');
    // Finite retry only AFTER publishing (edge propagation); never retry with a publish.
    for (let attempt = 0; ; attempt++) {
      try { await verify(mode, directory, cfg.cdnBase); break; }
      catch (error) { if (mode !== 'live' || attempt >= 4) throw error; await new Promise(resolve => setTimeout(resolve, 5000)); }
    }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}