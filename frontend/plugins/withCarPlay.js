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
  
  // Step 2: Configure background modes and scene manifest
  config = withInfoPlist(config, (config) => {
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    
    // Ensure all required background modes are present
    const requiredModes = ['audio', 'fetch', 'remote-notification', 'external-accessory'];
    for (const mode of requiredModes) {
      if (!backgroundModes.includes(mode)) {
        backgroundModes.push(mode);
      }
    }
    config.modResults.UIBackgroundModes = backgroundModes;
    
    // Ensure UIApplicationSceneManifest is properly configured for CarPlay
    // This is REQUIRED for CarPlay to work without crashing
    const manifest = config.modResults.UIApplicationSceneManifest || {};
    manifest.UIApplicationSupportsMultipleScenes = true;
    
    const sceneConfigs = manifest.UISceneConfigurations || {};
    
    // Ensure Phone scene configuration exists
    if (!sceneConfigs.UIWindowSceneSessionRoleApplication) {
      sceneConfigs.UIWindowSceneSessionRoleApplication = [{
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).PhoneSceneDelegate'
      }];
    }
    
    // Ensure CarPlay scene configuration exists
    if (!sceneConfigs.CPTemplateApplicationSceneSessionRoleApplication) {
      sceneConfigs.CPTemplateApplicationSceneSessionRoleApplication = [{
        UISceneConfigurationName: 'CarPlay',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate'
      }];
    }
    
    manifest.UISceneConfigurations = sceneConfigs;
    config.modResults.UIApplicationSceneManifest = manifest;
    
    console.log('[withCarPlay] Configured CarPlay scene manifest');
    console.log('[withCarPlay] Configured background modes:', backgroundModes);
    return config;
  });
  
  return config;
};

module.exports = withCarPlayEntitlement;
