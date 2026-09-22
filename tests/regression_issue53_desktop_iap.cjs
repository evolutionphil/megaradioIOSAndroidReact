const assert = require('assert');
const fs = require('fs');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function run() {
  const preload = read('/app/frontend/tvanddesktop/desktop/electron/preload.js');
  const iap = read('/app/frontend/tvanddesktop/desktop/electron/iap.js');
  const nativeIap = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/nativeIap.ts');
  const platform = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/platform.ts');

  assert(preload.includes("process.argv.includes('--megaradio-mas=1')"), 'preload MAS marker wiring missing');
  assert(preload.includes('isDesktop: true'), 'desktop marker missing');
  assert(preload.includes('supportsNativeIap'), 'supportsNativeIap bridge flag missing');
  assert(preload.includes('onShortcut: (cb) =>') && preload.includes('return () => ipcRenderer.removeListener'),
    'shortcut subscription should return cleanup unsubscribe');

  assert(iap.includes('if (!isMac())') && iap.includes("reason: 'not-mac'"),
    'non-MAS branch must avoid native StoreKit purchase flow');
  assert(iap.includes("postJson('/api/auth/tv/verify'"), 'purchase preflight must verify tv session');
  assert(iap.includes('if (purchaseBusy) return { ok: false, reason: \'busy\''), 'purchase busy guard missing');
  assert(iap.includes('if (!token || token !== cachedToken)'), 'token generation/session guard missing');
  assert(iap.includes("send('mr-iap-failed'"), 'IAP failure event forwarding missing');
  assert(iap.includes('if (verify.ok)') && iap.includes('finishTransactionByDate'),
    'transaction should only finish after backend verification');
  assert(iap.includes('state === \'restored\' ? \'mr-iap-restored\' : \'mr-iap-completed\''),
    'restored event must distinguish restored vs purchased');
  assert(iap.includes('tx.payment?.productIdentifier'), 'restored product identifier should come from transaction');
  assert(iap.includes("fileURLToPath(url)") && iap.includes("readFileSync(path).toString('base64')"),
    'receipt URL decode/base64 flow missing');
  assert(iap.includes('clearTimers()') && iap.includes('authGeneration++'), 'logout/session generation timer guards missing');

  assert(nativeIap.includes('if (!(window as any).MegaRadioBridge) (window as any).MegaRadioBridge = existing;'),
    'nativeIap should avoid overriding readonly Android injected MegaRadioBridge');
  assert(platform.includes('megaRadioDesktop?.isDesktop'), 'detectPlatform should prefer desktop injected marker');

  console.log('PASS regression_issue53_desktop_iap');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_issue53_desktop_iap:', err.message || err);
  process.exit(1);
}
