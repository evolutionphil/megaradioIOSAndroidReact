// Expo Config Plugin: Fix Android Build Configuration
//
// Fixes 3 critical build issues that cause "classes.dex not found" crashes:
// 1. Forces newArchEnabled=false in gradle.properties (overrides any default)
// 2. Enables MultiDex explicitly (safety net for 65K method limit)
// 3. Adds comprehensive ProGuard keep rules for all native libraries
// 4. Configures DEX compiler options for large projects

const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Step 1: Fix gradle.properties - ensure newArchEnabled=false
function withGradlePropertiesFix(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    
    // Force newArchEnabled=false
    const newArchProp = props.find(p => p.type === 'property' && p.key === 'newArchEnabled');
    if (newArchProp) {
      newArchProp.value = 'false';
      console.log('[withAndroidBuildFix] Set newArchEnabled=false in gradle.properties');
    } else {
      props.push({ type: 'property', key: 'newArchEnabled', value: 'false' });
      console.log('[withAndroidBuildFix] Added newArchEnabled=false to gradle.properties');
    }

    // Ensure proper JVM args for large builds
    const jvmProp = props.find(p => p.type === 'property' && p.key === 'org.gradle.jvmargs');
    if (jvmProp) {
      if (!jvmProp.value.includes('-Xmx')) {
        jvmProp.value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';
      } else {
        // Ensure at least 4GB heap for large builds
        jvmProp.value = jvmProp.value.replace(/-Xmx\d+m/, '-Xmx4096m');
        jvmProp.value = jvmProp.value.replace(/-XX:MaxMetaspaceSize=\d+m/, '-XX:MaxMetaspaceSize=1024m');
      }
      console.log('[withAndroidBuildFix] Updated JVM args:', jvmProp.value);
    }

    return config;
  });
}

// Step 2: Fix app/build.gradle - MultiDex + DEX options
function withMultiDexAndDexOptions(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const appBuildGradle = path.join(projectRoot, 'android/app/build.gradle');
    
    if (!fs.existsSync(appBuildGradle)) return config;
    
    let content = fs.readFileSync(appBuildGradle, 'utf-8');
    let modified = false;

    // Add multiDexEnabled to defaultConfig if not present
    if (!content.includes('multiDexEnabled')) {
      content = content.replace(
        /(defaultConfig\s*\{[^}]*)(versionName\s+["'][^"']+["'])/s,
        '$1$2\n\n        multiDexEnabled true'
      );
      modified = true;
      console.log('[withAndroidBuildFix] Added multiDexEnabled true to defaultConfig');
    }

    // Add dexOptions for large projects if not present
    if (!content.includes('dexOptions')) {
      // Insert after the android { block's opening configs
      content = content.replace(
        /(android\s*\{[^]*?)(buildTypes\s*\{)/s,
        `$1dexOptions {
        preDexLibraries true
        javaMaxHeapSize "4g"
    }
    $2`
      );
      modified = true;
      console.log('[withAndroidBuildFix] Added dexOptions to android block');
    }

    // Add multidex dependency if not present
    if (!content.includes('multidex') && !content.includes('multiDex')) {
      content = content.replace(
        /(dependencies\s*\{)/,
        `$1\n    implementation 'androidx.multidex:multidex:2.0.1'`
      );
      modified = true;
      console.log('[withAndroidBuildFix] Added multidex dependency');
    }

    if (modified) {
      fs.writeFileSync(appBuildGradle, content);
    }

    return config;
  }]);
}

// Step 3: Comprehensive ProGuard rules
function withProguardRules(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const proguardPath = path.join(projectRoot, 'android/app/proguard-rules.pro');
    
    if (!fs.existsSync(proguardPath)) return config;
    
    let content = fs.readFileSync(proguardPath, 'utf-8');
    
    // Check if our rules are already applied
    if (content.includes('MEGARADIO_PROGUARD_RULES')) {
      console.log('[withAndroidBuildFix] ProGuard rules already applied');
      return config;
    }
    
    const additionalRules = `
# ============================================================
# MEGARADIO_PROGUARD_RULES
# ============================================================

# --- React Native Core ---
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# --- React Native TurboModules ---
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# --- React Native Reanimated ---
-keep class com.swmansion.reanimated.** { *; }

# --- Firebase ---
-keep class io.invertase.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn io.invertase.**

# --- Google AdMob / Play Services ---
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# --- React Native Track Player ---
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep class com.doublesymmetry.kotlinaudio.** { *; }
-dontwarn com.doublesymmetry.**

# --- CarPlay / Android Auto ---
-keep class org.birkir.carplay.** { *; }
-dontwarn org.birkir.carplay.**

# --- Google Cast ---
-keep class com.google.android.gms.cast.** { *; }
-keep class com.reactnative.googlecast.** { *; }

# --- IAP (In-App Purchases) ---
-keep class com.dooboolab.rniap.** { *; }
-dontwarn com.dooboolab.rniap.**

# --- ExoPlayer (used by Track Player) ---
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

# --- Kotlin Coroutines ---
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }

# --- Expo Modules ---
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# --- Prevent stripping of native methods ---
-keepclassmembers class * { native <methods>; }

# --- Keep annotations ---
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes Exceptions
`;

    content += additionalRules;
    fs.writeFileSync(proguardPath, content);
    console.log('[withAndroidBuildFix] Added comprehensive ProGuard keep rules');

    return config;
  }]);
}

// Step 4: Fix Android 15 BOOT_COMPLETED + Foreground Service restriction
// Google Play rejects apps where BOOT_COMPLETED receivers start restricted
// foreground service types (expo-audio's AudioRecordingService & AudioControlsService).
// Fix: Remove BOOT_COMPLETED receiver from expo-notifications AND strip the permission.
function withAndroid15BootFix(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const manifestPath = path.join(projectRoot, 'android/app/src/main/AndroidManifest.xml');

    if (!fs.existsSync(manifestPath)) return config;

    let manifest = fs.readFileSync(manifestPath, 'utf-8');
    let modified = false;

    // 1. Remove RECEIVE_BOOT_COMPLETED permission
    if (manifest.includes('RECEIVE_BOOT_COMPLETED')) {
      manifest = manifest.replace(
        /\s*<uses-permission android:name="android\.permission\.RECEIVE_BOOT_COMPLETED"[^/]*\/>/g,
        ''
      );
      modified = true;
      console.log('[withAndroidBuildFix] Removed RECEIVE_BOOT_COMPLETED permission');
    }

    // 2. Remove any BOOT_COMPLETED intent-filter receivers
    // This regex matches <receiver> blocks containing BOOT_COMPLETED
    manifest = manifest.replace(
      /\s*<receiver[^>]*>[\s\S]*?BOOT_COMPLETED[\s\S]*?<\/receiver>/g,
      (match) => {
        modified = true;
        console.log('[withAndroidBuildFix] Removed BOOT_COMPLETED receiver');
        return '';
      }
    );

    if (modified) {
      fs.writeFileSync(manifestPath, manifest);
      console.log('[withAndroidBuildFix] Android 15 foreground service boot fix applied');
    }

    return config;
  }]);
}


module.exports = function withAndroidBuildFix(config) {
  config = withGradlePropertiesFix(config);
  config = withMultiDexAndDexOptions(config);
  config = withProguardRules(config);
  config = withAndroid15BootFix(config);
  return config;
};
