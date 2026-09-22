const assert = require('assert');
const fs = require('fs');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function run() {
  const plugin = read('/app/frontend/plugins/withCompanionBridges.js');
  const wearModule = read('/app/frontend/plugins/android/WearDataLayerModule.kt');
  const wearListener = read('/app/frontend/plugins/android/PhoneWearListenerService.kt');
  const mainApp = read('/app/frontend/android/app/src/main/java/com/megaradio/MainApplication.kt');
  const gradle = read('/app/frontend/android/app/build.gradle');
  const manifest = read('/app/frontend/android/app/src/main/AndroidManifest.xml');
  const watchHandler = read('/app/frontend/watch/ios/WatchConnectivityHandler.swift');
  const audioProvider = read('/app/frontend/src/providers/AudioProvider.tsx');
  const catalog = read('/app/frontend/src/services/companionCatalogService.ts');

  assert(plugin.includes("['WatchConnectivityBridge.swift', 'WatchConnectivityBridge.m', 'WatchConnectivityHandler.swift']"),
    'plugin must copy all Watch bridge source files');
  assert(plugin.includes('addBuildSourceFileToGroup'), 'plugin should add copied iOS sources to Xcode project');
  assert(plugin.includes('add(com.megaradio.wearbridge.WearDataLayerPackage())'),
    'plugin should inject Wear package into MainApplication template');
  assert(plugin.includes('play-services-wearable:18.1.0'), 'plugin should pin wearable dependency 18.1.0');
  assert(plugin.includes("'android:pathPrefix': '/megaradio/command/'"), 'plugin manifest pathPrefix mismatch');

  assert(mainApp.includes('add(com.megaradio.wearbridge.WearDataLayerPackage())'),
    'actual MainApplication.kt missing WearDataLayerPackage registration');
  assert(gradle.includes('com.google.android.gms:play-services-wearable:18.1.0'),
    'actual build.gradle wearable dependency mismatch');
  assert(manifest.includes('android:pathPrefix="/megaradio/command/"'), 'actual manifest listener path mismatch');

  assert(wearModule.includes('emit("onWearCommand"'), 'Wear bridge must emit onWearCommand');
  assert(wearModule.includes('@ReactMethod fun initialize()'), 'Wear bridge initialize missing');
  for (const m of ['updateFavorites', 'updateStations', 'updateGenres', 'updateCountries', 'updateNowPlaying', 'updatePlaybackState']) {
    assert(wearModule.includes(`fun ${m}`), `WearDataLayer missing JS-called method: ${m}`);
  }
  assert(wearModule.includes('minOf(input.length(), 100)'), 'Wear payload should cap items to 100');
  assert(wearModule.includes('> 90000'), 'Wear payload should trim to <=90KB UTF-8');
  assert(!wearModule.includes('email') && !wearModule.includes('token'), 'Wear module should not publish auth/email tokens');

  assert(wearListener.includes('commands = setOf("play", "pause", "resume", "next", "previous", "toggle_favorite", "request_data")'),
    'Wear command whitelist mismatch');
  assert(wearListener.includes('> 15000'), 'Wear stale command TTL should be 15s');

  assert(watchHandler.includes('override init()') && !watchHandler.includes('session?.activate()\n    }\n\n    @objc func initialize()'),
    'watch handler should not activate session in constructor');
  assert(watchHandler.includes('@objc func initialize()') && watchHandler.includes('session?.activate()'),
    'watch handler must activate session via initialize()');
  assert(watchHandler.includes('latestContext.merge(message)'), 'watch handler should cache latest context');
  assert(watchHandler.includes('session.updateApplicationContext(latestContext)'), 'watch handler should update application context');
  assert(watchHandler.includes('replyHandler(self.latestContext)'), 'watch reply should return normalized latest context');

  assert(audioProvider.includes('InteractionManager.runAfterInteractions'), 'AudioProvider must initialize bridges after interactions');
  assert(audioProvider.includes("case 'request_data'"), 'AudioProvider must handle request_data command');
  assert(audioProvider.includes("data.type === 'all'"), 'request_data:all handling missing');
  assert(audioProvider.includes("data.type === 'genre_stations'"), 'request_data:genre_stations handling missing');
  assert(audioProvider.includes("data.type === 'country_stations'"), 'request_data:country_stations handling missing');
  assert(catalog.includes("wearOSService.updateStations"), 'catalog sync should call wearOSService.updateStations');

  // Contract: do NOT invent ISO from first two letters of country name.
  assert(!audioProvider.includes('name.substring(0, 2).toUpperCase()'),
    'country selector mapping still invents fake ISO codes in AudioProvider requestCountries');

  console.log('PASS regression_issue53_companion_native');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_issue53_companion_native:', err.message || err);
  process.exit(1);
}
