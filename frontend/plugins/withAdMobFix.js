// Expo Config Plugin: Bulletproof fix for AdMob MobileAdsInitProvider crash
//
// Problem: MobileAdsInitProvider ContentProvider runs BEFORE React Native
// and crashes with "Invalid Application ID" if meta-data is missing.
//
// Strategy (v2 - Feb 2026):
// Layer 1: withAndroidManifest - Add correct meta-data + DISABLE provider (not remove)
// Layer 2: withDangerousMod - Raw XML backup patching
// Layer 3: withDangerousMod - Gradle task to patch ALL merged manifests post-merge
//
// Key change: Using tools:node="replace" + android:enabled="false" instead of
// tools:node="remove". "remove" silently fails when attributes don't match.
// "replace" + "enabled=false" is more reliable.

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ADMOB_ANDROID_APP_ID = 'ca-app-pub-8771434485570434~7427742767';

// Layer 1: Modify manifest via Expo API
function withAdMobManifestAPI(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    if (!application['meta-data']) application['meta-data'] = [];
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Remove ALL existing AdMob APPLICATION_ID entries to prevent duplicates
    application['meta-data'] = application['meta-data'].filter(
      (m) => !(m.$ && m.$['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID')
    );

    // Add correct AdMob meta-data with tools:replace
    application['meta-data'].push({
      $: {
        'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
        'android:value': ADMOB_ANDROID_APP_ID,
        'tools:replace': 'android:value',
      },
    });

    // DISABLE provider instead of removing it (more reliable)
    if (!application['provider']) application['provider'] = [];
    application['provider'] = application['provider'].filter(
      (p) => !(p.$ && p.$['android:name'] && p.$['android:name'].includes('MobileAdsInitProvider'))
    );
    application['provider'].push({
      $: {
        'android:name': 'com.google.android.gms.ads.MobileAdsInitProvider',
        'android:authorities': 'com.megaradio.mobileadsinitprovider',
        'android:enabled': 'false',
        'android:exported': 'false',
        'tools:node': 'replace',
      },
    });

    console.log('[withAdMobFix] Layer 1: Manifest API done (provider DISABLED)');
    return config;
  });
}

// Layer 2: Raw XML patching as backup
function withAdMobRawXML(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const manifestPath = path.join(
      config.modRequest.projectRoot,
      'android/app/src/main/AndroidManifest.xml'
    );

    if (fs.existsSync(manifestPath)) {
      let content = fs.readFileSync(manifestPath, 'utf-8');
      let modified = false;

      // Ensure xmlns:tools
      if (!content.includes('xmlns:tools=')) {
        content = content.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
        modified = true;
      }

      // Force-add AdMob meta-data if missing
      if (!content.includes(ADMOB_ANDROID_APP_ID)) {
        content = content.replace(
          '</application>',
          `    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${ADMOB_ANDROID_APP_ID}" tools:replace="android:value" />\n    </application>`
        );
        modified = true;
      }

      // Ensure provider is DISABLED (not removed)
      // First remove any existing MobileAdsInitProvider entries
      content = content.replace(
        /<provider[^>]*MobileAdsInitProvider[^/]*\/>/g,
        ''
      );
      content = content.replace(
        /<provider[^>]*MobileAdsInitProvider[^>]*>[\s\S]*?<\/provider>/g,
        ''
      );
      // Add disabled provider
      if (!content.includes('MobileAdsInitProvider')) {
        content = content.replace(
          '</application>',
          `    <provider android:name="com.google.android.gms.ads.MobileAdsInitProvider" android:authorities="com.megaradio.mobileadsinitprovider" android:enabled="false" android:exported="false" tools:node="replace" />\n    </application>`
        );
      }
      modified = true;

      if (modified) {
        fs.writeFileSync(manifestPath, content);
      }
      console.log('[withAdMobFix] Layer 2: Raw XML done');
    }
    return config;
  }]);
}

// Layer 3: NUCLEAR Gradle fix - patches ALL merged manifests after Gradle merge
function withAdMobGradleFix(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const buildGradlePath = path.join(
      config.modRequest.projectRoot,
      'android/app/build.gradle'
    );

    if (!fs.existsSync(buildGradlePath)) return config;

    let content = fs.readFileSync(buildGradlePath, 'utf-8');
    if (content.includes('MEGARADIO_ADMOB_FIX_V2')) return config;

    // Remove old v1 fix if present
    content = content.replace(/\/\/ =+\n\/\/ MEGARADIO_ADMOB_FIX:[\s\S]*?^}$/m, '');

    const admobId = ADMOB_ANDROID_APP_ID;
    const gradleFix = `
// ============================================================
// MEGARADIO_ADMOB_FIX_V2: Ensure AdMob APP ID + Disable provider
// ============================================================

tasks.whenTaskAdded { task ->
    if (task.name.contains("process") && task.name.contains("Manifest") && !task.name.contains("Test")) {
        task.doLast {
            def intermediatesDir = new File(project.buildDir, "intermediates")
            if (!intermediatesDir.exists()) return

            // Search ALL possible manifest locations
            def manifestDirs = ["merged_manifest", "merged_manifests", "packaged_manifests", "bundle_manifest"]
            manifestDirs.each { dirName ->
                def dir = new File(intermediatesDir, dirName)
                if (dir.exists()) {
                    dir.eachFileRecurse { file ->
                        if (file.name == "AndroidManifest.xml") {
                            patchManifestV2(file)
                        }
                    }
                }
            }

            // Also check task outputs
            task.outputs.files.each { outputFile ->
                if (outputFile.isDirectory()) {
                    outputFile.eachFileRecurse { file ->
                        if (file.name == "AndroidManifest.xml") {
                            patchManifestV2(file)
                        }
                    }
                } else if (outputFile.name == "AndroidManifest.xml") {
                    patchManifestV2(outputFile)
                }
            }
        }
    }
}

def patchManifestV2(File manifestFile) {
    if (!manifestFile.exists()) return
    def content = manifestFile.text
    def original = content

    // Step 1: Remove MobileAdsInitProvider completely from merged manifest
    // Self-closing tags
    content = content.replaceAll("(?s)<provider[^>]*MobileAdsInitProvider[^/]*/>" , "")
    // Paired open/close tags
    content = content.replaceAll("(?s)<provider[^>]*MobileAdsInitProvider[^>]*>.*?</provider>", "")

    // Step 2: Ensure APPLICATION_ID meta-data exists with correct value
    // First remove any existing (possibly wrong) entries
    content = content.replaceAll("(?s)<meta-data[^>]*com\\\\.google\\\\.android\\\\.gms\\\\.ads\\\\.APPLICATION_ID[^/]*/>" , "")
    content = content.replaceAll("(?s)<meta-data[^>]*com\\\\.google\\\\.android\\\\.gms\\\\.ads\\\\.APPLICATION_ID[^>]*>.*?</meta-data>", "")

    // Add correct meta-data
    content = content.replace(
        "</application>",
        "    <meta-data android:name=\\"com.google.android.gms.ads.APPLICATION_ID\\" android:value=\\"${admobId}\\" />\\n    </application>"
    )

    if (content != original) {
        manifestFile.text = content
        println "[MEGARADIO_ADMOB_FIX_V2] Patched: " + manifestFile.path
    }
}
`;

    content += gradleFix;
    fs.writeFileSync(buildGradlePath, content);
    console.log('[withAdMobFix] Layer 3: Gradle fix V2 added');
    return config;
  }]);
}

module.exports = function withAdMobFix(config) {
  config = withAdMobManifestAPI(config);
  config = withAdMobRawXML(config);
  config = withAdMobGradleFix(config);
  return config;
};
