// Expo Config Plugin: Ensures Google Services Gradle plugin is properly applied
// This fixes: "FirebaseApp failed to initialize because no default options were found.
// This usually means that com.google.gms:google-services was not applied to your gradle project."
//
// The @react-native-firebase/app plugin should handle this, but in some EAS build
// configurations it fails silently. This plugin ensures it's definitely applied.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGoogleServicesFix(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    
    // 1. Ensure google-services.json is in android/app/
    const srcJson = path.join(projectRoot, 'google-services.json');
    const destJson = path.join(projectRoot, 'android/app/google-services.json');
    
    if (fs.existsSync(srcJson)) {
      fs.copyFileSync(srcJson, destJson);
      console.log('[withGoogleServicesFix] Copied google-services.json to android/app/');
    }
    
    // 2. Ensure google-services classpath is in project build.gradle
    const projectBuildGradle = path.join(projectRoot, 'android/build.gradle');
    if (fs.existsSync(projectBuildGradle)) {
      let content = fs.readFileSync(projectBuildGradle, 'utf-8');
      
      if (!content.includes('com.google.gms:google-services')) {
        // Add google-services classpath to buildscript dependencies
        content = content.replace(
          /dependencies\s*\{/,
          `dependencies {
        classpath 'com.google.gms:google-services:4.4.2'`
        );
        fs.writeFileSync(projectBuildGradle, content);
        console.log('[withGoogleServicesFix] Added google-services classpath to project build.gradle');
      } else {
        console.log('[withGoogleServicesFix] google-services classpath already present');
      }
    }
    
    // 3. Ensure 'apply plugin' is in app build.gradle
    const appBuildGradle = path.join(projectRoot, 'android/app/build.gradle');
    if (fs.existsSync(appBuildGradle)) {
      let content = fs.readFileSync(appBuildGradle, 'utf-8');
      
      if (!content.includes("apply plugin: 'com.google.gms.google-services'") && 
          !content.includes('id "com.google.gms.google-services"')) {
        // Add at the end of the file (after android block)
        content += "\napply plugin: 'com.google.gms.google-services'\n";
        fs.writeFileSync(appBuildGradle, content);
        console.log('[withGoogleServicesFix] Applied google-services plugin to app build.gradle');
      } else {
        console.log('[withGoogleServicesFix] google-services plugin already applied');
      }
    }
    
    return config;
  }]);
}

module.exports = withGoogleServicesFix;
