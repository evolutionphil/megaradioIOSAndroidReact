const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function compileTsModule(tsPath, mocks = {}, globals = {}) {
  const source = read(tsPath);
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: tsPath,
  }).outputText;

  const module = { exports: {} };
  const dirname = path.dirname(tsPath);
  const localRequire = (spec) => {
    if (spec in mocks) return mocks[spec];
    if (spec.startsWith('.')) {
      const resolved = path.resolve(dirname, spec);
      if (resolved in mocks) return mocks[resolved];
    }
    throw new Error(`Missing mock for require("${spec}")`);
  };

  const context = {
    module,
    exports: module.exports,
    require: localRequire,
    __filename: tsPath,
    __dirname: dirname,
    console,
    clearTimeout,
    setTimeout,
    ...globals,
  };
  vm.runInNewContext(transpiled, context, { filename: tsPath });
  return module.exports;
}

function createHookRuntime() {
  const state = [];
  const deps = [];
  const pendingEffects = [];
  let hookIndex = 0;

  function beginRender() {
    hookIndex = 0;
  }

  function useState(initialValue) {
    const index = hookIndex++;
    if (!(index in state)) state[index] = initialValue;
    const setState = (next) => {
      state[index] = typeof next === 'function' ? next(state[index]) : next;
    };
    return [state[index], setState];
  }

  function useEffect(effectFn, effectDeps) {
    const index = hookIndex++;
    const prev = deps[index];
    const changed = !prev || !effectDeps || effectDeps.some((d, i) => d !== prev[i]);
    if (changed) {
      deps[index] = effectDeps;
      pendingEffects.push(effectFn);
    }
  }

  function flushEffects() {
    while (pendingEffects.length > 0) {
      const fn = pendingEffects.shift();
      fn();
    }
  }

  return { beginRender, useState, useEffect, flushEffects };
}

function createImageWithFallbackHarness() {
  const runtime = createHookRuntime();
  const calls = [];

  const reactMock = {
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children } };
    },
    useState: runtime.useState,
    useEffect: runtime.useEffect,
  };
  reactMock.default = reactMock;

  const expoImageModule = {
    Image: (props) => {
      calls.push(props);
      return { type: 'ExpoImage', props };
    },
  };

  const mod = compileTsModule('/app/frontend/src/components/ImageWithFallback.tsx', {
    react: reactMock,
    'expo-image': expoImageModule,
    '../utils/stationLogoHelper': {
      DEFAULT_STATION_LOGO_SOURCE: 'LOCAL_FALLBACK',
    },
  });

  const Component = mod.ImageWithFallback;

  function render(props) {
    runtime.beginRender();
    const element = Component(props);
    runtime.flushEffects();
    return element;
  }

  return { render, calls };
}

function createStationShareHarness({ fetchImpl, getStationImpl }) {
  const calls = { getStation: 0, fetch: [] };
  const stationShare = compileTsModule('/app/frontend/src/utils/stationShare.ts', {
    'expo-constants': {
      expoConfig: { extra: { websiteUrl: 'https://themegaradio.com' } },
      default: { expoConfig: { extra: { websiteUrl: 'https://themegaradio.com' } } },
    },
    '../services/stationService': {
      stationService: {
        getStation: async (id) => {
          calls.getStation += 1;
          return getStationImpl(id);
        },
      },
    },
  }, {
    AbortController,
    fetch: async (url, init = {}) => {
      calls.fetch.push({ url, init });
      return fetchImpl(url, init);
    },
  });

  return { ...stationShare, calls };
}

async function run() {
  const carMode = read('/app/frontend/src/components/CarModeScreen.tsx');
  const player = read('/app/frontend/app/player.tsx');
  const shareModal = read('/app/frontend/src/components/ShareModal.tsx');
  const optionsSheet = read('/app/frontend/src/components/PlayerOptionsSheet.tsx');
  const appJson = JSON.parse(read('/app/frontend/app.json'));

  // ImageWithFallback behavioral checks (not just source-string assertions).
  {
    {
      const { render } = createImageWithFallbackHarness();
      // primary -> fallbackUri -> local fallback after two errors
      let el = render({ uri: 'https://a/logo.png', fallbackUri: 'https://b/fallback.png', style: { w: 1 } });
      assert.strictEqual(el.props.source.uri, 'https://a/logo.png');
      el.props.onError?.({ nativeEvent: {} });
      el = render({ uri: 'https://a/logo.png', fallbackUri: 'https://b/fallback.png', style: { w: 1 } });
      assert.strictEqual(el.props.source.uri, 'https://b/fallback.png');
      el.props.onError?.({ nativeEvent: {} });
      el = render({ uri: 'https://a/logo.png', fallbackUri: 'https://b/fallback.png', style: { w: 1 } });
      assert.strictEqual(el.props.source, 'LOCAL_FALLBACK');
    }

    {
      const { render } = createImageWithFallbackHarness();
      // missing uri -> fallbackUri immediately
      const el = render({ uri: '', fallbackUri: 'https://b/fallback.png' });
      assert.strictEqual(el.props.source.uri, 'https://b/fallback.png');
    }

    {
      const { render } = createImageWithFallbackHarness();
      // missing uri + fallbackUri -> local fallback
      const el = render({ uri: '', fallbackUri: '' });
      assert.strictEqual(el.props.source, 'LOCAL_FALLBACK');
    }

    {
      const { render } = createImageWithFallbackHarness();
      // uri change resets stage (second render applies useEffect reset)
      let el = render({ uri: 'https://old/logo.png', fallbackUri: 'https://old/fallback.png' });
      el.props.onError?.({ nativeEvent: {} }); // move to stage1
      el = render({ uri: 'https://new/logo.png', fallbackUri: 'https://old/fallback.png' });
      el = render({ uri: 'https://new/logo.png', fallbackUri: 'https://old/fallback.png' });
      assert.strictEqual(el.props.source.uri, 'https://new/logo.png');
    }

    {
      const { render } = createImageWithFallbackHarness();
      // external onError composed
      let onErrCalls = 0;
      let el = render({
        uri: 'https://x/logo.png',
        fallbackUri: 'https://y/fallback.png',
        onError: () => { onErrCalls += 1; },
      });
      el.props.onError?.({ nativeEvent: {} });
      el = render({
        uri: 'https://x/logo.png',
        fallbackUri: 'https://y/fallback.png',
        onError: () => { onErrCalls += 1; },
      });
      el.props.onError?.({ nativeEvent: {} });
      assert.strictEqual(onErrCalls, 2);
    }
  }

  // Car mode and player wiring testIDs.
  assert(carMode.includes('testID={`car-mode-logo-${posIdx}-${station._id}`}'));
  assert(carMode.includes('<ImageWithFallback'));
  assert(player.includes('testID={`player-grid-logo-${station._id}`}'));
  assert(player.includes('<ImageWithFallback'));
  assert(!player.includes('https://themegaradio.com/logo.png'), 'Player should not hardcode remote logo fallback in grid');

  // Canonical website url.
  assert.strictEqual(appJson.expo.extra.websiteUrl, 'https://themegaradio.com');

  // stationShare behavior (explicit globals: fetch + AbortController) including HEAD edge cases.
  const baseGetStation = async (id) => {
    if (id === 'old-history-id') return { _id: id, slug: 'best-fm-2', name: 'Best FM', noIndex: true };
    if (id === 'missing-slug-id') return { _id: id, slug: '', name: 'NoSlug' };
    return { _id: id, slug: 'virgin-radio-turkiye', name: 'Virgin' };
  };

  // HEAD 200 -> canonical
  {
    const { stationShareUrl, resolveStationShareUrl, stationShareContent, calls } = createStationShareHarness({
      getStationImpl: baseGetStation,
      fetchImpl: async () => ({ status: 200 }),
    });

    assert.strictEqual(
      stationShareUrl({ slug: 'virgin-radio-turkiye' }),
      'https://themegaradio.com/station/virgin-radio-turkiye'
    );
    assert.strictEqual(stationShareUrl({ slug: 'best fm 2' }), 'https://themegaradio.com/station/best%20fm%202');
    assert.strictEqual(stationShareUrl({ slug: '' }), null);

    // Existing slug: no detail fetch.
    const direct = await resolveStationShareUrl({ _id: '1', slug: 'virgin-radio-turkiye', name: 'Virgin' });
    assert.strictEqual(direct, 'https://themegaradio.com/station/virgin-radio-turkiye');
    assert.strictEqual(calls.getStation, 0);
    assert.strictEqual(calls.fetch[0].init.method, 'HEAD');
    assert(calls.fetch[0].init.signal, 'AbortController signal should be passed to fetch');

    // Missing slug recovery + noIndex true should still be valid with HEAD 200.
    const fetched = await resolveStationShareUrl({ _id: 'old-history-id', slug: '', name: 'Best FM' });
    assert.strictEqual(fetched, 'https://themegaradio.com/station/best-fm-2');
    assert.strictEqual(calls.getStation, 1);

    // Missing slug after fetch should throw user-visible error.
    await assert.rejects(
      () => resolveStationShareUrl({ _id: 'missing-slug-id', slug: '', name: 'NoSlug' }),
      /Paylaşım bağlantısı hazırlanamadı/
    );

    // stationShareContent: exactly one canonical URL and no duplicate `url` field.
    const content = stationShareContent(
      { _id: '2', slug: 'best-fm-2', name: 'Best FM' },
      'https://themegaradio.com/station/best-fm-2',
      'Live Show'
    );
    assert.strictEqual(typeof content.message, 'string');
    assert.strictEqual((content.message.match(/https:\/\/themegaradio\.com\/station\/best-fm-2/g) || []).length, 1);
    assert.ok(!Object.prototype.hasOwnProperty.call(content, 'url'));
  }

  // HEAD 404/410 -> deleted/unavailable message (both direct + recovered slug).
  for (const status of [404, 410]) {
    const { resolveStationShareUrl } = createStationShareHarness({
      getStationImpl: baseGetStation,
      fetchImpl: async () => ({ status }),
    });
    await assert.rejects(
      () => resolveStationShareUrl({ _id: '1', slug: 'virgin-radio-turkiye', name: 'Virgin' }),
      /Bu radyonun web paylaşım sayfası şu anda kullanılamıyor/
    );
    await assert.rejects(
      () => resolveStationShareUrl({ _id: 'old-history-id', slug: '', name: 'Best FM' }),
      /Bu radyonun web paylaşım sayfası şu anda kullanılamıyor/
    );
  }

  // HEAD 405 is not "deleted".
  {
    const { resolveStationShareUrl } = createStationShareHarness({
      getStationImpl: baseGetStation,
      fetchImpl: async () => ({ status: 405 }),
    });
    const out = await resolveStationShareUrl({ _id: '1', slug: 'virgin-radio-turkiye', name: 'Virgin' });
    assert.strictEqual(out, 'https://themegaradio.com/station/virgin-radio-turkiye');
  }

  // Network failure should keep existing/recovered slug (no fake ID/no alternate station swap).
  {
    const { resolveStationShareUrl } = createStationShareHarness({
      getStationImpl: baseGetStation,
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    const existing = await resolveStationShareUrl({ _id: '1', slug: 'virgin-radio-turkiye', name: 'Virgin' });
    assert.strictEqual(existing, 'https://themegaradio.com/station/virgin-radio-turkiye');

    const recovered = await resolveStationShareUrl({ _id: 'old-history-id', slug: '', name: 'Best FM' });
    assert.strictEqual(recovered, 'https://themegaradio.com/station/best-fm-2');
  }

  // Timeout/abort path should also preserve slug.
  {
    const { resolveStationShareUrl } = createStationShareHarness({
      getStationImpl: baseGetStation,
      fetchImpl: async (_url, init) => new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
    });
    const started = Date.now();
    const out = await resolveStationShareUrl({ _id: '1', slug: 'virgin-radio-turkiye', name: 'Virgin' });
    const elapsed = Date.now() - started;
    assert.strictEqual(out, 'https://themegaradio.com/station/virgin-radio-turkiye');
    assert(elapsed >= 2900, `abort timeout should be ~3s, got ${elapsed}ms`);
  }

  // Share entry points must use shared helper.
  assert(shareModal.includes('resolveStationShareUrl(station)'));
  assert(shareModal.includes('stationShareContent(station, url, nowPlayingTitle)'));
  assert(shareModal.includes('const url = await resolveStationShareUrl(station);'));
  assert(shareModal.includes('await action(url);'));
  assert(shareModal.includes('setShareError('));
  assert(optionsSheet.includes('resolveStationShareUrl(station)'));
  assert(optionsSheet.includes('stationShareContent(station, url)'));
  assert(optionsSheet.includes('Clipboard.setStringAsync(await resolveStationShareUrl(station))'));
  assert(optionsSheet.includes('const url = await resolveStationShareUrl(station);'));
  assert(!shareModal.includes('/station/${station._id}'));
  assert(!optionsSheet.includes('/station/${station._id}'));

  console.log('PASS regression_issue49_share_and_image');
}

run().catch((err) => {
  console.error('FAIL regression_issue49_share_and_image:', err);
  process.exit(1);
});
