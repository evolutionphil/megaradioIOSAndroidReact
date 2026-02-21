// Config Plugin to enable cleartext traffic (HTTP) for Android
// Required for radio streams that use HTTP instead of HTTPS

const { withAndroidManifest } = require('@expo/config-plugins');

const withCleartextTraffic = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];
    
    // Add usesCleartextTraffic to application
    application.$['android:usesCleartextTraffic'] = 'true';
    
    console.log('[withCleartextTraffic] Enabled cleartext traffic for HTTP streams');
    
    return config;
  });
};

module.exports = withCleartextTraffic;
