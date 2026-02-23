// Custom Config Plugin for CarPlay Entitlements
// NOTE: Scene configuration removed - causes crash in Expo
const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const withCarPlayEntitlement = (config) => {
  // Add entitlement
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.carplay-audio'] = true;
    return config;
  });
  
  // Add UIBackgroundModes only - NO scene configuration
  config = withInfoPlist(config, (config) => {
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    
    if (!backgroundModes.includes('audio')) {
      backgroundModes.push('audio');
    }
    if (!backgroundModes.includes('fetch')) {
      backgroundModes.push('fetch');
    }
    
    config.modResults.UIBackgroundModes = backgroundModes;
    
    // DO NOT add UIApplicationSceneManifest - it causes crash
    // The react-native-carplay package handles this internally
    
    return config;
  });
  
  return config;
};

module.exports = withCarPlayEntitlement;
