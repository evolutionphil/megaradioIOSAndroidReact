// Custom Config Plugin for CarPlay Entitlements
const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

// Add CarPlay entitlement
const withCarPlayEntitlement = (config) => {
  // Add entitlement
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.carplay-audio'] = true;
    return config;
  });
  
  // Add UIBackgroundModes if not present
  config = withInfoPlist(config, (config) => {
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    
    if (!backgroundModes.includes('audio')) {
      backgroundModes.push('audio');
    }
    if (!backgroundModes.includes('fetch')) {
      backgroundModes.push('fetch');
    }
    
    config.modResults.UIBackgroundModes = backgroundModes;
    
    return config;
  });
  
  return config;
};

module.exports = withCarPlayEntitlement;
