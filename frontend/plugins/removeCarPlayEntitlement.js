// plugins/removeCarPlayEntitlement.js
// This plugin removes CarPlay entitlement until Apple approves it

const { withEntitlementsPlist } = require('@expo/config-plugins');

const removeCarPlayEntitlement = (config) => {
  return withEntitlementsPlist(config, (config) => {
    // Remove CarPlay entitlement if it exists
    if (config.modResults['com.apple.developer.carplay-audio']) {
      delete config.modResults['com.apple.developer.carplay-audio'];
      console.log('[Plugin] Removed com.apple.developer.carplay-audio entitlement');
    }
    
    // Also remove any CarPlay-related entitlements
    const keysToRemove = Object.keys(config.modResults).filter(key => 
      key.toLowerCase().includes('carplay')
    );
    
    keysToRemove.forEach(key => {
      delete config.modResults[key];
      console.log(`[Plugin] Removed ${key} entitlement`);
    });
    
    return config;
  });
};

module.exports = removeCarPlayEntitlement;
