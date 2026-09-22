const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript/lib/typescript.js');

let assertions = 0;
const check = (condition, message) => {
  assertions += 1;
  assert.ok(condition, message);
};

function resolveTsFile(specifier, parentFile) {
  if (specifier.startsWith('@/')) {
    const base = path.join('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src', specifier.slice(2));
    return resolveWithExtensions(base);
  }
  if (specifier.startsWith('.')) {
    const base = path.resolve(path.dirname(parentFile), specifier);
    return resolveWithExtensions(base);
  }
  return null;
}

function resolveWithExtensions(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`Cannot resolve module: ${base}`);
}

function compileTs(source, filename) {
  return ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      skipLibCheck: true,
    },
  }).outputText;
}

function makeRunner({ stubs = {}, sourceMutators = {}, globals = {} } = {}) {
  const cache = new Map();

  const load = (entryFile) => {
    const resolved = path.resolve(entryFile);
    if (cache.has(resolved)) return cache.get(resolved).exports;

    let source = fs.readFileSync(resolved, 'utf8');
    if (typeof sourceMutators[resolved] === 'function') {
      source = sourceMutators[resolved](source);
    }
    const compiled = compileTs(source, resolved);

    const module = { exports: {} };
    const sandbox = {
      module,
      exports: module.exports,
      __filename: resolved,
      __dirname: path.dirname(resolved),
      console,
      process,
      globalThis: null,
      ...globals,
    };
    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;

    const localRequire = (specifier) => {
      if (Object.prototype.hasOwnProperty.call(stubs, specifier)) {
        return stubs[specifier];
      }
      const tsFile = resolveTsFile(specifier, resolved);
      if (tsFile) return load(tsFile);
      return require(specifier);
    };

    sandbox.require = localRequire;
    cache.set(resolved, module);
    vm.runInNewContext(compiled, sandbox, { filename: resolved });
    return module.exports;
  };

  return { load };
}

function createReactHarness() {
  const stateSlots = [];
  const refSlots = [];
  const cleanups = [];
  const updates = [];
  let hookIndex = 0;

  const react = {
    useState: (initial) => {
      const idx = hookIndex++;
      if (!(idx in stateSlots)) {
        stateSlots[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setter = (next) => {
        stateSlots[idx] = typeof next === 'function' ? next(stateSlots[idx]) : next;
        updates.push(stateSlots[idx]);
      };
      return [stateSlots[idx], setter];
    },
    useRef: (initial) => {
      const idx = hookIndex++;
      if (!(idx in refSlots)) {
        refSlots[idx] = { current: initial };
      }
      return refSlots[idx];
    },
    useEffect: (fn) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
  };

  return {
    react,
    beginRender: () => { hookIndex = 0; },
    cleanupAll: () => {
      while (cleanups.length) {
        const fn = cleanups.pop();
        fn();
      }
    },
    getUpdates: () => [...updates],
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function testNowPlayingLibFormattingAndResolvedUrlPreference() {
  const runner = makeRunner();
  const mod = runner.load('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/nowPlaying.ts');

  check(mod.formatNowPlaying({ title: ' Senem ', artist: ' İzzet Altınmeşe ' }, 'Türkülerle Türkiye') === 'İzzet Altınmeşe - Senem', 'flat now-playing payload should format artist-title');
  check(mod.formatNowPlaying({ metadata: { title: 'Song A', artist: 'Song A' } }, '') === 'Song A', 'wrapped payload with same artist/title should collapse to title');
  check(mod.formatNowPlaying({ title: 'Now Playing' }, 'X') === null, 'placeholder title must return null');
  check(mod.formatNowPlaying({ metadata: { title: 'Türkülerle Türkiye' } }, 'Türkülerle Türkiye') === null, 'station-name echo must return null');

  const resolvedPreferred = mod.getMetadataStreamUrl({
    url: 'http://37.247.98.8/listen.pls?sid=22',
    url_resolved: 'http://37.247.98.8/stream/22/;',
  });
  check(resolvedPreferred === 'http://37.247.98.8/stream/22/;', 'url_resolved must be preferred over playlist url');

  const camelResolved = mod.getMetadataStreamUrl({
    url: 'http://station/listen.pls',
    urlResolved: 'https://station/stream/direct',
  });
  check(camelResolved === 'https://station/stream/direct', 'urlResolved should be preferred before url when url_resolved is missing');
}

async function testNowPlayingHookTransientWsErrorAndCleanup() {
  const hookFile = '/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/hooks/useNowPlayingMetadata.ts';
  const harness = createReactHarness();

  let wsCallback = null;
  let wsTerminated = false;
  let wsTrackUrl = '';
  let wsClientCreated = 0;
  let intervalCalls = 0;
  let clearIntervalCalls = 0;

  const megaRadioApi = {
    getStationMetadata: async () => ({ metadata: { title: 'Senem', artist: 'İzzet Altınmeşe' } }),
  };

  const runner = makeRunner({
    sourceMutators: {
      [hookFile]: (src) => src.replace(/\(import\.meta as any\)\.env\?\.VITE_METADATA_WS/g, 'undefined'),
    },
    stubs: {
      react: harness.react,
      '@radiolise/metadata-client': {
        createMetadataClient: () => {
          wsClientCreated += 1;
          return {
            subscribe: (cb) => {
              wsCallback = cb;
              return { unsubscribe: () => {} };
            },
            trackStream: async (url) => { wsTrackUrl = url; },
            terminate: () => { wsTerminated = true; },
          };
        },
      },
      '@/services/megaRadioApi': { megaRadioApi },
      '@/lib/nowPlaying': makeRunner().load('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/nowPlaying.ts'),
    },
    globals: {
      setInterval: () => { intervalCalls += 1; return 99; },
      clearInterval: () => { clearIntervalCalls += 1; },
      Date,
    },
  });

  const mod = runner.load(hookFile);
  harness.beginRender();
  mod.useNowPlayingMetadata({
    _id: '68a8c49fbd66579311ab78a1',
    name: 'Türkülerle Türkiye',
    url: 'http://37.247.98.8/listen.pls?sid=22',
    url_resolved: 'http://37.247.98.8/stream/22/;',
  }, true);
  await flushMicrotasks();

  const updates = harness.getUpdates();
  check(updates.includes('İzzet Altınmeşe - Senem'), 'initial API poll should set formatted metadata title');
  check(intervalCalls === 1, 'isPlaying=true should enable polling interval');
  check(wsClientCreated === 1, 'ws metadata client should be created for resolved non-playlist stream');
  check(wsTrackUrl === 'http://37.247.98.8/stream/22/;', 'ws tracking must use resolved stream URL, not playlist URL');

  const beforeErrorLen = harness.getUpdates().length;
  wsCallback && wsCallback({ title: '', error: new Error('transient') });
  check(harness.getUpdates().length === beforeErrorLen, 'transient ws error must not wipe existing API title');

  wsCallback && wsCallback({ title: 'Canlı Yayın - Yeni Şarkı' });
  check(harness.getUpdates().at(-1) === 'Canlı Yayın - Yeni Şarkı', 'valid ws title should replace API fallback');

  harness.cleanupAll();
  check(clearIntervalCalls >= 1, 'cleanup should clear polling interval');
  check(wsTerminated === true, 'cleanup should terminate metadata websocket client');
}

async function testNowPlayingHookIgnoresLateOldStationResponseAndPausedState() {
  const hookFile = '/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/hooks/useNowPlayingMetadata.ts';

  // Case A: old station request resolves after cleanup; must be ignored.
  const harnessA = createReactHarness();
  let resolveOld;
  const oldPromise = new Promise((res) => { resolveOld = res; });
  const megaRadioApiA = { getStationMetadata: () => oldPromise };
  const runnerA = makeRunner({
    sourceMutators: {
      [hookFile]: (src) => src.replace(/\(import\.meta as any\)\.env\?\.VITE_METADATA_WS/g, 'undefined'),
    },
    stubs: {
      react: harnessA.react,
      '@radiolise/metadata-client': { createMetadataClient: () => ({ subscribe: () => ({ unsubscribe: () => {} }), trackStream: async () => {}, terminate: () => {} }) },
      '@/services/megaRadioApi': { megaRadioApi: megaRadioApiA },
      '@/lib/nowPlaying': makeRunner().load('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/nowPlaying.ts'),
    },
    globals: {
      setInterval: () => 1,
      clearInterval: () => {},
      Date,
    },
  });

  const modA = runnerA.load(hookFile);
  harnessA.beginRender();
  modA.useNowPlayingMetadata({ _id: 'old', name: 'Old Station', url_resolved: 'https://old/stream' }, true);
  harnessA.cleanupAll();
  resolveOld({ metadata: { title: 'Old Song', artist: 'Old Artist' } });
  await flushMicrotasks();
  check(!harnessA.getUpdates().includes('Old Artist - Old Song'), 'late old-station response must be ignored after cleanup');

  // Case B: paused state should avoid interval + websocket.
  const harnessB = createReactHarness();
  let intervalCalls = 0;
  let wsCreated = 0;
  const runnerB = makeRunner({
    sourceMutators: {
      [hookFile]: (src) => src.replace(/\(import\.meta as any\)\.env\?\.VITE_METADATA_WS/g, 'undefined'),
    },
    stubs: {
      react: harnessB.react,
      '@radiolise/metadata-client': { createMetadataClient: () => { wsCreated += 1; return {}; } },
      '@/services/megaRadioApi': { megaRadioApi: { getStationMetadata: async () => ({ metadata: { title: 'Paused Song', artist: 'Paused Artist' } }) } },
      '@/lib/nowPlaying': makeRunner().load('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/nowPlaying.ts'),
    },
    globals: {
      setInterval: () => { intervalCalls += 1; return 1; },
      clearInterval: () => {},
      Date,
    },
  });

  const modB = runnerB.load(hookFile);
  harnessB.beginRender();
  modB.useNowPlayingMetadata({ _id: 'paused', name: 'Paused', url_resolved: 'https://paused/stream' }, false);
  await flushMicrotasks();
  check(intervalCalls === 0, 'isPlaying=false should not start polling interval');
  check(wsCreated === 0, 'isPlaying=false should not create websocket client');
}

async function run() {
  await testNowPlayingLibFormattingAndResolvedUrlPreference();
  await testNowPlayingHookTransientWsErrorAndCleanup();
  await testNowPlayingHookIgnoresLateOldStationResponseAndPausedState();
  console.log(`PASS regression_iteration60_now_playing_metadata (${assertions} assertions)`);
}

run().catch((err) => {
  console.error('FAIL regression_iteration60_now_playing_metadata:', err && err.stack ? err.stack : err);
  process.exit(1);
});
