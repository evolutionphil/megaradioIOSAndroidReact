const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const remoteBootstrap = fs.readFileSync(path.join(FRONTEND, 'tvanddesktop/remote-bootstrap.html'), 'utf8');
const startupGuard = fs.readFileSync(path.join(FRONTEND, 'tvanddesktop/apple-tv-and-macos/web-preview/public/js/startup-guard.js'), 'utf8');
const { activateLegacyEntry } = require(path.join(FRONTEND, 'tvanddesktop/_shared/legacy-entry.js'));
const { resolvedValue } = require(path.join(FRONTEND, 'tvanddesktop/apple-tv-and-macos/web-preview/compat/legacy-css.cjs'));

// CI builds cdn-dist before this suite; it must not depend on ignored native dist/.
const packagedAppHtml = fs.readFileSync(process.env.TV_LEGACY_HTML
  ? path.resolve(process.env.TV_LEGACY_HTML)
  : path.join(FRONTEND, 'tvanddesktop/cdn-dist/index.html'), 'utf8');

const bootstrapInlineScript = remoteBootstrap
  .match(/<script>([\s\S]*?)<\/script>/)?.[1]
  ?.replace(/__CDN_BASE__/g, 'https://cdn.test.local/')
  ?.replace(/__APP_VERSION__/g, '1.0.3');

if (!bootstrapInlineScript) throw new Error('Failed to extract inline bootstrap script');

function parseAttributes(attrText) {
  const attrs = [];
  const re = /([:\w-]+)(?:\s*=\s*(["'])([\s\S]*?)\2)?/g;
  let m;
  while ((m = re.exec(attrText || ''))) {
    attrs.push({ name: m[1], value: m[3] ?? '' });
  }
  return attrs;
}

function makeElement(tagName, attrs = [], textContent = '') {
  const attrMap = {};
  for (const attr of attrs) attrMap[attr.name] = attr.value;
  return {
    tagName: tagName.toUpperCase(),
    attributes: attrs,
    textContent,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrMap, name) ? attrMap[name] : null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrMap, name);
    },
  };
}

function parseRemoteHtml(html) {
  const linksAndStyles = [];
  const scripts = [];

  const linkRe = /<link\b([^>]*)>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    linksAndStyles.push(makeElement('link', parseAttributes(m[1])));
  }

  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html))) {
    linksAndStyles.push(makeElement('style', [], m[1]));
  }

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html))) {
    scripts.push(makeElement('script', parseAttributes(m[1]), m[2] || ''));
  }

  return {
    head: {
      querySelectorAll(sel) {
        return sel === 'link, style' ? linksAndStyles : [];
      },
    },
    body: {},
    querySelectorAll(sel) {
      return sel === 'script' ? scripts : [];
    },
    getElementById(id) {
      return scripts.find((s) => s.getAttribute('id') === id) || null;
    },
  };
}

function createTimerController() {
  let idSeq = 0;
  const timers = [];
  return {
    setTimeout(fn, ms) {
      idSeq += 1;
      timers.push({ id: idSeq, fn, ms, canceled: false });
      return idSeq;
    },
    clearTimeout(id) {
      const found = timers.find((t) => t.id === id);
      if (found) found.canceled = true;
    },
    runTimersByMs(ms) {
      for (const t of timers) {
        if (!t.canceled && t.ms === ms) t.fn();
      }
    },
  };
}

function createBootstrapHarness({
  cachedHtml,
  cachedVersion = '2026.01.01',
  favorites = '["fav1"]',
  failScriptContaining,
  stallScriptLoading = false,
  systemImportReject = false,
  exposeRuntimeProbe = false,
} = {}) {
  const timers = createTimerController();
  const listeners = {};
  const operations = [];
  const systemImportCalls = [];
  const appendedScripts = [];
  const localStorageData = new Map();

  if (cachedHtml != null) localStorageData.set('mr_cdn_html', cachedHtml);
  localStorageData.set('mr_cdn_ver', cachedVersion);
  localStorageData.set('favorites', favorites);

  const document = {
    head: {
      appendChild(node) {
        operations.push(`HEAD:${node.tagName}`);
      },
    },
    body: {
      appendChild(node) {
        if (node.tagName !== 'SCRIPT') return;
        appendedScripts.push(node);
        const src = node.src || '[inline]';
        operations.push(`SCRIPT:${src}`);
        if (src !== '[inline]' && failScriptContaining && src.includes(failScriptContaining)) {
          node.onerror?.(new Error(`failed: ${src}`));
          return;
        }
        if (stallScriptLoading) return;
        node.onload?.();
      },
    },
    addEventListener(event, handler) {
      listeners[event] = listeners[event] || new Set();
      listeners[event].add(handler);
    },
    removeEventListener(event, handler) {
      listeners[event]?.delete(handler);
    },
    dispatchEvent(evt) {
      const set = listeners[evt.type];
      if (!set) return;
      for (const h of Array.from(set)) h(evt);
    },
    createElement(tag) {
      const attrMap = {};
      return {
        tagName: String(tag).toUpperCase(),
        setAttribute(k, v) {
          attrMap[k] = String(v);
          this[k] = String(v);
        },
        getAttribute(k) {
          return Object.prototype.hasOwnProperty.call(attrMap, k) ? attrMap[k] : null;
        },
        hasAttribute(k) {
          return Object.prototype.hasOwnProperty.call(attrMap, k);
        },
        attributes: [],
        textContent: '',
        async: false,
      };
    },
    getElementById() {
      return null;
    },
  };

  function DOMParser() {}
  DOMParser.prototype.parseFromString = (s) => parseRemoteHtml(s || '');

  let fallbackCount = 0;
  let fallbackUrl = null;

  const localStorage = {
    getItem(k) {
      return localStorageData.has(k) ? localStorageData.get(k) : null;
    },
    setItem(k, v) {
      localStorageData.set(k, String(v));
    },
    removeItem(k) {
      localStorageData.delete(k);
      operations.push(`REMOVE:${k}`);
    },
  };

  const windowObj = {
    __MR_APP_READY__: false,
    __MR_BOOT_FALLBACK__: null,
    navigator: { userAgent: 'Mozilla/5.0 (Web0S; Linux) AppleWebKit/538' },
    location: {
      replace(url) {
        fallbackCount += 1;
        fallbackUrl = url;
        operations.push(`FALLBACK:${url}`);
      },
      href: '',
    },
    localStorage,
  };

  if (exposeRuntimeProbe) {
    windowObj.__MR_RUNTIME_PROBE__ = {
      sawTypeModuleNode: false,
      sawNoModuleNode: false,
      sawSystemImportCall: false,
    };
  }

  if (!stallScriptLoading) {
    windowObj.System = {
      import(specifier) {
        systemImportCalls.push(specifier);
        operations.push(`SYSTEM_IMPORT:${specifier}`);
        if (windowObj.__MR_RUNTIME_PROBE__) windowObj.__MR_RUNTIME_PROBE__.sawSystemImportCall = true;
        return {
          catch(fn) {
            if (systemImportReject) fn(new Error('System.import reject'));
            return this;
          },
        };
      },
    };
  }

  function Image() {}
  Object.defineProperty(Image.prototype, 'src', { set() {} });

  const context = {
    window: windowObj,
    document,
    navigator: windowObj.navigator,
    localStorage,
    DOMParser,
    Image,
    console,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  };

  vm.runInNewContext(bootstrapInlineScript, context, { filename: 'remote-bootstrap-inline.js' });

  return {
    windowObj,
    operations,
    systemImportCalls,
    appendedScripts,
    getFallbackCount: () => fallbackCount,
    getFallbackUrl: () => fallbackUrl,
    getStorageValue: (k) => localStorageData.get(k),
    runBootTimeout: () => timers.runTimersByMs(20000),
    dispatchReady: () => document.dispatchEvent({ type: 'megaradio-ready' }),
  };
}

function createStartupGuardHarness() {
  const timers = createTimerController();
  const listeners = {};
  let rootHtml = '';
  let reloadCount = 0;
  const retryButton = {
    onclick: null,
    focusCalled: false,
    focus() {
      this.focusCalled = true;
    },
    click() {
      if (typeof this.onclick === 'function') this.onclick();
    },
  };

  const document = {
    addEventListener(event, handler) {
      listeners[event] = listeners[event] || new Set();
      listeners[event].add(handler);
    },
    dispatchEvent(evt) {
      const set = listeners[evt.type];
      if (!set) return;
      for (const h of Array.from(set)) h(evt);
    },
    getElementById(id) {
      if (id !== 'root') return null;
      return {
        get innerHTML() {
          return rootHtml;
        },
        set innerHTML(v) {
          rootHtml = v;
        },
        querySelector(sel) {
          return sel === '[data-testid="tv-startup-retry"]' ? retryButton : null;
        },
      };
    },
  };

  const windowObj = {
    __MR_APP_READY__: false,
    __MR_BOOT_FALLBACK__: null,
    location: {
      reload() {
        reloadCount += 1;
      },
    },
  };

  const context = {
    window: windowObj,
    document,
    console,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  };

  vm.runInNewContext(startupGuard, context, { filename: 'startup-guard.js' });

  return {
    dispatchReady: () => document.dispatchEvent({ type: 'megaradio-ready' }),
    trigger25s: () => timers.runTimersByMs(25000),
    rootHtml: () => rootHtml,
    clickRetry: () => retryButton.click(),
    pressEnter: () => document.dispatchEvent({ type: 'keydown', keyCode: 13, preventDefault() {}, stopImmediatePropagation() {} }),
    reloadCount: () => reloadCount,
  };
}

test('bootstrap clears only OTA cache keys, not all localStorage', () => {
  assert.match(remoteBootstrap, /localStorage\.removeItem\('mr_cdn_html'\)/);
  assert.match(remoteBootstrap, /localStorage\.removeItem\('mr_cdn_ver'\)/);
  assert.doesNotMatch(remoteBootstrap, /localStorage\.clear\(/);
});

test('bootstrap protects legacy loader shape and fallback paths', () => {
  assert.match(remoteBootstrap, /!legacyPolyfill \|\| !legacyEntry \|\| !legacyEntry\.getAttribute\('data-src'\)/);
  assert.match(remoteBootstrap, /if \(type === 'module' \|\| sc\.hasAttribute\('nomodule'\) \|\| sc === legacyEntry \|\| sc === legacyPolyfill\) continue;/);
  assert.match(remoteBootstrap, /queue\.push\(legacyPolyfill\);/);
  assert.match(remoteBootstrap, /System\.import\(toAbs\(legacyEntry\.getAttribute\('data-src'\)\)\)/);
});

test('bootstrap success is gated by megaradio-ready and watchdog exists', () => {
  assert.match(remoteBootstrap, /document\.addEventListener\('megaradio-ready', onReady\)/);
  assert.match(remoteBootstrap, /bootTimer = setTimeout\(loadLocal, TIMEOUT\)/);
  assert.match(remoteBootstrap, /var TIMEOUT\s*=\s*20000/);
  assert.match(remoteBootstrap, /Only megaradio-ready[\s\S]*clears the watchdog/);
});

test('startup guard timeout UI and retry controls are present', () => {
  assert.match(startupGuard, /setTimeout\(failed, 25000\)/);
  assert.match(startupGuard, /data-testid="tv-startup-error"/);
  assert.match(startupGuard, /TV_STARTUP_TIMEOUT/);
  assert.match(startupGuard, /data-testid="tv-startup-retry"/);
});

test('legacy entry converter strips static module scripts and nomodule attrs', () => {
  const sample = `
    <link rel="modulepreload" href="/x.js">
    <script type="module" src="/modern.js"></script>
    <script nomodule>window.safariProbeShouldNotRun = true;</script>
    <script id="vite-legacy-polyfill" nomodule src="/poly.js"></script>
    <script id="vite-legacy-entry" nomodule data-src="/legacy.js"></script>
  `;
  const output = activateLegacyEntry(sample);
  assert.doesNotMatch(output, /type="module"/);
  assert.doesNotMatch(output, /modulepreload/);
  assert.doesNotMatch(output, /safariProbeShouldNotRun/);
  assert.doesNotMatch(output, /\snomodule/);
  assert.match(output, /id="vite-legacy-entry"/);
  assert.match(output, /data-src="\/legacy\.js"/);
});

test('legacy css resolver handles nested vars and cycle/unknown safely', () => {
  const vars = {
    '--a': 'var(--b)',
    '--b': '#ff4199',
    '--x': 'var(--y)',
    '--y': 'var(--x)',
  };
  assert.equal(resolvedValue('color: var(--a)', vars), 'color: #ff4199');
  assert.equal(resolvedValue('inset: var(--missing, 10px)', vars), 'inset: 10px');
  assert.equal(resolvedValue('border-color: var(--x)', vars), null);
});

test('bootstrap no-cache path immediately replaces with local app', () => {
  const h = createBootstrapHarness({ cachedHtml: null });
  assert.equal(h.getFallbackCount(), 1);
  assert.equal(h.getFallbackUrl(), './app/index.html');
});

test('bootstrap module-only cached html fails closed and keeps favorites', () => {
  const oldModuleOnly = '<html><head></head><body><script type="module" src="/assets/new.js"></script></body></html>';
  const h = createBootstrapHarness({ cachedHtml: oldModuleOnly, favorites: '["stay"]' });
  assert.equal(h.getFallbackCount(), 1);
  assert.equal(h.getStorageValue('mr_cdn_html'), undefined);
  assert.equal(h.getStorageValue('mr_cdn_ver'), undefined);
  assert.equal(h.getStorageValue('favorites'), '["stay"]');
});

test('bootstrap valid cached html uses classic queue and System.import with absolute legacy data-src', () => {
  const h = createBootstrapHarness({ cachedHtml: packagedAppHtml, exposeRuntimeProbe: true });
  assert.equal(h.getFallbackCount(), 0);
  assert.ok(h.systemImportCalls.length >= 1);
  const rawEntry = parseRemoteHtml(packagedAppHtml).getElementById('vite-legacy-entry').getAttribute('data-src');
  assert.equal(h.systemImportCalls[0], new URL(rawEntry, 'https://cdn.test.local/').href);
  assert.match(h.systemImportCalls[0], /index-legacy/);
  // Actual CDN HTML already has absolute URLs; also exercise relative package URLs.
  const sourceBase = new URL(rawEntry, 'https://cdn.test.local/').origin + '/';
  const relative = createBootstrapHarness({ cachedHtml: packagedAppHtml.split(sourceBase).join('') });
  assert.match(relative.systemImportCalls[0], /^https:\/\/cdn\.test\.local\//);

  const scriptSrcs = h.appendedScripts.map((s) => s.src).filter(Boolean);
  assert.ok(scriptSrcs.some((s) => /\/js\/polyfills\.js$/.test(s)));
  assert.ok(scriptSrcs.some((s) => /polyfills-legacy-/.test(s)));

  const polyfillNode = h.appendedScripts.find((s) => /polyfills-legacy-/.test(s.src || ''));
  assert.equal(polyfillNode?.id, 'vite-legacy-polyfill');
  for (const node of h.appendedScripts) {
    assert.notEqual(node.type, 'module');
    assert.equal(node.hasAttribute('nomodule'), false);
  }
  assert.equal(h.windowObj.__MR_RUNTIME_PROBE__.sawSystemImportCall, true);
  assert.equal(h.windowObj.__MR_RUNTIME_PROBE__.sawTypeModuleNode, false);
  assert.equal(h.windowObj.__MR_RUNTIME_PROBE__.sawNoModuleNode, false);
});

test('bootstrap script load alone does not mark success; timeout falls back once', () => {
  const h = createBootstrapHarness({ cachedHtml: packagedAppHtml });
  assert.equal(h.getFallbackCount(), 0);
  h.runBootTimeout();
  assert.equal(h.getFallbackCount(), 1);
});

test('bootstrap megaradio-ready event clears watchdog and prevents timeout fallback', () => {
  const h = createBootstrapHarness({ cachedHtml: packagedAppHtml });
  h.dispatchReady();
  h.runBootTimeout();
  assert.equal(h.getFallbackCount(), 0);
});

test('bootstrap external script error triggers exactly one local fallback', () => {
  const h = createBootstrapHarness({ cachedHtml: packagedAppHtml, failScriptContaining: '/js/polyfills.js' });
  assert.equal(h.getFallbackCount(), 1);
  h.runBootTimeout();
  assert.equal(h.getFallbackCount(), 1);
});

test('bootstrap System.import rejection triggers exactly one local fallback', () => {
  const h = createBootstrapHarness({ cachedHtml: packagedAppHtml, systemImportReject: true });
  assert.equal(h.getFallbackCount(), 1);
  h.runBootTimeout();
  assert.equal(h.getFallbackCount(), 1);
});

test('bootstrap stalled loading hits 20s timeout and falls back once', () => {
  const h = createBootstrapHarness({ cachedHtml: packagedAppHtml, stallScriptLoading: true });
  assert.equal(h.getFallbackCount(), 0);
  h.runBootTimeout();
  assert.equal(h.getFallbackCount(), 1);
});

test('startup guard 25s timeout shows retry UI and retry actions reload', () => {
  const h = createStartupGuardHarness();
  h.trigger25s();
  assert.match(h.rootHtml(), /data-testid="tv-startup-error"/);
  assert.match(h.rootHtml(), /TV_STARTUP_TIMEOUT/);
  h.clickRetry();
  h.pressEnter();
  assert.ok(h.reloadCount() >= 2);
});

test('startup guard ready event cancels timeout UI', () => {
  const h = createStartupGuardHarness();
  h.dispatchReady();
  h.trigger25s();
  assert.equal(h.rootHtml(), '');
});