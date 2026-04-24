// Custom Config Plugin for CarPlay
// Ensures CarPlay scene configuration is properly set

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const withCarPlayEntitlement = (config) => {
  // Step 1: Add CarPlay entitlement
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.carplay-audio'] = true;
    console.log('[withCarPlay] Added CarPlay entitlement');
    return config;
  });
  
  // Step 2: Configure background modes (Scene manifest removed — causes black screen
  // when PhoneSceneDelegate class doesn't exist. CarPlay works without it via
  // react-native-carplay's own native module.)
  config = withInfoPlist(config, (config) => {
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    
    // Ensure all required background modes are present
    const requiredModes = ['audio', 'fetch', 'remote-notification'];
    for (const mode of requiredModes) {
      if (!backgroundModes.includes(mode)) {
        backgroundModes.push(mode);
      }
    }
    config.modResults.UIBackgroundModes = backgroundModes;
    
    // Remove UIApplicationSceneManifest if it exists (causes black screen)
    if (config.modResults.UIApplicationSceneManifest) {
      delete config.modResults.UIApplicationSceneManifest;
      console.log('[withCarPlay] Removed UIApplicationSceneManifest (prevents black screen)');
    }
    
    console.log('[withCarPlay] Configured background modes:', backgroundModes);
    return config;
  });
  
  return config;
};

module.exports = withCarPlayEntitlement;
