const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const preview = path.resolve(__dirname, '../../apple-tv-and-macos/web-preview');
const ts = require(path.join(preview, 'node_modules/typescript'));
const cdnBuild = 'gha-35752167926-1-58df6021d3ae2caff555aa32445cd455245c7657';

function load(file, globals, modules) {
  const source = fs.readFileSync(path.join(preview, 'src', file), 'utf8')
    .replace(/import\.meta/g, 'testImportMeta');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const context = { exports: {}, ...globals, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  } };
  vm.runInNewContext(output, context);
  return context.exports;
}

async function check({ platform = 'tizen', native = '1.0.3', build = cdnBuild,
  latest = '1.0.3', minimum, unavailable = false, metadataError = false,
  location = 'file:///media/developer/apps/megaradio/index.html', dismissed = null } = {}) {
  let state;
  let requestedMetadata;
  const effects = [];
  const window = { location: new URL(location) };
  if (platform === 'tizen') window.tizen = { application: {
    getCurrentApplication: () => {
      if (unavailable) throw new Error('Native API unavailable');
      return { appInfo: { version: native } };
    },
  } };
  if (platform === 'desktop') window.megaRadioDesktop = { isDesktop: true };
  const hook = load('hooks/useTvVersionCheck.ts', {
    window, navigator: { userAgent: platform, language: 'tr' }, URL,
    testImportMeta: { env: { VITE_APP_VERSION: build } },
    localStorage: { getItem: () => dismissed },
    fetch: async () => ({ ok: true, json: async () => ({
      latest: { [platform]: latest }, minimum: { [platform]: minimum },
      storeUrl: { [platform]: 'https://www.themegaradio.com/tv/samsung' },
    }) }),
    XMLHttpRequest: class {
      open(method, url) { requestedMetadata = url; }
      send() {
        if (unavailable) { this.ontimeout(); return; }
        this.status = 0;
        this.responseText = metadataError ? '<html>404</html>' : JSON.stringify({ version: native });
        this.onload();
      }
    },
  }, { react: {
    useState: initial => { state = initial; return [state, value => { state = value; }]; },
    useEffect: effect => effects.push(effect),
  } });
  hook.useTvVersionCheck();
  effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  return { state, requestedMetadata };
}

test('Samsung 1.0.3 with a gha CDN build never prompts for the already installed 1.0.3', async () => {
  assert.equal((await check()).state.kind, 'none');
});
test('real older Samsung packages still receive soft and required updates without website links', async () => {
  const soft = (await check({ native: '1.0.2' })).state;
  assert.equal(soft.kind, 'soft');
  assert.equal(soft.storeUrl, undefined);
  assert.equal((await check({ native: '1.0.2', minimum: '1.0.3' })).state.kind, 'forced');
  assert.equal((await check({ native: '1.0.10', latest: '1.0.9' })).state.kind, 'none');
});
test('missing or invalid native/backend versions do not become 0.0.0', async () => {
  for (const args of [{ unavailable: true }, { native: cdnBuild }, { latest: 'garbage' },
    { latest: '1.0.4junk' }, { native: '', minimum: '1.0.3' }, { platform: 'web' }]) {
    assert.equal((await check(args)).state.kind, 'none');
  }
});
test('LG CDN bootstrap and local fallback read installed appinfo outside the app subfolder', async () => {
  for (const location of ['file:///media/developer/apps/megaradio/index.html#/settings',
    'file:///media/developer/apps/megaradio/app/index.html#/settings']) {
    const current = await check({ platform: 'webos', location });
    assert.equal(current.state.kind, 'none');
    assert.equal(current.requestedMetadata, 'file:///media/developer/apps/megaradio/appinfo.json');
    const older = await check({ platform: 'webos', location, native: '1.0.2' });
    assert.equal(older.state.kind, 'soft');
    assert.equal(older.state.storeUrl, undefined);
  }
});
test('LG metadata timeout, malformed JSON and non-package context never trigger false updates', async () => {
  for (const args of [{ unavailable: true }, { metadataError: true }, { location: 'https://cdn.themegaradio.com/' }]) {
    assert.equal((await check({ platform: 'webos', ...args })).state.kind, 'none');
  }
});
test('desktop valid package versions still compare and soft dismissal cooldown remains effective', async () => {
  assert.equal((await check({ platform: 'desktop', build: '1.0.2' })).state.kind, 'soft');
  assert.equal((await check({ native: '1.0.2', dismissed: String(Date.now()) })).state.kind, 'none');
  assert.equal((await check({ native: '1.0.2', minimum: '1.0.3', dismissed: String(Date.now()) })).state.kind, 'forced');
});

test('TV update prompts expose no navigation action and remote OK dismisses optional updates', () => {
  for (const kind of ['soft', 'forced']) {
    let keyHandler;
    let dismissals = 0;
    let reloads = 0;
    const jsx = (type, props) => ({ type, props });
    const component = load('components/UpdateBanner.tsx', {
      window: {
        open: () => assert.fail('TV must never open an update website'),
        location: { reload: () => { reloads++; } },
        addEventListener: (name, fn) => { keyHandler = fn; },
        removeEventListener() {},
      },
    }, {
      react: { useEffect: fn => fn(), useRef: () => ({ current: null }), useState: () => [0, () => {}] },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '../hooks/useTvVersionCheck': {
        useTvVersionCheck: () => ({ kind, latest: '1.0.4', minimum: '1.0.4' }),
        dismissSoftUpdate: () => { dismissals++; },
      },
    });
    const tree = component.UpdateBanner();
    assert.doesNotMatch(JSON.stringify(tree), /update-banner-(?:soft|forced)-store-btn/);
    if (kind === 'soft') {
      keyHandler({ key: 'Enter', keyCode: 13, preventDefault() {}, stopImmediatePropagation() {} });
      assert.equal(dismissals, 1);
      assert.equal(reloads, 1);
    }
  }
});
