// Expo Config Plugin: Ensures AdMob Application ID is correctly injected
// into AndroidManifest.xml with tools:replace to prevent startup crashes.
// This fixes the "Invalid application ID" crash that occurs when
// MobileAdsInitProvider can't find a valid AdMob App ID.

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAdMobFix(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Get AdMob App ID from app.json plugins config
    const admobPlugin = config.plugins?.find(
      (p) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads'
    );
    const admobAppId = admobPlugin?.[1]?.androidAppId;

    if (!admobAppId) {
      console.warn('[withAdMobFix] No androidAppId found in react-native-google-mobile-ads plugin config');
      return config;
    }

    // Find existing AdMob meta-data or create new one
    const existingIndex = application['meta-data'].findIndex(
      (m) => m.$?.['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
    );

    const admobMetaData = {
      $: {
        'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
        'android:value': admobAppId,
        'tools:replace': 'android:value',
      },
    };

    if (existingIndex >= 0) {
      // Override existing entry to ensure tools:replace is present
      application['meta-data'][existingIndex] = admobMetaData;
    } else {
      application['meta-data'].push(admobMetaData);
    }

    // Ensure tools namespace is declared
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    console.log(`[withAdMobFix] AdMob App ID injected: ${admobAppId}`);
    return config;
  });
};
