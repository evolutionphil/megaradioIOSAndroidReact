const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function runBannerWith(pathname, linksConfig) {
  const nodes = [];
  const byId = new Map();
  const document = {
    body: {
      firstChild: null,
      insertBefore(node) {
        nodes.unshift(node);
        if (node.id) byId.set(node.id, node);
      },
    },
    getElementById(id) {
      return byId.get(id) || null;
    },
    createElement(tag) {
      const node = {
        tag,
        id: '',
        textContent: '',
        href: '',
        style: { cssText: '' },
        attrs: {},
        children: [],
        appendChild(child) {
          this.children.push(child);
          if (child.id) byId.set(child.id, child);
        },
        setAttribute(name, value) {
          this.attrs[name] = value;
        },
      };
      return node;
    },
  };

  const windowObj = {
    location: { pathname },
    MEGARADIO_LINKS: linksConfig,
  };

  const source = read('/app/frontend/linking/website-install-banner.js');
  vm.runInNewContext(source, { window: windowObj, document, decodeURIComponent });
  return document.getElementById('megaradio-install-banner');
}

function run() {
  const appJson = JSON.parse(read('/app/frontend/app.json'));
  const expo = appJson.expo;

  // iOS/Android app link configuration checks in Expo config.
  assert.strictEqual(expo.ios.associatedDomains.includes('applinks:themegaradio.com'), true);
  assert.strictEqual(expo.android.intentFilters[0].autoVerify, true);
  const data = expo.android.intentFilters[0].data;
  const dataStrings = data.map((d) => `${d.scheme}|${d.host}|${d.pathPrefix || d.pathPattern}`);
  assert(dataStrings.includes('https|themegaradio.com|/station/'));
  assert(dataStrings.includes('https|themegaradio.com|/user/'));
  assert(dataStrings.includes('https|themegaradio.com|/genre/'));
  assert(dataStrings.includes('https|themegaradio.com|/.*/station/.*'));
  assert(dataStrings.includes('https|themegaradio.com|/.*/user/.*'));
  assert(dataStrings.includes('https|themegaradio.com|/.*/genre/.*'));

  // Custom schemes and OAuth scheme must remain.
  assert(Array.isArray(expo.scheme));
  assert(expo.scheme.includes('megaradio'));
  assert(expo.scheme.some((s) => String(s).startsWith('com.googleusercontent.apps.')));

  // README must explicitly carry external blockers and no deferred-link SDK caveat.
  const linkingReadme = read('/app/frontend/linking/README.md');
  assert(linkingReadme.includes('assetlinks points at **com.visiongo.megaradio**'));
  assert(linkingReadme.includes('Android app\n23|  is **com.megaradio**') || linkingReadme.includes('Android app\n23|') === false);
  assert(linkingReadme.includes('There is no Branch/AppsFlyer/deferred-link service'));
  assert(linkingReadme.includes('website-install-banner.js'));

  // website-install-banner asset should be present in repository per handoff doc.
  const bannerPath = '/app/frontend/linking/website-install-banner.js';
  assert(fs.existsSync(bannerPath), 'Missing /app/frontend/linking/website-install-banner.js external website asset');
  const bannerSource = read(bannerPath);
  assert(/appStoreUrl/.test(bannerSource) && /playStoreUrl/.test(bannerSource), 'Banner must reference configured store links');
  assert(/'megaradio:\/\/' \+ path\[0\] \+ '\/'/.test(bannerSource), 'Banner must map station/user route to custom scheme dynamically');
  assert(/tekrar dokunun|again|retap/i.test(bannerSource), 'Banner must include after-install retap guidance');

  // DOM-level behavior checks using lightweight in-memory DOM stubs.
  const linksConfig = {
    appStoreUrl: 'https://apps.apple.com/app/id6759302561',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.megaradio',
  };
  const stationBanner = runBannerWith('/station/virgin-radio-turkiye', linksConfig);
  assert(stationBanner, 'Banner should render on station route');
  const stationOpen = stationBanner.children.find((c) => c.id === 'megaradio-open-app');
  assert(stationOpen && stationOpen.href === 'megaradio://station/virgin-radio-turkiye');

  const userBanner = runBannerWith('/tr/user/abc123', linksConfig);
  assert(userBanner, 'Banner should render on localized user route');
  const userOpen = userBanner.children.find((c) => c.id === 'megaradio-open-app');
  assert(userOpen && userOpen.href === 'megaradio://user/abc123');

  const malformed = runBannerWith('/station/%2Fetc%2Fpasswd', linksConfig);
  assert.strictEqual(malformed, null, 'Malformed encoded-slash path must not reveal target');
  const unsupported = runBannerWith('/genre/lounge', linksConfig);
  assert.strictEqual(unsupported, null, 'Unsupported route should not show banner');

  // generate-app-link-files.js: input validation + output payload in temp dir.
  const scriptPath = '/app/frontend/scripts/generate-app-link-files.js';
  const script = require(scriptPath);
  const cfg = appJson.expo;

  assert.throws(() => script.associationFiles(cfg, '', 'M6T85HP76P.com.visiongo.megaradio'), /SHA-256/);
  assert.throws(
    () => script.associationFiles(cfg, 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99', 'WRONG.com.visiongo.megaradio'),
    /application-identifier/
  );

  const fingerprint = '11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00';
  const appIdentifier = 'M6T85HP76P.com.visiongo.megaradio';
  const generated = script.associationFiles(cfg, fingerprint, appIdentifier);
  assert.strictEqual(generated.assetlinks[0].target.package_name, 'com.megaradio');
  assert.strictEqual(generated.assetlinks[0].target.sha256_cert_fingerprints[0], fingerprint);
  assert.strictEqual(generated.aasa.applinks.details[0].appID, appIdentifier);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue51-links-'));
  execFileSync('node', [scriptPath, tempDir], {
    cwd: '/app/frontend',
    env: {
      ...process.env,
      ANDROID_APP_LINKS_SHA256: fingerprint,
      IOS_APPLICATION_IDENTIFIER: appIdentifier,
    },
    stdio: 'pipe',
  });
  const assetlinks = JSON.parse(read(path.join(tempDir, '.well-known/assetlinks.json')));
  const aasa = JSON.parse(read(path.join(tempDir, '.well-known/apple-app-site-association')));
  const js = read(path.join(tempDir, 'app-link-config.js'));
  assert.strictEqual(assetlinks[0].target.package_name, 'com.megaradio');
  assert.strictEqual(aasa.applinks.details[0].appID, appIdentifier);
  assert(js.includes('https://apps.apple.com/app/id6759302561'));
  assert(js.includes('https://play.google.com/store/apps/details?id=com.megaradio'));

  console.log('PASS regression_issue51_native_config_and_banner');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_issue51_native_config_and_banner:', err);
  process.exit(1);
}
