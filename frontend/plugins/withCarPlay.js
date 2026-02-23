// Custom Config Plugin for CarPlay
// Only adds entitlement and background modes - NO scene configuration
// Scene configuration causes crash in Expo managed workflow

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const withCarPlayEntitlement = (config) => {
  // Step 1: Add CarPlay entitlement
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.carplay-audio'] = true;
    console.log('[withCarPlay] Added CarPlay entitlement');
    return config;
  });
  
  // Step 2: Add background modes for audio
  config = withInfoPlist(config, (config) => {
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    
    // Ensure audio background mode is present
    if (!backgroundModes.includes('audio')) {
      backgroundModes.push('audio');
    }
    if (!backgroundModes.includes('fetch')) {
      backgroundModes.push('fetch');
    }
    
    config.modResults.UIBackgroundModes = backgroundModes;
    
    // IMPORTANT: Do NOT add UIApplicationSceneManifest
    // Expo manages scene configuration automatically
    // Adding custom scene delegates causes crash
    
    // Remove any existing CarPlay scene configuration that might cause issues
    if (config.modResults.UIApplicationSceneManifest) {
      const manifest = config.modResults.UIApplicationSceneManifest;
      
      // Remove CarPlay scene configuration if present
      if (manifest.CPTemplateApplicationSceneSessionRoleApplication) {
        delete manifest.CPTemplateApplicationSceneSessionRoleApplication;
        console.log('[withCarPlay] Removed CPTemplateApplicationSceneSessionRoleApplication');
      }
      
      // Also check for any custom CarPlay configurations
      if (manifest['Application Scene Manifest Version']) {
        // Keep the default Expo scene configuration
        // Don't add anything CarPlay-specific
      }
    }
    
    console.log('[withCarPlay] Configured background modes:', backgroundModes);
    return config;
  });
  
  return config;
};

module.exports = withCarPlayEntitlement;
