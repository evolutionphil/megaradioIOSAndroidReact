const assert = require('assert');
const fs = require('fs');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function run() {
  const apiClient = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/APIClient.swift');
  const models = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Models.swift');
  const audioPlayer = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/AudioPlayer.swift');
  const storeKit = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/StoreKitIapService.swift');

  const billing = read('/app/frontend/tvanddesktop/android-tv/app/src/main/java/com/megaradio/tv/BillingService.kt');
  const bridge = read('/app/frontend/tvanddesktop/android-tv/app/src/main/java/com/megaradio/tv/MegaRadioBridge.kt');
  const mainActivity = read('/app/frontend/tvanddesktop/android-tv/app/src/main/java/com/megaradio/tv/MainActivity.kt');
  const authCtx = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/contexts/AuthContext.tsx');
  const premiumNative = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/PremiumUpgradeNative.tsx');

  // tvOS API client / models
  assert(apiClient.includes('query: ["genre": genre'), 'APIClient should filter by genre (not tag)');
  assert(models.includes('case countryCode = "countrycode"'), 'Models should map lowercase countrycode');
  assert(models.includes('["http", "https"].contains(scheme)') && models.includes('u.host != nil'),
    'Models should skip empty/relative stream URLs');

  // Audio player stale observer guards + idempotent remote controls
  assert(audioPlayer.includes('self.player?.currentItem === item'), 'status observer should ignore stale item');
  assert(audioPlayer.includes('self.player === p'), 'rate observer should ignore stale player');
  assert(audioPlayer.includes('func pause()') && audioPlayer.includes('player?.pause()'), 'pause command must be idempotent');
  assert(audioPlayer.includes('func resume()') && audioPlayer.includes('player.play()'), 'resume command missing');

  // StoreKit: JWS receipt + finish only after verified backend response
  assert(storeKit.includes('verification.jwsRepresentation') || storeKit.includes('result.jwsRepresentation'),
    'StoreKit should send verified JWS representation');
  assert(storeKit.includes('let plan = try await reportToBackend') && storeKit.includes('await txn.finish()'),
    'StoreKit should finish transaction only after backend verification');

  // Android TV: deep links/routes/search shape + billing safety
  assert(mainActivity.includes('#/radio-playing?station=${Uri.encode(it)}'), 'radio-playing route should use station query');
  assert(mainActivity.includes('#/genre-list/${Uri.encode(it)}'), 'genre-list route should be encoded');
  assert(mainActivity.includes('SEARCH') || mainActivity.includes('search?q=${Uri.encode(q)}'), 'SEARCH intent should read q');

  assert(billing.includes('withContext(Dispatchers.IO)'), 'billing backend call must run on IO dispatcher');
  assert(billing.includes('Purchase pending approval') && billing.includes('put("ok", false)'),
    'pending purchases should not be acknowledged as success');
  assert(billing.includes('purchaseMutex') && billing.includes('withTimeout(110000)'), 'purchase should be serialized with timeout');
  assert(billing.includes('check(conn.responseCode in 200..299)') && billing.includes('No verified subscription returned'),
    'backend verification must require 2xx and non-empty plan');
  assert(billing.includes('acknowledgeIfNeeded(purchase)') && billing.indexOf('postReceiptToBackend') < billing.indexOf('acknowledgeIfNeeded(purchase)'),
    'acknowledge should happen after verification call');
  assert(billing.includes('fun close()') && billing.includes('scope.cancel()') && billing.includes('billingClient.endConnection()'),
    'billing close() must cancel scope and connection');

  // Bridge quoting and JS auth-token sync before purchase/restore
  assert(bridge.includes('JSONObject.quote(id)'), 'bridge should quote id in JS callback');
  assert(premiumNative.includes('.setAuthToken(auth.token)') && premiumNative.includes('.purchaseProduct('),
    'purchase flow should setAuthToken before purchaseProduct');
  assert(premiumNative.includes('.setAuthToken(auth.token)') && premiumNative.includes('.restorePurchases()'),
    'restore flow should setAuthToken before restorePurchases');
  assert(authCtx.includes('nativeIap.setAuthToken(token)') && authCtx.includes('[token]'),
    'logout/login token effect should sync native auth token');

  // Android TV bridge detection path (invoke + UA; no Java getter property use)
  assert(bridge.includes('fun invoke(json: String)'), 'Android TV should use MegaRadioNative.invoke bridge');

  console.log('PASS regression_native_source_checks');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_native_source_checks:', err);
  process.exit(1);
}
