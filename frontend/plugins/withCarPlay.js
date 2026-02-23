// Custom Config Plugin for CarPlay Entitlements & Scene Configuration
const { withEntitlementsPlist, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');

// Add CarPlay entitlement
const withCarPlayEntitlement = (config) => {
  // Add entitlement
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.carplay-audio'] = true;
    return config;
  });
  
  // Add UIBackgroundModes and CarPlay scene configuration
  config = withInfoPlist(config, (config) => {
    // Background modes
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    
    if (!backgroundModes.includes('audio')) {
      backgroundModes.push('audio');
    }
    if (!backgroundModes.includes('fetch')) {
      backgroundModes.push('fetch');
    }
    
    config.modResults.UIBackgroundModes = backgroundModes;
    
    // CarPlay Scene Configuration
    // This tells iOS that the app supports CarPlay audio
    if (!config.modResults.UIApplicationSceneManifest) {
      config.modResults.UIApplicationSceneManifest = {
        UIApplicationSupportsMultipleScenes: true,
        UISceneConfigurations: {}
      };
    }
    
    const sceneManifest = config.modResults.UIApplicationSceneManifest;
    if (!sceneManifest.UISceneConfigurations) {
      sceneManifest.UISceneConfigurations = {};
    }
    
    // Add CarPlay scene configuration
    sceneManifest.UISceneConfigurations.CPTemplateApplicationSceneSessionRoleApplication = [
      {
        UISceneConfigurationName: 'CarPlay',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate'
      }
    ];
    
    return config;
  });
  
  return config;
};

module.exports = withCarPlayEntitlement;
