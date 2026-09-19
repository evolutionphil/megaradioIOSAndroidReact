const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('/app/frontend/tvanddesktop/remote-bootstrap.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  ?.replace(/__CDN_BASE__/g, 'https://cdn.themegaradio.com/')
  ?.replace(/__APP_VERSION__/g, '1.0.0');
if (!script) throw new Error('bootstrap script not found');

function extractScripts(remoteHtml) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(remoteHtml))) {
    const attrs = m[1] || '';
    const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] || null;
    const type = attrs.match(/type=["']([^"']+)["']/i)?.[1] || '';
    out.push({ src, type, text: m[2] || '' });
  }
  return out;
}

function runScenario({ name, cachedHtml, failScriptSrc, scriptLoadMode = 'ok', expectFallback, expectOrder = [] }) {
  const operations = [];
  let fallbackCount = 0;
  const timers = [];
  const storage = new Map();
  if (cachedHtml != null) storage.set('mr_cdn_html', cachedHtml);
  storage.set('mr_cdn_ver', '20260101');

  const document = {
    head: {
      appendChild(node) {
        if (node.tagName === 'LINK' && node.rel === 'stylesheet' && node.onerror && scriptLoadMode === 'link-error') {
          node.onerror(new Error('stylesheet failed'));
        }
      },
    },
    body: {
      appendChild(node) {
        if (node.tagName === 'SCRIPT') {
          operations.push(node.src || '[inline]');
          if (node.src && failScriptSrc && node.src.includes(failScriptSrc) && node.onerror) {
            node.onerror(new Error('network fail'));
            return;
          }
          if (scriptLoadMode === 'timeout') return;
          if (node.onload) node.onload();
        }
      },
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        attrs: {},
        setAttribute(k, v) {
          this.attrs[k] = v;
          this[k] = v;
        },
        getAttribute(k) { return this.attrs[k] ?? null; },
        textContent: '',
        async: false,
      };
    },
  };

  function DOMParser() {}
  DOMParser.prototype.parseFromString = (s) => {
    if (!s || !s.trim()) return { head: null, body: null };
    const scripts = extractScripts(s);
    return {
      head: {
        querySelectorAll(sel) {
          if (sel !== 'link, style') return [];
          return [];
        },
      },
      body: {},
      querySelectorAll(sel) {
        if (sel === 'script') {
          return scripts.map((x) => ({
            getAttribute(name) {
              if (name === 'src') return x.src;
              if (name === 'type') return x.type;
              if (name === 'crossorigin') return null;
              return null;
            },
            textContent: x.text,
          }));
        }
        return [];
      },
    };
  };

  const window = {
    location: {
      replace(url) { fallbackCount += 1; operations.push(`FALLBACK:${url}`); },
      href: '',
      protocol: 'file:',
    },
    navigator: { userAgent: 'tizen tv' },
    localStorage: {
      getItem(k) { return storage.has(k) ? storage.get(k) : null; },
      setItem(k, v) { storage.set(k, String(v)); },
    },
  };

  function Image() {}
  Object.defineProperty(Image.prototype, 'src', { set() {} });

  const context = {
    window,
    document,
    navigator: window.navigator,
    localStorage: window.localStorage,
    DOMParser,
    Image,
    console,
    setTimeout(fn, ms) {
      const entry = { fn, ms, canceled: false };
      timers.push(entry);
      return timers.length;
    },
    clearTimeout(id) {
      const idx = typeof id === 'number' ? id - 1 : -1;
      if (idx >= 0 && timers[idx]) timers[idx].canceled = true;
    },
  };

  vm.runInNewContext(script, context, { filename: 'remote-bootstrap-inline.js' });

  // Run timeout callback(s) to emulate stuck load fallback behavior.
  for (const t of timers) {
    if (t.canceled) continue;
    if (scriptLoadMode === 'timeout' || t.ms === 6000) t.fn();
  }

  assert.strictEqual(fallbackCount > 0, expectFallback, `${name}: fallback expectation mismatch`);
  if (expectOrder.length) {
    const filtered = operations.filter((x) => !x.startsWith('FALLBACK:'));
    assert.deepStrictEqual(filtered, expectOrder, `${name}: script order mismatch`);
  }
}

function run() {
  runScenario({
    name: 'cdn script error -> local fallback once',
    cachedHtml: '<html><head></head><body><script src="/js/helper.js"></script><script src="/js/app.js" type="module"></script></body></html>',
    failScriptSrc: '/js/helper.js',
    expectFallback: true,
  });

  runScenario({
    name: 'stuck load timeout -> local fallback',
    cachedHtml: '<html><head></head><body><script src="/js/helper.js"></script><script src="/js/app.js" type="module"></script></body></html>',
    scriptLoadMode: 'timeout',
    expectFallback: true,
  });

  runScenario({
    name: 'successful queue -> no fallback and preserved order',
    cachedHtml: '<html><head></head><body><script src="/js/one.js"></script><script src="/js/two.js"></script><script src="/js/main.js" type="module"></script></body></html>',
    expectFallback: false,
    expectOrder: [
      'https://cdn.themegaradio.com/js/one.js',
      'https://cdn.themegaradio.com/js/two.js',
      'https://cdn.themegaradio.com/js/main.js',
    ],
  });

  runScenario({
    name: 'empty html -> fail closed to local',
    cachedHtml: '',
    expectFallback: true,
  });

  console.log('PASS regression_remote_bootstrap');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_remote_bootstrap:', err);
  process.exit(1);
}
