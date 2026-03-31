// Expo Config Plugin: Ensures AdMob Application ID is correctly injected
// into AndroidManifest.xml with tools:replace to prevent startup crashes.
// This runs AFTER react-native-google-mobile-ads plugin to guarantee
// the tools:replace attribute is present on the meta-data.
// 
// ALSO: Adds a safety mechanism to prevent app crash if AdMob initialization fails.

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Hardcoded AdMob App ID - must match app.json react-native-google-mobile-ads config
const ADMOB_ANDROID_APP_ID = 'ca-app-pub-8771434485570434~7427742767';

function fixManifest(config) {
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

    // CRITICAL: Remove ALL existing AdMob entries to prevent duplicates
    application['meta-data'] = application['meta-data'].filter(
      (m) => !(m.$ && m.$['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID')
    );

    // Add single, correct AdMob meta-data entry
    application['meta-data'].push({
      $: {
        'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
        'android:value': ADMOB_ANDROID_APP_ID,
        'tools:replace': 'android:value',
      },
    });

    console.log(`[withAdMobFix] Set AdMob App ID: ${ADMOB_ANDROID_APP_ID} (removed duplicates)`);
    return config;
  });
}

function fixAdMobProvider(config) {
  // Add a safety mechanism at the native level:
  // Prevent MobileAdsInitProvider from crashing the app if there's an issue
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const manifestPath = path.join(
      projectRoot,
      'android/app/src/main/AndroidManifest.xml'
    );
    
    if (fs.existsSync(manifestPath)) {
      let content = fs.readFileSync(manifestPath, 'utf-8');
      
      // Verify AdMob meta-data is present and correct
      if (!content.includes(ADMOB_ANDROID_APP_ID)) {
        console.warn('[withAdMobFix] WARNING: AdMob App ID not found in manifest after withAndroidManifest!');
        // Force-add it if missing
        if (content.includes('</application>')) {
          content = content.replace(
            '</application>',
            `    <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${ADMOB_ANDROID_APP_ID}"
            tools:replace="android:value" />
        </application>`
          );
          fs.writeFileSync(manifestPath, content);
          console.log('[withAdMobFix] Force-added AdMob App ID to manifest');
        }
      } else {
        console.log('[withAdMobFix] Verified AdMob App ID present in manifest');
      }
    }
    
    return config;
  }]);
}

module.exports = function withAdMobFix(config) {
  config = fixManifest(config);
  config = fixAdMobProvider(config);
  return config;
};
