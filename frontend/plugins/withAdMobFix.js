// Expo Config Plugin: NUCLEAR FIX for AdMob MobileAdsInitProvider crash
// 
// Problem: MobileAdsInitProvider ContentProvider from play-services-ads runs
// before React Native loads and crashes with "Invalid Application ID".
//
// THREE-LAYER approach:
// Layer 1: withAndroidManifest - Add correct meta-data + tools:node="remove"
// Layer 2: withDangerousMod - Raw XML patching of AndroidManifest.xml  
// Layer 3: withDangerousMod - Gradle task to patch ALL merged manifests post-merge

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

    // Remove ALL existing AdMob entries to prevent duplicates
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

    // Add provider removal directive
    if (!application['provider']) application['provider'] = [];
    application['provider'] = application['provider'].filter(
      (p) => !(p.$ && p.$['android:name'] && p.$['android:name'].includes('MobileAdsInitProvider'))
    );
    application['provider'].push({
      $: {
        'android:name': 'com.google.android.gms.ads.MobileAdsInitProvider',
        'android:authorities': '${applicationId}.mobileadsinitprovider',
        'tools:node': 'remove',
      },
    });

    console.log('[withAdMobFix] Layer 1: Manifest API done');
    return config;
  });
}

// Layer 2: Raw XML patching
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

      // Add provider removal if missing
      if (!content.includes('MobileAdsInitProvider')) {
        content = content.replace(
          '</application>',
          `    <provider android:name="com.google.android.gms.ads.MobileAdsInitProvider" android:authorities="\${applicationId}.mobileadsinitprovider" tools:node="remove" />\n    </application>`
        );
        modified = true;
      }

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
    if (content.includes('MEGARADIO_ADMOB_FIX')) return config;

    // Build the Gradle fix with properly escaped Groovy strings
    // Groovy 4.0+ (Gradle 8.14+) rejects unknown escape sequences in single-quoted strings
    // Use Java-style double-quoted strings for regex patterns
    const admobId = ADMOB_ANDROID_APP_ID;
    const gradleFix = `
// ============================================================
// MEGARADIO_ADMOB_FIX: Remove MobileAdsInitProvider post-merge
// ============================================================

tasks.whenTaskAdded { task ->
    if (task.name.contains("process") && task.name.contains("Manifest") && !task.name.contains("Test")) {
        task.doLast {
            def intermediatesDir = new File(project.buildDir, "intermediates")
            if (intermediatesDir.exists()) {
                intermediatesDir.eachFileRecurse { file ->
                    if (file.name == "AndroidManifest.xml" && file.path.contains("merged_manifest")) {
                        patchManifest(file)
                    }
                }
            }
            ["packaged_manifests", "bundle_manifest"].each { dirName ->
                def dir = new File(intermediatesDir, dirName)
                if (dir.exists()) {
                    dir.eachFileRecurse { file ->
                        if (file.name == "AndroidManifest.xml") {
                            patchManifest(file)
                        }
                    }
                }
            }
            task.outputs.files.each { outputFile ->
                if (outputFile.isDirectory()) {
                    outputFile.eachFileRecurse { file ->
                        if (file.name == "AndroidManifest.xml") {
                            patchManifest(file)
                        }
                    }
                } else if (outputFile.name == "AndroidManifest.xml") {
                    patchManifest(outputFile)
                }
            }
        }
    }
}

def patchManifest(File manifestFile) {
    if (!manifestFile.exists()) return
    def content = manifestFile.text
    def original = content
    
    // Remove MobileAdsInitProvider - self-closing tags
    content = content.replaceAll("(?s)<provider[^>]*MobileAdsInitProvider[^/]*/>" , "")
    // Remove MobileAdsInitProvider - paired open/close tags
    content = content.replaceAll("(?s)<provider[^>]*MobileAdsInitProvider[^>]*>.*?</provider>", "")
    
    // Ensure AdMob App ID meta-data exists
    if (!content.contains("${admobId}")) {
        content = content.replace(
            "</application>",
            "    <meta-data android:name=\\"com.google.android.gms.ads.APPLICATION_ID\\" android:value=\\"${admobId}\\" />\\n    </application>"
        )
    }
    
    if (content != original) {
        manifestFile.text = content
        println "[MEGARADIO_ADMOB_FIX] Patched: " + manifestFile.path
    }
}
`;

    content += gradleFix;
    fs.writeFileSync(buildGradlePath, content);
    console.log('[withAdMobFix] Layer 3: Gradle fix added');
    return config;
  }]);
}

module.exports = function withAdMobFix(config) {
  config = withAdMobManifestAPI(config);
  config = withAdMobRawXML(config);
  config = withAdMobGradleFix(config);
  return config;
};
