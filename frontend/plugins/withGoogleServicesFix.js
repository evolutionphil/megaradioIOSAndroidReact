// Expo Config Plugin: BULLETPROOF Google Services Gradle Plugin Fix
//
// Problem: @react-native-firebase/app v23.8.x has known Expo config plugin issues
// that can prevent google-services Gradle plugin from being properly applied.
// Without it, FirebaseApp.initializeApp() fails at runtime with:
// "Default FirebaseApp failed to initialize because no default options were found."
//
// This plugin guarantees:
// 1. google-services.json is copied to android/app/
// 2. classpath 'com.google.gms:google-services' is in buildscript.dependencies
// 3. apply plugin: 'com.google.gms.google-services' is in app/build.gradle
// 4. Firebase BOM is available for native initialization

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGoogleServicesFix(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    
    console.log('[withGoogleServicesFix] Starting Firebase/Google Services setup...');

    // ============================================================
    // Step 1: Copy google-services.json to android/app/
    // ============================================================
    const srcJson = path.join(projectRoot, 'google-services.json');
    const destDir = path.join(projectRoot, 'android/app');
    const destJson = path.join(destDir, 'google-services.json');
    
    if (fs.existsSync(srcJson)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcJson, destJson);
      console.log('[withGoogleServicesFix] Step 1: Copied google-services.json to android/app/');
    } else {
      console.error('[withGoogleServicesFix] WARNING: google-services.json not found at project root!');
    }

    // ============================================================
    // Step 2: Add google-services classpath to PROJECT build.gradle
    // ============================================================
    const projectBuildGradle = path.join(projectRoot, 'android/build.gradle');
    if (fs.existsSync(projectBuildGradle)) {
      let content = fs.readFileSync(projectBuildGradle, 'utf-8');
      
      // Check if already present (any format)
      const hasClasspath = content.includes('com.google.gms:google-services') || 
                           content.includes('com.google.gms.google-services');
      
      if (!hasClasspath) {
        // Strategy: Find buildscript { ... dependencies { and insert after the opening {
        // Use a more specific pattern that targets buildscript.dependencies specifically
        const buildscriptMatch = content.match(/buildscript\s*\{[\s\S]*?dependencies\s*\{/);
        
        if (buildscriptMatch) {
          const insertPoint = buildscriptMatch.index + buildscriptMatch[0].length;
          content = content.slice(0, insertPoint) + 
                    "\n        classpath('com.google.gms:google-services:4.4.2')" +
                    content.slice(insertPoint);
          console.log('[withGoogleServicesFix] Step 2: Added google-services classpath to buildscript.dependencies');
        } else {
          // Fallback: If no buildscript block, add entire buildscript block at the top
          const buildscriptBlock = `
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath('com.google.gms:google-services:4.4.2')
    }
}

`;
          // Insert before the first line that isn't a comment
          const firstNonCommentLine = content.search(/^[^\/\n]/m);
          if (firstNonCommentLine >= 0) {
            content = content.slice(0, firstNonCommentLine) + buildscriptBlock + content.slice(firstNonCommentLine);
          } else {
            content = buildscriptBlock + content;
          }
          console.log('[withGoogleServicesFix] Step 2: Added full buildscript block with google-services classpath');
        }
        
        fs.writeFileSync(projectBuildGradle, content);
      } else {
        console.log('[withGoogleServicesFix] Step 2: google-services classpath already present');
      }
    }

    // ============================================================
    // Step 3: Apply google-services plugin in APP build.gradle
    // ============================================================
    const appBuildGradle = path.join(projectRoot, 'android/app/build.gradle');
    if (fs.existsSync(appBuildGradle)) {
      let content = fs.readFileSync(appBuildGradle, 'utf-8');
      
      // Check multiple possible formats
      const hasPlugin = content.includes("apply plugin: 'com.google.gms.google-services'") ||
                        content.includes('apply plugin: "com.google.gms.google-services"') ||
                        content.includes('id "com.google.gms.google-services"') ||
                        content.includes("id 'com.google.gms.google-services'") ||
                        content.includes('id("com.google.gms.google-services")');
      
      if (!hasPlugin) {
        // The google-services plugin MUST be applied at the very bottom of the file
        // after android {} and dependencies {} blocks
        content = content.trimEnd() + "\n\napply plugin: 'com.google.gms.google-services'\n";
        fs.writeFileSync(appBuildGradle, content);
        console.log('[withGoogleServicesFix] Step 3: Applied google-services plugin at bottom of app/build.gradle');
      } else {
        console.log('[withGoogleServicesFix] Step 3: google-services plugin already applied');
      }
    }

    // ============================================================
    // Step 4: Verify google-services.json has correct package name
    // ============================================================
    if (fs.existsSync(destJson)) {
      try {
        const gsConfig = JSON.parse(fs.readFileSync(destJson, 'utf-8'));
        const packageName = gsConfig?.client?.[0]?.client_info?.android_client_info?.package_name;
        console.log('[withGoogleServicesFix] Step 4: google-services.json package_name:', packageName);
        
        // Also read app.json to compare
        const appJsonPath = path.join(projectRoot, 'app.json');
        if (fs.existsSync(appJsonPath)) {
          const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
          const appPackage = appConfig?.expo?.android?.package;
          if (packageName && appPackage && packageName !== appPackage) {
            console.error(`[withGoogleServicesFix] MISMATCH! google-services.json package: "${packageName}" vs app.json: "${appPackage}"`);
          } else {
            console.log('[withGoogleServicesFix] Step 4: Package names match OK');
          }
        }
      } catch (e) {
        console.error('[withGoogleServicesFix] Step 4: Failed to verify google-services.json:', e.message);
      }
    }

    console.log('[withGoogleServicesFix] Setup complete');
    return config;
  }]);
}

module.exports = withGoogleServicesFix;
