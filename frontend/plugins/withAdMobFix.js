// Expo Config Plugin: Ensures AdMob Application ID is correctly injected
// into AndroidManifest.xml with tools:replace to prevent startup crashes.
// This runs AFTER react-native-google-mobile-ads plugin to guarantee
// the tools:replace attribute is present on the meta-data.
// 
// CRITICAL FIX: Also DISABLES MobileAdsInitProvider ContentProvider to prevent
// "Invalid Application ID" startup crashes. AdMob is initialized manually via JS.

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

    // CRASH FIX: Disable MobileAdsInitProvider ContentProvider
    // This provider runs BEFORE React Native loads and crashes with "Invalid Application ID"
    // even when the meta-data is correct. By removing it, AdMob initializes manually via JS
    // which is the recommended approach for React Native apps.
    if (!application['provider']) {
      application['provider'] = [];
    }

    // Remove any existing MobileAdsInitProvider entries
    application['provider'] = application['provider'].filter(
      (p) => !(p.$ && p.$['android:name'] && 
               p.$['android:name'].includes('MobileAdsInitProvider'))
    );

    // Add disabled MobileAdsInitProvider (tools:node="remove" removes it from merged manifest)
    application['provider'].push({
      $: {
        'android:name': 'com.google.android.gms.ads.MobileAdsInitProvider',
        'android:authorities': '${applicationId}.mobileadsinitprovider',
        'tools:node': 'remove',
      },
    });

    console.log(`[withAdMobFix] Set AdMob App ID: ${ADMOB_ANDROID_APP_ID} (removed duplicates)`);
    console.log('[withAdMobFix] Disabled MobileAdsInitProvider to prevent startup crash');
    return config;
  });
}

function fixAdMobProvider(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const manifestPath = path.join(
      projectRoot,
      'android/app/src/main/AndroidManifest.xml'
    );
    
    if (fs.existsSync(manifestPath)) {
      let content = fs.readFileSync(manifestPath, 'utf-8');
      let modified = false;
      
      // Verify AdMob meta-data is present and correct
      if (!content.includes(ADMOB_ANDROID_APP_ID)) {
        console.warn('[withAdMobFix] WARNING: AdMob App ID not found in manifest!');
        if (content.includes('</application>')) {
          content = content.replace(
            '</application>',
            `    <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${ADMOB_ANDROID_APP_ID}"
            tools:replace="android:value" />
        </application>`
          );
          modified = true;
          console.log('[withAdMobFix] Force-added AdMob App ID to manifest');
        }
      } else {
        console.log('[withAdMobFix] Verified AdMob App ID present in manifest');
      }

      // CRASH FIX: Ensure MobileAdsInitProvider is disabled in raw XML too
      // This is a DOUBLE safety mechanism in case withAndroidManifest didn't work
      if (!content.includes('MobileAdsInitProvider') || 
          !content.includes('tools:node="remove"')) {
        // Remove any existing MobileAdsInitProvider entries first
        content = content.replace(
          /<provider[^>]*MobileAdsInitProvider[^>]*\/>/g,
          ''
        );
        content = content.replace(
          /<provider[^>]*MobileAdsInitProvider[^>]*>[\s\S]*?<\/provider>/g,
          ''
        );
        
        // Add disabled provider
        if (content.includes('</application>')) {
          content = content.replace(
            '</application>',
            `    <provider
            android:name="com.google.android.gms.ads.MobileAdsInitProvider"
            android:authorities="\${applicationId}.mobileadsinitprovider"
            tools:node="remove" />
        </application>`
          );
          modified = true;
          console.log('[withAdMobFix] Force-disabled MobileAdsInitProvider in manifest XML');
        }
      }

      if (modified) {
        // Ensure tools namespace exists
        if (!content.includes('xmlns:tools=')) {
          content = content.replace(
            '<manifest ',
            '<manifest xmlns:tools="http://schemas.android.com/tools" '
          );
        }
        fs.writeFileSync(manifestPath, content);
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
