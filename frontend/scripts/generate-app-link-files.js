// Generate deployment INPUTS for the external website owner; this does not
// publish anything. Never substitute a debug or another package's certificate.
const fs = require('fs');
const path = require('path');
function associationFiles(config, fingerprint, applicationIdentifier) {
  if (!/^([A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(fingerprint || '')) {
    throw new Error('Supply the real release/Play App Signing SHA-256 fingerprint');
  }
  if (!/^[A-Z0-9]{10}\./.test(applicationIdentifier || '') || !applicationIdentifier.endsWith('.' + config.ios.bundleIdentifier)) {
    throw new Error('Supply application-identifier copied from the signed iOS archive entitlements');
  }
  return {
    assetlinks: [{ relation: ['delegate_permission/common.handle_all_urls'], target: {
      namespace: 'android_app', package_name: config.android.package,
      sha256_cert_fingerprints: [fingerprint.toUpperCase()],
    } }],
    aasa: { applinks: { apps: [], details: [{ appID: applicationIdentifier,
      paths: ['/station/*', '/*/station/*', '/user/*', '/*/user/*', '/genre/*', '/*/genre/*'],
    }] } },
  };
}
if (require.main === module) {
  const config = require('../app.json').expo;
  const result = associationFiles(config, process.env.ANDROID_APP_LINKS_SHA256, process.env.IOS_APPLICATION_IDENTIFIER);
  const target = path.resolve(process.argv[2] || path.join(__dirname, '../linking/generated'));
  fs.mkdirSync(path.join(target, '.well-known'), { recursive: true });
  fs.writeFileSync(path.join(target, '.well-known/assetlinks.json'), JSON.stringify(result.assetlinks, null, 2) + '\n');
  fs.writeFileSync(path.join(target, '.well-known/apple-app-site-association'), JSON.stringify(result.aasa, null, 2) + '\n');
  fs.writeFileSync(path.join(target, 'app-link-config.js'), 'window.MEGARADIO_LINKS = ' + JSON.stringify({
    websiteUrl: config.extra.websiteUrl, appStoreUrl: config.extra.appStoreUrl, playStoreUrl: config.extra.playStoreUrl,
  }) + ';\n');
  console.log('Website association files generated; not published:', target);
}
module.exports = { associationFiles };