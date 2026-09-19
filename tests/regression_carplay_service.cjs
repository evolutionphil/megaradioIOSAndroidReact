const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeHarness() {
  const sourcePath = '/app/frontend/src/services/carPlayService.ts';
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert(!source.includes('/api/logs/remote'), 'carPlayService should not reference remote log endpoint');

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;

  const calls = {
    setRootTemplate: [],
    listTemplates: [],
    tabBarTemplates: [],
    registerOnConnect: 0,
  };

  const onConnect = new Set();
  const onDisconnect = new Set();

  class ListTemplate {
    constructor(opts) {
      this.opts = opts;
      calls.listTemplates.push(opts);
    }
    destroy() {}
  }

  class TabBarTemplate {
    constructor(opts) {
      this.opts = opts;
      calls.tabBarTemplates.push(opts);
    }
    destroy() {}
  }

  class NowPlayingTemplate {
    constructor(opts) { this.opts = opts; }
    destroy() {}
  }

  class GridTemplate {
    constructor(opts) { this.opts = opts; }
    destroy() {}
  }

  class SearchTemplate {
    constructor(opts) { this.opts = opts; }
    destroy() {}
  }

  class VoiceControlTemplate {
    constructor(opts) { this.opts = opts; }
    destroy() {}
  }

  const CarPlay = {
    connected: false,
    bridge: { checkForConnection() {} },
    registerOnConnect(cb) { calls.registerOnConnect += 1; onConnect.add(cb); },
    unregisterOnConnect(cb) { onConnect.delete(cb); },
    registerOnDisconnect(cb) { onDisconnect.add(cb); },
    unregisterOnDisconnect(cb) { onDisconnect.delete(cb); },
    setRootTemplate(template) { calls.setRootTemplate.push(template); },
    pushTemplate() {},
    popToRootTemplate() {},
    triggerConnect() { CarPlay.connected = true; for (const cb of [...onConnect]) cb(); },
    triggerDisconnect() { CarPlay.connected = false; for (const cb of [...onDisconnect]) cb(); },
  };

  function localRequire(spec) {
    if (spec === 'react-native') {
      return { Platform: { OS: 'ios' }, NativeModules: { CarPlayCacheModule: { saveStations() {} } } };
    }
    if (spec === 'react-native-track-player') return {};
    if (spec === './i18nService') {
      return {
        __esModule: true,
        default: { t: (k) => k },
        addLanguageChangeListener: () => () => {},
      };
    }
    if (spec === '../utils/stationLogoHelper') {
      return {
        getStationLogoUrl: () => 'https://themegaradio.com/logo.png',
        DEFAULT_STATION_LOGO_URL: 'https://themegaradio.com/logo.png',
      };
    }
    if (spec === './carPlayImageCache') {
      return {
        getCarPlayImagePath: async () => null,
        cacheStationImages: async () => new Map(),
      };
    }
    if (spec === '../store/playerStore') {
      return { usePlayerStore: { getState: () => ({ currentStation: null, nowPlaying: null }) } };
    }
    if (spec === '@g4rb4g3/react-native-carplay') {
      return { CarPlay, ListTemplate, TabBarTemplate, NowPlayingTemplate, GridTemplate, SearchTemplate, VoiceControlTemplate };
    }
    if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(spec)) return { mockedAsset: spec };
    throw new Error(`Unmocked require: ${spec}`);
  }

  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: localRequire,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
  };

  vm.runInNewContext(transpiled, context, { filename: sourcePath });
  const service = module.exports.default || module.exports;
  return { service, CarPlay, calls };
}

function station(id, name) {
  return {
    _id: id,
    name,
    country: 'TR',
    tags: 'pop',
    url: `https://stream.example/${id}`,
    url_resolved: `https://resolved.example/${id}`,
    logo: 'https://themegaradio.com/logo.png',
  };
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const { service, CarPlay, calls } = makeHarness();

  // 1) Disconnect while data pending should NOT commit stale root
  const pending = deferred();
  service.initialize(
    async () => {},
    async () => pending.promise,
    async () => pending.promise,
    async () => pending.promise,
    async () => [{ name: 'Pop', count: 10 }],
    async () => [station('g1', 'Genre Station')],
    async () => []
  );
  CarPlay.triggerConnect();
  await wait(5);
  CarPlay.triggerDisconnect();
  pending.resolve([station('a1', 'Pending Station')]);
  await wait(30);
  assert.strictEqual(calls.setRootTemplate.length, 0, 'stale root committed after disconnect');

  // 2) Reconnect should create fresh root using latest callbacks
  service.initialize(
    async () => {},
    async () => [station('s1', 'Browse 1')],
    async () => [station('f1', 'Fav 1')],
    async () => [station('r1', 'Recent 1')],
    async () => [{ name: 'Jazz', count: 50 }],
    async () => [station('jg1', 'Jazz One')],
    async () => [station('q1', 'Query Result')]
  );
  CarPlay.triggerConnect();
  await wait(60);
  assert(calls.setRootTemplate.length >= 1, 'reconnect did not set root template');

  const tabPairs = calls.listTemplates
    .filter((x) => x && x.tabTitle && x.tabSystemImageName)
    .map((x) => `${x.tabTitle}|${x.tabSystemImageName}`);
  const hasPair = (labelA, labelB, icon) =>
    tabPairs.some((x) => x.includes(`${labelA}|${icon}`) || x.includes(`${labelB}|${icon}`));
  assert(hasPair('carplay_favorites', 'Favorites', 'heart.fill'), 'favorites tab config missing');
  assert(hasPair('carplay_recently_played', 'Recently Played', 'clock.fill'), 'recent tab config missing');
  assert(hasPair('carplay_discover', 'Discover', 'music.note.list'), 'discover tab config missing');
  assert(hasPair('carplay_genres', 'Genres', 'square.grid.2x2.fill'), 'genres tab config missing');

  // 3) Rapid repeated connect should be debounced (no infinite rebuild)
  const before = calls.setRootTemplate.length;
  CarPlay.triggerConnect();
  CarPlay.triggerConnect();
  CarPlay.triggerConnect();
  await wait(80);
  const after = calls.setRootTemplate.length;
  assert(after - before <= 1, `connect debounce failed: extra rebuilds=${after - before}`);

  service.disconnect();
  console.log('PASS regression_carplay_service');
}

run().catch((err) => {
  console.error('FAIL regression_carplay_service:', err);
  process.exit(1);
});
