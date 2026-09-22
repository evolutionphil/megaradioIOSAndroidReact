const assert = require('assert');
const fs = require('fs');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function run() {
  const settings = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Settings.swift');
  const views = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Views.swift');
  const premium = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/Premium.swift');
  const authStore = read('/app/frontend/tvanddesktop/apple-tv-and-macos/ios-tvos/AuthStore.swift');
  const usePremium = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/hooks/usePremium.ts');
  const paywall = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/contexts/PaywallContext.tsx');
  const desktopPremium = read('/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/pages/DesktopPremium.tsx');
  const buildReadme = read('/app/frontend/tvanddesktop/desktop/README_BUILD.md');
  const buildDesktop = read('/app/frontend/tvanddesktop/desktop/build-desktop.js');
  const prepareRenderer = read('/app/frontend/tvanddesktop/desktop/build/prepare-renderer.js');
  const main = read('/app/frontend/tvanddesktop/desktop/electron/main.js');

  assert(settings.includes('router.go(.premium)'), 'Settings premium button should route to .premium');
  assert(views.includes('case .premium:               PremiumPage()'), 'Root router should render PremiumPage for .premium route');
  assert(premium.includes('StoreKitIapService.shared.getProducts()') && premium.includes('localizedPrice'),
    'Premium page should load localized StoreKit product prices');
  assert(premium.includes('try await auth.refreshSession()'), 'Premium purchase flow should preflight auth refreshSession');
  assert(premium.includes('StoreKitIapService.shared.restore()') && !premium.includes('restorePurchases('),
    'tvOS StoreKit restore method should be restore()');

  assert(authStore.includes('checking = false') && authStore.includes('guard let code = pendingCode, !checking else { return }'),
    'AuthStore polling should enforce one in-flight check');
  assert(authStore.includes('generation') && authStore.includes('guard request == generation'),
    'AuthStore should guard stale polling responses with generation');
  assert(authStore.includes('get("/api/auth/tv/verify"'), 'AuthStore refreshSession should call GET /api/auth/tv/verify');

  assert(!/Date\.now\(\)\s*\+\s*(365|31536000|one\s*year)/i.test(usePremium),
    'premiumFromServer must not fabricate expiry from Date.now()');
  assert(usePremium.includes('if (!userId || data?.isActive !== true) return empty();'), 'premiumFromServer should free-tier inactive/ownerless responses');
  assert(usePremium.includes("plan === 'remove_ads'"), 'remove_ads should not force premium but should remove ads');
  assert(usePremium.includes("setReady(false)") && usePremium.includes("if (!requestOwner || !requestToken) { setReady(true); return; }"),
    'ready state handling should block until verified unless clearly unauthenticated');

  // Type-level regression surfaced by tsc: invalid variant + shadowed bridge variable.
  assert(!desktopPremium.includes("showPaywall('subscription-page')"),
    'DesktopPremium uses unsupported PaywallVariant: subscription-page');
  assert(!paywall.includes('const bridge = (window as any).megaRadioNative;\n    if (!bridge?.supportsNativeIap)'),
    'PaywallContext redeclares bridge in onPurchase causing TS2448 use-before-declaration');

  assert(buildDesktop.includes("config: path.join(__dirname, 'electron-builder.config.js')"),
    'desktop wrapper must explicitly pass electron-builder config');
  assert(prepareRenderer.includes("['build', '--base', './', '--outDir', dist]"),
    'prepare-renderer should build with explicit relative base/outDir');
  assert(prepareRenderer.includes('Desktop renderer build has no index.html'), 'prepare-renderer must fail if index missing');
  assert(main.includes('pathToFileURL(LOCAL_FILE).href'), 'main.js local fallback should use pathToFileURL');
  assert(main.includes('if (!triedLocal && fs.existsSync(LOCAL_FILE))'), 'main.js should attempt one local fallback after load failure');
  assert(main.includes('isMainFrame === false'), 'did-fail-load should ignore subframe failures');
  assert(buildReadme.includes('build-desktop.js') && buildReadme.includes('oldscriptsnotautomaticallyhooked') === false,
    'README_BUILD should document explicit wrapper requirement');

  console.log('PASS regression_issue53_tv_desktop_build_shared');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_issue53_tv_desktop_build_shared:', err.message || err);
  process.exit(1);
}
