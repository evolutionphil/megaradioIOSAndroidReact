// Expo Config Plugin: Ensures AdMob Application ID is correctly injected
// into AndroidManifest.xml with tools:replace to prevent startup crashes.
// This runs AFTER react-native-google-mobile-ads plugin to guarantee
// the tools:replace attribute is present on the meta-data.

const { withAndroidManifest } = require('@expo/config-plugins');

// Hardcoded AdMob App ID - must match app.json react-native-google-mobile-ads config
const ADMOB_ANDROID_APP_ID = 'ca-app-pub-8771434485570434~7427742767';

module.exports = function withAdMobFix(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Ensure tools namespace is declared
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Find existing AdMob meta-data
    const existingIndex = application['meta-data'].findIndex(
      (m) => m.$ && m.$['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
    );

    const admobMetaData = {
      $: {
        'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
        'android:value': ADMOB_ANDROID_APP_ID,
        'tools:replace': 'android:value',
      },
    };

    if (existingIndex >= 0) {
      // Override existing entry to ensure tools:replace is present
      application['meta-data'][existingIndex] = admobMetaData;
      console.log(`[withAdMobFix] Updated existing AdMob meta-data with tools:replace`);
    } else {
      application['meta-data'].push(admobMetaData);
      console.log(`[withAdMobFix] Added new AdMob meta-data entry`);
    }

    console.log(`[withAdMobFix] AdMob App ID: ${ADMOB_ANDROID_APP_ID}`);
    return config;
  });
};
