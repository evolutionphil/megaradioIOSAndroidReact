/**
 * bundleUpdater.ts — background OTA for the Tizen/WebOS packages (cache-first).
 *
 * The store package boots INSTANTLY (no network) from either:
 *   • the bundled local copy (fresh install), or
 *   • the last CDN index.html cached in localStorage by THIS module.
 *
 * After the app has painted, we quietly check the CDN for a newer bundle and, if
 * found, stash its index.html in localStorage so the NEXT launch boots the update
 * instantly. `killSwitch` clears the cache → next launch falls back to the bundled
 * local copy (rollback). Old hashed assets are kept on the CDN by build-cdn.js, so
 * a cached older index.html never 404s.
 *
 * Runs ONLY inside the packaged TV app (file:// origin) — never on the web preview
 * or Electron (https), so it can't interfere with normal web usage.
 */
const CDN_BASE = 'https://cdn.themegaradio.com/'; // infra constant (matches cdn-config.json)
const HTML_KEY = 'mr_cdn_html';
const VER_KEY = 'mr_cdn_ver';

export function scheduleBundleUpdate(): void {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    if (window.location.protocol !== 'file:') return; // packaged TV app only
    window.setTimeout(runUpdate, 4000); // after first paint, low priority
  } catch {
    /* noop */
  }
}

async function runUpdate(): Promise<void> {
  const manifestTxt = await getT(CDN_BASE + 'version.json?_=' + Date.now(), 8000);
  if (!manifestTxt) return;
  let manifest: { version?: string; killSwitch?: boolean } | null = null;
  try { manifest = JSON.parse(manifestTxt); } catch { return; }
  if (!manifest) return;

  if (manifest.killSwitch === true) {
    lsDel(HTML_KEY); lsDel(VER_KEY); // rollback → bundled local copy next launch
    return;
  }

  const newVer = manifest.version ? String(manifest.version) : '';
  const curVer = lsGet(VER_KEY) || '';
  if (newVer && newVer === curVer) return; // already cached the latest

  const html = await getT(CDN_BASE + 'index.html?_=' + Date.now(), 8000);
  if (!html || html.indexOf('<script') === -1) return;
  lsSet(HTML_KEY, html);
  lsSet(VER_KEY, newVer);
  prewarm(html); // warm the HTTP cache so next launch is instant
}

function prewarm(html: string): void {
  try {
    const re = /(?:src|href)="(https:\/\/[^"]+\.(?:js|css|woff2))"/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(html)) !== null && n < 12) {
      n++;
      const url = m[1];
      try { fetch(url, { mode: 'no-cors' as RequestMode }).catch(() => {}); } catch { /* noop */ }
    }
  } catch {
    /* noop */
  }
}

function getT(url: string, ms: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', url, true);
      try { x.timeout = ms; } catch { /* noop */ }
      x.onreadystatechange = () => {
        if (x.readyState === 4) resolve(x.status >= 200 && x.status < 300 ? x.responseText : null);
      };
      x.onerror = () => resolve(null);
      x.ontimeout = () => resolve(null);
      x.send();
    } catch {
      resolve(null);
    }
  });
}

function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* quota */ } }
function lsDel(k: string): void { try { localStorage.removeItem(k); } catch { /* noop */ } }
