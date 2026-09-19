const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript');

function compileTsModule(tsPath, mocks = {}, globals = {}) {
  const source = fs.readFileSync(tsPath, 'utf8');
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
    throw new Error(`Missing mock for require(\"${spec}\")`);
  };

  const context = {
    module,
    exports: module.exports,
    require: localRequire,
    __filename: tsPath,
    __dirname: dirname,
    console,
    setTimeout,
    clearTimeout,
    ...globals,
  };
  vm.runInNewContext(transpiled, context, { filename: tsPath });
  return module.exports;
}

function makeAsyncStorage() {
  const db = new Map();
  const hooks = { onGet: null, onSet: null };
  return {
    db,
    hooks,
    async getItem(key) {
      if (hooks.onGet) await hooks.onGet(key);
      return db.has(key) ? db.get(key) : null;
    },
    async setItem(key, value) {
      if (hooks.onSet) await hooks.onSet(key, value);
      db.set(key, value);
    },
    async removeItem(key) {
      db.delete(key);
    },
    async multiRemove(keys) {
      keys.forEach((k) => db.delete(k));
    },
  };
}

function ownerKey(owner, name) {
  return `@megaradio/stats-v2/${owner ? `user:${encodeURIComponent(owner)}` : 'guest'}/${name}`;
}

async function run() {
  const RealDate = Date;
  let now = 0;
  class FakeDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }

  const auth = { isAuthenticated: false, user: null };
  const AsyncStorage = makeAsyncStorage();

  const mod = compileTsModule('/app/frontend/src/services/statsService.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: AsyncStorage },
    '../store/authStore': { useAuthStore: { getState: () => auth } },
  }, { Date: FakeDate });

  const { statsService, emptyStats } = mod;
  const A = 'owner-A';
  const B = 'owner-B';

  // Legacy device-wide keys exist but must be ignored.
  AsyncStorage.db.set('@megaradio_listening_stats', JSON.stringify({ totalMinutes: 999, musicPlayed: 999 }));
  AsyncStorage.db.set('@megaradio_current_session', JSON.stringify({ stationId: 'legacy' }));
  AsyncStorage.db.set('@megaradio_unique_stations', JSON.stringify(['legacy-1', 'legacy-2']));

  // A session: two 30-second chunks = 60s total => 1 minute.
  now = 0;
  await statsService.startSession('station-1', 'Station 1', undefined, A);
  now = 30_000;
  await statsService.updateListeningTime(A);
  await statsService.endSession(A); // should not double-count or add songs

  await statsService.startSession('station-2', 'Station 2', undefined, A);
  now = 60_000;
  await statsService.updateListeningTime(A);
  await statsService.endSession(A);

  const aStatsAfterTwoSessions = await statsService.getStats(A);
  assert.strictEqual(Math.round(aStatsAfterTwoSessions.totalSeconds), 60);
  assert.strictEqual(aStatsAfterTwoSessions.totalMinutes, 1);
  assert.strictEqual(aStatsAfterTwoSessions.musicPlayed, 0, 'endSession must not increment songs');

  // Unique should count once.
  const uniqueResults = await Promise.all([
    statsService.trackUniqueStation('dup-1', A),
    statsService.trackUniqueStation('dup-1', A),
    statsService.trackUniqueStation('dup-1', A),
  ]);
  assert.strictEqual(uniqueResults.filter(Boolean).length, 1);

  // Parallel increments/uniques must serialize without lost updates.
  await Promise.all(Array.from({ length: 25 }, () => statsService.incrementMusicPlayed(A)));
  await Promise.all(Array.from({ length: 10 }, (_, i) => statsService.trackUniqueStation(`parallel-${i % 3}`, A)));
  const aStatsAfterParallel = await statsService.getStats(A);
  assert.strictEqual(aStatsAfterParallel.musicPlayed, 25);
  assert.strictEqual(aStatsAfterParallel.uniqueStationsListened, 4); // dup-1 + parallel-0/1/2

  // B starts fresh; must not inherit A or legacy stats.
  auth.isAuthenticated = true;
  auth.user = { _id: B };
  const bFresh = await statsService.getStats();
  assert.strictEqual(bFresh.totalMinutes, emptyStats().totalMinutes);
  assert.strictEqual(bFresh.musicPlayed, 0);
  assert.strictEqual(await statsService.getUniqueStationsListened(B), 0);

  // Owner capture BEFORE async read: invoke as A, switch to B while AsyncStorage is blocked.
  auth.user = { _id: A };
  let releaseGet;
  const gate = new Promise((resolve) => { releaseGet = resolve; });
  let gatedOnce = false;
  AsyncStorage.hooks.onGet = async (key) => {
    if (!gatedOnce && key === ownerKey(A, 'unique')) {
      gatedOnce = true;
      await gate;
    }
  };

  const racePromise = statsService.trackUniqueStation('race-station');
  auth.user = { _id: B }; // switch account before read resolves
  releaseGet();
  await racePromise;
  AsyncStorage.hooks.onGet = null;

  assert.strictEqual(await statsService.getUniqueStationsListened(A) >= 1, true);
  assert.strictEqual(await statsService.getUniqueStationsListened(B), 0);

  // Logout/guest must not inherit user stats.
  auth.isAuthenticated = false;
  auth.user = null;
  await statsService.incrementMusicPlayed();
  const guestStats = await statsService.getStats();
  assert.strictEqual(guestStats.musicPlayed, 1);
  assert.strictEqual(guestStats.totalMinutes, 0);

  // A relogin should preserve A's own values.
  auth.isAuthenticated = true;
  auth.user = { _id: A };
  const aAgain = await statsService.getStats();
  assert.strictEqual(aAgain.musicPlayed, 25);
  assert.strictEqual(aAgain.totalMinutes, 1);

  // Reset must affect only current owner.
  await statsService.resetStats(A);
  const aAfterReset = await statsService.getStats(A);
  assert.strictEqual(aAfterReset.musicPlayed, 0);
  auth.isAuthenticated = false;
  auth.user = null;
  const guestAfterAReset = await statsService.getStats();
  assert.strictEqual(guestAfterAReset.musicPlayed, 1, 'guest stats must remain isolated');

  // Stale previous-process session must not be charged.
  const staleOwner = 'stale-owner';
  const staleSessionKey = ownerKey(staleOwner, 'session');
  const staleTotalsKey = ownerKey(staleOwner, 'totals');
  AsyncStorage.db.set(staleSessionKey, JSON.stringify({
    stationId: 'stale-station',
    stationName: 'Stale',
    startTime: 0,
    accountedUntil: 0,
    durationMinutes: 0,
  }));
  AsyncStorage.db.set(staleTotalsKey, JSON.stringify({ ...emptyStats(), totalMinutes: 7, totalSeconds: 420 }));
  now = 600_000;
  await statsService.endSession(staleOwner);
  const staleStatsAfter = await statsService.getStats(staleOwner);
  assert.strictEqual(staleStatsAfter.totalMinutes, 7);
  assert.strictEqual(AsyncStorage.db.has(staleSessionKey), false, 'stale session must be removed');

  console.log('PASS regression_issue51_stats');
}

run().catch((err) => {
  console.error('FAIL regression_issue51_stats:', err);
  process.exit(1);
});
